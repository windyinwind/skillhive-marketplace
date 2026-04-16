-- ============================================================
-- 005_arena_synthesis.sql
-- Adds synthesis columns to arena_entries so that each entry
-- can represent a multi-skill synthesized answer instead of
-- a single skill's raw output.
-- ============================================================

-- contributing_skill_ids: all skill IDs whose outputs fed this synthesis
ALTER TABLE arena_entries
  ADD COLUMN IF NOT EXISTS contributing_skill_ids text[]   DEFAULT '{}';

-- synthesis_type: 'comprehensive' | 'key_insights' | null (legacy single-skill)
ALTER TABLE arena_entries
  ADD COLUMN IF NOT EXISTS synthesis_type text;

-- contributing_owners: [{wallet, skillId, skillName, amountLamports}]
-- used by the frontend to split payment among contributors
ALTER TABLE arena_entries
  ADD COLUMN IF NOT EXISTS contributing_owners jsonb DEFAULT '[]';

-- Update leaderboard view to credit contributing skills on synthesis wins
-- Drop first so we can change column types without conflict
DROP VIEW IF EXISTS leaderboard;
CREATE VIEW leaderboard AS
WITH round_winners AS (
  -- A synthesis entry wins if it has the highest sol_earned in a closed round.
  -- Credit goes to ALL contributing skills equally.
  SELECT DISTINCT ON (ae.round_id)
    ae.id          AS entry_id,
    ae.round_id,
    ae.skill_id,
    ae.contributing_skill_ids
  FROM arena_entries ae
  WHERE ae.sol_earned > 0
  ORDER BY ae.round_id, ae.sol_earned DESC, ae.created_at ASC
),
-- Flatten contributing_skill_ids into individual rows for credit
credited_wins AS (
  SELECT
    UNNEST(
      CASE
        WHEN array_length(rw.contributing_skill_ids, 1) > 0
        THEN rw.contributing_skill_ids
        ELSE ARRAY[rw.skill_id]
      END
    ) AS skill_id,
    rw.round_id
  FROM round_winners rw
),
skill_stats AS (
  SELECT
    ae.skill_id,
    COUNT(DISTINCT ae.round_id)             AS total_rounds,
    COALESCE(SUM(ae.sol_earned), 0)::BIGINT AS total_sol_earned,
    COALESCE(SUM(ae.votes), 0)::INT         AS total_votes,
    ROUND(AVG(ae.response_ms))::INT         AS avg_response_ms
  FROM arena_entries ae
  WHERE ae.skill_id != 'synthesis'
  GROUP BY ae.skill_id
),
-- Also credit contributing skills for sol_earned
contrib_stats AS (
  SELECT
    co_elem->>'skillId'                            AS skill_id,
    SUM((co_elem->>'amountLamports')::BIGINT)      AS contrib_sol_earned
  FROM arena_entries ae,
       LATERAL jsonb_array_elements(ae.contributing_owners) AS co_elem
  WHERE jsonb_array_length(ae.contributing_owners) > 0
    AND ae.sol_earned > 0
  GROUP BY co_elem->>'skillId'
),
win_counts AS (
  SELECT skill_id, COUNT(DISTINCT round_id)::INT AS wins
  FROM credited_wins
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
  COALESCE(cs.contrib_sol_earned, ss.total_sol_earned, 0) AS total_sol_earned,
  COALESCE(ss.total_votes,      0) AS total_votes,
  ss.avg_response_ms
FROM skills_public s
LEFT JOIN skill_stats  ss ON ss.skill_id = s.id
LEFT JOIN contrib_stats cs ON cs.skill_id = s.id
LEFT JOIN win_counts   wc ON wc.skill_id = s.id;
