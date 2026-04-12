/**
 * Server-side Solana transaction builders.
 *
 * These functions construct unsigned transactions that are returned as base64
 * strings to the browser. The client (Phantom / Solflare) signs them and
 * broadcasts, or POSTs them back to /api/call/execute for server-side broadcast.
 *
 * No wallet signer is required here — feePayer is set to the caller's pubkey
 * so the wallet can sign without any server-side key material.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  getRpcConnection,
  deriveSkillPda,
  deriveCallPda,
  SKILL_REGISTRY_PROGRAM_ID,
  ESCROW_PROGRAM_ID,
  PLATFORM_TREASURY,
  PLATFORM_FEE_BPS,
  validateSolanaEnv,
} from '@/lib/solana'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuidToBuffer(uuid: string): Buffer {
  // Strip hyphens and convert hex to a 16-byte Buffer
  const hex = uuid.replace(/-/g, '')
  return Buffer.from(hex, 'hex')
}

async function buildBaseTx(
  connection: Connection,
  feePayer: PublicKey
): Promise<Transaction> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed')
  const tx = new Transaction()
  tx.recentBlockhash = blockhash
  tx.lastValidBlockHeight = lastValidBlockHeight
  tx.feePayer = feePayer
  return tx
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 0.1 SOL registration fee paid to the platform treasury on skill creation. */
const REGISTRATION_FEE_LAMPORTS = 100_000_000

// ---------------------------------------------------------------------------
// register_skill — used by /api/create-skill and /api/register/prepare
// ---------------------------------------------------------------------------

export interface RegisterSkillParams {
  skillId: string       // UUID string
  ownerWallet: string   // base58 pubkey
  name: string
  description: string
  tags: string[]
  priceLamports: number
  tier: 1 | 2 | 3
}

export async function buildRegisterSkillTx(
  params: RegisterSkillParams
): Promise<string> {
  validateSolanaEnv()
  const connection = getRpcConnection()
  const owner = new PublicKey(params.ownerWallet)
  const skillIdBuffer = uuidToBuffer(params.skillId)
  const [skillPda] = deriveSkillPda(owner, skillIdBuffer)

  // Encode instruction data with a simple borsh-like layout.
  // Discriminator = sha256("global:register_skill")[0..8]
  // For MVP we use a manually assembled buffer; replace with generated IDL
  // client once the Anchor IDL is available in Phase 2.
  const discriminator = Buffer.from([131, 157, 23, 197, 87, 216, 30, 202])

  const nameBytes = Buffer.from(params.name, 'utf8')
  const descBytes = Buffer.from(params.description, 'utf8')
  const tagsJoined = params.tags.join(',')
  const tagsBytes = Buffer.from(tagsJoined, 'utf8')

  // Layout: discriminator(8) + skillId(16) + tier(1) + priceLamports(8) +
  //         name_len(4) + name + description_len(4) + desc + tags_len(4) + tags
  const data = Buffer.concat([
    discriminator,
    skillIdBuffer,
    Buffer.from([params.tier]),
    (() => {
      const b = Buffer.alloc(8)
      b.writeBigUInt64LE(BigInt(params.priceLamports))
      return b
    })(),
    (() => { const b = Buffer.alloc(4); b.writeUInt32LE(nameBytes.length); return b })(),
    nameBytes,
    (() => { const b = Buffer.alloc(4); b.writeUInt32LE(descBytes.length); return b })(),
    descBytes,
    (() => { const b = Buffer.alloc(4); b.writeUInt32LE(tagsBytes.length); return b })(),
    tagsBytes,
  ])

  const ix = new TransactionInstruction({
    programId: SKILL_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: owner,              isSigner: true,  isWritable: true  },
      { pubkey: skillPda,           isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  const tx = await buildBaseTx(connection, owner)

  // Registration fee: 0.1 SOL → platform treasury (atomic with skill registration)
  tx.add(
    SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: PLATFORM_TREASURY,
      lamports: REGISTRATION_FEE_LAMPORTS,
    })
  )
  tx.add(ix)

  // partialSign is skipped — client will sign as feePayer
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
}

