use anchor_lang::prelude::*;
use anchor_lang::system_program;
use skill_registry::cpi::accounts::UpdateReputation;
use skill_registry::program::SkillRegistry;
use skill_registry::SkillAccount;

declare_id!("8GHDWw5XsN39zVGPryYcSNaanxjAfT5jWbmaoNb7e9mx");

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/// Platform fee in basis points: 500 bps = 5%.
/// Never change without explicit instruction. This is a core invariant.
pub const PLATFORM_FEE_BPS: u64 = 500;
pub const BPS_DENOMINATOR: u64 = 10_000;

/// CallAccount space calculation:
///   discriminator          8
///   call_id ([u8;32])     32
///   skill_id ([u8;32])    32
///   caller (Pubkey)       32
///   skill_owner (Pubkey)  32
///   amount_lamports (u64)  8
///   input_hash ([u8;32])  32
///   result_hash ([u8;32]) 32
///   status (enum)          1  (1-byte discriminant)
///   created_at (i64)       8
///   completed_at (i64)     8
///   bump (u8)              1
///   ─────────────────────────
///   Total                228
pub const CALL_ACCOUNT_SPACE: usize = 8   // discriminator
    + 32                                   // call_id
    + 32                                   // skill_id
    + 32                                   // caller
    + 32                                   // skill_owner
    + 8                                    // amount_lamports
    + 32                                   // input_hash
    + 32                                   // result_hash
    + 1                                    // status (enum discriminant, 1 byte)
    + 8                                    // created_at
    + 8                                    // completed_at
    + 1; // bump

// ────────────────────────────────────────────────────────────────────────────
// Program
// ────────────────────────────────────────────────────────────────────────────

#[program]
pub mod escrow_payment {
    use super::*;

    /// Initiate a skill call by locking SOL in the vault PDA.
    ///
    /// The caller pays `skill_account.price_lamports` which is transferred
    /// into the vault. The vault is a system-owned PDA holding raw lamports
    /// (not a token account).
    ///
    /// PDA seeds:
    ///   call_account: ["call", caller.key(), call_id]
    ///   vault:        ["vault", call_id]
    pub fn initiate_call(
        ctx: Context<InitiateCall>,
        call_id: [u8; 32],
        skill_id: [u8; 32],
        input_hash: [u8; 32],
    ) -> Result<()> {
        let skill = &ctx.accounts.skill_account;

        // Skill must be active and skill_id must match
        require!(skill.is_active, EscrowPaymentError::SkillNotActive);
        require!(
            skill.skill_id == skill_id,
            EscrowPaymentError::SkillIdMismatch
        );

        let amount = skill.price_lamports;
        require!(amount > 0, EscrowPaymentError::PriceZero);

        // ── Populate call account ─────────────────────────────────────────
        let call = &mut ctx.accounts.call_account;
        let clock = Clock::get()?;

        call.call_id = call_id;
        call.skill_id = skill_id;
        call.caller = ctx.accounts.caller.key();
        call.skill_owner = skill.owner;
        call.amount_lamports = amount;
        call.input_hash = input_hash;
        call.result_hash = [0u8; 32];
        call.status = CallStatus::Pending;
        call.created_at = clock.unix_timestamp;
        call.completed_at = 0;
        call.bump = ctx.bumps.call_account;

        // ── Transfer lamports into vault via system_program CPI ───────────
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.caller.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount)?;

        emit!(CallInitiated {
            call_id,
            skill_id,
            caller: ctx.accounts.caller.key(),
            skill_owner: skill.owner,
            amount_lamports: amount,
        });

