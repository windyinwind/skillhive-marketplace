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
      .select('*, entries:arena_entries(round_id, votes, sol_earned)', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (wallet) q = q.eq('creator_wallet', wallet)

    const { data: rounds, error, count } = await q

    if (error) throw error

    const enriched = (rounds ?? []).map((r) => {
      const entries = (r.entries ?? []) as { votes: number; sol_earned: number }[]
      const total_sol_staked = entries.reduce((s: number, e) => s + (e.sol_earned ?? 0), 0)
      const total_votes = entries.reduce((s: number, e) => s + (e.votes ?? 0), 0)
      const entry_count = entries.length
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { entries: _entries, ...roundData } = r
      return { ...roundData, total_sol_staked, total_votes, entry_count }
    })

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
