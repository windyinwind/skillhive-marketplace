-- SkillHive Marketplace — Initial Schema
-- Apply: supabase db push  OR  paste into Supabase SQL editor

-- ── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE skill_type AS ENUM ('prompt', 'tool', 'custom_agent');

-- ── Skills ───────────────────────────────────────────────────────────────────
CREATE TABLE skills (
  id                    TEXT PRIMARY KEY,
  owner_wallet          TEXT NOT NULL,

  -- PUBLIC: mirrored from on-chain by Helius webhooks
  skill_type            skill_type NOT NULL DEFAULT 'prompt',
  tier                  SMALLINT NOT NULL DEFAULT 1 CHECK (tier IN (1,2,3)),
  name                  TEXT NOT NULL,
  description           TEXT,
  tags                  TEXT[],
  price_lamports        BIGINT NOT NULL DEFAULT 0,
  reputation_score      INT NOT NULL DEFAULT 500,
  total_calls           BIGINT NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ,

  -- PRIVATE: server-side only, NEVER returned to browser
  endpoint              TEXT,
  endpoint_verified_at  TIMESTAMPTZ,
  system_prompt         TEXT,
  model_config          JSONB,
  tool_config           JSONB,

  -- PUBLIC: off-chain enrichment
  logo_url              TEXT,
  provider_name         TEXT,
  long_description      TEXT
);

-- RLS: block all direct anon access to the skills table.
-- Private fields (endpoint, system_prompt, tool_config) are only accessible
-- via the service role key in API routes.
-- Browser queries use the skills_public view via the anon key.
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- skills_public view — NEVER includes private fields
-- Runs as the calling user so RLS applies; safe for anon key access.
CREATE VIEW skills_public AS
  SELECT
    id, owner_wallet, skill_type, tier,
    name, description, tags,
    price_lamports, reputation_score, total_calls,
    is_active, created_at,
    logo_url, provider_name, long_description
  FROM skills;

-- Allow anon to read from the view (PostgREST exposes views directly)
GRANT SELECT ON skills_public TO anon, authenticated;

-- ── Calls ─────────────────────────────────────────────────────────────────────
CREATE TABLE calls (
  call_id         TEXT PRIMARY KEY,
  skill_id        TEXT REFERENCES skills(id),
  caller_wallet   TEXT NOT NULL,
  amount_lamports BIGINT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL CHECK (status IN ('pending','completed','refunded','preview')),
  call_type       TEXT NOT NULL DEFAULT 'escrow' CHECK (call_type IN ('escrow','x402','preview')),
  input_hash      TEXT,
  result_hash     TEXT,
  result          TEXT,
  tx_signature    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_select" ON calls FOR SELECT USING (true);

-- ── Ratings ───────────────────────────────────────────────────────────────────
CREATE TABLE skill_ratings (
  id         SERIAL PRIMARY KEY,
  call_id    TEXT REFERENCES calls(call_id),
  skill_id   TEXT REFERENCES skills(id),
  score      INT CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE skill_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_ratings_select" ON skill_ratings FOR SELECT USING (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX skills_tags_idx   ON skills USING gin(tags);
CREATE INDEX skills_active_idx ON skills(is_active, reputation_score DESC);
CREATE INDEX calls_skill_idx   ON calls(skill_id);
CREATE INDEX calls_caller_idx  ON calls(caller_wallet);
CREATE INDEX calls_status_idx  ON calls(status);
