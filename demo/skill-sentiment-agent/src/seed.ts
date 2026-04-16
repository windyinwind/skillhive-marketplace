/**
 * seed.ts — Register the "Sentiment Analyzer" Tier 1 prompt skill on SkillHive Marketplace.
 *
 * Run once against devnet:
 *   pnpm seed
 */

import 'dotenv/config'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

const SkillHive_API_URL = process.env.SkillHive_MARKETPLACE_URL ?? 'http://localhost:3000'
const AGENT_WALLET_KEYPAIR = process.env.AGENT_WALLET_KEYPAIR ?? ''

if (!AGENT_WALLET_KEYPAIR) {
  console.error('ERROR: AGENT_WALLET_KEYPAIR env var is required.')
  process.exit(1)
}

const SKILL_DEFINITION = {
  name: 'Sentiment Analyzer',
  description:
    'Analyzes market sentiment for a given asset or topic using macro signals, news tone, and social indicators. Returns BULLISH / NEUTRAL / BEARISH with confidence score.',
  system_prompt: `You are a market sentiment analyst.

When given an asset name, topic, or text snippet:
1. Assess the overall market sentiment: BULLISH, NEUTRAL, or BEARISH.
2. Provide a confidence score from 0–100.
3. List 2–3 key sentiment drivers (news, macro, narrative, on-chain signals).
4. Flag any contrarian signals that could reverse the sentiment.
5. Give a 1-sentence actionable takeaway.

Be precise. Use structured output. Today: ${new Date().toISOString().split('T')[0]}.`,
  model: 'claude-sonnet-4-6',
  tags: ['sentiment', 'finance', 'crypto', 'macro', 'analysis'],
  price_lamports: 1_000_000,
  tier: 1,
}

function loadKeypair(raw: string): Keypair {
  try {
    return Keypair.fromSecretKey(bs58.decode(raw))
  } catch {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
    } catch {
      throw new Error('AGENT_WALLET_KEYPAIR must be base58 or JSON array')
    }
  }
}

async function main(): Promise<void> {
  const keypair = loadKeypair(AGENT_WALLET_KEYPAIR)
  const providerPubkey = keypair.publicKey.toBase58()

  console.log(`\nRegistering skill: "${SKILL_DEFINITION.name}"`)
  console.log(`  Provider: ${providerPubkey}`)
  console.log(`  API: ${SkillHive_API_URL}\n`)

  const res = await fetch(`${SkillHive_API_URL}/api/create-skill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...SKILL_DEFINITION, provider_pubkey: providerPubkey }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`ERROR: ${res.status}`, body)
    process.exit(1)
  }

  const { skillId, txSignature } = body as { skillId?: string; txSignature?: string }
  console.log('Registered successfully.')
  console.log(`  Skill ID: ${skillId}`)
  if (txSignature) {
    console.log(`  Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
