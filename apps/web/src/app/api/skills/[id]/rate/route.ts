import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: skillId } = await params
    const { helpful } = await req.json()

    if (typeof helpful !== 'boolean') {
      return NextResponse.json({ error: 'helpful (boolean) required' }, { status: 400 })
    }

    const { data } = await supabaseServiceRole
      .from('skills')
      .select('id')
      .eq('id', skillId)
      .single()

    if (!data) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    await supabaseServiceRole.rpc('rate_skill', { p_skill_id: skillId, p_helpful: helpful })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/skills/[id]/rate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
