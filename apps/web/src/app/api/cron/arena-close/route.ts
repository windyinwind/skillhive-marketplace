/**
 * Vercel Cron Job — runs hourly via vercel.json cron config.
 * Auto-closes Arena rounds that have been 'open' for more than 24 hours.
 *
 * Secured by CRON_SECRET env var (set in Vercel dashboard).
 * Vercel automatically sends Authorization: Bearer <CRON_SECRET> for cron requests.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

const OPEN_TTL_HOURS = 24

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (or authorized caller)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date(Date.now() - OPEN_TTL_HOURS * 60 * 60 * 1000).toISOString()

  const { data: staleRounds, error: fetchErr } = await supabaseServiceRole
    .from('arena_rounds')
    .select('id')
    .eq('status', 'open')
    .lt('created_at', cutoff)

  if (fetchErr) {
    console.error('[cron/arena-close] fetch error', fetchErr)
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }

  if (!staleRounds || staleRounds.length === 0) {
    return NextResponse.json({ closed: 0 })
  }

  const ids = staleRounds.map((r) => r.id)

  const { error: updateErr } = await supabaseServiceRole
    .from('arena_rounds')
    .update({ status: 'closed' })
    .in('id', ids)

  if (updateErr) {
    console.error('[cron/arena-close] update error', updateErr)
    return NextResponse.json({ error: 'update failed' }, { status: 500 })
  }

  console.log(`[cron/arena-close] closed ${ids.length} stale rounds`)
  return NextResponse.json({ closed: ids.length, ids })
}
