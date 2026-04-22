export interface ArenaRound {
  id: string
  query: string
  tags: string[] | null
  creator_wallet: string | null
  selection_mode: 'auto' | 'manual'
  sort_mode: 'reputation' | 'usage' | 'cheapest' | 'newest'
  competitor_count: number
  status: 'running' | 'open' | 'closed'
  closes_at: string | null
  created_at: string
}

export interface ContributingSkill {
  skillId: string
  skillName: string
  wallet: string
  amountLamports: number
}

export interface ArenaEntry {
  id: string
  round_id: string
  skill_id: string
  skill_name: string
  skill_tier: number
  owner_wallet: string
  result: string | null
  error: string | null
  response_ms: number | null
  cost_lamports: number
  votes: number
  sol_earned: number
  created_at: string
  // synthesis fields (populated on multi-skill answers)
  synthesis_type: 'comprehensive' | 'key_insights' | null
  contributing_skill_ids: string[]
  contributing_owners: ContributingSkill[]
}

export interface ArenaRoundWithEntries extends ArenaRound {
  entries: ArenaEntry[]
  total_sol_staked: number
  total_votes: number
}

export interface ArenaVote {
  id: string
  round_id: string
  entry_id: string
  voter_wallet: string
  amount_lamports: number
  tx_signature: string
  verified: boolean
  created_at: string
}

export interface LeaderboardRow {
  skill_id: string
  name: string
  tier: number
  tags: string[] | null
  reputation_score: number
  total_calls: number
  price_lamports: number
  owner_wallet: string
  logo_url: string | null
  provider_name: string | null
  total_rounds: number
  wins: number
  win_rate: number
  total_sol_earned: number
  total_votes: number
  avg_response_ms: number | null
}
