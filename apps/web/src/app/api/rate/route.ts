import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'
import { verifyWalletSignature, checkRateLimit } from '@/lib/security'

export const runtime = 'nodejs'

interface RateBody {
  callId: string
  skillId: string
  score: number        // 1–5
  callerWallet: string
  signature: string    // sign(callId + score + callerWallet)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<RateBody>
    const { callId, skillId, score, callerWallet, signature } = body

    if (!callId || !skillId || !callerWallet || !signature) {
      return NextResponse.json({ error: 'callId, skillId, callerWallet, and signature are required' }, { status: 400 })
    }
    if (typeof score !== 'number' || score < 1 || score > 5 || !Number.isInteger(score)) {
      return NextResponse.json({ error: 'score must be an integer between 1 and 5' }, { status: 400 })
    }

    // Rate limit: 60 ratings per wallet per hour
    await checkRateLimit(`rate:rate-call:${callerWallet}`, 60, 3600)

    // Verify the caller owns this wallet — prevents rating spoofing
    try {
      verifyWalletSignature(callerWallet, `${callId}${score}${callerWallet}`, signature)
    } catch {
      return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 })
    }

    // Verify the call exists and belongs to this caller
    const { data: call, error: callErr } = await supabaseServiceRole
      .from('calls')
      .select('call_id, skill_id, caller_wallet, status')
      .eq('call_id', callId)
      .single()

    if (callErr || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }
    if ((call as Record<string, unknown>)['caller_wallet'] !== callerWallet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if ((call as Record<string, unknown>)['status'] !== 'completed') {
      return NextResponse.json({ error: 'Can only rate completed calls' }, { status: 400 })
    }

    // Upsert — idempotent if user rates twice
    const { error: insertErr } = await supabaseServiceRole
      .from('ratings')
      .upsert(
        { call_id: callId, skill_id: skillId, caller_wallet: callerWallet, score },
        { onConflict: 'call_id', ignoreDuplicates: false }
      )

    if (insertErr) {
      console.error('[POST /api/rate]', insertErr)
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/rate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
