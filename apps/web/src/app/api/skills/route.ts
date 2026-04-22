import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const tag = searchParams.get('tag')
    const skillType = searchParams.get('skillType')
    const minReputation = searchParams.get('minReputation')
    const maxPrice = searchParams.get('maxPrice')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const isFeatured = searchParams.get('isFeatured') === 'true'
    
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const offset = (page - 1) * limit

    const COLS = 'id, owner_wallet, skill_type, tier, name, description, tags, price_lamports, reputation_score, total_calls, is_active, created_at, logo_url, provider_name, long_description'

    let query = supabaseAnon
      .from('skills_public')
      .select(COLS, { count: 'exact' })
      .eq('is_active', true)

    if (tag) {
      query = query.contains('tags', [tag])
    }

    if (skillType) {
      query = query.eq('skill_type', skillType)
    }

    if (minReputation) {
      const rep = parseInt(minReputation, 10)
      if (!isNaN(rep)) {
        query = query.gte('reputation_score', rep)
      }
    }

    if (maxPrice) {
      const price = parseInt(maxPrice, 10)
      if (!isNaN(price)) {
        query = query.lte('price_lamports', price)
      }
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    query = query
      .order('reputation_score', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: skills, error, count } = await query

    if (error) {
      console.error('[GET /api/skills] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 })
    }

    return NextResponse.json(
      { skills: skills ?? [], total: count ?? 0, page, limit },
      {
        headers: {
          'Cache-Control': 's-maxage=30',
        },
      }
    )
  } catch (err) {
    console.error('[GET /api/skills] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
