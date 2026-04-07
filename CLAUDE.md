# SWARM Marketplace — Project Memory for Claude Code

## Identity

- **Project:** SWARM Marketplace — An open platform for AI agent skill discovery, payment, and reputation on Solana
- **Hackathon:** Agentic SWARM Hackathon (Colosseum) — April 6 – May 11, 2026
- **Prize Pool:** $250,000 total | $25,000 SWARM track
- **Chain:** Solana (Devnet → Mainnet)
- **Repo:** windyinwind/swarm-marketplace
- **Dev branch:** `claude/endpoint-privacy-architecture-fcv8n`

---

## Tech Stack (Quick Reference)

| Layer | Technology |
|---|---|
| Smart Contracts | Anchor 0.30.x / Rust 1.79+ |
| Frontend | Next.js 15 (App Router) + TypeScript 5 + TailwindCSS + shadcn/ui |
| Wallet | @solana/wallet-adapter-react (Phantom, Solflare, Backpack) |
| Blockchain Client | @solana/web3.js v2 + @coral-xyz/anchor 0.30.x |
| Database | Supabase (PostgreSQL 16) |
| Cache | Redis (Upstash in prod, Docker in local dev) |
| Agent Framework | ElizaOS 1.7.x |
| LLM (hosted skills) | Anthropic Claude claude-sonnet-4-6 (primary), GPT-4o (fallback) |
| Package Manager | pnpm 9.x (workspace) |
| Local Dev | solana-test-validator + Docker Compose |

---

## Key Architectural Decisions

### 1. Endpoint Privacy (CRITICAL)

**Decision:** Skill endpoint URLs are NEVER stored on-chain. They live in Supabase, protected by Row-Level Security, accessible only via service role key.

**Why:** Anyone calling `getProgramAccounts` on Solana can see all fields of a `SkillAccount`. If the endpoint were on-chain, competitors could call skills directly and bypass payment entirely. The platform must be the only authorized proxy.

**Implementation rule:** 
- `SkillAccount` on Solana has NO `endpoint` field
- Supabase `skills` table has `endpoint` column — **never included in API responses** to the browser
- All endpoint reads use `supabaseServiceRole` (server-side only), never `supabaseAnon`
- The `skills_public` view explicitly excludes `endpoint` and `system_prompt`

### 2. Three-Tier Skill Model

```
Tier 1 — Prompt Skill (no-code, anyone)
  Provider fills: name, description, system_prompt, model, tags, price_lamports
  Endpoint internally = /api/skill-executor/[skillId]  (platform-managed)
  Provider never touches a server

Tier 2 — Tool Skill (low-code, power users)
  Same as Tier 1 + tool_config (webhook URL + input/output mapping)
  Platform calls provider's webhook as an LLM tool

Tier 3 — Custom Agent (self-hosted, developers)
  Provider deploys own ElizaOS agent
  Registers HTTPS endpoint via two-step authenticated flow
  Platform proxies UI calls; agent-to-agent calls go direct via Solana polling
```

### 3. Two-Step Skill Registration

**Custom Agents (Tier 3) only** — Prompt/Tool skills use a single `/api/create-skill` call.

```
Step 1 (on-chain):  POST /api/register/prepare  → unsigned register_skill tx
                    User signs → SkillAccount created on Solana (no endpoint)

Step 2 (off-chain): POST /api/register/complete
                    Body: { skillId, endpoint, nonce, walletSignature: sign(skillId + endpoint + nonce) }
                    Server: verify signature → store endpoint in Supabase
```

**Anti-replay:** nonce = timestamp (server rejects if > 5 minutes old).

### 4. Two Call Paths

**Path A — Human via UI:**
Browser → `/api/call/prepare` (get unsigned tx) → sign with Phantom → `/api/call/execute` (server fetches endpoint privately, calls skill, settles on-chain) → result to browser

**Path B — Agent-to-Agent:**
Orchestrator agent initiates `initiate_call` tx on-chain → Skill agent polls Solana for `Pending` CallAccounts matching its skill_id → processes → submits `complete_call` tx → orchestrator polls `/api/call/[id]` for result. **No HTTP endpoint involved.**

