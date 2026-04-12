/**
 * Shared types for the SWARM plugin.
 * These are intentionally lean — never include endpoint, system_prompt, or tool_config.
 */

export interface SkillPublic {
  id: string
  skill_id_bytes: number[] // 32-byte on-chain skill_id, serialised as number[]
  name: string
  description: string
  tags: string[]
  price_lamports: number
  reputation_score: number // 0–1000
  total_calls: number
  tier: number // 1 | 2 | 3
  owner_pubkey: string
  is_active: boolean
}

export interface PrepareCallResponse {
  callId: string // hex string matching on-chain call_id
  unsignedTx: string // base64-encoded serialised transaction
  priceLamports: number
}

export interface ExecuteCallResponse {
  callId: string
  status: 'processing' | 'completed' | 'failed'
  result?: string
}

export interface CallEventPayload {
  callId: string
  status: 'completed' | 'failed'
  result?: string
  error?: string
}

/** Shape of a deserialized on-chain CallAccount (matches escrow_payment program). */
export interface CallAccountData {
  callId: Uint8Array // [u8;32]
  skillId: Uint8Array // [u8;32]
  caller: string // base58 pubkey
  skillOwner: string // base58 pubkey
  amountLamports: bigint
  inputHash: Uint8Array
  resultHash: Uint8Array
  status: 0 | 1 | 2 // 0=Pending, 1=Completed, 2=Cancelled
  createdAt: bigint
  completedAt: bigint
  bump: number
}

export interface SwarmEnv {
  agentWalletKeypair: string // base58 private key from AGENT_WALLET_KEYPAIR
  marketplaceUrl: string // SWARM_MARKETPLACE_URL
  heliusGrpcUrl: string // HELIUS_GRPC_URL
  solanaRpcUrl: string // SOLANA_RPC_URL
  escrowProgramId: string // ESCROW_PROGRAM_ID
  skillRegistryProgramId: string // SKILL_REGISTRY_PROGRAM_ID
  platformTreasury: string // PLATFORM_TREASURY
  mySkillId?: string // MY_SKILL_ID — hex string, only needed for LISTEN action
}

export function loadEnv(): SwarmEnv {
  const required = [
    'AGENT_WALLET_KEYPAIR',
    'SWARM_MARKETPLACE_URL',
    'HELIUS_GRPC_URL',
    'SOLANA_RPC_URL',
    'ESCROW_PROGRAM_ID',
    'SKILL_REGISTRY_PROGRAM_ID',
    'PLATFORM_TREASURY',
  ]
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`[plugin-swarm] Missing required env var: ${key}`)
    }
  }
  return {
    agentWalletKeypair: process.env.AGENT_WALLET_KEYPAIR!,
    marketplaceUrl: process.env.SWARM_MARKETPLACE_URL!,
    heliusGrpcUrl: process.env.HELIUS_GRPC_URL!,
    solanaRpcUrl: process.env.SOLANA_RPC_URL!,
    escrowProgramId: process.env.ESCROW_PROGRAM_ID!,
    skillRegistryProgramId: process.env.SKILL_REGISTRY_PROGRAM_ID!,
    platformTreasury: process.env.PLATFORM_TREASURY!,
    mySkillId: process.env.MY_SKILL_ID,
  }
}

/** Decode a base58 private key into a Uint8Array secret key. */
export function decodeKeypair(base58Key: string): Uint8Array {
  // Dynamic import bs58 to keep the module tree clean.
  // Callers already import from 'bs58' directly where needed.
  throw new Error('Use bs58.decode(base58Key) at the call site')
}