// ---------------------------------------------------------------------------
// initiate_call — used by /api/call/prepare
// ---------------------------------------------------------------------------

export interface InitiateCallParams {
  callId: string        // UUID string
  skillId: string       // UUID string
  callerWallet: string  // base58 pubkey
  skillOwner: string    // base58 pubkey — to fund escrow destination
  priceLamports: number
}

export async function buildInitiateCallTx(
  params: InitiateCallParams
): Promise<string> {
  const connection = getRpcConnection()
  const caller = new PublicKey(params.callerWallet)
  const skillOwner = new PublicKey(params.skillOwner)
  const skillIdBuffer = uuidToBuffer(params.skillId)
  const callIdBuffer = uuidToBuffer(params.callId)

  // Nonce derived from lower 8 bytes of callId for determinism
  const nonce = callIdBuffer.readBigUInt64LE(0)
  const [callPda] = deriveCallPda(caller, skillIdBuffer, Number(nonce))
  const [skillPda] = deriveSkillPda(skillOwner, skillIdBuffer)

  const discriminator = Buffer.from([214, 161, 95, 81, 91, 249, 14, 24])

  const platformFee = Math.floor((params.priceLamports * PLATFORM_FEE_BPS) / 10000)
  const providerAmount = params.priceLamports - platformFee

  const data = Buffer.concat([
    discriminator,
    callIdBuffer,
    skillIdBuffer,
    (() => {
      const b = Buffer.alloc(8)
      b.writeBigUInt64LE(BigInt(params.priceLamports))
      return b
    })(),
    (() => {
      const b = Buffer.alloc(8)
      b.writeBigUInt64LE(BigInt(providerAmount))
      return b
    })(),
    (() => {
      const b = Buffer.alloc(8)
      b.writeBigUInt64LE(BigInt(platformFee))
      return b
    })(),
  ])

  const ix = new TransactionInstruction({
    programId: ESCROW_PROGRAM_ID,
    keys: [
      { pubkey: caller,                  isSigner: true,  isWritable: true  },
      { pubkey: callPda,                 isSigner: false, isWritable: true  },
      { pubkey: skillPda,                isSigner: false, isWritable: false },
      { pubkey: skillOwner,              isSigner: false, isWritable: true  },
      { pubkey: PLATFORM_TREASURY,       isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  const tx = await buildBaseTx(connection, caller)
  tx.add(ix)

  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
}

// ---------------------------------------------------------------------------
// complete_call — used by /api/call/execute (server signs with platform key)
// ---------------------------------------------------------------------------

export interface CompleteCallParams {
  callId: string
  skillId: string
  callerWallet: string
  skillOwner: string
  resultHash: string   // hex string
}

export async function buildCompleteCallTx(
  params: CompleteCallParams
): Promise<string> {
  const connection = getRpcConnection()
  const caller = new PublicKey(params.callerWallet)
  const skillOwner = new PublicKey(params.skillOwner)
  const skillIdBuffer = uuidToBuffer(params.skillId)
  const callIdBuffer = uuidToBuffer(params.callId)
  const nonce = callIdBuffer.readBigUInt64LE(0)
  const [callPda] = deriveCallPda(caller, skillIdBuffer, Number(nonce))

  const discriminator = Buffer.from([54, 132, 229, 17, 21, 98, 87, 220])
  const resultHashBytes = Buffer.from(params.resultHash, 'hex')

  const data = Buffer.concat([
    discriminator,
    callIdBuffer,
    (() => { const b = Buffer.alloc(4); b.writeUInt32LE(resultHashBytes.length); return b })(),
    resultHashBytes,
  ])

  // Platform treasury acts as the authority to finalize calls
  const ix = new TransactionInstruction({
    programId: ESCROW_PROGRAM_ID,
    keys: [
      { pubkey: PLATFORM_TREASURY,       isSigner: true,  isWritable: true  },
      { pubkey: callPda,                 isSigner: false, isWritable: true  },
      { pubkey: skillOwner,              isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  const tx = await buildBaseTx(connection, PLATFORM_TREASURY)
  tx.add(ix)

  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
}
