import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnon, supabaseServiceRole } from '@/lib/supabase'
import { verifyWalletSignature, validateWebhookUrl, checkRateLimit } from '@/lib/security'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Missing skill id' }, { status: 400 })
    }

    const COLS = 'id, owner_wallet, skill_type, tier, name, description, tags, price_lamports, reputation_score, total_calls, rating_count, rating_avg, is_active, created_at, logo_url, provider_name, long_description'

    const { data: skill, error } = await supabaseAnon
      .from('skills_public')
      .select(COLS)
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error || !skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    // Fetch recent calls count (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: recentCalls } = await supabaseAnon
      .from('calls')
      .select('call_id', { count: 'exact', head: true })
      .eq('skill_id', id)
      .gte('created_at', sevenDaysAgo)

    // Fetch average rating
    const { data: ratings } = await supabaseAnon
      .from('skill_ratings')
      .select('score')
      .eq('skill_id', id)

    let avgRating: number | null = null
    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + (r.score ?? 0), 0)
      avgRating = Math.round((sum / ratings.length) * 10) / 10
    }

    return NextResponse.json({
      ...skill,
      recentCalls: recentCalls ?? 0,
      avgRating,
    })
  } catch (err) {
    console.error('[GET /api/skills/[id]] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
