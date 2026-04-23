import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAnon, supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    if (!process.env.X402_FACILITATOR_URL) {
      return Response.json({ error: 'x402_not_configured' }, { status: 503 })
    }

    const { skillId } = await params
    const paymentHeader = req.headers.get('x402-payment')

    // Fetch public skill info
    const { data: skill, error } = await supabaseAnon
      .from('skills_public')
      .select('name, price_lamports, owner_wallet, is_active')
      .eq('id', skillId)
      .single()

    if (error || !skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    if (!skill.is_active) return NextResponse.json({ error: 'Skill is inactive' }, { status: 400 })

    // ── No payment header → return 402 ────────────────────────────────────
    if (!paymentHeader) {
      return NextResponse.json(
        {
          x402Version: 1,
          accepts: [
            {
              scheme: 'exact',
              network: process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' ? 'solana-mainnet' : 'solana-devnet',
              maxAmountRequired: String(skill.price_lamports),
              resource: req.url,
              description: `Call skill: ${skill.name}`,
              mimeType: 'application/json',
              payTo: skill.owner_wallet,
              maxTimeoutSeconds: 300,
              asset: 'sol',
              extra: {},
            },
          ],
        },
        { status: 402 }
      )
    }

    // ── Verify payment via x402 facilitator ───────────────────────────────
    const verification = await fetch(`${process.env.X402_FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment: paymentHeader, resource: req.url }),
    })
    if (!verification.ok) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 402 })
    }

    // ── Fetch endpoint and call skill ─────────────────────────────────────
    const { data: skillPrivate } = await supabaseServiceRole
      .from('skills')
      .select('endpoint, tool_config')
      .eq('id', skillId)
      .single()

    if (!skillPrivate?.endpoint) {
      return NextResponse.json({ error: 'Skill endpoint unavailable' }, { status: 503 })
    }

    let body: { input?: string } = {}
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const input = body.input ?? ''
    const callId = crypto.randomUUID()

    const endpointToken = (skillPrivate.tool_config as Record<string, unknown> | null)?.endpointToken as string | undefined
    const callHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
    }
    if (endpointToken) callHeaders['Authorization'] = `Bearer ${endpointToken}`
    const skillRes = await fetch(skillPrivate.endpoint, {
      method: 'POST',
      headers: callHeaders,
      body: JSON.stringify({ input, callId }),
    })

    if (!skillRes.ok) throw new Error(`Skill returned ${skillRes.status}`)

    const { result } = (await skillRes.json()) as { result: string }

    await supabaseServiceRole.from('calls').insert({
      call_id: callId,
      skill_id: skillId,
      caller_wallet: 'x402',
      amount_lamports: skill.price_lamports,
      status: 'completed',
      call_type: 'x402',
      result_hash: createHash('sha256').update(result).digest('hex'),
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json(
      { result, callId },
      { headers: { 'x402-receipt': paymentHeader } }
    )
  } catch (err) {
    console.error('[POST /api/call/x402/[skillId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
