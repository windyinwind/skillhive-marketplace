/**
 * seed.ts — Register the "Price Analyst" Tier 1 prompt skill on SkillHive Marketplace.
 *
 * Tier 1 skills are pure prompt skills. They have no running server.
 * The platform executes them via its hosted skill executor at
 * POST /api/skill-executor/[skillId].
 *
 * Run once against devnet:
 *   pnpm seed
 */

import 'dotenv/config'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SkillHive_API_URL = process.env.SkillHive_MARKETPLACE_URL ?? 'http://localhost:3000'
const AGENT_WALLET_KEYPAIR = process.env.AGENT_WALLET_KEYPAIR ?? ''

if (!AGENT_WALLET_KEYPAIR) {
  console.error('ERROR: AGENT_WALLET_KEYPAIR env var is required.')
  console.error('  Set it to a base58-encoded Solana private key for a funded devnet wallet.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

const SKILL_DEFINITION = {
  name: 'Price Analyst',
  description:
    'Analyzes crypto and stock price trends, technical indicators, and momentum signals for a given ticker symbol. Returns a buy/hold/sell signal with supporting data.',
  system_prompt: `You are a quantitative price analyst specializing in crypto and equity markets.

When given a ticker symbol (e.g. NVDA, BTC, ETH, AAPL):
1. Describe the current price trend (bullish/bearish/neutral) with reasoning.
2. Estimate 30-day momentum based on publicly known price action.
3. Identify key support and resistance levels.
4. State key technical signals (e.g. RSI territory, moving average position).
5. Output a clear BUY / HOLD / SELL signal with a one-sentence rationale.

Be concise, structured, and data-focused. Do not hedge excessively. Today's date: ${new Date().toISOString().split('T')[0]}.`,
  model: 'claude-sonnet-4-6',
  tags: ['finance', 'stocks', 'crypto', 'price', 'technical-analysis'],
  price_lamports: 1_000_000, // 0.001 SOL
  tier: 1,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadKeypair(raw: string): Keypair {
  try {
    // Try base58 private key first
    const decoded = bs58.decode(raw)
    return Keypair.fromSecretKey(decoded)
  } catch {
    // Try JSON array format
    try {
      const arr = JSON.parse(raw)
      return Keypair.fromSecretKey(Uint8Array.from(arr))
    } catch {
      throw new Error('AGENT_WALLET_KEYPAIR must be a base58 private key or a JSON array of bytes.')
    }
  }
}

async function registerSkill(keypair: Keypair): Promise<void> {
  const providerPubkey = keypair.publicKey.toBase58()
  console.log(`\nRegistering skill: "${SKILL_DEFINITION.name}"`)
  console.log(`  Provider wallet : ${providerPubkey}`)
  console.log(`  SkillHive API       : ${SkillHive_API_URL}`)
  console.log(`  Price           : ${SKILL_DEFINITION.price_lamports} lamports (${SKILL_DEFINITION.price_lamports / 1e9} SOL)`)
  console.log(`  Tags            : ${SKILL_DEFINITION.tags.join(', ')}\n`)

  const payload = {
    ...SKILL_DEFINITION,
    provider_pubkey: providerPubkey,
  }

  const response = await fetch(`${SkillHive_API_URL}/api/create-skill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    console.error(`ERROR: POST /api/create-skill returned ${response.status}`)
    console.error(JSON.stringify(body, null, 2))
    process.exit(1)
  }

  const { skillId, txSignature, onChainAddress } = body as {
    skillId?: string
    txSignature?: string
    onChainAddress?: string
  }

  console.log('Skill registered successfully.')
  console.log(`  Skill ID        : ${skillId}`)
  if (onChainAddress) console.log(`  On-chain addr   : ${onChainAddress}`)
  if (txSignature) {
    console.log(`  TX signature    : ${txSignature}`)
    console.log(`  Explorer        : https://explorer.solana.com/tx/${txSignature}?cluster=devnet`)
  }
  console.log('\nSave this Skill ID — the orchestrator will discover it automatically via tags.')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const keypair = loadKeypair(AGENT_WALLET_KEYPAIR)
  await registerSkill(keypair)
}

main().catch((err) => {
  console.error('Seed script failed:', err)
  process.exit(1)
})
