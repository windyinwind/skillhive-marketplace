# SWARM Marketplace — Software Design Document

> **Hackathon:** Agentic SWARM Hackathon (Colosseum)
> **Dates:** April 6 – May 11, 2026
> **Prize Pool:** $250,000 total | $25,000 SWARM track
> **Chain:** Solana
> **Submission Deadline:** May 11, 2026

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

```
┌─────────────────────────────────────────────────────────────────┐
│                        SWARM Marketplace                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐        ┌──────────────────────────────┐  │
│   │   Next.js Web   │        │     Solana Smart Contracts   │  │
│   │   (Frontend)    │◄──────►│     (Anchor Programs)        │  │
│   │                 │        │                              │  │
│   │ • Marketplace   │        │ • SkillRegistry Program      │  │
│   │ • Register UI   │        │ • EscrowPayment Program      │  │
│   │ • Try-it live   │        │ • Reputation Program         │  │
│   │ • Dashboard     │        │                              │  │
│   └────────┬────────┘        └──────────────┬───────────────┘  │
│            │                                │                  │
│            ▼                                ▼                  │
│   ┌─────────────────┐        ┌──────────────────────────────┐  │
│   │   API Gateway   │        │     Skill Agent Runtime      │  │
│   │   (Next.js API  │        │     (ElizaOS)                │  │
│   │    Routes)      │◄──────►│                              │  │
│   │                 │        │ • Skill Provider deploys     │  │
│   │ • /api/skills   │        │ • Listens for on-chain tasks │  │
│   │ • /api/call     │        │ • Executes LLM logic         │  │
│   │ • /api/register │        │ • Submits result on-chain    │  │
│   └─────────────────┘        └──────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

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

## 4. Solana Smart Contracts (Anchor)

### 4.1 Program: `skill_registry`

**Purpose:** Store all registered skills on-chain. Source of truth for discovery.

```
Program ID: [generated on deploy]
Account Structure:

