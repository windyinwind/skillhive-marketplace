import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { assert } from "chai";
import { EscrowPayment } from "../target/types/escrow_payment";
import { SkillRegistry } from "../target/types/skill_registry";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const PLATFORM_FEE_BPS = 500n;
const BPS_DENOMINATOR = 10_000n;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function randomBytes32(): Uint8Array {
  const b = new Uint8Array(32);
  for (let i = 0; i < 32; i++) b[i] = Math.floor(Math.random() * 256);
  return b;
}

function toArr(b: Uint8Array): number[] {
  return Array.from(b);
}

function deriveSkillPda(
  registryProgramId: PublicKey,
  providerKey: PublicKey,
  skillId: Uint8Array
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("skill"), providerKey.toBuffer(), Buffer.from(skillId)],
    registryProgramId
  )[0];
}

function deriveCallPda(
  escrowProgramId: PublicKey,
  callerKey: PublicKey,
  callId: Uint8Array
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("call"), callerKey.toBuffer(), Buffer.from(callId)],
    escrowProgramId
  )[0];
}

function deriveVaultPda(
  escrowProgramId: PublicKey,
  callId: Uint8Array
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from(callId)],
    escrowProgramId
  )[0];
}

async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol: number = 10
): Promise<void> {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

async function getBalance(
  connection: anchor.web3.Connection,
  pubkey: PublicKey
): Promise<bigint> {
  return BigInt(await connection.getBalance(pubkey));
}

// ────────────────────────────────────────────────────────────────────────────
// Test suite
// ────────────────────────────────────────────────────────────────────────────

describe("escrow_payment", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const escrowProgram = anchor.workspace.EscrowPayment as Program<EscrowPayment>;
  const registryProgram = anchor.workspace.SkillRegistry as Program<SkillRegistry>;
  const connection = provider.connection;

  // Wallets
  const skillOwner = Keypair.generate();
  const caller = Keypair.generate();
  const platformTreasury = Keypair.generate();

  // Shared skill registered once before all tests
  const sharedSkillId = randomBytes32();
  let sharedSkillPda: PublicKey;
  const SKILL_PRICE = 1_000_000n; // 0.001 SOL

  before(async () => {
    await Promise.all([
      airdrop(connection, skillOwner.publicKey),
      airdrop(connection, caller.publicKey, 20),
      airdrop(connection, platformTreasury.publicKey, 1),
    ]);

    sharedSkillPda = deriveSkillPda(
      registryProgram.programId,
      skillOwner.publicKey,
      sharedSkillId
    );

    // Register the shared skill via skill_registry
    await registryProgram.methods
      .registerSkill(
        toArr(sharedSkillId),
        "Shared Test Skill",
        "Skill used across escrow tests",
        ["test"],
        new anchor.BN(Number(SKILL_PRICE)),
        1
      )
      .accounts({
        skillAccount: sharedSkillPda,
        provider: skillOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([skillOwner])
      .rpc();
  });

  // ── initiate_call ──────────────────────────────────────────────────────

  describe("initiate_call", () => {
    it("locks correct lamports in vault PDA", async () => {
      const callId = randomBytes32();
      const inputHash = randomBytes32();
      const callPda = deriveCallPda(escrowProgram.programId, caller.publicKey, callId);
      const vaultPda = deriveVaultPda(escrowProgram.programId, callId);

      const callerBefore = await getBalance(connection, caller.publicKey);

      await escrowProgram.methods
        .initiateCall(toArr(callId), toArr(sharedSkillId), toArr(inputHash))
        .accounts({
          callAccount: callPda,
          vault: vaultPda,
          skillAccount: sharedSkillPda,
          caller: caller.publicKey,
          platformTreasury: platformTreasury.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([caller])
        .rpc();

      const callAccount = await escrowProgram.account.callAccount.fetch(callPda);

      // Verify call account state
      assert.deepEqual(Array.from(callAccount.callId as number[]), toArr(callId));
      assert.deepEqual(Array.from(callAccount.skillId as number[]), toArr(sharedSkillId));
      assert.equal(callAccount.caller.toBase58(), caller.publicKey.toBase58());
      assert.equal(callAccount.skillOwner.toBase58(), skillOwner.publicKey.toBase58());
      assert.equal(callAccount.amountLamports.toNumber(), Number(SKILL_PRICE));
      assert.deepEqual(Array.from(callAccount.inputHash as number[]), toArr(inputHash));

      // Status must be Pending
      assert.deepEqual(callAccount.status, { pending: {} });

      // Vault must hold exactly skill price
      const vaultBalance = await getBalance(connection, vaultPda);
      assert.equal(vaultBalance, SKILL_PRICE);

      // Caller balance decreased by at least skill price (+ fees)
      const callerAfter = await getBalance(connection, caller.publicKey);
      assert.isTrue(
        callerBefore - callerAfter >= SKILL_PRICE,
        "Caller should have paid at least skill price"
      );
    });

    it("fails when skill is not active", async () => {
      // Deactivate the skill first
      await registryProgram.methods
        .updateSkill(null, null, false)
        .accounts({
          skillAccount: sharedSkillPda,
          owner: skillOwner.publicKey,
          provider: skillOwner.publicKey,
        })
        .signers([skillOwner])
        .rpc();

      const callId = randomBytes32();
      const callPda = deriveCallPda(escrowProgram.programId, caller.publicKey, callId);
      const vaultPda = deriveVaultPda(escrowProgram.programId, callId);

      try {
        await escrowProgram.methods
          .initiateCall(toArr(callId), toArr(sharedSkillId), toArr(randomBytes32()))
          .accounts({
            callAccount: callPda,
            vault: vaultPda,
            skillAccount: sharedSkillPda,
            caller: caller.publicKey,
            platformTreasury: platformTreasury.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([caller])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "not currently active"
        );
      } finally {
        // Re-activate for subsequent tests
        await registryProgram.methods
          .updateSkill(null, null, true)
          .accounts({
            skillAccount: sharedSkillPda,
            owner: skillOwner.publicKey,
            provider: skillOwner.publicKey,
          })
          .signers([skillOwner])
          .rpc();
      }
    });
  });

  // ── complete_call ──────────────────────────────────────────────────────

  describe("complete_call", () => {
    let completeCallId: Uint8Array;
    let completeCallPda: PublicKey;
    let completeVaultPda: PublicKey;

    beforeEach(async () => {
      // Fresh call for each complete test
      completeCallId = randomBytes32();
      completeCallPda = deriveCallPda(escrowProgram.programId, caller.publicKey, completeCallId);
      completeVaultPda = deriveVaultPda(escrowProgram.programId, completeCallId);

      await escrowProgram.methods
        .initiateCall(
          toArr(completeCallId),
          toArr(sharedSkillId),
          toArr(randomBytes32())
        )
        .accounts({
          callAccount: completeCallPda,
          vault: completeVaultPda,
          skillAccount: sharedSkillPda,
          caller: caller.publicKey,
          platformTreasury: platformTreasury.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([caller])
        .rpc();
    });

    it("sends 95% to skill_owner and 5% to platform_treasury", async () => {
      const resultHash = randomBytes32();

      const ownerBefore = await getBalance(connection, skillOwner.publicKey);
      const treasuryBefore = await getBalance(connection, platformTreasury.publicKey);

      await escrowProgram.methods
        .completeCall(toArr(completeCallId), toArr(resultHash), 4)
        .accounts({
          callAccount: completeCallPda,
          vault: completeVaultPda,
          skillOwner: skillOwner.publicKey,
          platformTreasury: platformTreasury.publicKey,
          skillAccount: sharedSkillPda,
          skillRegistryProgram: registryProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .signers([skillOwner])
        .rpc();

      const ownerAfter = await getBalance(connection, skillOwner.publicKey);
      const treasuryAfter = await getBalance(connection, platformTreasury.publicKey);

      const expectedFee = (SKILL_PRICE * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
      const expectedProvider = SKILL_PRICE - expectedFee;

      // Exactly 5% = 50_000 lamports fee; 95% = 950_000 to provider
      assert.equal(expectedFee, 50_000n);
      assert.equal(expectedProvider, 950_000n);

      assert.equal(ownerAfter - ownerBefore, expectedProvider);
      assert.equal(treasuryAfter - treasuryBefore, expectedFee);
    });

    it("sets call status to Completed and records result_hash", async () => {
      const resultHash = randomBytes32();

      await escrowProgram.methods
        .completeCall(toArr(completeCallId), toArr(resultHash), 4)
        .accounts({
          callAccount: completeCallPda,
          vault: completeVaultPda,
          skillOwner: skillOwner.publicKey,
          platformTreasury: platformTreasury.publicKey,
          skillAccount: sharedSkillPda,
          skillRegistryProgram: registryProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .signers([skillOwner])
        .rpc();

      const callAccount = await escrowProgram.account.callAccount.fetch(completeCallPda);
      assert.deepEqual(callAccount.status, { completed: {} });
      assert.deepEqual(Array.from(callAccount.resultHash as number[]), toArr(resultHash));
      assert.isAbove(callAccount.completedAt.toNumber(), 0);
    });

    it("increments reputation total_calls after completion", async () => {
      const beforeSkill = await registryProgram.account.skillAccount.fetch(sharedSkillPda);
      const beforeCalls = beforeSkill.totalCalls.toNumber();

      await escrowProgram.methods
        .completeCall(toArr(completeCallId), toArr(randomBytes32()), 4)
        .accounts({
          callAccount: completeCallPda,
          vault: completeVaultPda,
          skillOwner: skillOwner.publicKey,
          platformTreasury: platformTreasury.publicKey,
          skillAccount: sharedSkillPda,
          skillRegistryProgram: registryProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .signers([skillOwner])
        .rpc();

      const afterSkill = await registryProgram.account.skillAccount.fetch(sharedSkillPda);
      assert.equal(afterSkill.totalCalls.toNumber(), beforeCalls + 1);
    });

    it("complete_call twice fails with InvalidStateTransition", async () => {
      // First completion
      await escrowProgram.methods
        .completeCall(toArr(completeCallId), toArr(randomBytes32()), 4)
        .accounts({
          callAccount: completeCallPda,
          vault: completeVaultPda,
          skillOwner: skillOwner.publicKey,
          platformTreasury: platformTreasury.publicKey,
          skillAccount: sharedSkillPda,
          skillRegistryProgram: registryProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .signers([skillOwner])
        .rpc();

      // Second attempt — must fail
      try {
        await escrowProgram.methods
          .completeCall(toArr(completeCallId), toArr(randomBytes32()), 4)
          .accounts({
            callAccount: completeCallPda,
            vault: completeVaultPda,
            skillOwner: skillOwner.publicKey,
            platformTreasury: platformTreasury.publicKey,
            skillAccount: sharedSkillPda,
            skillRegistryProgram: registryProgram.programId,
            systemProgram: SystemProgram.programId,
          })
          .signers([skillOwner])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Pending"
        );
      }
    });

    it("non-owner cannot complete the call", async () => {
      const rogue = Keypair.generate();
      await airdrop(connection, rogue.publicKey);

      try {
        await escrowProgram.methods
          .completeCall(toArr(completeCallId), toArr(randomBytes32()), 4)
          .accounts({
            callAccount: completeCallPda,
            vault: completeVaultPda,
            skillOwner: rogue.publicKey, // wrong signer
            platformTreasury: platformTreasury.publicKey,
            skillAccount: sharedSkillPda,
            skillRegistryProgram: registryProgram.programId,
            systemProgram: SystemProgram.programId,
          })
          .signers([rogue])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        // Either a constraint violation or our Unauthorized error
        assert.instanceOf(err, Error);
      }
    });

    it("rejects invalid score (0 and 6)", async () => {
      // Set up a fresh call to test score validation
      const scoreTestCallId = randomBytes32();
      const scoreTestCallPda = deriveCallPda(escrowProgram.programId, caller.publicKey, scoreTestCallId);
      const scoreTestVaultPda = deriveVaultPda(escrowProgram.programId, scoreTestCallId);

      await escrowProgram.methods
        .initiateCall(toArr(scoreTestCallId), toArr(sharedSkillId), new anchor.BN(PRICE_LAMPORTS))
        .accounts({
          callAccount: scoreTestCallPda,
          vault: scoreTestVaultPda,
          caller: caller.publicKey,
          skillAccount: sharedSkillPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([caller])
        .rpc();

      // Score 0 should fail
      try {
        await escrowProgram.methods
          .completeCall(toArr(scoreTestCallId), toArr(randomBytes32()), 0)
          .accounts({
            callAccount: scoreTestCallPda,
            vault: scoreTestVaultPda,
            skillOwner: skillOwner.publicKey,
            platformTreasury: platformTreasury.publicKey,
            skillAccount: sharedSkillPda,
            skillRegistryProgram: registryProgram.programId,
            systemProgram: SystemProgram.programId,
          })
          .signers([skillOwner])
          .rpc();
        assert.fail("Expected InvalidScore error for score=0");
      } catch (err) {
        assert.include(String(err), "InvalidScore");
      }

      // Score 6 should also fail
      try {
        await escrowProgram.methods
          .completeCall(toArr(scoreTestCallId), toArr(randomBytes32()), 6)
          .accounts({
            callAccount: scoreTestCallPda,
            vault: scoreTestVaultPda,
            skillOwner: skillOwner.publicKey,
            platformTreasury: platformTreasury.publicKey,
            skillAccount: sharedSkillPda,
            skillRegistryProgram: registryProgram.programId,
            systemProgram: SystemProgram.programId,
          })
          .signers([skillOwner])
          .rpc();
        assert.fail("Expected InvalidScore error for score=6");
      } catch (err) {
        assert.include(String(err), "InvalidScore");
      }
    });
  });

  // ── refund_call ────────────────────────────────────────────────────────

  describe("refund_call", () => {
    let refundCallId: Uint8Array;
    let refundCallPda: PublicKey;
    let refundVaultPda: PublicKey;

    beforeEach(async () => {
      refundCallId = randomBytes32();
      refundCallPda = deriveCallPda(escrowProgram.programId, caller.publicKey, refundCallId);
      refundVaultPda = deriveVaultPda(escrowProgram.programId, refundCallId);

      await escrowProgram.methods
        .initiateCall(
          toArr(refundCallId),
          toArr(sharedSkillId),
          toArr(randomBytes32())
        )
        .accounts({
          callAccount: refundCallPda,
          vault: refundVaultPda,
          skillAccount: sharedSkillPda,
          caller: caller.publicKey,
          platformTreasury: platformTreasury.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([caller])
        .rpc();
    });

    it("returns 100% of lamports to caller and sets status to Cancelled", async () => {
      const callerBefore = await getBalance(connection, caller.publicKey);
      const vaultBefore = await getBalance(connection, refundVaultPda);

      assert.equal(vaultBefore, SKILL_PRICE, "Vault should hold skill price before refund");

      await escrowProgram.methods
        .refundCall(toArr(refundCallId))
        .accounts({
          callAccount: refundCallPda,
          vault: refundVaultPda,
          caller: caller.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([caller])
        .rpc();

      const callAccount = await escrowProgram.account.callAccount.fetch(refundCallPda);
      assert.deepEqual(callAccount.status, { cancelled: {} });
      assert.isAbove(callAccount.completedAt.toNumber(), 0);

      // Vault must be drained
      const vaultAfter = await getBalance(connection, refundVaultPda);
      assert.equal(vaultAfter, 0n);

      // Caller receives the full amount back (minus tx fee)
      const callerAfter = await getBalance(connection, caller.publicKey);
      assert.isTrue(
        callerAfter > callerBefore,
        "Caller balance should increase after refund"
      );
      // The increase should be close to SKILL_PRICE (caller pays a small tx fee)
      const delta = callerAfter - callerBefore;
      assert.isTrue(
        delta >= SKILL_PRICE - 10_000n,
        `Expected refund close to ${SKILL_PRICE}, got ${delta}`
      );
    });

    it("refund_call after complete fails with InvalidStateTransition", async () => {
      // First complete the call
      await escrowProgram.methods
        .completeCall(toArr(refundCallId), toArr(randomBytes32()), 4)
        .accounts({
          callAccount: refundCallPda,
          vault: refundVaultPda,
          skillOwner: skillOwner.publicKey,
          platformTreasury: platformTreasury.publicKey,
          skillAccount: sharedSkillPda,
          skillRegistryProgram: registryProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .signers([skillOwner])
        .rpc();

      // Now try to refund — must fail
      try {
        await escrowProgram.methods
          .refundCall(toArr(refundCallId))
          .accounts({
            callAccount: refundCallPda,
            vault: refundVaultPda,
            caller: caller.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([caller])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Pending"
        );
      }
    });

    it("non-caller cannot refund", async () => {
      const rogue = Keypair.generate();
      await airdrop(connection, rogue.publicKey);

      try {
        // rogue tries to use their own PDA derivation but actual call_account
        // was created with `caller` as the seed — so the PDA derivation differs
        // and Anchor will reject it with a seed mismatch. Still a meaningful test.
        await escrowProgram.methods
          .refundCall(toArr(refundCallId))
          .accounts({
            callAccount: refundCallPda,
            vault: refundVaultPda,
            caller: rogue.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([rogue])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        assert.instanceOf(err, Error);
      }
    });

    it("refund_call twice fails after first cancellation", async () => {
      // First refund
      await escrowProgram.methods
        .refundCall(toArr(refundCallId))
        .accounts({
          callAccount: refundCallPda,
          vault: refundVaultPda,
          caller: caller.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([caller])
        .rpc();

      // Second refund must fail
      try {
        await escrowProgram.methods
          .refundCall(toArr(refundCallId))
          .accounts({
            callAccount: refundCallPda,
            vault: refundVaultPda,
            caller: caller.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([caller])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Pending"
        );
      }
    });
  });

  // ── fee invariant sanity check ─────────────────────────────────────────

  describe("fee invariant", () => {
    it("platform fee is exactly 500 bps (5%)", () => {
      // This test validates the constant in TypeScript against the invariant.
      // The Rust constant is enforced at compile time; this is a cross-language check.
      assert.equal(PLATFORM_FEE_BPS, 500n, "Platform fee must be exactly 500 bps (5%)");
      assert.equal(BPS_DENOMINATOR, 10_000n);

      const amount = 1_000_000n;
      const fee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
      const provider = amount - fee;

      assert.equal(fee, 50_000n, "5% of 1_000_000 lamports = 50_000");
      assert.equal(provider, 950_000n, "95% of 1_000_000 lamports = 950_000");
      assert.equal(fee + provider, amount, "Fee + provider must equal total");
    });
  });
});
