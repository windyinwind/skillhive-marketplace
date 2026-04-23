import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params
    const { entryId, helpful } = await req.json()

    if (!entryId || typeof helpful !== 'boolean') {
      return NextResponse.json({ error: 'entryId and helpful (boolean) required' }, { status: 400 })
    }

    // Verify entry belongs to this round
    const { data: entry } = await supabaseServiceRole
      .from('arena_entries')
      .select('id')
      .eq('id', entryId)
      .eq('round_id', roundId)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found in this round' }, { status: 404 })
    }

    await supabaseServiceRole.rpc('rate_entry', { p_entry_id: entryId, p_helpful: helpful })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/arena/[roundId]/rate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
