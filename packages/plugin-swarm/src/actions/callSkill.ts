/**
 * CALL_SKILL action — Path A (Human/Agent via platform API, secure escrow).
 *
 * Flow:
 *   1. POST /api/call/prepare  → unsigned escrow transaction + callId
 *   2. Agent signs the transaction with its Solana keypair
 *   3. POST /api/call/execute  → platform broadcasts tx, calls skill, returns result
 *   4. Subscribe to GET /api/events?callId=... via SSE to receive the async result
 *
 * The agent's wallet keypair is loaded from AGENT_WALLET_KEYPAIR (base58).
 * The platform API proxies the skill call and settles escrow on-chain.
 * The endpoint URL is never exposed to this action.
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import { signTransaction } from '../wallet.js'
import { PrepareCallResponse, ExecuteCallResponse, CallEventPayload } from '../types.js'

const SSE_TIMEOUT_MS = 60_000 // 60 seconds to wait for async result

export interface CallSkillInput {
  skillId: string
  input: string
  callerWallet?: string // optional override; defaults to agent wallet pubkey
}

function extractInput(_runtime: IAgentRuntime, message: Memory): CallSkillInput {
  const content = message.content as Record<string, unknown>
  return {
    skillId: String(content.skillId ?? content.skill_id ?? ''),
    input: String(content.input ?? content.text ?? ''),
    callerWallet: typeof content.callerWallet === 'string' ? content.callerWallet : undefined,
  }
}

function getMarketplaceUrl(): string {
  const url = process.env.SWARM_MARKETPLACE_URL
  if (!url) throw new Error('[CALL_SKILL] SWARM_MARKETPLACE_URL env var is not set')
  return url
}

/**
 * Step 1: Ask the platform to build an unsigned escrow transaction.
 */
async function prepareCall(
  skillId: string,
  input: string,
  callerWallet: string,
): Promise<PrepareCallResponse> {
  const url = `${getMarketplaceUrl()}/api/call/prepare`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillId, input, callerWallet }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[CALL_SKILL] /api/call/prepare returned ${res.status}: ${body}`)
  }

  return res.json() as Promise<PrepareCallResponse>
}

/**
 * Step 3: Send the signed transaction to the platform for broadcasting + skill execution.
 */
async function executeCall(
  callId: string,
  signedTx: string,
): Promise<ExecuteCallResponse> {
  const url = `${getMarketplaceUrl()}/api/call/execute`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callId, signedTx }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[CALL_SKILL] /api/call/execute returned ${res.status}: ${body}`)
  }

  return res.json() as Promise<ExecuteCallResponse>
}

/**
 * Step 4: Subscribe to the SSE stream for the async result.
 * Uses the native fetch + ReadableStream API (Node 20+).
 * Falls back to a direct result if /api/call/execute already returned one.
 */
async function waitForResult(callId: string, timeoutMs: number): Promise<string> {
  const url = `${getMarketplaceUrl()}/api/events?callId=${encodeURIComponent(callId)}`

  return new Promise<string>((resolve, reject) => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
      reject(new Error(`[CALL_SKILL] Timed out after ${timeoutMs}ms waiting for callId=${callId}`))
    }, timeoutMs)

    fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
      .then(async (res) => {
        if (!res.ok) {
          clearTimeout(timer)
          reject(new Error(`[CALL_SKILL] SSE stream returned ${res.status}`))
          return
        }

        const reader = res.body?.getReader()
        if (!reader) {
          clearTimeout(timer)
          reject(new Error('[CALL_SKILL] SSE response has no body'))
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE lines: each event block ends with a blank line
          const blocks = buffer.split('\n\n')
          buffer = blocks.pop() ?? ''

          for (const block of blocks) {
            const lines = block.split('\n')
            let eventType = 'message'
            let data = ''

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.slice('event:'.length).trim()
              } else if (line.startsWith('data:')) {
                data = line.slice('data:'.length).trim()
              }
            }

            if (eventType === 'call_result' || eventType === 'result') {
              clearTimeout(timer)
              controller.abort()
              try {
                const payload = JSON.parse(data) as CallEventPayload
                if (payload.status === 'failed') {
                  reject(new Error(`[CALL_SKILL] Skill execution failed: ${payload.error ?? 'unknown'}`))
                } else {
                  resolve(payload.result ?? '')
                }
              } catch {
                resolve(data)
              }
              return
            }

            if (eventType === 'error') {
              clearTimeout(timer)
              controller.abort()
              reject(new Error(`[CALL_SKILL] SSE error event: ${data}`))
              return
            }
          }
        }

        clearTimeout(timer)
        reject(new Error('[CALL_SKILL] SSE stream ended before result arrived'))
      })
      .catch((err) => {
        clearTimeout(timer)
        if ((err as Error).name !== 'AbortError') {
          reject(err)
        }
      })
  })
}

