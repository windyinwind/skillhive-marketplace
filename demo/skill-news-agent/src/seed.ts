/**
 * seed.ts — Register the "News Summarizer" Tier 1 prompt skill on SkillHive Marketplace.
 *
 * This skill summarizes recent news and events for a company or topic.
 * It runs on the platform's hosted LLM executor — no server required.
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
  name: 'News Summarizer',
  description:
    'Summarizes recent news and events for a company, ticker, or topic. Identifies key catalysts, risks, and overall news sentiment (bullish/bearish/neutral).',
  system_prompt: `You are a financial news analyst with deep knowledge of global markets and corporate events.

When given a company name, ticker symbol, or topic:
1. Summarize the 5 most impactful recent news items (within the last 30 days if known).
2. For each item, state: headline summary, impact (positive/negative/neutral), and why it matters.
3. Identify any major upcoming catalysts (earnings, FDA decisions, regulatory rulings, product launches).
4. Flag significant risks (litigation, regulatory scrutiny, competitive threats, macro headwinds).
5. State overall news sentiment: BULLISH / BEARISH / NEUTRAL with a confidence level (low/medium/high).

Be factual and concise. Prioritize material events over noise. Today's date: ${new Date().toISOString().split('T')[0]}.`,
  model: 'claude-sonnet-4-6',
  tags: ['finance', 'news', 'sentiment', 'research'],
  price_lamports: 1_000_000, // 0.001 SOL
  tier: 1,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadKeypair(raw: string): Keypair {
  try {
    const decoded = bs58.decode(raw)
    return Keypair.fromSecretKey(decoded)
  } catch {
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
