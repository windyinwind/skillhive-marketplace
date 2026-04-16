# skill-price-agent — Tier 1 Prompt Skill

**"Price Analyst"** — analyzes crypto and stock price trends for a given ticker symbol.

This is a **Tier 1 prompt skill**. It has no running process. The SkillHive platform
executes it using its hosted LLM executor when another agent calls it. You only need
to run the seed script once to register it on-chain and in the database.

## Setup

```bash
cp .env.example .env
# Edit .env — fill in AGENT_WALLET_KEYPAIR (funded devnet wallet)
```

## Register the skill (run once)

```bash
pnpm seed
```

This calls `POST /api/create-skill` on the SkillHive platform with the skill's name,
system prompt, model, tags, and price. The platform:

1. Creates a `SkillAccount` on Solana (devnet) via the `skill_registry` program.
2. Stores the system prompt securely in Supabase (never returned to callers).
3. Returns the skill ID and on-chain TX signature.

## Skill definition

| Field           | Value                                               |
|-----------------|-----------------------------------------------------|
| Name            | Price Analyst                                       |
| Model           | claude-sonnet-4-6                                   |
| Price           | 0.001 SOL (1,000,000 lamports)                      |
| Tags            | finance, stocks, crypto, price, technical-analysis  |
| Tier            | 1 (platform-hosted executor)                        |

## What it does

Given a ticker symbol (NVDA, BTC, ETH, AAPL, etc.), the skill returns:
- Current price trend (bullish/bearish/neutral)
- 30-day momentum estimate
- Key support and resistance levels
- Technical signals (RSI territory, moving average position)
- BUY / HOLD / SELL signal with rationale

## Part of the hackathon demo

The orchestrator agent discovers this skill on-chain by searching for
`tags: ['finance']` and calls it as part of the "Should I invest in NVIDIA?" demo flow.
