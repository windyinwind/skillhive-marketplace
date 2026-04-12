import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'

export const runtime = 'nodejs'

const ROUND_COLS  = 'id, query, tags, creator_wallet, selection_mode, sort_mode, competitor_count, status, closes_at, created_at'
const ENTRY_COLS  = 'id, round_id, skill_id, skill_name, skill_tier, owner_wallet, result, error, response_ms, cost_lamports, votes, sol_earned, created_at'

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
      .order('sol_earned', { ascending: false })

    const total_sol_staked = (entries ?? []).reduce((s, e) => s + (e.sol_earned ?? 0), 0)
    const total_votes      = (entries ?? []).reduce((s, e) => s + (e.votes ?? 0), 0)

    return NextResponse.json({ ...round, entries: entries ?? [], total_sol_staked, total_votes })
  } catch (err) {
    console.error('[GET /api/arena/[roundId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
