-- 009_ratings.sql — Post-payment helpfulness ratings for entries and skills

-- ── Arena entry ratings ───────────────────────────────────────────────────────
ALTER TABLE arena_entries
  ADD COLUMN IF NOT EXISTS helpful_votes   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unhelpful_votes INT NOT NULL DEFAULT 0;

-- Atomic increment to avoid read-modify-write races
CREATE OR REPLACE FUNCTION rate_entry(
  p_entry_id  UUID,
  p_helpful   BOOLEAN
) RETURNS VOID LANGUAGE sql AS $$
  UPDATE arena_entries
  SET
    helpful_votes   = helpful_votes   + CASE WHEN p_helpful THEN 1 ELSE 0 END,
    unhelpful_votes = unhelpful_votes + CASE WHEN p_helpful THEN 0 ELSE 1 END
  WHERE id = p_entry_id;
$$;

-- ── Skill ratings (used by chat post-payment) ────────────────────────────────
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS helpful_votes   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unhelpful_votes INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION rate_skill(
  p_skill_id  TEXT,
  p_helpful   BOOLEAN
) RETURNS VOID LANGUAGE sql AS $$
  UPDATE skills
  SET
    helpful_votes   = helpful_votes   + CASE WHEN p_helpful THEN 1 ELSE 0 END,
    unhelpful_votes = unhelpful_votes + CASE WHEN p_helpful THEN 0 ELSE 1 END
  WHERE id = p_skill_id;
$$;