### 5. Preview Mode on "Try it" Panel

The skill detail page has two modes:
- **Preview** (free, rate-limited 3/day per IP): Platform subsidizes fee, calls skill directly. For discovery.
- **Live** (real SOL payment, full escrow flow): Full on-chain payment.

---

## Monorepo Structure

```
swarm-marketplace/
├── apps/
│   ├── web/                    # Next.js 15 frontend + API routes
│   └── indexer/                # Cron: polls Solana → syncs Supabase
├── packages/
│   ├── contracts/              # Anchor workspace (skill_registry + escrow_payment)
│   ├── plugin-swarm/           # ElizaOS plugin (listen, complete, discover, call)
│   └── skill-template/         # Self-hosted agent starter kit (Tier 3)
├── demo/
│   ├── orchestrator-agent/
│   ├── skill-price-agent/      # Tier 1 prompt skill (demo)
│   ├── skill-news-agent/       # Tier 1 prompt skill (demo)
│   └── skill-sentiment-agent/  # Tier 1 prompt skill (demo)
├── docker-compose.yml           # Local: Postgres + Redis
├── CLAUDE.md                    # This file
├── README.md                    # Full SDD
├── package.json
└── pnpm-workspace.yaml
```

---

## Supabase Schema Rules

- `skills.endpoint` — service role only. NEVER in API responses. NEVER `NEXT_PUBLIC_`.
- `skills.system_prompt` — service role only. Never returned to browser.
- `skills.tool_config` — service role only.
- Read via `skills_public` view for all browser-facing queries.
- RLS enabled on all tables.

---

## Critical Constraints

1. **Never** put `SUPABASE_SERVICE_ROLE_KEY` in any `NEXT_PUBLIC_*` env var.
2. **Never** include `endpoint`, `system_prompt`, or `tool_config` in any API response.
3. **Always** use `supabaseServiceRole` client for endpoint lookups in API routes.
4. **Always** use `supabaseAnon` client for browser-side queries (queries via `skills_public` view).
5. Smart contract `register_skill` instruction has **no** `endpoint` parameter.
6. Platform fee = 5% (500 bps) — `PLATFORM_FEE_BPS=500`.

---

## Environment Variables

```bash
# apps/web/.env.local

# Public (safe for browser)
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_SKILL_REGISTRY_PROGRAM_ID=<deployed>
NEXT_PUBLIC_ESCROW_PROGRAM_ID=<deployed>
NEXT_PUBLIC_PLATFORM_TREASURY=<wallet>
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>

# Private (server-side only — NEVER NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
ANTHROPIC_API_KEY=<for_hosted_skill_executor>
PLATFORM_FEE_BPS=500
INTERNAL_API_KEY=<for_indexer_cron>
PREVIEW_RATE_LIMIT_DAILY=3
```

---

## Build Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Monorepo scaffold + Docker + tooling | TODO |
| 2 | Smart contracts (skill_registry + escrow_payment) + tests + devnet deploy | TODO |
| 3 | Supabase schema + all API routes + indexer | TODO |
| 4 | Frontend (marketplace, create, register, detail, dashboard, wallet) | TODO |
| 5 | Agent runtime (plugin-swarm, skill-template, orchestrator + 3 demo skills) | TODO |

---

## Demo Script (for judges)

```
1. Browse marketplace → 3+ live skills shown
2. Click "Stock Analyst" → "Try it" panel → Preview mode (free) → see result
3. Switch to Live mode → Phantom approves 0.001 SOL → see tx on Explorer
4. Create a new Prompt Skill (no-code) → fill form → connect wallet → sign → live in 30s
5. Dashboard → provider sees earnings
6. Terminal: run orchestrator agent
7. Ask: "Should I invest in NVIDIA?"
8. Watch: agent discovers 3 skills on-chain, pays each, synthesizes result
9. Explorer: show 3 payment txs settled
```

---

## Local Dev Commands

```bash
# Start local infra
docker compose up -d

# Start local Solana validator
solana-test-validator

# Deploy contracts
cd packages/contracts && anchor deploy

# Start frontend
cd apps/web && pnpm dev

# Start indexer
cd apps/indexer && pnpm dev
```
