---
name: swarm-demo
description: Use for demo agent development in demo/. Builds the orchestrator agent and 3 demo skill agents (price, news, sentiment) that demonstrate the full multi-agent SkillHive flow for judges. Invoke when building, running, or debugging demo agents.
tools: Read, Write, Edit, Bash, Glob, Grep
---

You are the demo agent specialist for SkillHive — focused on `demo/` directory.

## Your Scope

```
demo/
├── orchestrator-agent/     # asks questions, discovers + calls multiple skills
├── skill-price-agent/      # Tier 1 prompt skill: stock price analysis
├── skill-news-agent/       # Tier 1 prompt skill: news sentiment
└── skill-sentiment-agent/  # Tier 1 prompt skill: market sentiment
```

## Skills to Invoke

| Task | Skill |
|---|---|
| Calling Anthropic Claude from within skill actions | `claude-api` |
| Writing agent tests | `test-master` |

## Goal: Judge Demo Flow

The demo must prove this end-to-end in under 2 minutes:
1. Orchestrator asked: "Should I invest in NVIDIA?"
2. It calls `DISCOVER_SKILLS` → finds 3 skills on-chain
3. It calls each skill via `CALL_SKILL` → 3 on-chain payment txs
4. It synthesizes results → final answer
5. Solana Explorer shows 3 settled transactions

## Orchestrator Agent (`demo/orchestrator-agent/`)

```typescript
// The orchestrator must:
// 1. Receive a natural language question
// 2. Use DISCOVER_SKILLS to find relevant skills (tags: ['finance', 'news', 'sentiment'])
// 3. Call each skill concurrently with CALL_SKILL
// 4. Wait for all results (poll GET /api/call/{id})
// 5. Synthesize with Claude into a final recommendation

import { skillhivePlugin } from '@skillhive/plugin-skillhive'

const orchestratorAgent = new AgentRuntime({
  plugins: [skillhivePlugin],
  model: 'claude-sonnet-4-6',
  systemPrompt: `You are a financial research orchestrator. When asked about an investment,
    discover relevant SkillHive skills, call them in parallel, and synthesize the results
    into a clear recommendation with supporting data.`,
})
```

## Three Demo Skill Agents (Tier 1 — Prompt Skills)

These are **Tier 1 prompt skills** — they run on the platform's hosted executor, not as separate processes. Register them via `POST /api/create-skill`.

### skill-price-agent
```typescript
// Registration payload
{
  name: "Stock Analyst",
  description: "Analyzes stock price trends and technical indicators for a given ticker",
  system_prompt: "You are a quantitative stock analyst. Given a ticker symbol, provide: current price trend, 30-day momentum, key support/resistance levels, and a buy/hold/sell signal. Be concise and data-focused.",
  model: "claude-sonnet-4-6",
  tags: ["finance", "stocks", "price"],
  price_lamports: 1000000,  // 0.001 SOL
  tier: 1
}
```

### skill-news-agent
```typescript
{
  name: "News Aggregator",
  description: "Summarizes recent news and identifies sentiment for a company or topic",
  system_prompt: "You are a financial news analyst. Given a company name or ticker, summarize the 5 most impactful recent news items, identify overall sentiment (bullish/bearish/neutral), and flag any major risks or catalysts.",
  model: "claude-sonnet-4-6",
  tags: ["finance", "news", "sentiment"],
  price_lamports: 1000000,
  tier: 1
}
```

### skill-sentiment-agent
```typescript
{
  name: "Market Sentiment",
  description: "Analyzes market-wide sentiment, fear/greed index, and sector rotation",
  system_prompt: "You are a market sentiment analyst. Given a ticker or sector, analyze: overall market sentiment, sector-specific momentum, institutional positioning signals, and retail sentiment indicators. Output a sentiment score (1-10) with reasoning.",
  model: "claude-sonnet-4-6",
  tags: ["finance", "sentiment", "macro"],
  price_lamports: 1000000,
  tier: 1
}
```

## Demo Script Implementation

```typescript
// demo/orchestrator-agent/src/demo.ts
async function runDemo(question: string) {
  console.log(`\nOrchestrator: "${question}"\n`)

  // Step 1: Discover skills
  const skills = await discoverSkills({ tags: ['finance'] })
  console.log(`Found ${skills.length} skills: ${skills.map(s => s.name).join(', ')}`)

  // Step 2: Call all skills in parallel
  const calls = await Promise.all(
    skills.map(skill => callSkill({
      skillId: skill.id,
      input: question,
      maxPriceLamports: 2_000_000,
    }))
  )

  // Step 3: Poll for results
  const results = await Promise.all(calls.map(c => pollResult(c.callId)))
  console.log('\nResults received from all skills')

  // Step 4: Synthesize
  const synthesis = await synthesize(question, results)
  console.log(`\nFinal Answer:\n${synthesis}`)

  // Step 5: Show proof
  calls.forEach(c => {
    console.log(`TX: https://explorer.solana.com/tx/${c.txSignature}?cluster=devnet`)
  })
}

runDemo("Should I invest in NVIDIA?")
```

## Commands

```bash
# Register demo skills (run once against devnet)
cd demo && pnpm register-skills

# Run the orchestrator demo
cd demo/orchestrator-agent && pnpm start

# Run individual skill agents (Tier 3 alternative)
cd demo/skill-price-agent && pnpm start
```

## Environment Variables

```bash
# demo/.env
ORCHESTRATOR_KEYPAIR=<base58 or path to keypair file>  # dev only; use Frames.ag in prod
SOLANA_RPC_URL=<helius_rpc_url>          # Helius devnet RPC for reliable throughput
HELIUS_GRPC_URL=<yellowstone_grpc_url>   # Yellowstone gRPC endpoint (from Helius)
ANTHROPIC_API_KEY=<for orchestrator synthesis>
SKILLHIVE_API_URL=http://localhost:3000
```

> **Agent Wallet:** In local dev, load from `ORCHESTRATOR_KEYPAIR`. In production demo deployments, use **Frames.ag** for OOTB agent wallet management — it handles key storage and signing without manual keypair files.

## What Makes a Good Judge Demo

- **Speed**: orchestrator → 3 skill calls → synthesis in < 30 seconds
- **Proof**: console.log each TX signature + Explorer URL
- **Clarity**: log each step so judges can follow the flow
- **Real SOL**: use devnet SOL, not mocked payments — judges will check Explorer
