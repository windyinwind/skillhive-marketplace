-- ============================================================
-- 003_arena.sql — Arena rounds, entries, votes + leaderboard
-- ============================================================

-- Add 'mcp' to skill_type enum (Tier 2 MCP skills)
ALTER TYPE skill_type ADD VALUE IF NOT EXISTS 'mcp';

-- ── Arena rounds ─────────────────────────────────────────────
-- One round = one problem submitted against N competing skills.
CREATE TABLE arena_rounds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query            TEXT NOT NULL,
  tags             TEXT[],
  creator_wallet   TEXT,                           -- NULL = anonymous
  selection_mode   TEXT NOT NULL DEFAULT 'auto'
                     CHECK (selection_mode IN ('auto','manual')),
  sort_mode        TEXT NOT NULL DEFAULT 'reputation'
                     CHECK (sort_mode IN ('reputation','usage','cheapest','newest')),
  competitor_count SMALLINT NOT NULL DEFAULT 3
                     CHECK (competitor_count BETWEEN 2 AND 6),
  status           TEXT NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running','open','closed')),
  closes_at        TIMESTAMPTZ,                    -- NULL = open indefinitely
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX arena_rounds_status_idx    ON arena_rounds(status, created_at DESC);
CREATE INDEX arena_rounds_creator_idx   ON arena_rounds(creator_wallet);

-- ── Arena entries ────────────────────────────────────────────
-- One entry = one skill's answer inside a round.
CREATE TABLE arena_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      UUID NOT NULL REFERENCES arena_rounds(id) ON DELETE CASCADE,
  skill_id      TEXT NOT NULL,                     -- UUID string, refs skills(id)
  skill_name    TEXT NOT NULL,
  skill_tier    SMALLINT NOT NULL,
  owner_wallet  TEXT NOT NULL,                     -- where votes (SOL) go
  result        TEXT,                              -- NULL while running or on error
  error         TEXT,                              -- set if skill call failed
  response_ms   INT,
  cost_lamports BIGINT NOT NULL DEFAULT 0,
  votes         INT NOT NULL DEFAULT 0,
  sol_earned    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX arena_entries_round_idx ON arena_entries(round_id);
CREATE INDEX arena_entries_skill_idx ON arena_entries(skill_id);

-- ── Arena votes ──────────────────────────────────────────────
-- One vote = user stakes SOL on a specific entry.
-- tx_signature is the on-chain proof of payment; UNIQUE prevents replay.
CREATE TABLE arena_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id        UUID NOT NULL REFERENCES arena_rounds(id) ON DELETE CASCADE,
  entry_id        UUID NOT NULL REFERENCES arena_entries(id) ON DELETE CASCADE,
  voter_wallet    TEXT NOT NULL,
  amount_lamports BIGINT NOT NULL CHECK (amount_lamports > 0),
  tx_signature    TEXT NOT NULL UNIQUE,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX arena_votes_entry_idx  ON arena_votes(entry_id);
CREATE INDEX arena_votes_voter_idx  ON arena_votes(voter_wallet);
CREATE INDEX arena_votes_round_idx  ON arena_votes(round_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE arena_rounds  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_votes   ENABLE ROW LEVEL SECURITY;

-- Public read for all arena data
CREATE POLICY "arena_rounds_public_read"  ON arena_rounds  FOR SELECT USING (TRUE);
CREATE POLICY "arena_entries_public_read" ON arena_entries FOR SELECT USING (TRUE);
CREATE POLICY "arena_votes_public_read"   ON arena_votes   FOR SELECT USING (TRUE);

-- Writes go through server-side API routes (service role bypasses RLS)

-- ── Leaderboard view ─────────────────────────────────────────
-- Aggregates arena performance per skill. Queried by /api/leaderboard.
-- "win" = highest sol_earned in a closed round (ties go to first entry).
CREATE OR REPLACE VIEW leaderboard AS
WITH round_winners AS (
  SELECT DISTINCT ON (round_id)
    skill_id,
    round_id
  FROM arena_entries
  WHERE sol_earned > 0
  ORDER BY round_id, sol_earned DESC, created_at ASC
),
skill_stats AS (
  SELECT
    ae.skill_id,
    COUNT(DISTINCT ae.round_id)               AS total_rounds,
    COALESCE(SUM(ae.sol_earned), 0)::BIGINT   AS total_sol_earned,
    COALESCE(SUM(ae.votes), 0)::INT           AS total_votes,
    ROUND(AVG(ae.response_ms))::INT           AS avg_response_ms
  FROM arena_entries ae
  GROUP BY ae.skill_id
),
win_counts AS (
  SELECT skill_id, COUNT(*)::INT AS wins
  FROM round_winners
  GROUP BY skill_id
)
SELECT
  s.id              AS skill_id,
  s.name,
  s.tier,
  s.tags,
  s.reputation_score,
  s.total_calls,
  s.price_lamports,
  s.owner_wallet,
  s.logo_url,
  s.provider_name,
  COALESCE(ss.total_rounds,    0)  AS total_rounds,
  COALESCE(wc.wins,            0)  AS wins,
  CASE
    WHEN COALESCE(ss.total_rounds, 0) > 0
    THEN ROUND(COALESCE(wc.wins, 0)::NUMERIC / ss.total_rounds * 100, 1)
    ELSE 0
  END                              AS win_rate,
  COALESCE(ss.total_sol_earned, 0) AS total_sol_earned,
  COALESCE(ss.total_votes,      0) AS total_votes,
  ss.avg_response_ms
FROM skills_public s
LEFT JOIN skill_stats ss ON ss.skill_id = s.id
LEFT JOIN win_counts  wc ON wc.skill_id = s.id;
