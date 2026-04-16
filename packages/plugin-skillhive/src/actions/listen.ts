/**
 * LISTEN action — Path B (Agent-to-Agent via Yellowstone gRPC).
 *
 * Subscribes to Yellowstone gRPC (Helius) for real-time CallAccount creation
 * events where this agent's skill is the target. When a Pending CallAccount
 * appears for MY_SKILL_ID, it processes the call and triggers COMPLETE.
 *
 * This is non-blocking: it starts a background gRPC subscription and returns
 * immediately. The subscription runs until the process exits or an error occurs.
 *
 * Environment variables required:
 *   HELIUS_GRPC_URL     — Yellowstone gRPC endpoint (e.g. https://...helius...grpc.com)
 *   MY_SKILL_ID         — 32-byte skill id as hex string (which calls to listen for)
 *   AGENT_WALLET_KEYPAIR — Base58 private key (for signing complete_call tx)
 *   ESCROW_PROGRAM_ID   — On-chain escrow payment program id
 *   SOLANA_RPC_URL      — RPC endpoint for submitting transactions
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'

// Yellowstone gRPC discriminator for CallAccount (first 8 bytes of sha256("account:CallAccount"))
const CALL_ACCOUNT_DISCRIMINATOR = Buffer.from([254, 33, 140, 162, 118, 203, 5, 86])

// Status byte values (matches escrow_payment program)
const STATUS_PENDING = 0

export interface ListenInput {
  onResult?: (callId: string, result: string) => void
}

function getRequiredEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`[LISTEN] ${key} env var is required`)
  return val
}

/**
 * Start the Yellowstone gRPC subscription.
 * Returns a cleanup function that stops the subscription.
 */
async function startGrpcSubscription(
  runtime: IAgentRuntime,
  mySkillIdHex: string,
  callback?: HandlerCallback,
): Promise<() => void> {
  const { default: Client, CommitmentLevel } = await import(
    '@triton-one/yellowstone-grpc'
  )

  const grpcUrl = getRequiredEnv('HELIUS_GRPC_URL')
  const escrowProgramId = getRequiredEnv('ESCROW_PROGRAM_ID')

  const client = new Client(grpcUrl, undefined, {})
  const stream = await client.subscribe()
  let stopped = false

  // Subscribe to all account changes for the escrow program
  const subscribeRequest = {
    slots: {},
    accounts: {
      escrow: {
        account: [],
        owner: [escrowProgramId],
        filters: [],
      },
    },
    transactions: {},
    blocks: {},
    blocksMeta: {},
    accountsDataSlice: [],
    commitment: CommitmentLevel.CONFIRMED,
  }

  stream.write(subscribeRequest, (err: Error | null) => {
    if (err) console.error('[LISTEN] gRPC subscribe write error:', err)
  })

  console.log(`[LISTEN] gRPC subscription started. Watching for calls to skill ${mySkillIdHex}`)

  stream.on('data', async (data: Record<string, unknown>) => {
    if (stopped) return

    const account = data?.account as Record<string, unknown> | undefined
    if (!account) return

    const accountRaw = account.account as Record<string, unknown> | undefined
    if (!accountRaw?.data) return

    // Decode account data
    let buf: Buffer
    try {
      const dataField = accountRaw.data as string | Uint8Array
      buf = Buffer.isBuffer(dataField)
        ? dataField
        : typeof dataField === 'string'
        ? Buffer.from(dataField, 'base64')
        : Buffer.from(dataField)
    } catch {
      return
    }

    if (buf.length < 8) return

    // Check discriminator — only handle CallAccount
    if (!buf.slice(0, 8).equals(CALL_ACCOUNT_DISCRIMINATOR)) return

    // Parse minimal CallAccount fields:
    // [0..8]   discriminator
    // [8..40]  call_id [u8;32]
    // [40..72] skill_id [u8;32]
    // [72..104] caller pubkey [u8;32]
    // [104..136] skill_owner pubkey [u8;32]
    // [136..144] amount_lamports u64 LE
    // ... input_hash [u8;32]
    // ... result_hash [u8;32]
    // [208]   status u8
    if (buf.length < 210) return

    const callIdHex = buf.slice(8, 40).toString('hex')
    const skillIdHex = buf.slice(40, 72).toString('hex')
    const status = buf.readUInt8(208)

    // Only act on calls targeting our skill that are still pending
    if (skillIdHex !== mySkillIdHex) return
    if (status !== STATUS_PENDING) return

    const bs58 = await import('bs58')
    const callerPubkey = bs58.default.encode(buf.slice(72, 104))
    const inputHashHex = buf.slice(176, 208).toString('hex')

    console.log(`[LISTEN] Pending call detected: callId=${callIdHex} caller=${callerPubkey}`)

    if (callback) {
      await callback({
        text: `Received call ${callIdHex} from ${callerPubkey}`,
        status: 'pending',
        callId: callIdHex,
        skillId: skillIdHex,
        callerPubkey,
        inputHashHex,
      })
    }

    // Trigger COMPLETE action via runtime
    try {
      await runtime.processAction('COMPLETE', {
        callId: callIdHex,
        callerPubkey,
        skillId: skillIdHex,
        result: `[Processed by ${mySkillIdHex.slice(0, 8)}…]`,
      })
    } catch (err) {
      console.error('[LISTEN] COMPLETE action failed:', err)
    }
  })

  stream.on('error', (err: Error) => {
    if (!stopped) console.error('[LISTEN] gRPC stream error:', err)
  })

  stream.on('end', () => {
    if (!stopped) console.warn('[LISTEN] gRPC stream ended unexpectedly')
  })

  return () => {
    stopped = true
    stream.destroy()
    console.log('[LISTEN] gRPC subscription stopped')
  }
}

