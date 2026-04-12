import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'open'
    const limit  = Math.min(Number(searchParams.get('limit') ?? 20), 50)
    const page   = Math.max(Number(searchParams.get('page') ?? 1), 1)
    const offset = (page - 1) * limit

    const wallet = searchParams.get('wallet')

    let q = supabaseAnon
      .from('arena_rounds')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (wallet) q = q.eq('creator_wallet', wallet)

    const { data: rounds, error, count } = await q

    if (error) throw error

    // Attach aggregate stats for each round
    const roundIds = (rounds ?? []).map((r) => r.id)
    let statsMap: Record<string, { total_sol_staked: number; total_votes: number; entry_count: number }> = {}

    if (roundIds.length > 0) {
      const { data: entries } = await supabaseAnon
        .from('arena_entries')
        .select('round_id, votes, sol_earned')
        .in('round_id', roundIds)

      for (const e of entries ?? []) {
        if (!statsMap[e.round_id]) statsMap[e.round_id] = { total_sol_staked: 0, total_votes: 0, entry_count: 0 }
        statsMap[e.round_id].total_sol_staked += e.sol_earned
        statsMap[e.round_id].total_votes += e.votes
        statsMap[e.round_id].entry_count += 1
      }
    }

    const enriched = (rounds ?? []).map((r) => ({
      ...r,
      ...(statsMap[r.id] ?? { total_sol_staked: 0, total_votes: 0, entry_count: 0 }),
    }))

    return NextResponse.json({
      rounds: enriched,
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[GET /api/arena]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
