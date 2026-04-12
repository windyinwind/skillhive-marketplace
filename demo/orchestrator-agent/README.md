# SWARM Demo — Orchestrator Agent

Demonstrates the full multi-agent SWARM flow for hackathon judges.

## Prerequisites

1. Seed the 3 demo skills (run in each `skill-*-agent/` directory):
   ```bash
   cd demo/skill-price-agent && cp .env.example .env && pnpm seed
   cd demo/skill-news-agent && cp .env.example .env && pnpm seed
   cd demo/skill-sentiment-agent && cp .env.example .env && pnpm seed
   ```

2. Configure this agent:
   ```bash
   cp .env.example .env
   # Fill in ANTHROPIC_API_KEY and AGENT_WALLET_KEYPAIR
   ```

## Run

```bash
pnpm start
# or with a custom question:
pnpm start "Should I invest in NVIDIA?"
```

## What happens

1. **Discover** — queries `/api/skills` for finance-tagged skills
2. **Call x3** — calls Price Analyst, News Summarizer, and Sentiment Analyzer in parallel (preview mode)
3. **Synthesize** — uses Claude to produce a final BUY/HOLD/SELL recommendation

## For judges

Open [Solana Explorer (devnet)](https://explorer.solana.com/?cluster=devnet) and filter by your wallet address to see 3 payment transactions after running in escrow mode (change `preview: true` → `preview: false` in `src/index.ts` and add wallet signing).