SkillAccount (PDA: ["skill", skill_id])
├── id: [u8; 32]              // unique skill ID
├── owner: Pubkey             // wallet of skill provider
├── name: String (64)         // display name
├── description: String (256) // what it does
├── tags: Vec<String>         // e.g. ["finance", "stocks"]
├── endpoint: String (128)    // HTTPS URL of agent
├── price_lamports: u64       // price per call in lamports
├── total_calls: u64          // lifetime call count
├── reputation_score: u16     // 0–1000, updated per call
├── is_active: bool           // provider can pause/unpause
├── created_at: i64           // unix timestamp
└── bump: u8
```

**Instructions:**
```rust
// 1. Register a new skill
pub fn register_skill(
    ctx: Context<RegisterSkill>,
    name: String,
    description: String,
    tags: Vec<String>,
    endpoint: String,
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

// 4. Update reputation (called by EscrowPayment program CPI)
pub fn update_reputation(
    ctx: Context<UpdateReputation>,
    call_id: [u8; 32],
    score: u8,  // 1–5 star rating
) -> Result<()>
```

---

### 4.2 Program: `escrow_payment`

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

## 5. Frontend (Next.js)

### 5.1 Pages & Routes

```
app/
├── page.tsx                    # Landing page + hero
├── marketplace/
│   └── page.tsx                # Browse all skills
├── skill/
│   └── [id]/
│       └── page.tsx            # Skill detail + Try-it UI
├── register/
│   └── page.tsx                # Register new skill form
├── dashboard/
│   └── page.tsx                # Provider earnings + calls history
├── docs/
│   └── page.tsx                # How to register, SDK docs
└── api/
    ├── skills/
    │   ├── route.ts             # GET all skills (cached from chain)
    │   └── [id]/route.ts       # GET single skill
    ├── call/
    │   └── route.ts             # POST initiate a call
    └── register/
        └── route.ts             # POST register new skill
```

### 5.2 Key Components

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
// — Text input for user query
// — "Call Skill" button (triggers wallet approval)
// — Shows result + tx signature
// — Shows SOL deducted

// components/RegisterForm.tsx
// — Name, description, tags (multi-select)
// — Endpoint URL (validated with test ping)
// — Price per call (SOL input with USD estimate)
// — Connect wallet → sign registration tx

// components/EarningsDashboard.tsx
// — Total earned (SOL)
// — Call history table (call_id, input_hash, result_hash, amount, timestamp)
// — Skill performance chart
// — Pause/unpause skill toggle
```

### 5.3 Wallet Integration

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

### 5.4 On-chain Read (skill listing)

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

## 6. Agent Runtime (ElizaOS)

### 6.1 Skill Provider Template

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

### 6.2 SWARM Plugin (our custom ElizaOS plugin)

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

### 6.3 Orchestrator Agent (Demo)

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

## 7. Database Schema (Supabase — off-chain cache)

```sql
-- Mirror of on-chain data for fast queries + search
-- Synced by a background indexer job

CREATE TABLE skills (
  id            TEXT PRIMARY KEY,  -- matches on-chain skill_id
  owner_wallet  TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  tags          TEXT[],
  endpoint      TEXT NOT NULL,
  price_lamports BIGINT,
  reputation_score INT DEFAULT 500,
  total_calls   BIGINT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- off-chain only:
  logo_url      TEXT,
  provider_name TEXT,
  long_description TEXT
);

CREATE TABLE calls (
  call_id       TEXT PRIMARY KEY,
  skill_id      TEXT REFERENCES skills(id),
  caller_wallet TEXT,
  amount_lamports BIGINT,
  status        TEXT CHECK (status IN ('pending','completed','refunded')),
  tx_signature  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE skill_ratings (
  id        SERIAL PRIMARY KEY,
  call_id   TEXT REFERENCES calls(call_id),
  skill_id  TEXT REFERENCES skills(id),
  score     INT CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full text search index
CREATE INDEX skills_search ON skills USING gin(
  to_tsvector('english', name || ' ' || description || ' ' || array_to_string(tags, ' '))
);
```

---

## 8. API Routes (Next.js)

```typescript
// GET /api/skills
// Returns paginated skill list with filters
// Query params: tag, minReputation, maxPrice, search, page, limit
Response: {
  skills: SkillAccount[],
  total: number,
  page: number
}

// GET /api/skills/[id]
// Returns single skill detail
Response: SkillAccount & { recentCalls: number, avgRating: number }

// POST /api/call
// Initiates a skill call (creates escrow tx for frontend to sign)
Body: { skillId: string, input: string, callerWallet: string }
Response: { txToSign: Transaction, callId: string }

// POST /api/register
// Creates registration tx for frontend to sign
Body: { name, description, tags, endpoint, priceLamports, ownerWallet }
Response: { txToSign: Transaction }

// GET /api/dashboard/[wallet]
// Returns provider earnings and call history
Response: { totalEarned: number, calls: Call[], skills: Skill[] }

// POST /api/indexer/sync
// Called by cron to sync on-chain data to Supabase
// Protected by internal API key
```

---

## 9. Monorepo Structure

```
swarm-marketplace/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── anchor/               # IDL + program client
│   │   │   ├── solana/               # web3.js helpers
│   │   │   └── supabase/             # DB client
│   │   └── package.json
│   │
│   └── indexer/                      # Background sync job
│       ├── src/index.ts              # Polls chain → writes to Supabase
│       └── package.json
│
├── packages/
│   ├── contracts/                    # Anchor programs
│   │   ├── programs/
│   │   │   ├── skill_registry/
│   │   │   │   └── src/lib.rs
│   │   │   └── escrow_payment/
│   │   │       └── src/lib.rs
│   │   ├── tests/
│   │   │   ├── skill_registry.ts
│   │   │   └── escrow_payment.ts
│   │   └── Anchor.toml
│   │
│   ├── plugin-swarm/                 # ElizaOS plugin
│   │   ├── src/
│   │   │   ├── actions/
│   │   │   ├── providers/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── skill-template/               # Starter kit for providers
│       ├── src/
│       │   ├── index.ts              # Agent entrypoint
│       │   ├── skill.ts              # ← PROVIDER EDITS THIS
│       │   └── character.ts
│       ├── .env.example
│       ├── Dockerfile
│       └── README.md
│
├── demo/
│   ├── orchestrator-agent/           # Demo: multi-agent swarm
│   ├── skill-price-agent/            # Demo skill: stock prices
│   ├── skill-news-agent/             # Demo skill: news summary
│   └── skill-sentiment-agent/        # Demo skill: sentiment
│
├── DESIGN.md                         # This file
├── package.json                      # pnpm workspace
└── pnpm-workspace.yaml
```

---

## 10. Environment Variables

```bash
# apps/web/.env.local
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_SKILL_REGISTRY_PROGRAM_ID=<deployed_program_id>
NEXT_PUBLIC_ESCROW_PROGRAM_ID=<deployed_program_id>
NEXT_PUBLIC_PLATFORM_TREASURY=<treasury_wallet>
NEXT_PUBLIC_SUPABASE_URL=<supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
PLATFORM_FEE_BPS=500                 # 5% = 500 basis points
INTERNAL_API_KEY=<for_indexer>

# packages/skill-template/.env
SKILL_NAME="My Stock Analyst"
SKILL_SYSTEM_PROMPT="You are a stock analyst..."
SOLANA_PRIVATE_KEY=<skill_agent_wallet_keypair>
SKILL_REGISTRY_PROGRAM_ID=<same_as_above>
ESCROW_PROGRAM_ID=<same_as_above>
ANTHROPIC_API_KEY=<claude_api_key>
PORT=3001
```

---

## 11. Hackathon Deliverables Checklist

### Required for Submission
- [ ] Public GitHub repo
- [ ] Deployed on Solana Devnet (Mainnet bonus)
- [ ] Working demo video (3–5 min)
- [ ] Deployed website URL
- [ ] Solana wallet verification

### Demo Script (for judges)
```
1. Open marketplace → show 5 registered skills
2. Connect Phantom wallet
3. Call "Stock Analyst" skill → approve 0.001 SOL tx
4. Show result returned
5. Show tx on Solana Explorer (escrow → skill owner)
6. Show skill owner dashboard → earnings updated
7. Switch to terminal: run Orchestrator Agent
8. Ask: "Should I invest in NVIDIA?"
9. Show agent autonomously discovering 3 skills on-chain
10. Show agent paying each skill and synthesizing result
11. Show all 3 payments settled on Solana Explorer
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

## 12. 4-Week Build Plan

### Week 1 (Apr 6–12): Smart Contracts
- [ ] Setup Anchor workspace
- [ ] Implement `skill_registry` program
- [ ] Implement `escrow_payment` program
- [ ] Write tests (Bankrun)
- [ ] Deploy to Devnet
- [ ] Generate TypeScript IDL client

### Week 2 (Apr 13–19): Agent Runtime
- [ ] Setup ElizaOS monorepo
- [ ] Build `plugin-swarm` (listen, complete, discover, call actions)
- [ ] Build skill-template with Docker
- [ ] Deploy 3 demo skills (price, news, sentiment)
- [ ] Build orchestrator agent
- [ ] Test agent-to-agent payment end-to-end

### Week 3 (Apr 20–26): Frontend
- [ ] Setup Next.js with wallet adapter
- [ ] Marketplace page (read from chain)
- [ ] Skill detail + Try-it panel
- [ ] Register form (writes to chain)
- [ ] Provider dashboard
- [ ] Supabase indexer

### Week 4 (Apr 27–May 11): Polish + Submit
- [ ] End-to-end testing
- [ ] Mainnet deployment (optional)
- [ ] Demo video recording
- [ ] GitHub README + docs
- [ ] Hackathon submission

---

## 13. Key Technical Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Solana tx latency breaks UX | Show optimistic UI, confirm async |
| Skill agent goes offline mid-call | 5-minute timeout → auto-refund instruction |
| LLM hallucination in skill output | Provider's responsibility; reputation penalizes bad outputs |
| Front-running on escrow | Use commitment: "confirmed" for escrow reads |
| Private key management for skill agents | Recommend hardware wallet or KMS; template uses env var for hackathon |
| Anchor program bugs | Bankrun tests + manual devnet testing before demo |
