import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'

export const runtime = 'nodejs'

const ROUND_COLS  = 'id, query, tags, creator_wallet, selection_mode, sort_mode, competitor_count, status, closes_at, created_at'
const ENTRY_COLS  = 'id, round_id, skill_id, skill_name, skill_tier, owner_wallet, result, error, response_ms, cost_lamports, votes, sol_earned, helpful_votes, unhelpful_votes, created_at, synthesis_type, contributing_skill_ids, contributing_owners'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params

    const { data: round, error } = await supabaseAnon
      .from('arena_rounds')
      .select(ROUND_COLS)
      .eq('id', roundId)
      .single()

    if (error || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    const { data: entries } = await supabaseAnon
      .from('arena_entries')
      .select(ENTRY_COLS)
      .eq('round_id', roundId)

    const sorted = (entries ?? []).slice().sort((a, b) => {
      const aCompleted = a.result != null && !a.error
      const bCompleted = b.result != null && !b.error
      const aError = !!a.error
      const bError = !!b.error

      if (aCompleted && bCompleted) return (b.sol_earned ?? 0) - (a.sol_earned ?? 0)
      if (aCompleted) return -1
      if (bCompleted) return 1
      if (!aError && !bError) return 0
      if (!aError) return -1
      if (!bError) return 1
      return 0
    })

    const total_sol_staked = sorted.reduce((s, e) => s + (e.sol_earned ?? 0), 0)
    const total_votes      = sorted.reduce((s, e) => s + (e.votes ?? 0), 0)

    return NextResponse.json({ ...round, entries: sorted, total_sol_staked, total_votes })
  } catch (err) {
    console.error('[GET /api/arena/[roundId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
