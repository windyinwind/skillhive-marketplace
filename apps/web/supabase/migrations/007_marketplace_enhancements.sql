-- 007: Marketplace Enhancements
-- Add categorization and featured status to skills

ALTER TABLE skills ADD COLUMN category TEXT;
ALTER TABLE skills ADD COLUMN is_featured BOOLEAN DEFAULT false;

-- Update the skills_public view to include new fields
DROP VIEW IF EXISTS skills_public;
CREATE VIEW skills_public AS
  SELECT
    id, owner_wallet, skill_type, tier,
    name, description, tags,
    price_lamports, reputation_score, total_calls,
    rating_count, rating_avg,
    is_active, created_at,
    logo_url, provider_name, long_description,
    category, is_featured
  FROM skills;

GRANT SELECT ON skills_public TO anon, authenticated;