        Ok(())
    }

    /// Complete a pending call: distribute funds and update reputation.
    ///
    /// Only the skill owner may invoke this. SOL is split:
    ///   - 95% (10_000 - 500 bps) → skill_owner
    ///   - 5%  (500 bps)          → platform_treasury
    ///
    /// After settlement a CPI to skill_registry::update_reputation is issued
    /// with the caller-provided score (1–5). This feeds real user ratings into
    /// the on-chain reputation score rather than a hardcoded default.
    ///
    /// PDA: vault ["vault", call_id] is drained via invoke_signed.
    pub fn complete_call(
        ctx: Context<CompleteCall>,
        call_id: [u8; 32],
        result_hash: [u8; 32],
        score: u8,
    ) -> Result<()> {
        require!(score >= 1 && score <= 5, EscrowPaymentError::InvalidScore);
        // Verify state transition: must be Pending
        require!(
            ctx.accounts.call_account.status == CallStatus::Pending,
            EscrowPaymentError::InvalidStateTransition
        );
        // Verify this complete matches the call
        require!(
            ctx.accounts.call_account.call_id == call_id,
            EscrowPaymentError::CallIdMismatch
        );
        // Verify the signer is the registered skill owner
        require!(
            ctx.accounts.skill_owner.key() == ctx.accounts.call_account.skill_owner,
            EscrowPaymentError::Unauthorized
        );

        let amount = ctx.accounts.call_account.amount_lamports;

        // ── Fee arithmetic (checked) ──────────────────────────────────────
        // platform_fee = amount * 500 / 10_000
        let platform_fee = amount
            .checked_mul(PLATFORM_FEE_BPS)
            .ok_or(EscrowPaymentError::ArithmeticOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(EscrowPaymentError::ArithmeticOverflow)?;

        let provider_amount = amount
            .checked_sub(platform_fee)
            .ok_or(EscrowPaymentError::ArithmeticOverflow)?;

        // ── Drain vault via invoke_signed ─────────────────────────────────
        // The vault is a system-owned PDA. We transfer lamports directly by
        // manipulating the account lamport fields (the canonical pattern for
        // native SOL PDAs that are not ATA-backed).
        let vault_call_id = call_id; // for seeds
        let vault_bump = ctx.bumps.vault;
        let seeds: &[&[u8]] = &[b"vault", vault_call_id.as_ref(), &[vault_bump]];
        let signer_seeds = &[seeds];

        // Transfer provider_amount to skill_owner
        anchor_lang::solana_program::program::invoke_signed(
            &anchor_lang::solana_program::system_instruction::transfer(
                ctx.accounts.vault.key,
                ctx.accounts.skill_owner.key,
                provider_amount,
            ),
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.skill_owner.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        // Transfer platform_fee to platform_treasury
        anchor_lang::solana_program::program::invoke_signed(
            &anchor_lang::solana_program::system_instruction::transfer(
                ctx.accounts.vault.key,
                ctx.accounts.platform_treasury.key,
                platform_fee,
            ),
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.platform_treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        // ── Update call account state ─────────────────────────────────────
        let call = &mut ctx.accounts.call_account;
        let clock = Clock::get()?;
        call.result_hash = result_hash;
        call.status = CallStatus::Completed;
        call.completed_at = clock.unix_timestamp;

        // ── CPI: update_reputation on skill_registry ──────────────────────
        // Pass the caller-provided score (1–5) so real user ratings feed
        // directly into the on-chain rolling reputation average.
        let cpi_program = ctx.accounts.skill_registry_program.key();
        let cpi_accounts = UpdateReputation {
            skill_account: ctx.accounts.skill_account.to_account_info(),
            authority: ctx.accounts.skill_owner.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        skill_registry::cpi::update_reputation(cpi_ctx, score)?;

        emit!(CallCompleted {
            call_id,
            skill_id: call.skill_id,
            provider_amount,
            platform_fee,
        });

        Ok(())
    }

    /// Cancel a pending call and refund 100% of lamports to the caller.
    ///
    /// Only the original caller may invoke this.
    /// A call may only be refunded while still in Pending state.
    ///
    /// PDA: vault ["vault", call_id] is drained back to caller.
    pub fn refund_call(ctx: Context<RefundCall>, call_id: [u8; 32]) -> Result<()> {
        // Verify state transition: must be Pending
        require!(
            ctx.accounts.call_account.status == CallStatus::Pending,
            EscrowPaymentError::InvalidStateTransition
        );
        require!(
            ctx.accounts.call_account.call_id == call_id,
            EscrowPaymentError::CallIdMismatch
        );
        // Only the original caller may cancel
        require!(
            ctx.accounts.caller.key() == ctx.accounts.call_account.caller,
            EscrowPaymentError::Unauthorized
        );

        let amount = ctx.accounts.call_account.amount_lamports;

        // ── Drain vault back to caller ─────────────────────────────────────
        let vault_bump = ctx.bumps.vault;
        let seeds: &[&[u8]] = &[b"vault", call_id.as_ref(), &[vault_bump]];
        let signer_seeds = &[seeds];

        anchor_lang::solana_program::program::invoke_signed(
            &anchor_lang::solana_program::system_instruction::transfer(
                ctx.accounts.vault.key,
                ctx.accounts.caller.key,
                amount,
            ),
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.caller.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        // ── Update call account state ─────────────────────────────────────
        let call = &mut ctx.accounts.call_account;
        let clock = Clock::get()?;
        call.status = CallStatus::Cancelled;
        call.completed_at = clock.unix_timestamp;

        emit!(CallRefunded {
            call_id,
            caller: ctx.accounts.caller.key(),
            amount_lamports: amount,
        });

        Ok(())
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Account contexts
// ────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(call_id: [u8; 32], skill_id: [u8; 32])]
pub struct InitiateCall<'info> {
    /// The call record PDA.
    /// PDA: ["call", caller.key(), call_id]
    #[account(
        init,
        payer = caller,
        space = CALL_ACCOUNT_SPACE,
        seeds = [b"call", caller.key().as_ref(), &call_id],
        bump,
    )]
    pub call_account: Account<'info, CallAccount>,

    /// The vault PDA that holds escrowed lamports.
    /// PDA: ["vault", call_id]
    /// This is a system-owned account (no data, just lamports).
    /// CHECK: This is a PDA vault seeded by call_id. We verify seeds here.
    #[account(
        mut,
        seeds = [b"vault", &call_id],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// The registered skill being called. Must be active.
    #[account(
        seeds = [b"skill", skill_account.owner.as_ref(), &skill_id],
        bump = skill_account.bump,
        constraint = skill_account.is_active @ EscrowPaymentError::SkillNotActive,
        constraint = skill_account.skill_id == skill_id @ EscrowPaymentError::SkillIdMismatch,
    )]
    pub skill_account: Account<'info, SkillAccount>,

    /// The wallet initiating the call. Pays rent + escrow amount.
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The platform treasury that receives 5% fees.
    /// CHECK: Verified off-chain; no on-chain constraint needed beyond receiving lamports.
    #[account(mut)]
    pub platform_treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(call_id: [u8; 32])]
pub struct CompleteCall<'info> {
    /// The call record PDA. Must be Pending; validated in handler.
    /// PDA: ["call", call_account.caller, call_id]
    #[account(
        mut,
        seeds = [b"call", call_account.caller.as_ref(), &call_id],
        bump = call_account.bump,
        constraint = call_account.call_id == call_id @ EscrowPaymentError::CallIdMismatch,
        constraint = call_account.status == CallStatus::Pending @ EscrowPaymentError::InvalidStateTransition,
    )]
    pub call_account: Account<'info, CallAccount>,

    /// The vault PDA holding escrowed lamports.
    /// PDA: ["vault", call_id]
    #[account(
        mut,
        seeds = [b"vault", &call_id],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// The skill owner; receives 95% of the escrow amount.
    /// Must match call_account.skill_owner (enforced in handler).
    #[account(mut)]
    pub skill_owner: Signer<'info>,

    /// The platform treasury receiving the 5% fee.
    /// CHECK: No constraint needed beyond being a mutable lamport recipient.
    #[account(mut)]
    pub platform_treasury: UncheckedAccount<'info>,

    /// The skill account for the CPI update_reputation call.
    /// PDA: ["skill", skill_owner.key(), call_account.skill_id]
    #[account(
        mut,
        seeds = [b"skill", skill_owner.key().as_ref(), &call_account.skill_id],
        bump = skill_account.bump,
        constraint = skill_account.owner == skill_owner.key() @ EscrowPaymentError::Unauthorized,
    )]
    pub skill_account: Account<'info, SkillAccount>,

    /// The skill_registry program for CPI.
    pub skill_registry_program: Program<'info, SkillRegistry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(call_id: [u8; 32])]
