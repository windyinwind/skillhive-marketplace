import { NextRequest, NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabaseAnon
      .from('calls')
      .select('call_id, skill_id, status, result_hash, tx_signature, created_at, completed_at, call_type')
      .eq('call_id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Call not found' }, { status: 404 })

    // Never return result text or private fields
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/call/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
