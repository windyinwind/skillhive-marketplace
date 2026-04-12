import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tag    = searchParams.get('tag')
    const sort   = searchParams.get('sort') ?? 'total_sol_earned'  // total_sol_earned | wins | win_rate | total_calls | reputation_score
    const limit  = Math.min(Number(searchParams.get('limit') ?? 50), 100)
    const page   = Math.max(Number(searchParams.get('page') ?? 1), 1)
    const offset = (page - 1) * limit

    const validSorts = ['total_sol_earned', 'wins', 'win_rate', 'total_calls', 'reputation_score', 'total_votes']
    const safeSort = validSorts.includes(sort) ? sort : 'total_sol_earned'

    let query = supabaseAnon
      .from('leaderboard')
      .select('*', { count: 'exact' })

    if (tag && tag !== 'all') {
      query = query.contains('tags', [tag])
    }

    const { data, error, count } = await query
      .order(safeSort, { ascending: false })
      .order('reputation_score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      rows: data ?? [],
      total: count ?? 0,
      page,
      limit,
      sort: safeSort,
    })
  } catch (err) {
    console.error('[GET /api/leaderboard]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