pub struct RefundCall<'info> {
    /// The call record PDA. Must be Pending; validated in handler.
    /// PDA: ["call", caller.key(), call_id]
    #[account(
        mut,
        seeds = [b"call", caller.key().as_ref(), &call_id],
        bump = call_account.bump,
        constraint = call_account.call_id == call_id @ EscrowPaymentError::CallIdMismatch,
        constraint = call_account.status == CallStatus::Pending @ EscrowPaymentError::InvalidStateTransition,
        constraint = call_account.caller == caller.key() @ EscrowPaymentError::Unauthorized,
    )]
    pub call_account: Account<'info, CallAccount>,

    /// The vault PDA holding the escrowed lamports to be returned.
    /// PDA: ["vault", call_id]
    #[account(
        mut,
        seeds = [b"vault", &call_id],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// The original caller who initiated the call. Receives the refund.
    #[account(mut)]
    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ────────────────────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────────────────────

#[account]
pub struct CallAccount {
    /// Unique identifier for this call (generated off-chain, sha256-based).
    pub call_id: [u8; 32],
    /// The skill being called.
    pub skill_id: [u8; 32],
    /// The wallet that initiated the call.
    pub caller: Pubkey,
    /// The skill owner who will receive payment upon completion.
    pub skill_owner: Pubkey,
    /// The amount locked in escrow (equals skill_account.price_lamports at initiation time).
    pub amount_lamports: u64,
    /// sha256(raw_input) — stored for auditability without exposing input.
    pub input_hash: [u8; 32],
    /// sha256(raw_result) — populated on completion.
    pub result_hash: [u8; 32],
    /// Current lifecycle state.
    pub status: CallStatus,
    /// Unix timestamp when the call was initiated.
    pub created_at: i64,
    /// Unix timestamp when the call was completed or cancelled. 0 if pending.
    pub completed_at: i64,
    /// PDA bump seed.
    pub bump: u8,
}

