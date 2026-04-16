import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params
    const body = await req.json().catch(() => ({})) as { callerWallet?: string }

    const { data: round, error: fetchErr } = await supabaseServiceRole
      .from('arena_rounds')
      .select('id, status, creator_wallet')
      .eq('id', roundId)
      .single()

    if (fetchErr || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    if (round.status === 'closed') {
      return NextResponse.json({ error: 'Round already closed' }, { status: 409 })
    }

    if (round.status === 'running') {
      return NextResponse.json({ error: 'Round is still running — wait for all skills to respond' }, { status: 409 })
    }

    // Only the round creator may close it (if creator_wallet is set)
    if (round.creator_wallet && body.callerWallet && round.creator_wallet !== body.callerWallet) {
      return NextResponse.json({ error: 'Only the round creator can close it' }, { status: 403 })
    }

    const { error: updateErr } = await supabaseServiceRole
      .from('arena_rounds')
      .update({ status: 'closed' })
      .eq('id', roundId)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/arena/[roundId]/close]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
