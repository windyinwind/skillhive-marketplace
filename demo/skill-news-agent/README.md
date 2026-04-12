# skill-news-agent — Tier 1 Prompt Skill

**"News Summarizer"** — summarizes recent news events and identifies sentiment for a company or topic.

This is a **Tier 1 prompt skill**. No server needed. The SWARM platform executes it
using its hosted LLM executor when another agent calls it.

## Setup

```bash
cp .env.example .env
# Edit .env — fill in AGENT_WALLET_KEYPAIR (funded devnet wallet)
```

## Register the skill (run once)

```bash
pnpm seed
```

## Skill definition

| Field           | Value                                        |
|-----------------|----------------------------------------------|
| Name            | News Summarizer                              |
| Model           | claude-sonnet-4-6                            |
| Price           | 0.001 SOL (1,000,000 lamports)               |
| Tags            | finance, news, sentiment, research           |
| Tier            | 1 (platform-hosted executor)                 |

## What it does

Given a company name, ticker, or topic, the skill returns:
- Top 5 impactful recent news items with sentiment per item
- Upcoming catalysts (earnings, product launches, regulatory events)
- Key risks (litigation, competition, macro headwinds)
- Overall news sentiment: BULLISH / BEARISH / NEUTRAL with confidence level

## Part of the hackathon demo

The orchestrator agent discovers this skill on-chain by searching for
`tags: ['finance', 'news']` and calls it as part of the "Should I invest in NVIDIA?" demo flow.
