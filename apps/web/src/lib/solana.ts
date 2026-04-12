import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import type { AnchorWallet } from '@solana/wallet-adapter-react'

export const SKILL_REGISTRY_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SKILL_REGISTRY_PROGRAM_ID || '11111111111111111111111111111111'
)

export const ESCROW_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID || '11111111111111111111111111111111'
)

export const PLATFORM_TREASURY = new PublicKey(
  process.env.NEXT_PUBLIC_PLATFORM_TREASURY || '11111111111111111111111111111111'
)

export const PLATFORM_FEE_BPS = 500 // 5% — must match on-chain constant

export function getRpcConnection(): Connection {
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl('devnet')
  return new Connection(rpc, 'confirmed')
}

export function getAnchorProvider(wallet: AnchorWallet): AnchorProvider {
  return new AnchorProvider(getRpcConnection(), wallet, {
    commitment: 'confirmed',
  })
}

export function getProgram(idl: Idl, programId: PublicKey, wallet: AnchorWallet): Program {
  return new Program(idl, getAnchorProvider(wallet))
}

export function validateSolanaEnv(): void {
  const required = [
    'NEXT_PUBLIC_SKILL_REGISTRY_PROGRAM_ID',
    'NEXT_PUBLIC_ESCROW_PROGRAM_ID',
    'NEXT_PUBLIC_PLATFORM_TREASURY',
  ] as const
  for (const key of required) {
    const val = process.env[key]
    if (!val || val === '11111111111111111111111111111111') {
      throw new Error(
        `[solana] ${key} is not configured. Set it in .env.local before calling on-chain instructions.`
      )
    }
  }
}

// ── PDA helpers (populated in Phase 2 when IDL is available) ─────────────────

export function deriveSkillPda(provider: PublicKey, skillId: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('skill'), provider.toBuffer(), skillId],
    SKILL_REGISTRY_PROGRAM_ID
  )
}

export function deriveCallPda(
  payer: PublicKey,
  skillId: Buffer,
  nonce: number
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8)
  nonceBuffer.writeBigUInt64LE(BigInt(nonce))
  return PublicKey.findProgramAddressSync(
    [Buffer.from('call'), payer.toBuffer(), skillId, nonceBuffer],
    ESCROW_PROGRAM_ID
  )
}
