/**
 * COMPLETE action — Path B (Agent-to-Agent, on-chain settlement).
 *
 * Builds and submits the `complete_call` instruction on-chain after processing
 * a skill call. Called by the LISTEN action handler when it finishes processing
 * a pending CallAccount.
 *
 * On-chain instruction accounts (escrow_payment::complete_call):
 *   - call_account PDA  ["call", caller, call_id]
 *   - vault PDA         ["vault", call_id]
 *   - skill_owner (signer — this agent's keypair)
 *   - platform_treasury (writable, from env)
 *   - skill_account PDA ["skill", skill_owner, skill_id]
 *   - skill_registry_program
 *   - system_program
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { createHash } from 'crypto'
import { getAgentKeypair } from '../wallet.js'

export interface CompleteInput {
  callId: string // 32-byte call id as hex string
  result: string // raw result string
  callerPubkey: string // base58 pubkey of the original caller (needed for PDA derivation)
  skillId: string // 32-byte skill id as hex string
}

function extractInput(_runtime: IAgentRuntime, message: Memory): CompleteInput {
  const content = message.content as Record<string, unknown>
  return {
    callId: String(content.callId ?? ''),
    result: String(content.result ?? ''),
    callerPubkey: String(content.callerPubkey ?? ''),
    skillId: String(content.skillId ?? ''),
  }
}

function getConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL
  if (!rpcUrl) throw new Error('[COMPLETE] SOLANA_RPC_URL env var is not set')
  return new Connection(rpcUrl, 'confirmed')
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length !== 64) {
    throw new Error(`[COMPLETE] Expected 64-char hex string, got ${hex.length} chars`)
  }
  const result = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    result[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return result
}

function sha256(data: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(data).digest())
}

/**
 * Derives the call_account PDA.
 * Seeds: ["call", caller.key(), call_id]
 */
function deriveCallAccountPda(
  callerPubkey: PublicKey,
  callIdBytes: Uint8Array,
  escrowProgramId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('call'), callerPubkey.toBuffer(), Buffer.from(callIdBytes)],
    escrowProgramId,
  )
}

/**
 * Derives the vault PDA.
 * Seeds: ["vault", call_id]
 */
function deriveVaultPda(
  callIdBytes: Uint8Array,
  escrowProgramId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), Buffer.from(callIdBytes)],
    escrowProgramId,
  )
}

/**
 * Derives the skill_account PDA.
 * Seeds: ["skill", skill_owner.key(), skill_id]
 */
function deriveSkillAccountPda(
  skillOwner: PublicKey,
  skillIdBytes: Uint8Array,
  skillRegistryProgramId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('skill'), skillOwner.toBuffer(), Buffer.from(skillIdBytes)],
    skillRegistryProgramId,
  )
}

/**
 * Encodes the complete_call instruction data.
 *
 * Anchor instruction discriminator = sha256("global:complete_call")[0..8]
 * Arguments:
 *   call_id  [u8; 32]
 *   result_hash [u8; 32]
 */
function buildCompleteCallData(callIdBytes: Uint8Array, resultHashBytes: Uint8Array): Buffer {
  // Anchor discriminator: first 8 bytes of sha256("global:complete_call")
  const discriminator = createHash('sha256')
    .update('global:complete_call')
    .digest()
    .slice(0, 8)

  const data = Buffer.allocUnsafe(8 + 32 + 32)
  Buffer.from(discriminator).copy(data, 0)
  Buffer.from(callIdBytes).copy(data, 8)
  Buffer.from(resultHashBytes).copy(data, 40)
  return data
}

