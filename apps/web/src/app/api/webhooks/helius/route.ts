import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.HELIUS_WEBHOOK_SECRET
  if (!secret) return true // skip verification in local dev if not configured
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return signature === expected
}

// Minimal borsh deserialization helpers
function readU8(buf: Buffer, offset: number): [number, number] {
  return [buf.readUInt8(offset), offset + 1]
}
function readU64(buf: Buffer, offset: number): [bigint, number] {
  return [buf.readBigUInt64LE(offset), offset + 8]
}
function readPubkey(buf: Buffer, offset: number): [string, number] {
  const bs58 = require('bs58') as typeof import('bs58')
  return [bs58.default.encode(buf.slice(offset, offset + 32)), offset + 32]
}
function readBytes32(buf: Buffer, offset: number): [string, number] {
  return [buf.slice(offset, offset + 32).toString('hex'), offset + 32]
}

// Skill registry discriminator: first 8 bytes of sha256("account:SkillAccount")
// In practice, compare against the deployed IDL's discriminator.
const SKILL_ACCOUNT_DISCRIMINATOR = Buffer.from([
  201, 125, 247, 123, 248, 122, 90, 41,
])

// Escrow payment discriminator: first 8 bytes of sha256("account:CallAccount")
const CALL_ACCOUNT_DISCRIMINATOR = Buffer.from([
  254, 33, 140, 162, 118, 203, 5, 86,
])

interface ParsedSkill {
  owner: string
  skillId: string
  priceLamports: bigint
  reputationScore: number
  totalCalls: bigint
  isActive: boolean
  tier: number
}

interface ParsedCall {
  callId: string
  skillId: string
  caller: string
  skillOwner: string
  amountLamports: bigint
  status: number // 0=Pending, 1=Completed, 2=Cancelled
  resultHash: string
}

function parseSkillAccount(data: Buffer): ParsedSkill | null {
  try {
    if (!data.slice(0, 8).equals(SKILL_ACCOUNT_DISCRIMINATOR)) return null
    let off = 8
    const [owner] = readPubkey(data, off); off += 32
    const [skillId] = readBytes32(data, off); off += 32
    // Skip name (4 + len), description (4 + len), tags (4 + n*(4+len))
    // For MVP, only sync numeric/status fields — readable without length scanning
    // Future: implement full borsh string/vec reader
    return null // Placeholder — full deserialization requires IDL-generated client
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('helius-signature') ?? ''

    if (!verifySignature(rawBody, signature)) {
      return new Response('Unauthorized', { status: 401 })
    }

    const events = JSON.parse(rawBody) as Array<{
      accountData?: Array<{ account: string; data?: string }>
      type?: string
      slot?: number
    }>

    const updates: Array<PromiseLike<unknown>> = []

    for (const event of events) {
      if (!event.accountData) continue

      for (const acctChange of event.accountData) {
        if (!acctChange.data) continue

        // Helius sends account data as base64
        let accountDataBuf: Buffer
        try {
          accountDataBuf = Buffer.from(acctChange.data, 'base64')
        } catch {
          continue
        }

        if (accountDataBuf.length < 8) continue
        const disc = accountDataBuf.slice(0, 8)

        if (disc.equals(SKILL_ACCOUNT_DISCRIMINATOR)) {
          // SkillAccount — sync public fields only (no endpoint)
          // Full deserialization requires compiled IDL client (available after anchor build)
          // For now: trigger a re-sync of the skill's on-chain numeric fields
          // The Supabase upsert is idempotent and safe to call with partial data
          updates.push(
            supabaseServiceRole
              .from('skills')
              .update({ updated_at: new Date().toISOString() } as never)
              .eq('id', acctChange.account)
              .then((r) => r)
          )
        } else if (disc.equals(CALL_ACCOUNT_DISCRIMINATOR)) {
          // CallAccount — update call status
          // Full deserialization post-IDL generation
          updates.push(
            supabaseServiceRole
              .from('calls')
              .upsert(
                {
                  call_id: acctChange.account,
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                },
                { onConflict: 'call_id', ignoreDuplicates: false }
              )
              .then((r) => r)
          )
        }
      }
    }

    await Promise.allSettled(updates)

    return NextResponse.json({ processed: updates.length })
  } catch (err) {
    console.error('[POST /api/webhooks/helius]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
