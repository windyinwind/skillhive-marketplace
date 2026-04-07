# SWARM Marketplace — Software Design Document

> **Hackathon:** Agentic SWARM Hackathon (Colosseum)
> **Dates:** April 6 – May 11, 2026
> **Prize Pool:** $250,000 total | $25,000 SWARM track
> **Chain:** Solana
> **Submission Deadline:** May 11, 2026

> **Architecture revision:** Endpoint Privacy + Platform-Hosted Skills (Option B). See §3 and §4.

---

## 1. Project Overview

### 1.1 Problem Statement

AI agents are becoming economic actors, but the infrastructure for them to:
- **Discover** other agents/skills
- **Coordinate** task delegation
- **Pay** each other autonomously
- **Build reputation** over time

...does not exist in a unified, open, consumer-accessible way.

### 1.2 Solution

**SWARM Marketplace** — An open platform where:
- Anyone can **register** an AI agent/skill and earn SOL per call
- Anyone can **browse and call** skills directly from a website
- Other **AI agents** can discover and call skills autonomously
- All payments, reputation, and history are **on-chain** (Solana)

### 1.3 Hackathon Fit

| Hackathon Requirement | How We Address It |
|---|---|
| Agent discovery infrastructure | On-chain skill registry with capability queries |
| Agent reputation system | On-chain scoring updated after every call |
| Agent coordination | Orchestrator agent delegates to registered skills |
| Agent payment rails | Escrow smart contract with auto-settlement |
| Agentic SWARM | Multi-agent demo: orchestrator + 3+ specialist skills |
| Solana ecosystem | Anchor smart contracts + Solana wallet adapter |

---

## 2. Architecture Overview

