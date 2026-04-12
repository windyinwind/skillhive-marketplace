import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'

export const runtime = 'nodejs'

const SKILL_PUBLIC_COLS =
  'id, owner_wallet, skill_type, tier, name, description, tags, price_lamports, reputation_score, total_calls, is_active, created_at, logo_url, provider_name, long_description'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params

    const { data: skills, error: skillsErr } = await supabaseAnon
      .from('skills_public')
      .select(SKILL_PUBLIC_COLS)
      .eq('owner_wallet', wallet)
      .order('created_at', { ascending: false })

    if (skillsErr) throw skillsErr

    const skillIds = (skills ?? []).map((s) => s.id as string)

    if (skillIds.length === 0) {
      return NextResponse.json({ totalEarned: 0, callCount: 0, skills: [], recentCalls: [] })
    }

    const { data: calls, error: callsErr } = await supabaseAnon
      .from('calls')
      .select('call_id, skill_id, amount_lamports, status, tx_signature, created_at, completed_at')
      .in('skill_id', skillIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)

    if (callsErr) throw callsErr

    // Provider earns 95% per completed call (5% platform fee)
    const totalEarned = (calls ?? []).reduce((sum, c) => {
      return sum + Math.floor((Number(c.amount_lamports) * 9500) / 10000)
    }, 0)

    return NextResponse.json({
      totalEarned,
      callCount: (calls ?? []).length,
      skills: skills ?? [],
      recentCalls: calls ?? [],
    })
  } catch (err) {
    console.error('[GET /api/dashboard/[wallet]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
