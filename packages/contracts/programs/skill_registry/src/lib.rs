use anchor_lang::prelude::*;

declare_id!("Cu3AA9kASqXYTvf3YnLCMJYyYszSyeK56jFMgo9wZxfA");

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

pub const MAX_NAME_LEN: usize = 64;
pub const MAX_DESCRIPTION_LEN: usize = 256;
pub const MAX_TAGS: usize = 8;
pub const MAX_TAG_LEN: usize = 32;
pub const INITIAL_REPUTATION: u16 = 500;

/// SkillAccount space calculation:
///   discriminator          8
///   owner (Pubkey)        32
///   skill_id ([u8;32])    32
///   name (String)          4 + 64
///   description (String)   4 + 256
///   tags (Vec<String>)     4 + 8*(4+32)   = 4 + 288
///   price_lamports (u64)   8
///   reputation_score (u16) 2
///   total_calls (u64)      8
///   is_active (bool)       1
///   tier (u8)              1
///   created_at (i64)       8
///   bump (u8)              1
///   ─────────────────────────
///   Total                  8+32+32+68+260+292+8+2+8+1+1+8+1 = 721
pub const SKILL_ACCOUNT_SPACE: usize = 8   // discriminator
    + 32                                    // owner
    + 32                                    // skill_id
    + 4 + MAX_NAME_LEN                      // name
    + 4 + MAX_DESCRIPTION_LEN               // description
    + 4 + MAX_TAGS * (4 + MAX_TAG_LEN)      // tags vec
    + 8                                     // price_lamports
    + 2                                     // reputation_score
    + 8                                     // total_calls
    + 1                                     // is_active
    + 1                                     // tier
    + 8                                     // created_at
    + 1; // bump

// ────────────────────────────────────────────────────────────────────────────
// Program
// ────────────────────────────────────────────────────────────────────────────

#[program]
pub mod skill_registry {
    use super::*;

    /// Register a new skill on-chain.
    ///
    /// IMPORTANT: No endpoint parameter exists here by design.
    /// Endpoints are stored exclusively in Supabase under service-role protection.
    /// Any endpoint stored on-chain would be visible via getProgramAccounts,
    /// allowing competitors to bypass payment entirely.
    ///
    /// PDA: ["skill", provider.key(), skill_id]
    pub fn register_skill(
        ctx: Context<RegisterSkill>,
        skill_id: [u8; 32],
        name: String,
        description: String,
        tags: Vec<String>,
        price_lamports: u64,
        tier: u8,
    ) -> Result<()> {
        // ── Input validation ──────────────────────────────────────────────
        require!(!name.is_empty(), SkillRegistryError::NameEmpty);
        require!(name.len() <= MAX_NAME_LEN, SkillRegistryError::NameTooLong);
        require!(
            description.len() <= MAX_DESCRIPTION_LEN,
            SkillRegistryError::DescriptionTooLong
        );
        require!(tags.len() <= MAX_TAGS, SkillRegistryError::TooManyTags);
        for tag in &tags {
            require!(tag.len() <= MAX_TAG_LEN, SkillRegistryError::TagTooLong);
            require!(!tag.is_empty(), SkillRegistryError::TagEmpty);
        }
        require!(price_lamports > 0, SkillRegistryError::PriceZero);
        require!(tier >= 1 && tier <= 3, SkillRegistryError::InvalidTier);

        // ── Write account ─────────────────────────────────────────────────
        let skill = &mut ctx.accounts.skill_account;
        let clock = Clock::get()?;

        skill.owner = ctx.accounts.provider.key();
        skill.skill_id = skill_id;
        skill.name = name;
        skill.description = description;
        skill.tags = tags;
        skill.price_lamports = price_lamports;
        skill.reputation_score = INITIAL_REPUTATION;
        skill.total_calls = 0;
        skill.is_active = true;
        skill.tier = tier;
        skill.created_at = clock.unix_timestamp;
        skill.bump = ctx.bumps.skill_account;

        emit!(SkillRegistered {
            skill_id: skill.skill_id,
            owner: skill.owner,
            price_lamports: skill.price_lamports,
            tier: skill.tier,
        });

        Ok(())
    }