export async function submitComplete(completeInput: CompleteInput): Promise<string> {
  const escrowProgramIdStr = process.env.ESCROW_PROGRAM_ID
  const skillRegistryProgramIdStr = process.env.SKILL_REGISTRY_PROGRAM_ID
  const platformTreasuryStr = process.env.PLATFORM_TREASURY

  if (!escrowProgramIdStr) throw new Error('[COMPLETE] ESCROW_PROGRAM_ID env var is not set')
  if (!skillRegistryProgramIdStr)
    throw new Error('[COMPLETE] SKILL_REGISTRY_PROGRAM_ID env var is not set')
  if (!platformTreasuryStr) throw new Error('[COMPLETE] PLATFORM_TREASURY env var is not set')

  const keypair = getAgentKeypair()
  const connection = getConnection()

  const escrowProgramId = new PublicKey(escrowProgramIdStr)
  const skillRegistryProgramId = new PublicKey(skillRegistryProgramIdStr)
  const platformTreasury = new PublicKey(platformTreasuryStr)
  const callerPubkey = new PublicKey(completeInput.callerPubkey)

  const callIdBytes = hexToBytes(completeInput.callId)
  const skillIdBytes = hexToBytes(completeInput.skillId)
  const resultHashBytes = sha256(completeInput.result)

  const [callAccountPda] = deriveCallAccountPda(callerPubkey, callIdBytes, escrowProgramId)
  const [vaultPda] = deriveVaultPda(callIdBytes, escrowProgramId)
  const [skillAccountPda] = deriveSkillAccountPda(keypair.publicKey, skillIdBytes, skillRegistryProgramId)

  const instructionData = buildCompleteCallData(callIdBytes, resultHashBytes)

  const instruction = new TransactionInstruction({
    programId: escrowProgramId,
    keys: [
      { pubkey: callAccountPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey, isSigner: true, isWritable: true }, // skill_owner
      { pubkey: platformTreasury, isSigner: false, isWritable: true },
      { pubkey: skillAccountPda, isSigner: false, isWritable: true },
      { pubkey: skillRegistryProgramId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  })

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: keypair.publicKey,
  }).add(instruction)

  const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
    commitment: 'confirmed',
    maxRetries: 3,
  })

  console.log(
    `[COMPLETE] complete_call submitted. callId=${completeInput.callId} sig=${signature}`,
  )

  // Notify the platform API so it can publish the result via SSE
  const marketplaceUrl = process.env.SWARM_MARKETPLACE_URL
  if (marketplaceUrl) {
    try {
      await fetch(`${marketplaceUrl}/api/call/${completeInput.callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          result: completeInput.result,
          txSignature: signature,
        }),
      })
    } catch (err) {
      // Non-fatal — the on-chain tx is already confirmed
      console.warn(`[COMPLETE] Could not notify platform API: ${String(err)}`)
    }
  }

  return signature
}

export const completeAction: Action = {
  name: 'COMPLETE',
  similes: ['COMPLETE_CALL', 'FINISH_CALL', 'SUBMIT_RESULT', 'SETTLE_CALL'],
  description:
    'Submit the complete_call on-chain instruction after processing a SWARM skill call. ' +
    'This settles the escrow, pays the provider 95%, and updates on-chain reputation. ' +
    'Requires callId (hex), result (string), callerPubkey (base58), skillId (hex).',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const content = message.content as Record<string, unknown>
    if (!content.callId || !content.result || !content.callerPubkey || !content.skillId) {
      return false
    }
    if (!process.env.ESCROW_PROGRAM_ID || !process.env.SOLANA_RPC_URL) {
      return false
    }
    return true
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    const input = extractInput(runtime, message)

    if (!input.callId || !input.result || !input.callerPubkey || !input.skillId) {
      if (callback) {
        await callback({
          text: '[COMPLETE] callId, result, callerPubkey, and skillId are all required',
          error: true,
        })
      }
      return
    }

    try {
      const signature = await submitComplete(input)
      if (callback) {
        await callback({
          text: `Call completed on-chain. Transaction: ${signature}`,
          signature,
          callId: input.callId,
          status: 'completed',
        })
      }
    } catch (err) {
      const errMsg = String(err)
      console.error('[COMPLETE]', errMsg)
      if (callback) {
        await callback({ text: `Failed to complete call: ${errMsg}`, error: true })
      }
    }
  },

  examples: [
    [
      {
        user: '{{agent}}',
        content: {
          callId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          result: 'The answer is 42.',
          callerPubkey: 'So11111111111111111111111111111111111111112',
          skillId: '0102030405060708091011121314151617181920212223242526272829303132',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Call completed on-chain. Transaction: 5yX...',
          status: 'completed',
        },
      },
    ],
  ],
}
