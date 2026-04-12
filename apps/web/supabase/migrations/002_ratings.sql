-- SWARM Marketplace — Ratings
-- One rating per call, stored off-chain for instant UX.
-- On-chain reputation_score (via complete_call CPI) remains as fraud-resistant baseline.

CREATE TABLE ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id       TEXT NOT NULL UNIQUE,   -- one rating per call
  skill_id      TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  caller_wallet TEXT NOT NULL,
  score         SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ratings_skill_id_idx ON ratings(skill_id);
CREATE INDEX ratings_caller_wallet_idx ON ratings(caller_wallet);

-- RLS: anyone can insert their own rating; public read for aggregate stats
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_insert" ON ratings
  FOR INSERT WITH CHECK (true);   -- caller_wallet verified server-side via signed message

CREATE POLICY "ratings_select" ON ratings
  FOR SELECT USING (true);

-- Add off-chain aggregate columns to skills
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS rating_count  INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg    NUMERIC(3,2) NOT NULL DEFAULT 0;

-- Function: update skills.rating_avg + rating_count after a new rating
CREATE OR REPLACE FUNCTION update_skill_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE skills
  SET
    rating_count = (SELECT COUNT(*) FROM ratings WHERE skill_id = NEW.skill_id),
    rating_avg   = (SELECT ROUND(AVG(score)::NUMERIC, 2) FROM ratings WHERE skill_id = NEW.skill_id)
  WHERE id = NEW.skill_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_skill_rating
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_skill_rating();

-- Expose new columns in the public view
DROP VIEW IF EXISTS skills_public;
CREATE VIEW skills_public AS
  SELECT
    id, owner_wallet, skill_type, tier,
    name, description, tags,
    price_lamports, reputation_score, total_calls,
    rating_count, rating_avg,
    is_active, created_at,
    logo_url, provider_name, long_description
  FROM skills;
