import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAnon, supabaseServiceRole } from '@/lib/supabase'
import { buildInitiateCallTx } from '@/app/api/_lib/tx-builder'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { skillId, input, callerWallet } = body as {
      skillId: string
      input: string
      callerWallet: string
    }

    if (!skillId || !input || !callerWallet) {
      return NextResponse.json({ error: 'skillId, input, callerWallet required' }, { status: 400 })
    }

    const { data: skill, error } = await supabaseAnon
      .from('skills_public')
      .select('price_lamports, owner_wallet, is_active')
      .eq('id', skillId)
      .single()

    if (error || !skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    if (!skill.is_active) return NextResponse.json({ error: 'Skill is inactive' }, { status: 400 })

    const callId = crypto.randomUUID()
    const inputHash = createHash('sha256').update(input).digest('hex')

    const unsignedTx = await buildInitiateCallTx({
      callId,
      skillId,
      callerWallet,
      skillOwner: skill.owner_wallet,
      priceLamports: skill.price_lamports,
    })

    // Pre-insert call record as pending
    await supabaseServiceRole.from('calls').insert({
      call_id: callId,
      skill_id: skillId,
      caller_wallet: callerWallet,
      amount_lamports: skill.price_lamports,
      status: 'pending',
      call_type: 'escrow',
      input_hash: inputHash,
    })

    return NextResponse.json({ callId, unsignedTx })
  } catch (err) {
    console.error('[POST /api/call/prepare]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