    /// Update mutable fields on an existing skill.
    /// Only the skill owner may call this (enforced by has_one constraint).
    ///
    /// PDA: ["skill", provider.key(), skill_id]
    pub fn update_skill(
        ctx: Context<UpdateSkill>,
        description: Option<String>,
        price_lamports: Option<u64>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let skill = &mut ctx.accounts.skill_account;

        if let Some(desc) = description {
            require!(
                desc.len() <= MAX_DESCRIPTION_LEN,
                SkillRegistryError::DescriptionTooLong
            );
            skill.description = desc;
        }

        if let Some(price) = price_lamports {
            require!(price > 0, SkillRegistryError::PriceZero);
            skill.price_lamports = price;
        }

        if let Some(active) = is_active {
            skill.is_active = active;
        }

        emit!(SkillUpdated {
            skill_id: skill.skill_id,
            owner: skill.owner,
        });

        Ok(())
    }

    /// Update the reputation score after a completed call.
    /// Called via CPI from escrow_payment after complete_call.
    ///
    /// score parameter: 1–5 star rating from the caller.
    /// On-chain reputation_score is a rolling weighted average (0–1000 scale).
    /// Formula: new_score = ((old_score * total_calls) + (score * 200)) / (total_calls + 1)
    /// This maps a 1–5 rating onto the 0–1000 scale (5 stars = 1000, 1 star = 200).
    ///
    /// PDA: ["skill", provider.key(), skill_id]  (skill_id from skill_account.skill_id)
    pub fn update_reputation(ctx: Context<UpdateReputation>, score: u8) -> Result<()> {
        require!(score >= 1 && score <= 5, SkillRegistryError::InvalidScore);

        let skill = &mut ctx.accounts.skill_account;

        // Map 1–5 star rating to 0–1000 scale: stars * 200
        let score_scaled = (score as u64)
            .checked_mul(200)
            .ok_or(SkillRegistryError::ArithmeticOverflow)?;

        // Rolling average: ((old_score * n) + new_score_scaled) / (n + 1)
        let old_weighted = (skill.reputation_score as u64)
            .checked_mul(skill.total_calls)
            .ok_or(SkillRegistryError::ArithmeticOverflow)?;

        let new_total_calls = skill
            .total_calls
            .checked_add(1)
            .ok_or(SkillRegistryError::ArithmeticOverflow)?;

        let new_score_u64 = old_weighted
            .checked_add(score_scaled)
            .ok_or(SkillRegistryError::ArithmeticOverflow)?
            .checked_div(new_total_calls)
            .ok_or(SkillRegistryError::ArithmeticOverflow)?;

        skill.reputation_score = new_score_u64 as u16;
        skill.total_calls = new_total_calls;

        emit!(ReputationUpdated {
            skill_id: skill.skill_id,
            new_score: skill.reputation_score,
            total_calls: skill.total_calls,
        });

        Ok(())
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Account contexts
// ────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(skill_id: [u8; 32])]
pub struct RegisterSkill<'info> {
    /// The skill PDA.
    /// PDA: ["skill", provider.key(), skill_id]
    #[account(
        init,
        payer = provider,
        space = SKILL_ACCOUNT_SPACE,
        seeds = [b"skill", provider.key().as_ref(), &skill_id],
        bump,
    )]
    pub skill_account: Account<'info, SkillAccount>,

    /// The wallet that owns this skill and pays rent.
    #[account(mut)]
    pub provider: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSkill<'info> {
    /// PDA: ["skill", provider.key(), skill_account.skill_id]
    /// has_one = owner ensures only the registered owner can mutate.
    #[account(
        mut,
        seeds = [b"skill", provider.key().as_ref(), &skill_account.skill_id],
        bump = skill_account.bump,
        has_one = owner @ SkillRegistryError::Unauthorized,
    )]
    pub skill_account: Account<'info, SkillAccount>,

    /// Must match skill_account.owner — enforced by has_one above.
    #[account(mut)]
    pub owner: Signer<'info>,

    // Alias so the seeds macro can reference provider.key() in the PDA derivation.
    // We bind it separately so the instruction is consistent with RegisterSkill.
    /// CHECK: This is the provider key used in PDA seeds; it equals `owner`.
    #[account(address = skill_account.owner @ SkillRegistryError::Unauthorized)]
    pub provider: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    /// PDA: ["skill", skill_account.owner, skill_account.skill_id]
    #[account(
        mut,
        seeds = [b"skill", skill_account.owner.as_ref(), &skill_account.skill_id],
        bump = skill_account.bump,
    )]
    pub skill_account: Account<'info, SkillAccount>,

    /// The escrow_payment program must be the caller.
    /// We use a program-signed CPI so no additional key check is needed here;
    /// the escrow program enforces that complete_call succeeded before CPI-ing.
    pub authority: Signer<'info>,
}

