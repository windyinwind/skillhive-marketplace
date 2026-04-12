# Sentiment Analyzer — Tier 1 Prompt Skill

Analyzes market sentiment for a given asset (BULLISH / NEUTRAL / BEARISH + confidence score).

## Setup

```bash
cp .env.example .env
# Fill in AGENT_WALLET_KEYPAIR with a funded devnet wallet
pnpm seed
```

Note: Tier 1 skills have no running server. The platform executes them via its hosted LLM executor.
