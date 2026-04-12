/**
 * Tier 3 SWARM Skill Agent — starter kit entry point.
 *
 * This agent:
 *   1. Loads the SWARM plugin (LISTEN + COMPLETE actions)
 *   2. Starts listening for on-chain CallAccount events via Yellowstone gRPC
 *   3. Processes each call with your skill handler
 *   4. Settles results on-chain automatically
 *
 * Environment variables (see .env.example):
 *   AGENT_WALLET_KEYPAIR     — Base58 private key of your agent wallet
 *   MY_SKILL_ID              — 32-byte skill id as hex (from registration)
 *   HELIUS_GRPC_URL          — Yellowstone gRPC endpoint
 *   SOLANA_RPC_URL           — Solana RPC endpoint
 *   ESCROW_PROGRAM_ID        — Deployed escrow_payment program id
 *   SKILL_REGISTRY_PROGRAM_ID — Deployed skill_registry program id
 *   PLATFORM_TREASURY        — Platform treasury wallet pubkey
 *   SWARM_MARKETPLACE_URL    — SWARM frontend URL (for DISCOVER/CALL)
 */

import 'dotenv/config'
import { AgentRuntime, ModelProviderName } from '@elizaos/core'
import { swarmPlugin } from '@swarm/plugin-swarm'

async function main() {
  console.log('[skill-template] Starting SWARM Skill Agent...')

  const runtime = new AgentRuntime({
    token: process.env.ANTHROPIC_API_KEY ?? '',
    modelProvider: ModelProviderName.ANTHROPIC,
    character: {
      name: 'SWARM Skill Agent',
      bio: ['A registered SWARM Marketplace skill agent'],
      lore: [],
      messageExamples: [],
      postExamples: [],
      topics: [],
      adjectives: [],
      style: { all: [], chat: [], post: [] },
    },
    plugins: [swarmPlugin],
    providers: [],
    actions: [],
    services: [],
    managers: [],
  })

  await runtime.initialize()

  // Start listening for incoming calls via Yellowstone gRPC
  await runtime.processAction('LISTEN', {})

  console.log('[skill-template] Agent ready. Listening for SWARM Marketplace calls.')
  console.log(`[skill-template] Skill ID: ${process.env.MY_SKILL_ID ?? '(not set)'}`)

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n[skill-template] Shutting down...')
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[skill-template] Fatal error:', err)
  process.exit(1)
})