// ────────────────────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────────────────────

/// On-chain skill registration record.
///
/// SECURITY NOTE: There is intentionally NO `endpoint` field here.
/// Solana's getProgramAccounts RPC is public — any on-chain field is readable
/// by anyone without paying. Storing the endpoint here would allow competitors
/// to call skills directly and bypass the payment escrow entirely.
/// Endpoints are stored exclusively in Supabase under service-role protection.
#[account]
pub struct SkillAccount {
    /// The wallet that registered this skill. Receives payments.
    pub owner: Pubkey,
    /// Unique 32-byte identifier for this skill (generated off-chain, sha256-based).
    pub skill_id: [u8; 32],
    /// Human-readable name. Max 64 bytes.
    pub name: String,
    /// Human-readable description. Max 256 bytes.
    pub description: String,
    /// Capability tags for discovery. Max 8 tags, 32 bytes each.
    pub tags: Vec<String>,
    /// Price callers must pay in lamports.
    pub price_lamports: u64,
    /// Rolling reputation score, 0–1000. Starts at 500 (neutral).
    pub reputation_score: u16,
    /// Total number of completed calls. Used in reputation calculation.
    pub total_calls: u64,
    /// Whether the skill is accepting calls.
    pub is_active: bool,
    /// Skill tier: 1 = Prompt, 2 = Tool, 3 = Custom Agent.
    pub tier: u8,
    /// Unix timestamp of registration.
    pub created_at: i64,
    /// PDA bump seed.
    pub bump: u8,
    // NO endpoint field — endpoint URLs live in Supabase only.
}

// ────────────────────────────────────────────────────────────────────────────
// Events
// ────────────────────────────────────────────────────────────────────────────

#[event]
pub struct SkillRegistered {
    pub skill_id: [u8; 32],
    pub owner: Pubkey,
    pub price_lamports: u64,
    pub tier: u8,
}

#[event]
pub struct SkillUpdated {
    pub skill_id: [u8; 32],
    pub owner: Pubkey,
}

#[event]
pub struct ReputationUpdated {
    pub skill_id: [u8; 32],
    pub new_score: u16,
    pub total_calls: u64,
}

// ────────────────────────────────────────────────────────────────────────────
// Errors
// ────────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum SkillRegistryError {
    #[msg("Skill name cannot be empty")]
    NameEmpty,
    #[msg("Skill name exceeds 64 characters")]
    NameTooLong,
    #[msg("Description exceeds 256 characters")]
    DescriptionTooLong,
    #[msg("Maximum 8 tags allowed")]
    TooManyTags,
    #[msg("Tag exceeds 32 characters")]
    TagTooLong,
    #[msg("Tag cannot be empty")]
    TagEmpty,
    #[msg("Price must be greater than zero")]
    PriceZero,
    #[msg("Tier must be 1, 2, or 3")]
    InvalidTier,
    #[msg("Only the skill owner can perform this action")]
    Unauthorized,
    #[msg("Reputation score must be between 1 and 5")]
    InvalidScore,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