/// Lifecycle state for a call.
/// Valid transitions: Pending → Completed | Pending → Cancelled
/// No transition is valid from Completed or Cancelled.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CallStatus {
    Pending,
    Completed,
    Cancelled,
}

// ────────────────────────────────────────────────────────────────────────────
// Events
// ────────────────────────────────────────────────────────────────────────────

#[event]
pub struct CallInitiated {
    pub call_id: [u8; 32],
    pub skill_id: [u8; 32],
    pub caller: Pubkey,
    pub skill_owner: Pubkey,
    pub amount_lamports: u64,
}

#[event]
pub struct CallCompleted {
    pub call_id: [u8; 32],
    pub skill_id: [u8; 32],
    pub provider_amount: u64,
    pub platform_fee: u64,
}

#[event]
pub struct CallRefunded {
    pub call_id: [u8; 32],
    pub caller: Pubkey,
    pub amount_lamports: u64,
}

// ────────────────────────────────────────────────────────────────────────────
// Errors
// ────────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum EscrowPaymentError {
    #[msg("The skill is not currently active")]
    SkillNotActive,
    #[msg("Provided skill_id does not match the skill account")]
    SkillIdMismatch,
    #[msg("Provided call_id does not match the call account")]
    CallIdMismatch,
    #[msg("Skill price must be greater than zero")]
    PriceZero,
    #[msg("Only the skill owner may complete this call")]
    Unauthorized,
    #[msg("Call is not in the required state for this transition (Pending → Completed or Pending → Cancelled only)")]
    InvalidStateTransition,
    #[msg("Arithmetic overflow in fee calculation")]
    ArithmeticOverflow,
    #[msg("Rating score must be between 1 and 5")]
    InvalidScore,
}