### 2.1 Core Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          SWARM Marketplace                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐         ┌──────────────────────────────────┐  │
│   │   Next.js Web   │         │      Solana Smart Contracts      │  │
│   │   (Frontend)    │◄───────►│      (Anchor Programs)           │  │
│   │                 │         │                                  │  │
│   │ • Marketplace   │         │ • skill_registry (PDA: no URL)   │  │
│   │ • /create skill │         │ • escrow_payment (CallAccount)   │  │
│   │ • /register     │         │                                  │  │
│   │ • Try-it panel  │         └──────────────┬───────────────────┘  │
│   │ • Dashboard     │                        │                      │
│   └────────┬────────┘                        │                      │
│            │                                 │                      │
│            ▼                                 │                      │
│   ┌─────────────────┐         ┌──────────────▼───────────────────┐  │
│   │   API Gateway   │         │         Supabase                 │  │
│   │ (Next.js routes)│◄───────►│ • skills table (endpoint: PRIV)  │  │
│   │                 │         │ • skills_public view (safe)      │  │
│   │ • /api/skills   │         │ • calls table                    │  │
│   │ • /api/call/*   │         │ • RLS on all tables              │  │
│   │ • /api/register │         └──────────────────────────────────┘  │
│   │ • /api/create-  │                                               │
│   │   skill         │         ┌──────────────────────────────────┐  │
│   │ • /api/skill-   │         │     Skill Agent Runtime          │  │
│   │   executor/*    │◄───────►│     (ElizaOS — Tier 3 only)      │  │
│   └─────────────────┘         │ • Self-hosted by provider        │  │
│                                │ • Polls Solana for pending calls │  │
│                                │ • Submits complete_call tx       │  │
│                                └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Endpoint Privacy (Critical Design Decision)

```
BEFORE (insecure):   SkillAccount on-chain → endpoint field visible
                     Anyone with getProgramAccounts can call skills for free

AFTER (this design): SkillAccount on-chain → NO endpoint field
                     Endpoint stored in Supabase → service role only
                     Platform API is the only authorized proxy
```

### 2.3 Call Path A — Human via UI

```
Browser          API Gateway         Supabase        Skill / Executor
   │                  │                  │                  │
   ├─ POST /call/prepare ─►              │                  │
   │◄─ unsigned escrow tx ─              │                  │
   ├─ sign (Phantom) ──────────────────────────────────► Solana
   ├─ POST /call/execute ─►              │                  │
   │                  ├─ SELECT endpoint ─►                 │
   │                  │◄─ endpoint (private) ─              │
   │                  ├─ POST input ──────────────────────► │
   │                  │◄─ result ─────────────────────────  │
   │                  ├─ complete_call tx ──────────────► Solana
   │◄─ result ────────┘                  │                  │
```

### 2.4 Call Path B — Agent-to-Agent (ElizaOS SWARM plugin)

```
Orchestrator Agent                              Skill Agent
       │                                             │
       ├─ DISCOVER_SKILLS(tags) → GET /api/skills    │
       ├─ CALL_SKILL(skillId, input)                 │
       │       └─ initiate_call tx ──────────────► Solana
       │                                             │
       │                                 polls Solana for pending
       │                                 CallAccounts (own skill_id)
       │                                             │
       │                                  processCall(input)
       │                                             │
       │                                  complete_call tx ──► Solana
       ├─ polls GET /api/call/{callId} ──────────────►
       │◄─ result_hash + completion ─────────────────┘
```

> **Key insight:** Agent-to-agent calls never use HTTP endpoints. Skill agents poll Solana directly using their own keypair. The endpoint is only used for Path A (platform API proxying UI calls).

---

## 3. Three-Tier Skill Model

The platform supports three types of skills, from no-code to fully self-hosted:

### Tier 1 — Prompt Skill (no-code)

```
Who:       Anyone — no server required
Provider:  Fills in name, description, system_prompt, model, tags, price_lamports
Endpoint:  Internally = /api/skill-executor/[skillId]  (platform-managed)
Storage:   system_prompt + model stored in Supabase (service role only)
Flow:      Single POST /api/create-skill → on-chain register + Supabase insert
```

The platform's hosted executor (`/api/skill-executor/[skillId]`) fetches the private `system_prompt` from Supabase via service role key and calls the LLM on the provider's behalf.

### Tier 2 — Tool Skill (low-code)

```
Who:       Power users who want to integrate an external API
Provider:  Fills in Tier 1 fields + tool_config (webhook URL + input/output mapping)
Endpoint:  Same as Tier 1 — platform executor calls provider's webhook as an LLM tool
Storage:   tool_config stored in Supabase (service role only)
```

The executor runs the LLM with a tool definition; when the LLM calls the tool, the platform POSTs to the provider's webhook URL.

### Tier 3 — Custom Agent (self-hosted)

```
Who:       Developers who want full control
Provider:  Deploys their own ElizaOS agent, registers its HTTPS endpoint
Endpoint:  Provider's server — stored in Supabase (service role only)
Flow:      Two-step registration (see §6.3)
```

---

## 4. Tech Stack

### 3.1 Smart Contracts
| Component | Technology | Version |
|---|---|---|
| Framework | Anchor | 0.30.x |
| Language | Rust | 1.79+ |
| Network | Solana Devnet → Mainnet | - |
| Token | Native SOL + USDC (SPL) | - |
| Testing | Anchor test suite + Bankrun | - |

### 3.2 Frontend
| Component | Technology | Version |
|---|---|---|
| Framework | Next.js | 15.x (App Router) |
| Language | TypeScript | 5.x |
| Styling | TailwindCSS + shadcn/ui | latest |
| Wallet | @solana/wallet-adapter-react | latest |
| Blockchain Client | @solana/web3.js v2 | 2.x |
| Anchor Client | @coral-xyz/anchor | 0.30.x |
| State Management | Zustand | 5.x |
| Data Fetching | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | latest |

### 3.3 Agent Runtime
| Component | Technology | Version |
|---|---|---|
| Agent Framework | ElizaOS | 1.7.x |
| Language | TypeScript | 5.x |
| LLM Provider | Anthropic Claude (primary) | claude-sonnet-4-6 |
| LLM Fallback | OpenAI GPT | gpt-4o |
| Solana Plugin | @elizaos/plugin-solana | latest |
| Package Manager | pnpm | 9.x |

### 3.4 Backend / API
| Component | Technology |
|---|---|
| API Routes | Next.js API Routes (serverless) |
| Database | PostgreSQL (Supabase) — off-chain metadata cache |
| Cache | Redis (Upstash) — skill listings cache |
| File Storage | IPFS via Pinata — skill metadata |

### 3.5 Infrastructure
| Component | Technology |
|---|---|
| Frontend Hosting | Vercel |
| Agent Hosting | Railway or Fly.io (per-skill VPS) |
| Domain | Custom domain |
| Monitoring | Vercel Analytics + Sentry |

---

## 5. Solana Smart Contracts (Anchor)

### 5.1 Program: `skill_registry`

**Purpose:** Store all registered skills on-chain. Source of truth for discovery.

> **Critical:** `SkillAccount` has NO `endpoint` field. Endpoints are stored in Supabase only.

```
Program ID: [generated on deploy]
Account Structure:

SkillAccount (PDA: ["skill", skill_id])
├── id: [u8; 32]              // unique skill ID
├── owner: Pubkey             // wallet of skill provider
├── name: String (64)         // display name
├── description: String (256) // what it does
├── tags: Vec<String>         // e.g. ["finance", "stocks"]
├── price_lamports: u64       // price per call in lamports
├── total_calls: u64          // lifetime call count
├── reputation_score: u16     // 0–1000, updated per call
├── is_active: bool           // provider can pause/unpause
├── created_at: i64           // unix timestamp
└── bump: u8

NOTE: No endpoint field. Anyone querying getProgramAccounts
      sees only public data. Endpoint lives in Supabase.
```

**Instructions:**
```rust
// 1. Register a new skill (no endpoint param — endpoint is off-chain)
pub fn register_skill(
    ctx: Context<RegisterSkill>,
    skill_id: [u8; 32],
    name: String,
    description: String,
    tags: Vec<String>,
    price_lamports: u64,
) -> Result<()>

// 2. Update skill details (owner only)
pub fn update_skill(
    ctx: Context<UpdateSkill>,
    description: Option<String>,
    price_lamports: Option<u64>,
    is_active: Option<bool>,
) -> Result<()>

// 3. Query skills by tag (called off-chain, read-only)
// → Use getProgramAccounts filter on tags field

// 4. Update reputation (called by EscrowPayment program via CPI)
pub fn update_reputation(
    ctx: Context<UpdateReputation>,
    call_id: [u8; 32],
    score: u8,  // 1–5 star rating
) -> Result<()>
```

---

### 5.2 Program: `escrow_payment`

**Purpose:** Handle payment flow between callers and skill providers.

```
CallAccount (PDA: ["call", call_id])
├── call_id: [u8; 32]
├── skill_id: [u8; 32]
├── caller: Pubkey
├── skill_owner: Pubkey
├── amount_lamports: u64
├── input_hash: [u8; 32]     // sha256(input) — privacy
├── result_hash: [u8; 32]    // sha256(result) — filled on complete
├── status: CallStatus       // Pending | Completed | Refunded
├── created_at: i64
├── completed_at: i64
└── bump: u8

enum CallStatus { Pending, Completed, Refunded }
```

**Instructions:**
```rust
// 1. Initiate a call — locks payment in escrow
pub fn initiate_call(
    ctx: Context<InitiateCall>,
    call_id: [u8; 32],
    skill_id: [u8; 32],
    input_hash: [u8; 32],
) -> Result<()>
// → Transfers price_lamports from caller to escrow PDA

// 2. Complete a call — releases payment
pub fn complete_call(
    ctx: Context<CompleteCall>,
    call_id: [u8; 32],
    result_hash: [u8; 32],
) -> Result<()>
// → 95% to skill_owner
// → 5% to platform treasury wallet
// → CPI call to skill_registry to update reputation

// 3. Refund (if skill doesn't respond within timeout)
pub fn refund_call(
    ctx: Context<RefundCall>,
    call_id: [u8; 32],
) -> Result<()>
// → Returns lamports to caller
// → Marks skill as failed (reputation penalty)
```

---

## 6. Frontend (Next.js)

### 6.1 Pages & Routes

```
app/
├── page.tsx                    # Landing page + hero
├── marketplace/
│   └── page.tsx                # Browse all skills
├── skill/
│   └── [id]/
│       └── page.tsx            # Skill detail + Try-it panel (Preview + Live)
├── create/
│   └── page.tsx                # No-code skill creator (Tier 1 + 2)
├── register/
│   └── page.tsx                # Self-hosted agent registration (Tier 3, two-step)
├── dashboard/
│   └── page.tsx                # Provider earnings + call history
├── docs/
│   └── page.tsx                # How to register, SDK docs
└── api/
    ├── skills/
    │   ├── route.ts             # GET /api/skills  (queries skills_public view)
    │   └── [id]/route.ts        # GET /api/skills/[id]
    ├── create-skill/
    │   └── route.ts             # POST /api/create-skill  (Tier 1+2, single step)
    ├── register/
    │   ├── prepare/route.ts     # POST /api/register/prepare  (Tier 3 step 1: unsigned tx)
    │   └── complete/route.ts    # POST /api/register/complete (Tier 3 step 2: endpoint)
    ├── call/
    │   ├── prepare/route.ts     # POST /api/call/prepare  (unsigned escrow tx)
    │   ├── execute/route.ts     # POST /api/call/execute  (proxy + settle)
    │   └── [id]/route.ts        # GET  /api/call/[id]     (poll for result)
    ├── skill-executor/
    │   └── [skillId]/route.ts   # POST /api/skill-executor/[skillId] (internal)
    ├── dashboard/
    │   └── [wallet]/route.ts    # GET /api/dashboard/[wallet]
    └── indexer/
        └── sync/route.ts        # POST /api/indexer/sync  (cron, INTERNAL_API_KEY)
```

### 6.2 Key Components

```typescript
// components/SkillCard.tsx
interface SkillCardProps {
  id: string
  name: string
  description: string
  tags: string[]
  priceSOL: number
  reputationScore: number  // 0–1000
  totalCalls: number
  owner: string            // truncated wallet address
}

// components/TryItPanel.tsx
// — Toggle: Preview (free, rate-limited 3/day per IP) | Live (real SOL)
// — Text input for user query
// — Preview: calls /api/call/execute directly (platform subsidizes)
// — Live: /api/call/prepare → sign (Phantom) → /api/call/execute
// — Shows result + tx signature + SOL deducted

// components/CreateSkillForm.tsx  (Tier 1+2 — no-code)
// — Name, description, tags (multi-select)
// — System prompt textarea
// — Model selector (claude-sonnet-4-6, gpt-4o)
// — Optional: tool_config (webhook URL + field mapping) → Tier 2
// — Price per call (SOL input with USD estimate)
// — Connect wallet → single POST /api/create-skill → sign register_skill tx

// components/RegisterForm.tsx  (Tier 3 — self-hosted agent)
// — Skill ID (from Step 1 on-chain tx)
// — Endpoint URL input (validated with test ping)
// — Wallet sign → POST /api/register/complete

// components/EarningsDashboard.tsx
// — Total earned (SOL)
// — Call history table (call_id, input_hash, result_hash, amount, timestamp)
// — Skill performance chart
// — Pause/unpause skill toggle
```

### 6.3 Wallet Integration

```typescript
// providers/WalletProvider.tsx
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'

// Supported wallets: Phantom, Solflare, Backpack
```

### 6.4 On-chain Read (skill listing)

```typescript
// lib/registry.ts
import { Connection, PublicKey } from '@solana/web3.js'
import { Program, AnchorProvider } from '@coral-xyz/anchor'

export async function getAllSkills(): Promise<SkillAccount[]> {
  const accounts = await program.account.skillAccount.all()
  return accounts
    .filter(a => a.account.isActive)
    .sort((a, b) => b.account.reputationScore - a.account.reputationScore)
}

export async function getSkillsByTag(tag: string): Promise<SkillAccount[]> {
  return program.account.skillAccount.all([
    { memcmp: { offset: TAG_OFFSET, bytes: bs58.encode(Buffer.from(tag)) } }
  ])
}
```

---

## 7. Registration Flows

### 7.1 Tier 1 + 2 — No-code / Low-code (Single Step)

```
Browser                          API Gateway              Supabase         Solana
   │                                  │                       │               │
   ├─ POST /api/create-skill ─────────►                       │               │
   │  { name, system_prompt, model,   │                       │               │
   │    tool_config?, tags, price,    │                       │               │
   │    ownerWallet }                 │                       │               │
   │                                  ├─ generate skill_id    │               │
   │                                  ├─ INSERT skills row ──►│               │
   │                                  │  { endpoint:          │               │
   │                                  │    /api/skill-        │               │
   │                                  │    executor/[id],     │               │
   │                                  │    system_prompt,     │               │
   │                                  │    ... }              │               │
   │◄─ { unsignedTx, skillId } ───────│                       │               │
   ├─ sign (Phantom) ──────────────────────────────────────────────────────► Solana
   │◄─ tx confirmed ──────────────────────────────────────────────────────── │
```

### 7.2 Tier 3 — Self-Hosted Agent (Two Steps)

```
Step 1 — On-chain registration (no endpoint):
   POST /api/register/prepare
   Body: { name, description, tags, price_lamports, ownerWallet }
   Response: { unsignedTx: Transaction, skillId: string }
   → User signs → SkillAccount created on Solana (no endpoint field)

Step 2 — Off-chain endpoint registration (authenticated):
   POST /api/register/complete
   Body: {
     skillId: string,
     endpoint: string,          // provider's HTTPS URL
     nonce: number,             // Unix timestamp ms (server rejects if > 5 min old)
     walletSignature: string    // sign(skillId + endpoint + nonce)
   }
   Server:
     1. Verify nonce is fresh (anti-replay)
     2. Verify walletSignature against SkillAccount.owner on-chain
     3. Store endpoint in Supabase skills table (service role)
   Response: { success: true }
```

---

## 8. Hosted Skill Executor

For Tier 1 and Tier 2 skills, the platform runs the LLM on behalf of the provider.

```typescript
// POST /api/skill-executor/[skillId]
// Called internally by /api/call/execute — never exposed to browser directly
// Body: { input: string, callId: string }

export async function POST(req: Request, { params }) {
  // 1. Fetch private config — service role only, never anon
  const { system_prompt, model_config, tool_config } = await supabaseServiceRole
    .from('skills')
    .select('system_prompt, model_config, tool_config')
    .eq('id', params.skillId)
    .single()

  // 2. Call LLM (Anthropic primary, GPT-4o fallback)
  const result = await anthropic.messages.create({
    model: model_config.model ?? 'claude-sonnet-4-6',
    system: system_prompt,
    messages: [{ role: 'user', content: input }],
    tools: tool_config ? [buildTool(tool_config)] : [],
  })

  // 3. If LLM called a tool → forward to provider's webhook (Tier 2)
  if (tool_config && result.stop_reason === 'tool_use') {
    const toolResult = await fetch(tool_config.webhook_url, {
      method: 'POST', body: JSON.stringify(extractToolInput(result))
    })
    // Feed tool result back to LLM for final answer
  }

  return Response.json({ result: extractText(result) })
}
```

---

## 9. Agent Runtime (ElizaOS)

### 9.1 Skill Provider Template

Every skill provider gets this template to customize:

```typescript
// skill-template/src/index.ts
import { AgentRuntime, elizaLogger } from '@elizaos/core'
import { solanaPlugin } from '@elizaos/plugin-solana'
import { Connection, Keypair } from '@solana/web3.js'
import { swarmPlugin } from '@swarm/plugin'  // our custom plugin

const character = {
  name: process.env.SKILL_NAME,
  bio: [process.env.SKILL_DESCRIPTION],
  system: process.env.SKILL_SYSTEM_PROMPT,
  plugins: [solanaPlugin, swarmPlugin],
  settings: {
    secrets: {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY,
    }
  }
}

// ← SKILL PROVIDER ONLY EDITS THIS FUNCTION
async function executeSkill(input: string): Promise<string> {
  // Example: stock analyst skill
  const price = await fetchStockPrice(input)
  const news = await fetchStockNews(input)
  return await llm.run(`
    Analyze ${input}: Price=${price}, News=${news}
    Give a buy/hold/sell recommendation with reasoning.
  `)
}

// Framework handles everything else:
// - Listening for on-chain task assignments
// - Verifying payment was escrowed
// - Running executeSkill(input)
// - Submitting result hash on-chain
// - Receiving payment release
```

### 9.2 SWARM Plugin (our custom ElizaOS plugin)

```typescript
// packages/plugin-swarm/src/index.ts
export const swarmPlugin: Plugin = {
  name: 'swarm-marketplace',
  description: 'Connect ElizaOS agents to SWARM Marketplace',

  actions: [
    // Action: Listen for assigned tasks on-chain
    {
      name: 'LISTEN_FOR_TASKS',
      handler: async (runtime) => {
        // Poll Solana for CallAccounts with this agent's skill_id
        // status = Pending
        const pendingCalls = await getPendingCalls(runtime.wallet)
        for (const call of pendingCalls) {
          await processCall(runtime, call)
        }
      }
    },

    // Action: Submit result and trigger payment
    {
      name: 'COMPLETE_TASK',
      handler: async (runtime, callId, result) => {
        const resultHash = sha256(result)
        await program.methods
          .completeCall(callId, resultHash)
          .rpc()
        // Payment auto-releases to skill owner wallet
      }
    },

    // Action: Discover other skills (for orchestrator agents)
    {
      name: 'DISCOVER_SKILLS',
      handler: async (runtime, tags: string[]) => {
        return await getAllSkillsByTags(tags)
      }
    },

    // Action: Call another skill (agent-to-agent)
    {
      name: 'CALL_SKILL',
      handler: async (runtime, skillId: string, input: string) => {
        // 1. Initiate escrow payment on-chain
        const callId = await initiateCall(skillId, input)
        // 2. Wait for skill to complete (poll on-chain)
        const result = await waitForResult(callId)
        return result
      }
    }
  ]
}
```

### 9.3 Orchestrator Agent (Demo)

```typescript
// demo/orchestrator-agent/src/index.ts
// This agent coordinates 3 specialist skills to answer:
// "Should I invest in NVIDIA?"

const OrchestratorAgent = {
  name: "InvestmentAdvisor",
  system: `You are an investment advisor.
    You have access to specialist skills via the SWARM marketplace.
    Break complex questions into sub-tasks and delegate to specialists.
    Synthesize results into a final recommendation.`,

  // When asked "Should I invest in NVIDIA?":
  // 1. DISCOVER_SKILLS(["stock_price"])     → finds PriceAgent
  // 2. DISCOVER_SKILLS(["news"])            → finds NewsAgent
  // 3. DISCOVER_SKILLS(["sentiment"])       → finds SentimentAgent
  // 4. CALL_SKILL(priceAgent, "NVDA")       → pays 0.001 SOL, gets price
  // 5. CALL_SKILL(newsAgent, "NVIDIA")      → pays 0.001 SOL, gets news
  // 6. CALL_SKILL(sentimentAgent, "NVDA")   → pays 0.001 SOL, gets sentiment
  // 7. Synthesizes all 3 → returns recommendation to user
}
```

---

## 10. Database Schema (Supabase — off-chain cache + private config)

```sql
-- Skill type enum
CREATE TYPE skill_type AS ENUM ('prompt', 'tool', 'custom_agent');

-- Main skills table — synced from on-chain by indexer + enriched with private config
CREATE TABLE skills (
  id                    TEXT PRIMARY KEY,   -- matches on-chain skill_id (uuid)
  owner_wallet          TEXT NOT NULL,

  -- PRIVATE: server-side only, never returned to browser
  endpoint              TEXT,               -- HTTPS URL (null for Tier 1+2 = platform executor)
  endpoint_verified_at  TIMESTAMPTZ,        -- last successful health-check
  system_prompt         TEXT,               -- Tier 1+2: LLM system prompt
  model_config          JSONB,              -- Tier 1+2: { model, temperature, max_tokens }
  tool_config           JSONB,              -- Tier 2 only: { webhook_url, input_schema, output_schema }

  -- PUBLIC: mirrored from on-chain by indexer
  skill_type            skill_type NOT NULL DEFAULT 'prompt',
  name                  TEXT NOT NULL,
  description           TEXT,
  tags                  TEXT[],
  price_lamports        BIGINT,
  reputation_score      INT DEFAULT 500,
  total_calls           BIGINT DEFAULT 0,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ,

  -- PUBLIC: off-chain enrichment
  logo_url              TEXT,
  provider_name         TEXT,
  long_description      TEXT
);

-- RLS: enable on all tables
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can SELECT (but only via skills_public view — endpoint not exposed)
CREATE POLICY "Public read"
  ON skills FOR SELECT USING (true);

-- Policy: only service role can INSERT/UPDATE/DELETE
-- (enforced by only using service role key in API routes)

-- Public view — NEVER includes endpoint, system_prompt, model_config, tool_config
CREATE VIEW skills_public AS
  SELECT
    id, owner_wallet, skill_type,
    name, description, tags,
    price_lamports, reputation_score, total_calls,
    is_active, created_at,
    logo_url, provider_name, long_description
  FROM skills;

-- Calls table
CREATE TABLE calls (
  call_id         TEXT PRIMARY KEY,         -- matches on-chain call_id
  skill_id        TEXT REFERENCES skills(id),
  caller_wallet   TEXT,
  amount_lamports BIGINT,
  status          TEXT CHECK (status IN ('pending', 'completed', 'refunded')),
  input_hash      TEXT,                     -- sha256(input) — privacy
  result_hash     TEXT,                     -- sha256(result) — filled on complete
  tx_signature    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON calls FOR SELECT USING (true);

-- Ratings
CREATE TABLE skill_ratings (
  id         SERIAL PRIMARY KEY,
  call_id    TEXT REFERENCES calls(call_id),
  skill_id   TEXT REFERENCES skills(id),
  score      INT CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE skill_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON skill_ratings FOR SELECT USING (true);

-- Full-text search index
CREATE INDEX skills_search ON skills USING gin(
  to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || array_to_string(tags, ' '))
);
```

> **Rule:** All browser-facing queries MUST use the `skills_public` view via `supabaseAnon`.
> All endpoint/system_prompt reads MUST use `supabaseServiceRole` in server-side API routes only.

---

## 11. API Routes (Next.js)

```typescript
// ─── Skill Discovery ────────────────────────────────────────────────────────

// GET /api/skills
// Query params: tag, skillType, minReputation, maxPrice, search, page, limit
// Reads from skills_public view (supabaseAnon) — endpoint never included
Response: { skills: PublicSkill[], total: number, page: number }

// GET /api/skills/[id]
// Reads from skills_public view
Response: PublicSkill & { recentCalls: number, avgRating: number }

// ─── Skill Creation ──────────────────────────────────────────────────────────

// POST /api/create-skill   (Tier 1 + 2 — no-code)
// Inserts Supabase row (service role) + returns unsigned register_skill tx
Body: {
  name: string, description: string, tags: string[],
  priceLamports: number, ownerWallet: string,
  systemPrompt: string, modelConfig: { model: string, ... },
  toolConfig?: { webhookUrl: string, inputSchema: object }  // Tier 2 only
}
Response: { unsignedTx: string, skillId: string }

// POST /api/register/prepare   (Tier 3 step 1 — custom agent)
// Returns unsigned register_skill tx (no endpoint param)
Body: { name, description, tags, priceLamports, ownerWallet }
Response: { unsignedTx: string, skillId: string }

// POST /api/register/complete   (Tier 3 step 2 — store endpoint)
// Verifies wallet ownership + stores endpoint in Supabase (service role)
Body: {
  skillId: string,
  endpoint: string,
  nonce: number,             // Unix ms timestamp — server rejects if > 5 min old
  walletSignature: string    // sign(skillId + endpoint + nonce)
}
Response: { success: true }

// ─── Skill Calls ─────────────────────────────────────────────────────────────

// POST /api/call/prepare
// Returns unsigned escrow tx for wallet to sign
Body: { skillId: string, input: string, callerWallet: string }
Response: { unsignedTx: string, callId: string }

// POST /api/call/execute
// Fetches endpoint (service role), calls skill, settles on-chain
// Also handles Preview mode (no callerTx — platform subsidizes)
Body: { callId: string, signedTx?: string, input: string, preview?: boolean }
Response: { result: string, txSignature: string }

// GET /api/call/[id]
// Poll for result (used by agent-to-agent Path B)
Response: { status: 'pending'|'completed'|'refunded', result?: string, resultHash?: string }

// ─── Internal ────────────────────────────────────────────────────────────────

// POST /api/skill-executor/[skillId]
// Internal only — called by /api/call/execute, not by browser
// Fetches system_prompt + model_config (service role), calls LLM
Body: { input: string, callId: string }
Response: { result: string }

// GET /api/dashboard/[wallet]
Response: { totalEarned: number, calls: Call[], skills: PublicSkill[] }

// POST /api/indexer/sync
// Cron: syncs on-chain SkillAccount data to Supabase
// Protected by INTERNAL_API_KEY header
Body: { fromSlot?: number }
Response: { synced: number, errors: number }
```

---

## 12. Monorepo Structure

```
swarm-marketplace/
├── apps/
│   ├── web/                          # Next.js 15 (App Router)
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing
│   │   │   ├── marketplace/page.tsx  # Browse skills
│   │   │   ├── skill/[id]/page.tsx   # Detail + Try-it panel
│   │   │   ├── create/page.tsx       # No-code skill creator (Tier 1+2)
│   │   │   ├── register/page.tsx     # Self-hosted registration (Tier 3)
│   │   │   ├── dashboard/page.tsx    # Provider earnings
│   │   │   └── api/
│   │   │       ├── skills/route.ts
│   │   │       ├── skills/[id]/route.ts
│   │   │       ├── create-skill/route.ts
│   │   │       ├── register/prepare/route.ts
│   │   │       ├── register/complete/route.ts
│   │   │       ├── call/prepare/route.ts
│   │   │       ├── call/execute/route.ts
│   │   │       ├── call/[id]/route.ts
│   │   │       ├── skill-executor/[skillId]/route.ts
│   │   │       ├── dashboard/[wallet]/route.ts
│   │   │       └── indexer/sync/route.ts
│   │   ├── components/
│   │   │   ├── SkillCard.tsx
│   │   │   ├── TryItPanel.tsx        # Preview + Live toggle
│   │   │   ├── CreateSkillForm.tsx   # Tier 1+2 no-code
│   │   │   ├── RegisterForm.tsx      # Tier 3 two-step
│   │   │   └── EarningsDashboard.tsx
│   │   ├── lib/
│   │   │   ├── anchor/               # IDL + program client
│   │   │   ├── solana/               # web3.js helpers
│   │   │   └── supabase/
│   │   │       ├── client.ts         # supabaseAnon (browser-safe)
│   │   │       └── server.ts         # supabaseServiceRole (server only)
│   │   ├── providers/
│   │   │   └── WalletProvider.tsx
│   │   └── package.json
│   │
│   └── indexer/                      # Standalone cron job
│       ├── src/
│       │   └── index.ts              # Polls Solana → writes to Supabase
│       └── package.json
│
├── packages/
│   ├── contracts/                    # Anchor workspace
│   │   ├── programs/
│   │   │   ├── skill_registry/
│   │   │   │   └── src/lib.rs        # SkillAccount (no endpoint field)
│   │   │   └── escrow_payment/
│   │   │       └── src/lib.rs
│   │   ├── tests/
│   │   │   ├── skill_registry.ts
│   │   │   └── escrow_payment.ts
│   │   └── Anchor.toml
│   │
│   ├── plugin-swarm/                 # ElizaOS plugin
│   │   └── src/
│   │       ├── actions/
│   │       │   ├── listen-for-tasks.ts
│   │       │   ├── complete-task.ts
│   │       │   ├── discover-skills.ts
│   │       │   └── call-skill.ts
│   │       └── index.ts
│   │
│   └── skill-template/               # Tier 3 agent starter kit
│       ├── src/
│       │   ├── index.ts              # Agent entrypoint
│       │   ├── skill.ts              # ← PROVIDER EDITS THIS ONLY
│       │   └── character.ts
│       ├── .env.example
│       └── Dockerfile
│
├── demo/
│   ├── orchestrator-agent/           # Multi-agent demo driver
│   ├── skill-price-agent/            # Tier 1 prompt skill
│   ├── skill-news-agent/             # Tier 1 prompt skill
│   └── skill-sentiment-agent/        # Tier 1 prompt skill
│
├── docker-compose.yml                # Local: Postgres 16 + Redis 7
├── CLAUDE.md                         # Project memory for Claude Code
├── README.md                         # This file (SDD)
├── package.json                      # pnpm workspace root
└── pnpm-workspace.yaml
```

---

## 13. Environment Variables

```bash
# apps/web/.env.local

# ── Public (safe for browser) ──────────────────────────────────────
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_SKILL_REGISTRY_PROGRAM_ID=<deployed>
NEXT_PUBLIC_ESCROW_PROGRAM_ID=<deployed>
NEXT_PUBLIC_PLATFORM_TREASURY=<treasury_wallet_pubkey>
NEXT_PUBLIC_SUPABASE_URL=<supabase_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>

# ── Private (server-side ONLY — NEVER prefix with NEXT_PUBLIC_) ────
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>   # reads endpoint, system_prompt
ANTHROPIC_API_KEY=<key>                        # hosted skill executor
PLATFORM_FEE_BPS=500                           # 5% = 500 basis points
INTERNAL_API_KEY=<random_secret>               # indexer cron auth
PREVIEW_RATE_LIMIT_DAILY=3                     # free preview calls per IP

# apps/indexer/.env
SOLANA_RPC=https://api.devnet.solana.com
SUPABASE_URL=<same>
SUPABASE_SERVICE_ROLE_KEY=<same>
INTERNAL_API_KEY=<same>
SKILL_REGISTRY_PROGRAM_ID=<same>

# packages/skill-template/.env  (Tier 3 self-hosted agents)
SKILL_NAME="My Stock Analyst"
SOLANA_PRIVATE_KEY=<skill_agent_wallet_keypair>
SKILL_REGISTRY_PROGRAM_ID=<same_as_above>
ESCROW_PROGRAM_ID=<same_as_above>
ANTHROPIC_API_KEY=<claude_api_key>
PORT=3001
```

---

## 14. Hackathon Deliverables Checklist

### Required for Submission
- [ ] Public GitHub repo
- [ ] Deployed on Solana Devnet (Mainnet bonus)
- [ ] Working demo video (3–5 min)
- [ ] Deployed website URL
- [ ] Solana wallet verification

### Demo Script (for judges)
```
1. Browse marketplace → 3+ live skills shown (Tier 1 prompt skills)
2. Click "Stock Analyst" → "Try it" panel → Preview mode (free) → see result
3. Switch to Live mode → Phantom approves 0.001 SOL → see tx on Explorer
4. Create a new Prompt Skill (no-code) → fill form → connect wallet → sign → live in 30s
5. Dashboard → provider sees earnings updated
6. Terminal: run orchestrator agent
7. Ask: "Should I invest in NVIDIA?"
8. Watch: agent discovers 3 skills on-chain, pays each via escrow, synthesizes result
9. Explorer: show 3 payment txs settled on Solana
```

### Judging Criteria Addressed
| Criterion | Evidence |
|---|---|
| Technical Innovation | First platform combining discovery + payment + reputation + UI |
| Solana Integration | 2 Anchor programs, native SOL escrow, wallet adapter |
| Real Agentic Behavior | Orchestrator autonomously discovers, pays, delegates to specialists |
| Working Product | Live website, callable skills, real SOL transfers |
| Market Potential | Platform fee model, open registration, network effects |

---

## 15. Local Dev Stack

| Service | Production | Local Dev |
|---|---|---|
| Solana | Devnet | `solana-test-validator` |
| PostgreSQL | Supabase | Docker (`postgres:16`) |
| Redis | Upstash | Docker (`redis:7`) |
| IPFS | Pinata | Skip (placeholder URLs) |
| Frontend | Vercel | `pnpm dev` (Next.js) |
| Indexer | Cron (Vercel/Railway) | `pnpm dev` (local polling) |
| Agents | Railway / Fly.io | `pnpm dev` locally |

```bash
# 1. Start local infra
docker compose up -d              # Postgres + Redis

# 2. Start Solana validator
solana-test-validator

# 3. Deploy contracts
cd packages/contracts && anchor deploy

# 4. Run Supabase migrations
supabase db push                  # or apply SQL manually

# 5. Start frontend + indexer
cd apps/web && pnpm dev
cd apps/indexer && pnpm dev
```

---

## 16. 5-Phase Build Plan

### Phase 1 — Foundation (Apr 6–8)
- [ ] Monorepo scaffold: `pnpm-workspace.yaml`, root `package.json`, `tsconfig`s
- [ ] `docker-compose.yml` (Postgres 16 + Redis 7)
- [ ] `apps/web`: Next.js 15 + Tailwind + shadcn/ui init
- [ ] `apps/indexer`: bare TypeScript project
- [ ] Supabase client split: `lib/supabase/client.ts` (anon) + `lib/supabase/server.ts` (service role)
- [ ] `WalletProvider.tsx` (Phantom, Solflare, Backpack)

### Phase 2 — Smart Contracts (Apr 8–14)
- [ ] Anchor workspace init (`packages/contracts`)
- [ ] `skill_registry` program — `SkillAccount` (no endpoint field), `register_skill`, `update_skill`, `update_reputation`
- [ ] `escrow_payment` program — `CallAccount`, `initiate_call`, `complete_call`, `refund_call`
- [ ] Bankrun tests for both programs
- [ ] Deploy to Devnet + generate TypeScript IDL

### Phase 3 — Database + API Routes (Apr 14–21)
- [ ] Supabase schema migration (skills, calls, skill_ratings, skills_public view, RLS)
- [ ] `POST /api/create-skill` (Tier 1+2)
- [ ] `POST /api/register/prepare` + `POST /api/register/complete` (Tier 3)
- [ ] `POST /api/call/prepare` + `POST /api/call/execute` + `GET /api/call/[id]`
- [ ] `POST /api/skill-executor/[skillId]` (hosted LLM executor)
- [ ] `GET /api/skills` + `GET /api/skills/[id]`
- [ ] `GET /api/dashboard/[wallet]`
- [ ] `apps/indexer`: poll Solana → sync Supabase

### Phase 4 — Frontend (Apr 21–28)
- [ ] Marketplace page (`/marketplace`)
- [ ] Skill detail page + TryItPanel (Preview + Live modes) (`/skill/[id]`)
- [ ] No-code skill creator (`/create`)
- [ ] Self-hosted registration (`/register`)
- [ ] Provider dashboard (`/dashboard`)
- [ ] Landing page (`/`)

### Phase 5 — Agent Runtime (Apr 28–May 8)
- [ ] `packages/plugin-swarm`: LISTEN_FOR_TASKS, COMPLETE_TASK, DISCOVER_SKILLS, CALL_SKILL
- [ ] `packages/skill-template`: provider-editable starter kit + Dockerfile
- [ ] 3 demo Tier 1 skills: price-agent, news-agent, sentiment-agent
- [ ] `demo/orchestrator-agent`: multi-agent "Should I invest in NVIDIA?" demo
- [ ] End-to-end test: full call flow on Devnet

### Final (May 8–11)
- [ ] End-to-end testing + bug fixes
- [ ] Demo video (3–5 min)
- [ ] README polish
- [ ] Hackathon submission

---

## 17. Key Technical Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Solana tx latency breaks UX | Show optimistic UI, confirm async |
| Skill agent goes offline mid-call | 5-minute timeout → auto-refund instruction |
| LLM hallucination in skill output | Provider's responsibility; reputation penalizes bad outputs |
| Front-running on escrow | Use commitment: "confirmed" for escrow reads |
| Private key management for skill agents | Recommend hardware wallet or KMS; template uses env var for hackathon |
| Anchor program bugs | Bankrun tests + manual devnet testing before demo |
| Endpoint accidentally leaked in API response | `skills_public` view never includes endpoint; integration tests assert field absence |
| `SUPABASE_SERVICE_ROLE_KEY` leaking to browser | Never used in `NEXT_PUBLIC_*`; ESLint rule to catch accidental exposure |
| Hosted skill executor abused (SSRF via tool_config) | Validate webhook URLs against allowlist; sanitize tool_config inputs |
| Replay attack on `/api/register/complete` | nonce = timestamp; server rejects if > 5 minutes old |
