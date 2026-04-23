-- 008_atomic_vote_increment.sql — Atomic increment for arena vote stats

CREATE OR REPLACE FUNCTION increment_entry_stats(
  p_entry_id  UUID,
  p_lamports  BIGINT
) RETURNS VOID LANGUAGE sql AS $$
  UPDATE arena_entries
  SET
    votes      = votes + 1,
    sol_earned = sol_earned + p_lamports
  WHERE id = p_entry_id;
$$;
