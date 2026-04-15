import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { Connection } from '@solana/web3.js'
import { supabaseAnon, supabaseServiceRole } from '@/lib/supabase'
import { getRpcConnection } from '@/lib/solana'

export const runtime = 'nodejs'

const PREVIEW_LIMIT = Number(process.env.PREVIEW_RATE_LIMIT_DAILY ?? '3')

async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
  })
  const json = await res.json()
  return json.result ?? null
}

async function redisIncr(key: string, exSeconds: number): Promise<number> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/incr/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
  })
  const json = await res.json()
  const count = json.result as number
  if (count === 1) {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/expire/${key}/${exSeconds}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    })
  }
  return count
}

async function redisPublish(channel: string, message: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${channel}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { callId, signedTx, input, skillId, preview } = body as {
      callId?: string
      signedTx?: string
      input: string
      skillId: string
      preview?: boolean
    }

    if (!input || !skillId) {
      return NextResponse.json({ error: 'input and skillId required' }, { status: 400 })
    }

    // ── Preview mode: rate-limit by IP ────────────────────────────────────────
    if (preview) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
      const rateLimitKey = `preview:${ip}:${skillId}`
      const count = await redisIncr(rateLimitKey, 86400)
      if (count > PREVIEW_LIMIT) {
        return NextResponse.json(
          { error: `Preview limit reached (${PREVIEW_LIMIT}/day per IP)` },
          { status: 429 }
        )
      }
    }

    // ── For real escrow calls: broadcast the signed tx ─────────────────────
    let txSignature: string | undefined
    if (!preview && signedTx) {
      const connection = getRpcConnection()
      const txBuffer = Buffer.from(signedTx, 'base64')
      txSignature = await connection.sendRawTransaction(txBuffer, { skipPreflight: false })
      await connection.confirmTransaction(txSignature, 'confirmed')
    }

    // ── Fetch endpoint (service role — never returned to browser) ─────────
    const { data: skillPrivate, error: skillErr } = await supabaseServiceRole
      .from('skills')
      .select('endpoint')
      .eq('id', skillId)
      .single()

    if (skillErr || !skillPrivate?.endpoint) {
      return NextResponse.json({ error: 'Skill endpoint not found' }, { status: 404 })
    }

    // ── Call the skill ─────────────────────────────────────────────────────
    const effectiveCallId = callId ?? crypto.randomUUID()
    const skillRes = await fetch(skillPrivate.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
      },
      body: JSON.stringify({ input, callId: effectiveCallId }),
    })

    if (!skillRes.ok) {
      throw new Error(`Skill returned ${skillRes.status}`)
    }

    const { result } = (await skillRes.json()) as { result: string }
    const resultHash = createHash('sha256').update(result).digest('hex')

    // ── Truncate preview results to tease the full answer ─────────────────
    const PREVIEW_CHAR_LIMIT = 200
    const truncated = preview && result.length > PREVIEW_CHAR_LIMIT
    const resultToReturn = truncated ? result.slice(0, PREVIEW_CHAR_LIMIT) : result

    // ── Update call record ─────────────────────────────────────────────────
    if (callId) {
      await supabaseServiceRole.from('calls').update({
        status: preview ? 'preview' : 'completed',
        result,
        result_hash: resultHash,
        tx_signature: txSignature,
        completed_at: new Date().toISOString(),
      }).eq('call_id', callId)
    } else {
      await supabaseServiceRole.from('calls').insert({
        call_id: effectiveCallId,
        skill_id: skillId,
        caller_wallet: 'preview',
        amount_lamports: 0,
        status: 'preview',
        call_type: 'preview',
        result,
        result_hash: resultHash,
      })
    }

    // ── Publish to Redis for SSE subscribers ──────────────────────────────
    await redisPublish(
      `call:${effectiveCallId}:result`,
      JSON.stringify({ result, status: preview ? 'preview' : 'completed', txSignature })
    )

    return NextResponse.json({ result: resultToReturn, truncated, callId: effectiveCallId, txSignature })
  } catch (err) {
    console.error('[POST /api/call/execute]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
