import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * GET /api/my-calls?wallet=<pubkey>
 *
 * Returns completed calls made BY this wallet that have not yet been rated.
 * Used by the dashboard to surface deferred rating prompts.
 *
 * Uses serviceRole to join calls with ratings (ratings table is not in skills_public).
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet')
    if (!wallet) {
      return NextResponse.json({ error: 'wallet query param required' }, { status: 400 })
    }

    // Fetch completed calls by this wallet
    const { data: calls, error: callsErr } = await supabaseServiceRole
      .from('calls')
      .select('call_id, skill_id, amount_lamports, status, created_at')
      .eq('caller_wallet' as never, wallet)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20)

    if (callsErr) throw callsErr
    if (!calls || calls.length === 0) {
      return NextResponse.json({ unratedCalls: [] })
    }

    // Find which calls already have ratings
    const callIds = calls.map((c) => (c as Record<string, unknown>)['call_id'] as string)
    const { data: ratings } = await supabaseServiceRole
      .from('ratings')
      .select('call_id')
      .in('call_id', callIds)

    const ratedIds = new Set((ratings ?? []).map((r) => (r as Record<string, unknown>)['call_id'] as string))

    // Return only unrated calls, along with skill name for display
    const unratedCallIds = calls.filter(
      (c) => !ratedIds.has((c as Record<string, unknown>)['call_id'] as string)
    )

    // Fetch skill names for context
    const skillIds = [...new Set(unratedCallIds.map((c) => (c as Record<string, unknown>)['skill_id'] as string))]
    const { data: skills } = await supabaseServiceRole
      .from('skills_public')
      .select('id, name')
      .in('id', skillIds)

    const skillMap = Object.fromEntries(
      (skills ?? []).map((s) => [(s as Record<string, unknown>)['id'], (s as Record<string, unknown>)['name']])
    )

    const unratedCalls = unratedCallIds.map((c) => {
      const row = c as Record<string, unknown>
      return {
        call_id: row['call_id'],
        skill_id: row['skill_id'],
        skill_name: skillMap[row['skill_id'] as string] ?? 'Unknown skill',
        amount_lamports: row['amount_lamports'],
        created_at: row['created_at'],
      }
    })

    return NextResponse.json({ unratedCalls })
  } catch (err) {
    console.error('[GET /api/my-calls]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