// Track the active subscription cleanup per agent
const _cleanups = new WeakMap<object, () => void>()

export const listenAction: Action = {
  name: 'LISTEN',
  similes: ['LISTEN_FOR_CALLS', 'WATCH_SKILL', 'START_LISTENING', 'MONITOR_CALLS'],
  description:
    'Start listening for on-chain CallAccount creation events for this agent\'s skill ' +
    'via Yellowstone gRPC (Helius). When a Pending call for MY_SKILL_ID is detected, ' +
    'automatically triggers COMPLETE. Non-blocking — starts a background subscription.',

  validate: async (_runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    if (!process.env.HELIUS_GRPC_URL) {
      console.warn('[LISTEN] HELIUS_GRPC_URL is not set')
      return false
    }
    if (!process.env.MY_SKILL_ID) {
      console.warn('[LISTEN] MY_SKILL_ID is not set — not listening for any skill')
      return false
    }
    if (!process.env.AGENT_WALLET_KEYPAIR) {
      console.warn('[LISTEN] AGENT_WALLET_KEYPAIR is not set')
      return false
    }
    return true
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    const mySkillId = process.env.MY_SKILL_ID!

    // Stop any existing subscription
    const existingCleanup = _cleanups.get(runtime)
    if (existingCleanup) {
      existingCleanup()
    }

    try {
      const stop = await startGrpcSubscription(runtime, mySkillId, callback)
      _cleanups.set(runtime, stop)

      if (callback) {
        await callback({
          text: `SkillHive Marketplace listener started for skill ${mySkillId.slice(0, 8)}…`,
          status: 'listening',
          skillId: mySkillId,
        })
      }
    } catch (err) {
      const msg = `[LISTEN] Failed to start gRPC subscription: ${String(err)}`
      console.error(msg)
      if (callback) {
        await callback({ text: msg, error: true })
      }
    }
  },

  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: 'Start listening for calls to my skill on SkillHive Marketplace' },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'SkillHive Marketplace listener started. I\'m now watching for on-chain calls to your skill via Yellowstone gRPC.',
          status: 'listening',
        },
      },
    ],
  ],
}
