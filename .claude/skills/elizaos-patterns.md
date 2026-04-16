---
description: ElizaOS 1.7.x patterns for building plugins, actions, providers, and agent runtimes in SkillHive. Use when writing plugin-skillhive, skill-template, or any demo agent code.
---

# ElizaOS 1.7.x Patterns for SkillHive

## Core Concepts

ElizaOS agents are composed of:
- **Actions** — things the agent *can do* (CALL_SKILL, DISCOVER_SKILLS, etc.)
- **Providers** — context injected into every LLM prompt (wallet balance, available skills)
- **Evaluators** — post-response processors (update reputation, log calls)
- **Plugin** — bundles actions + providers + evaluators into one importable unit

---

## Plugin Structure

```typescript
// packages/plugin-skillhive/src/index.ts
import type { Plugin } from '@elizaos/core'

export const skillhivePlugin: Plugin = {
  name: 'plugin-skillhive',
  description: 'SkillHive — discover, pay for, and provide AI skills on Solana',
  actions: [
    discoverSkillsAction,
    callSkillAction,
    listenAction,
    completeAction,
  ],
  providers: [walletBalanceProvider, availableSkillsProvider],
  evaluators: [],
  services: [],
}

export default skillhivePlugin
```

---

## Action Pattern

```typescript
import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'

export const callSkillAction: Action = {
  name: 'CALL_SKILL',
  description: 'Pay for and call a registered SkillHive skill on Solana',
  similes: ['USE_SKILL', 'INVOKE_SKILL', 'PAY_FOR_SKILL'],

  // Validates whether this action should fire for a given message
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const hasWallet = !!runtime.getSetting('WALLET_PRIVATE_KEY')
    const mentionsSkill = message.content.text?.toLowerCase().includes('skill')
    return hasWallet && mentionsSkill
  },

  // Main handler — runs the action
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<boolean> => {
    try {
      // Extract skill ID and input from message/state
      const skillId = options.skillId as string
      const input = message.content.text

      // Step 1: prepare unsigned tx
      const { tx } = await fetch(`${runtime.getSetting('SKILLHIVE_API_URL')}/api/call/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, input }),
      }).then(r => r.json())

      // Step 2: sign with agent keypair
      const signed = await signTransaction(tx, runtime)

      // Step 3: execute
      const { result, callId } = await fetch(`${runtime.getSetting('SKILLHIVE_API_URL')}/api/call/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, signedTx: signed, input }),
      }).then(r => r.json())

      await callback({ text: result, metadata: { callId, skillId } })
      return true
    } catch (error) {
      await callback({ text: `Failed to call skill: ${error.message}` })
      return false
    }
  },

  // Example messages to help the LLM understand when to use this action
  examples: [
    [
      { user: 'user', content: { text: 'Analyze NVDA stock for me' } },
      { user: 'agent', content: { text: 'Calling the Stock Analyst skill...', action: 'CALL_SKILL' } },
    ],
  ],
}
```

---

## Provider Pattern

Providers inject real-time context into every LLM prompt.

```typescript
import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core'

export const walletBalanceProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
    const balance = await getWalletBalance(runtime)
    return `Wallet balance: ${balance} SOL`
  },
}

export const availableSkillsProvider: Provider = {
  get: async (runtime: IAgentRuntime): Promise<string> => {
    const skills = await fetch(`${runtime.getSetting('SKILLHIVE_API_URL')}/api/skills`)
      .then(r => r.json())
    const list = skills.map((s: any) => `- ${s.name} (${s.price_lamports / 1e9} SOL): ${s.description}`).join('\n')
    return `Available SkillHive skills:\n${list}`
  },
}
```

---

## Agent Runtime Setup

```typescript
import { AgentRuntime, ModelProviderName } from '@elizaos/core'
import { skillhivePlugin } from '@skillhive/plugin-skillhive'

const runtime = new AgentRuntime({
  token: process.env.ANTHROPIC_API_KEY!,
  modelProvider: ModelProviderName.ANTHROPIC,
  character: {
    name: 'SkillHive Orchestrator',
    system: 'You coordinate AI skills on the SkillHive to answer complex questions.',
    plugins: ['plugin-skillhive'],
    settings: {
      WALLET_PRIVATE_KEY: process.env.AGENT_KEYPAIR!,
      SKILLHIVE_API_URL: process.env.SKILLHIVE_API_URL!,
      SOLANA_RPC_URL: process.env.SOLANA_RPC_URL!,
    },
  },
  plugins: [skillhivePlugin],
})

await runtime.initialize()
```

---

## Skill Agent (LISTEN pattern — Tier 3, Yellowstone gRPC)

```typescript
// Skill agents subscribe to Solana via Yellowstone gRPC — real-time, no polling
// Path B: agent-to-agent calls never use HTTP endpoints
export const listenAction: Action = {
  name: 'LISTEN_FOR_CALLS',
  description: 'Subscribe to Solana via Yellowstone gRPC for CallAccounts assigned to this skill',

  handler: async (runtime: IAgentRuntime): Promise<boolean> => {
    const mySkillId = runtime.getSetting('SKILL_ID')!
    const grpcUrl = runtime.getSetting('HELIUS_GRPC_URL')!

    // Yellowstone gRPC subscription — fires on every new/updated CallAccount
    const stream = await createYellowstoneSubscription(grpcUrl, mySkillId)

    stream.on('data', async (data) => {
      const call = deserializeCallAccount(data.account.data)
      if (call.status !== 'Pending' || call.skillId !== mySkillId) return

      const result = await runtime.processActions(
        { content: { text: call.input } } as Memory,
        []
      )

      // Submit result on-chain — triggers payment release
      await completeCall(runtime, call.publicKey, result)
    })

    return true
  },
}
```

---

## Character File (JSON)

```json
{
  "name": "Stock Analyst",
  "username": "stock-analyst",
  "modelProvider": "anthropic",
  "settings": {
    "model": "claude-sonnet-4-6",
    "SKILL_ID": "...",
    "SKILL_PROVIDER_KEYPAIR": "...",
    "SOLANA_RPC_URL": "https://api.devnet.solana.com"
  },
  "system": "You are a quantitative stock analyst. Analyze stocks with price trends, momentum, and signals.",
  "plugins": ["@skillhive/plugin-skillhive"],
  "bio": ["Expert in technical analysis and market microstructure"]
}
```

---

## Runtime Settings Access

```typescript
// Access settings safely in actions/providers
const apiUrl = runtime.getSetting('SKILLHIVE_API_URL') ?? 'http://localhost:3000'
const keypair = runtime.getSetting('WALLET_PRIVATE_KEY')

// Never hardcode — always use runtime.getSetting()
```

---

## Testing Actions

```typescript
import { createMockRuntime } from '@elizaos/test-utils'

describe('callSkillAction', () => {
  it('calls skill and returns result', async () => {
    const runtime = createMockRuntime({
      settings: {
        SKILLHIVE_API_URL: 'http://localhost:3000',
        WALLET_PRIVATE_KEY: TEST_KEYPAIR,
      },
    })

    const callback = vi.fn()
    const result = await callSkillAction.handler(
      runtime,
      { content: { text: 'analyze NVDA' } } as Memory,
      {} as State,
      { skillId: TEST_SKILL_ID },
      callback
    )

    expect(result).toBe(true)
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ text: expect.any(String) }))
  })
})
```
