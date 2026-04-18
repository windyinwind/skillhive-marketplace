---
description: Solana web3.js v2 + Anchor 0.30.x patterns for SkillHive. Use when writing smart contracts, transaction builders, account fetchers, or any Solana on-chain interaction in this project.
---

# Solana + Anchor Patterns for SkillHive

## Stack Versions

- `@solana/web3.js` v2 (new functional API — NOT the legacy class-based v1)
- `@coral-xyz/anchor` 0.30.x
- Rust 1.79+ / Anchor CLI 0.30.x

---

## web3.js v2 — Key Differences from v1

web3.js v2 uses a **functional API** — no more `new Connection()` class style.

```typescript
// v2 imports (use these)
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  address,
  lamports,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
} from '@solana/web3.js'

// v1 (DO NOT use)
// import { Connection, PublicKey, Transaction } from '@solana/web3.js'
```

### RPC Connection (v2)

```typescript
const rpc = createSolanaRpc(process.env.NEXT_PUBLIC_SOLANA_RPC!)
const rpcSubscriptions = createSolanaRpcSubscriptions(process.env.NEXT_PUBLIC_SOLANA_WS!)
```

### Address (v2)

```typescript
import { address } from '@solana/web3.js'
// address() is the v2 equivalent of new PublicKey()
const programId = address('YourProgramId...')
```

---

## Anchor 0.30.x Patterns

### Program Setup

```typescript
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'

function useProgram() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  const provider = new AnchorProvider(connection, wallet!, {
    commitment: 'confirmed',
  })

  return new Program(IDL as Idl, provider)
}
```

### Fetch All Accounts

```typescript
// Fetch all SkillAccounts (used by indexer + plugin)
const skills = await program.account.skillAccount.all()

// Fetch with filter (memcmp on provider field)
const mySkills = await program.account.skillAccount.all([
  {
    memcmp: {
      offset: 8, // skip discriminator
      bytes: wallet.publicKey.toBase58(),
    },
  },
])
```

### PDA Derivation

```typescript
import { PublicKey } from '@coral-xyz/anchor'

// Skill PDA: ["skill", provider, skill_id]
const [skillPda, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('skill'),
    provider.toBuffer(),
    Buffer.from(skillId), // [u8; 32]
  ],
  SKILL_REGISTRY_PROGRAM_ID
)

// Call PDA: ["call", payer, skill_id, nonce]
const [callPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('call'),
    payer.toBuffer(),
    Buffer.from(skillId),
    Buffer.from(nonce.toString()),
  ],
  ESCROW_PROGRAM_ID
)
```

### Send Transaction (Anchor + wallet adapter)

```typescript
const tx = await program.methods
  .registerSkill(skillIdBytes, priceLamports, tags, tier)
  .accounts({
    skillAccount: skillPda,
    provider: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .transaction()

// Get blockhash
const { blockhash } = await connection.getLatestBlockhash()
tx.recentBlockhash = blockhash
tx.feePayer = wallet.publicKey

// Sign with Phantom (browser)
const signed = await wallet.signTransaction(tx)
const sig = await connection.sendRawTransaction(signed.serialize())
await connection.confirmTransaction(sig, 'confirmed')
```

---

## SkillHive-Specific Account Structures

### SkillAccount (on-chain — NO endpoint field)

```typescript
interface SkillAccount {
  provider: PublicKey      // skill owner's wallet
  skillId: number[]        // [u8; 32] — unique identifier
  priceLamports: BN        // cost per call
  reputationScore: BN      // 0–10000 (basis points)
  totalCalls: BN           // all-time call count
  tier: number             // 1, 2, or 3
  tags: string[]           // capability tags
  bump: number             // PDA bump
  // NO endpoint field — stored in Supabase only
}
```

### CallAccount (on-chain)

```typescript
interface CallAccount {
  skillId: number[]        // [u8; 32]
  payer: PublicKey         // caller's wallet
  provider: PublicKey      // skill provider
  priceLamports: BN        // amount in escrow
  status: CallStatus       // Pending | Completed | Cancelled
  resultHash: number[]     // [u8; 32] sha256 of result
  createdAt: BN            // unix timestamp
  completedAt: BN | null
  bump: number
}

enum CallStatus { Pending = 0, Completed = 1, Cancelled = 2 }
```

---

## Platform Fee Calculation

Always use 500 bps (5%) — matches the on-chain constant.

```typescript
const PLATFORM_FEE_BPS = 500
const fee = (priceLamports * PLATFORM_FEE_BPS) / 10_000
const providerAmount = priceLamports - fee
// fee goes to NEXT_PUBLIC_PLATFORM_TREASURY
// providerAmount goes to skill provider
```

---

## Agent-to-Agent Call Detection (Path B — Yellowstone gRPC)

Path B uses **Yellowstone gRPC** (via Helius) for real-time `CallAccount` detection — not `getProgramAccounts` polling. The gRPC subscription pushes events immediately when a new PDA is created.

```typescript
// Yellowstone gRPC subscription — fires in real-time on new CallAccounts
// HELIUS_GRPC_URL env var provides the endpoint (from Helius dashboard)
const stream = await yellowstoneClient.subscribe({
  accounts: {
    skillhive: {
      account: [],
      filters: [{
        memcmp: {
          offset: 8,            // after discriminator
          data: mySkillIdBase58 // filter to own skill only
        }
      }]
    }
  }
})

stream.on('data', (data) => {
  // CallAccount PDA created or updated — deserialize and check status
  const call = deserializeCallAccount(data.account.data)
  if (call.status === CallStatus.Pending) processCall(call)
})
```

For indexer-style reads (non-realtime, e.g. dashboard or historical queries), `getProgramAccounts` is still fine:

```typescript
// Fetch all SkillAccounts for browsing/listing
const skills = await program.account.skillAccount.all()

// Fetch with filter (memcmp on provider field)
const mySkills = await program.account.skillAccount.all([
  { memcmp: { offset: 8, bytes: wallet.publicKey.toBase58() } }
])
```

---

## Devnet Setup

```bash
# Airdrop SOL for testing
solana airdrop 2 <wallet-address> --url devnet

# Check balance
solana balance <wallet-address> --url devnet

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID after deploy
solana address -k target/deploy/skill_registry-keypair.json
```

---

## Explorer Links

```typescript
// Always log Explorer links when sending transactions
const explorerUrl = `https://explorer.solana.com/tx/${sig}?cluster=devnet`
console.log(`TX: ${explorerUrl}`)
```
