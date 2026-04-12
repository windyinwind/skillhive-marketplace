import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { assert } from "chai";
import { SkillRegistry } from "../target/types/skill_registry";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function randomSkillId(): Uint8Array {
  const id = new Uint8Array(32);
  for (let i = 0; i < 32; i++) id[i] = Math.floor(Math.random() * 256);
  return id;
}

function skillIdToArray(id: Uint8Array): number[] {
  return Array.from(id);
}

async function deriveSkillPda(
  program: Program<SkillRegistry>,
  provider: PublicKey,
  skillId: Uint8Array
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("skill"), provider.toBuffer(), Buffer.from(skillId)],
    program.programId
  );
}

async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol: number = 10
): Promise<void> {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

// ────────────────────────────────────────────────────────────────────────────
// Test suite
// ────────────────────────────────────────────────────────────────────────────

describe("skill_registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SkillRegistry as Program<SkillRegistry>;
  const connection = provider.connection;

  // Wallets
  const owner = Keypair.generate();
  const nonOwner = Keypair.generate();

  before(async () => {
    await airdrop(connection, owner.publicKey);
    await airdrop(connection, nonOwner.publicKey);
  });

  // ── register_skill (valid) ─────────────────────────────────────────────

  describe("register_skill", () => {
    it("registers a Tier 1 skill and sets all fields correctly", async () => {
      const skillIdBytes = randomSkillId();
      const skillIdArr = skillIdToArray(skillIdBytes);
      const [skillPda] = await deriveSkillPda(program, owner.publicKey, skillIdBytes);

      await program.methods
        .registerSkill(
          skillIdArr,
          "Price Analysis",
          "Returns current token price with AI analysis",
          ["finance", "price", "defi"],
          new anchor.BN(100_000), // 0.0001 SOL
          1 // Tier 1 = Prompt
        )
        .accounts({
          skillAccount: skillPda,
          provider: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.skillAccount.fetch(skillPda);

      // Core fields
      assert.equal(account.owner.toBase58(), owner.publicKey.toBase58());
      assert.deepEqual(Array.from(account.skillId as number[]), skillIdArr);
      assert.equal(account.name, "Price Analysis");
      assert.equal(account.description, "Returns current token price with AI analysis");
      assert.deepEqual(account.tags, ["finance", "price", "defi"]);
      assert.equal(account.priceLamports.toNumber(), 100_000);
      assert.equal(account.tier, 1);
      assert.equal(account.isActive, true);
      assert.equal(account.totalCalls.toNumber(), 0);

      // Reputation starts at 500 (neutral)
      assert.equal(account.reputationScore, 500);

      // Timestamp set
      assert.isAbove(account.createdAt.toNumber(), 0);

      // CRITICAL: Verify there is absolutely no endpoint field on the account.
      // Any endpoint on-chain would allow competitors to bypass payment via
      // getProgramAccounts. This is the primary security invariant.
      assert.isUndefined(
        (account as any).endpoint,
        "SECURITY VIOLATION: endpoint field must NOT exist on SkillAccount"
      );
      assert.isUndefined(
        (account as any).endpointUrl,
        "SECURITY VIOLATION: endpointUrl field must NOT exist on SkillAccount"
      );
      assert.isUndefined(
        (account as any).url,
        "SECURITY VIOLATION: url field must NOT exist on SkillAccount"
      );
    });

    it("registers a Tier 2 (Tool) skill", async () => {
      const skillIdBytes = randomSkillId();
      const skillIdArr = skillIdToArray(skillIdBytes);
      const [skillPda] = await deriveSkillPda(program, owner.publicKey, skillIdBytes);

      await program.methods
        .registerSkill(
          skillIdArr,
          "Sentiment Scorer",
          "Scores social sentiment for a token",
          ["sentiment", "social", "nlp"],
          new anchor.BN(50_000),
          2 // Tier 2 = Tool
        )
        .accounts({
          skillAccount: skillPda,
          provider: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.skillAccount.fetch(skillPda);
      assert.equal(account.tier, 2);
      assert.equal(account.isActive, true);
    });

    it("registers a Tier 3 (Custom Agent) skill", async () => {
      const skillIdBytes = randomSkillId();
      const skillIdArr = skillIdToArray(skillIdBytes);
      const [skillPda] = await deriveSkillPda(program, owner.publicKey, skillIdBytes);

      await program.methods
        .registerSkill(
          skillIdArr,
          "Custom News Agent",
          "Self-hosted news aggregation agent",
          ["news", "agent"],
          new anchor.BN(200_000),
          3 // Tier 3 = Custom Agent
        )
        .accounts({
          skillAccount: skillPda,
          provider: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.skillAccount.fetch(skillPda);
      assert.equal(account.tier, 3);
    });

    it("fails with NameEmpty when name is empty", async () => {
      const skillIdBytes = randomSkillId();
      const skillIdArr = skillIdToArray(skillIdBytes);
      const [skillPda] = await deriveSkillPda(program, owner.publicKey, skillIdBytes);

      try {
        await program.methods
          .registerSkill(skillIdArr, "", "desc", [], new anchor.BN(100_000), 1)
          .accounts({
            skillAccount: skillPda,
            provider: owner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Skill name cannot be empty"
        );
      }
    });

    it("fails with NameTooLong when name exceeds 64 chars", async () => {
      const skillIdBytes = randomSkillId();
      const skillIdArr = skillIdToArray(skillIdBytes);
      const [skillPda] = await deriveSkillPda(program, owner.publicKey, skillIdBytes);
      const longName = "a".repeat(65);

      try {
        await program.methods
          .registerSkill(skillIdArr, longName, "desc", [], new anchor.BN(100_000), 1)
          .accounts({
            skillAccount: skillPda,
            provider: owner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "exceeds 64 characters"
        );
      }
    });

    it("fails with InvalidTier when tier is 0", async () => {
      const skillIdBytes = randomSkillId();
      const skillIdArr = skillIdToArray(skillIdBytes);
      const [skillPda] = await deriveSkillPda(program, owner.publicKey, skillIdBytes);

      try {
        await program.methods
          .registerSkill(skillIdArr, "Test", "desc", [], new anchor.BN(100_000), 0)
          .accounts({
            skillAccount: skillPda,
            provider: owner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Tier must be 1, 2, or 3"
        );
      }
    });

    it("fails with InvalidTier when tier is 4", async () => {
      const skillIdBytes = randomSkillId();
      const skillIdArr = skillIdToArray(skillIdBytes);
      const [skillPda] = await deriveSkillPda(program, owner.publicKey, skillIdBytes);

      try {
        await program.methods
          .registerSkill(skillIdArr, "Test", "desc", [], new anchor.BN(100_000), 4)
          .accounts({
            skillAccount: skillPda,
            provider: owner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Tier must be 1, 2, or 3"
        );
      }
    });

    it("fails with PriceZero when price is 0", async () => {
      const skillIdBytes = randomSkillId();
      const skillIdArr = skillIdToArray(skillIdBytes);
      const [skillPda] = await deriveSkillPda(program, owner.publicKey, skillIdBytes);

      try {
        await program.methods
          .registerSkill(skillIdArr, "Test", "desc", [], new anchor.BN(0), 1)
          .accounts({
            skillAccount: skillPda,
            provider: owner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Price must be greater than zero"
        );
      }
    });

    it("fails with TooManyTags when more than 8 tags provided", async () => {
      const skillIdBytes = randomSkillId();
      const skillIdArr = skillIdToArray(skillIdBytes);
      const [skillPda] = await deriveSkillPda(program, owner.publicKey, skillIdBytes);
      const tooManyTags = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

      try {
        await program.methods
          .registerSkill(skillIdArr, "Test", "desc", tooManyTags, new anchor.BN(100_000), 1)
          .accounts({
            skillAccount: skillPda,
            provider: owner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Maximum 8 tags allowed"
        );
      }
    });
  });

  // ── update_skill ───────────────────────────────────────────────────────

  describe("update_skill", () => {
    let updateSkillId: Uint8Array;
    let updateSkillPda: PublicKey;

    before(async () => {
      updateSkillId = randomSkillId();
      [updateSkillPda] = await deriveSkillPda(program, owner.publicKey, updateSkillId);

      await program.methods
        .registerSkill(
          skillIdToArray(updateSkillId),
          "Update Test Skill",
          "Original description",
          ["tag1"],
          new anchor.BN(100_000),
          1
        )
        .accounts({
          skillAccount: updateSkillPda,
          provider: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
    });

    it("owner can update description", async () => {
      await program.methods
        .updateSkill("New description", null, null)
        .accounts({
          skillAccount: updateSkillPda,
          owner: owner.publicKey,
          provider: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.skillAccount.fetch(updateSkillPda);
      assert.equal(account.description, "New description");
    });

    it("owner can update price", async () => {
      await program.methods
        .updateSkill(null, new anchor.BN(200_000), null)
        .accounts({
          skillAccount: updateSkillPda,
          owner: owner.publicKey,
          provider: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.skillAccount.fetch(updateSkillPda);
      assert.equal(account.priceLamports.toNumber(), 200_000);
    });

    it("owner can deactivate skill", async () => {
      await program.methods
        .updateSkill(null, null, false)
        .accounts({
          skillAccount: updateSkillPda,
          owner: owner.publicKey,
          provider: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.skillAccount.fetch(updateSkillPda);
      assert.equal(account.isActive, false);
    });

    it("owner can re-activate skill", async () => {
      await program.methods
        .updateSkill(null, null, true)
        .accounts({
          skillAccount: updateSkillPda,
          owner: owner.publicKey,
          provider: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.skillAccount.fetch(updateSkillPda);
      assert.equal(account.isActive, true);
    });

    it("non-owner fails with ConstraintHasOne / Unauthorized", async () => {
      // nonOwner does not own this skill — must not be able to update it
      try {
        await program.methods
          .updateSkill("Hacked description", null, null)
          .accounts({
            skillAccount: updateSkillPda,
            owner: nonOwner.publicKey,
            provider: owner.publicKey, // provider still the real owner key for PDA seed
          })
          .signers([nonOwner])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        // Anchor's has_one produces a ConstraintHasOne error (code 2001)
        // or our custom Unauthorized error — either is acceptable.
        const anchorErr = err as AnchorError;
        const isHasOne = anchorErr.error?.errorCode?.code === "ConstraintHasOne";
        const isUnauthorized = anchorErr.error?.errorMessage?.includes("Unauthorized") ||
          anchorErr.error?.errorMessage?.includes("Only the skill owner");
        assert.isTrue(
          isHasOne || isUnauthorized,
          `Expected ConstraintHasOne or Unauthorized, got: ${JSON.stringify(anchorErr.error)}`
        );
      }
    });

    it("fails with PriceZero when update price is 0", async () => {
      try {
        await program.methods
          .updateSkill(null, new anchor.BN(0), null)
          .accounts({
            skillAccount: updateSkillPda,
            owner: owner.publicKey,
            provider: owner.publicKey,
          })
          .signers([owner])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Price must be greater than zero"
        );
      }
    });
  });

  // ── update_reputation ──────────────────────────────────────────────────

  describe("update_reputation", () => {
    let repSkillId: Uint8Array;
    let repSkillPda: PublicKey;
    // A dummy authority keypair — in production this is the escrow program via CPI.
    // For unit tests we sign directly.
    const repAuthority = Keypair.generate();

    before(async () => {
      await airdrop(connection, repAuthority.publicKey);

      repSkillId = randomSkillId();
      [repSkillPda] = await deriveSkillPda(program, owner.publicKey, repSkillId);

      await program.methods
        .registerSkill(
          skillIdToArray(repSkillId),
          "Reputation Test Skill",
          "Used to test reputation updates",
          ["test"],
          new anchor.BN(100_000),
          1
        )
        .accounts({
          skillAccount: repSkillPda,
          provider: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
    });

    it("updates reputation score and increments total_calls", async () => {
      const before = await program.account.skillAccount.fetch(repSkillPda);
      assert.equal(before.reputationScore, 500);
      assert.equal(before.totalCalls.toNumber(), 0);

      await program.methods
        .updateReputation(4) // 4-star rating = 800/1000
        .accounts({
          skillAccount: repSkillPda,
          authority: repAuthority.publicKey,
        })
        .signers([repAuthority])
        .rpc();

      const after = await program.account.skillAccount.fetch(repSkillPda);
      assert.equal(after.totalCalls.toNumber(), 1);

      // First call: ((500 * 0) + (4 * 200)) / 1 = 800
      assert.equal(after.reputationScore, 800);
    });

    it("second call averages the score", async () => {
      // After first call: score=800, totalCalls=1
      await program.methods
        .updateReputation(2) // 2-star = 400
        .accounts({
          skillAccount: repSkillPda,
          authority: repAuthority.publicKey,
        })
        .signers([repAuthority])
        .rpc();

      const after = await program.account.skillAccount.fetch(repSkillPda);
      assert.equal(after.totalCalls.toNumber(), 2);

      // ((800 * 1) + 400) / 2 = 1200 / 2 = 600
      assert.equal(after.reputationScore, 600);
    });

    it("fails with InvalidScore when score is 0", async () => {
      try {
        await program.methods
          .updateReputation(0)
          .accounts({
            skillAccount: repSkillPda,
            authority: repAuthority.publicKey,
          })
          .signers([repAuthority])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Reputation score must be between 1 and 5"
        );
      }
    });

    it("fails with InvalidScore when score is 6", async () => {
      try {
        await program.methods
          .updateReputation(6)
          .accounts({
            skillAccount: repSkillPda,
            authority: repAuthority.publicKey,
          })
          .signers([repAuthority])
          .rpc();
        assert.fail("Expected error was not thrown");
      } catch (err) {
        const anchorErr = err as AnchorError;
        assert.include(
          anchorErr.error.errorMessage,
          "Reputation score must be between 1 and 5"
        );
      }
    });
  });
});