export const callSkillAction: Action = {
  name: 'CALL_SKILL',
  similes: ['INVOKE_SKILL', 'RUN_SKILL', 'EXECUTE_SKILL', 'USE_SKILL', 'PAY_AND_CALL'],
  description:
    'Call a SWARM Marketplace skill using the secure escrow path (Path A). ' +
    'The agent signs an on-chain escrow transaction; payment is held in escrow and released ' +
    'when the skill completes. Returns the skill result. ' +
    'Requires skillId (string) and input (string).',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const content = message.content as Record<string, unknown>
    if (!content.skillId && !content.skill_id) {
      console.warn('[CALL_SKILL] validate: skillId is required')
      return false
    }
    if (!process.env.SWARM_MARKETPLACE_URL) {
      console.warn('[CALL_SKILL] SWARM_MARKETPLACE_URL is not set')
      return false
    }
    if (!process.env.AGENT_WALLET_KEYPAIR) {
      console.warn('[CALL_SKILL] AGENT_WALLET_KEYPAIR is not set')
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

    if (!input.skillId) {
      if (callback) {
        await callback({ text: '[CALL_SKILL] skillId is required', error: true })
      }
      return
    }

    // Resolve callerWallet to agent's own pubkey if not overridden
    let callerWallet = input.callerWallet
    if (!callerWallet) {
      const { getAgentKeypair } = await import('../wallet.js')
      callerWallet = getAgentKeypair().publicKey.toBase58()
    }

    try {
      // Step 1: Prepare — get unsigned transaction
      if (callback) {
        await callback({
          text: `Preparing escrow transaction for skill ${input.skillId}...`,
          status: 'preparing',
        })
      }

      const prepared = await prepareCall(input.skillId, input.input, callerWallet)

      // Step 2: Sign the transaction
      const signedTx = await signTransaction(prepared.unsignedTx)

      if (callback) {
        await callback({
          text: `Transaction signed. Executing call (callId: ${prepared.callId})...`,
          status: 'signed',
          callId: prepared.callId,
        })
      }

      // Step 3: Execute
      const execResult = await executeCall(prepared.callId, signedTx)

      // If the platform already returned a synchronous result, use it
      if (execResult.status === 'completed' && execResult.result) {
        if (callback) {
          await callback({
            text: execResult.result,
            status: 'completed',
            callId: prepared.callId,
            result: execResult.result,
          })
        }
        return
      }

      // Step 4: Wait for async result via SSE
      if (callback) {
        await callback({
          text: 'Waiting for skill result via SSE stream...',
          status: 'processing',
          callId: prepared.callId,
        })
      }

      const result = await waitForResult(prepared.callId, SSE_TIMEOUT_MS)

      if (callback) {
        await callback({
          text: result,
          status: 'completed',
          callId: prepared.callId,
          result,
        })
      }
    } catch (err) {
      const errMsg = String(err)
      console.error('[CALL_SKILL]', errMsg)
      if (callback) {
        await callback({ text: `Skill call failed: ${errMsg}`, error: true })
      }
    }
  },

  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Call the stock analyst skill with input: Should I buy NVIDIA?',
          skillId: 'abc123',
          input: 'Should I buy NVIDIA?',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Based on current market data, NVIDIA shows strong growth indicators...',
          status: 'completed',
        },
      },
    ],
  ],
}
