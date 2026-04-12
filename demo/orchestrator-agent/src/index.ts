/**
 * SWARM Marketplace Demo — Orchestrator Agent
 *
 * Demonstrates the full multi-agent SWARM flow:
 *   1. DISCOVER_SKILLS — find price, news, and sentiment skills on-chain
 *   2. CALL_SKILL x3   — pay and invoke each skill in parallel
 *   3. Synthesize      — combine results into an investment recommendation
 *
 * Run: pnpm start
 * Then ask: "Should I invest in NVIDIA?"
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

const SWARM_API_URL = process.env.SWARM_MARKETPLACE_URL ?? 'http://localhost:3000'

// ─── Step 1: Discover skills ─────────────────────────────────────────────────

interface SkillSummary {
  id: string
  name: string
  description: string
  price_lamports: number
  tags: string[]
}

async function discoverSkills(tags: string[]): Promise<SkillSummary[]> {
  const params = new URLSearchParams({ tags: tags.join(','), limit: '10' })
  const res = await fetch(`${SWARM_API_URL}/api/skills?${params}`)
  if (!res.ok) throw new Error(`/api/skills returned ${res.status}`)
  const data = await res.json() as { skills: SkillSummary[] }
  return data.skills ?? []
}

// ─── Step 2: Call a skill ────────────────────────────────────────────────────

async function callSkill(skillId: string, input: string): Promise<string> {
  // Preview mode for demo (no wallet required; uses platform subsidy)
  const res = await fetch(`${SWARM_API_URL}/api/call/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillId, input, preview: true }),
  })
  const data = await res.json() as { result?: string; error?: string }
  if (!res.ok) throw new Error(data.error ?? `Execute failed: ${res.status}`)
  return data.result ?? '(no result)'
}

// ─── Step 3: Synthesize ──────────────────────────────────────────────────────

async function synthesize(
  question: string,
  results: Array<{ skillName: string; result: string }>,
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const context = results
    .map((r) => `## ${r.skillName}\n${r.result}`)
    .join('\n\n')

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a financial meta-analyst synthesizing insights from multiple specialized AI skills.

Question: ${question}

Skill outputs:
${context}

Synthesize these into a clear, concise investment recommendation (3–5 sentences). State your overall stance (BUY / HOLD / SELL) with confidence level.`,
      },
    ],
  })

  const text = msg.content.find((b) => b.type === 'text')
  return text?.type === 'text' ? text.text : '(synthesis failed)'
}

// ─── Main demo ───────────────────────────────────────────────────────────────

async function runDemo(question: string): Promise<void> {
  console.log('\n' + '═'.repeat(60))
  console.log(' SWARM Marketplace Demo — Orchestrator Agent')
  console.log('═'.repeat(60))
  console.log(`\nQuestion: "${question}"\n`)

  // Step 1: Discover skills
  console.log('▶ Step 1: Discovering skills on SWARM Marketplace...')
  const allSkills = await discoverSkills(['finance', 'stocks', 'crypto', 'sentiment', 'price', 'news'])
  console.log(`  Found ${allSkills.length} skills`)

  // Pick up to 3 relevant skills
  const targets = allSkills.slice(0, 3)
  if (targets.length === 0) {
    console.log('  No skills found. Run pnpm seed in each skill-*-agent directory first.')
    return
  }

  for (const s of targets) {
    console.log(`  • ${s.name} (${s.id.slice(0, 8)}…) — ${s.price_lamports / 1e9} SOL`)
  }

  // Step 2: Call all skills in parallel
  console.log('\n▶ Step 2: Calling skills in parallel...')
  const results = await Promise.all(
    targets.map(async (skill) => {
      console.log(`  → Calling "${skill.name}"...`)
      try {
        const result = await callSkill(skill.id, question)
        console.log(`  ✓ "${skill.name}" responded (${result.length} chars)`)
        return { skillName: skill.name, result }
      } catch (err) {
        console.error(`  ✗ "${skill.name}" failed: ${err}`)
        return { skillName: skill.name, result: `(failed: ${err})` }
      }
    }),
  )

  // Step 3: Synthesize
  console.log('\n▶ Step 3: Synthesizing recommendation...')
  const synthesis = await synthesize(question, results)

  console.log('\n' + '═'.repeat(60))
  console.log(' FINAL RECOMMENDATION')
  console.log('═'.repeat(60))
  console.log(synthesis)
  console.log('═'.repeat(60) + '\n')
}

// Run the demo
const question = process.argv[2] ?? 'Should I invest in NVIDIA?'
runDemo(question).catch((err) => {
  console.error('Demo failed:', err)
  process.exit(1)
})
