import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import bs58 from 'bs58'
import { supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.HELIUS_WEBHOOK_SECRET
  if (!secret) return true // skip in local dev
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return signature === expected
}

// ---------------------------------------------------------------------------
// Borsh primitive readers
// Each returns [value, newOffset]
// ---------------------------------------------------------------------------

function readU8(buf: Buffer, off: number): [number, number] {
  return [buf.readUInt8(off), off + 1]
}

function readU16LE(buf: Buffer, off: number): [number, number] {
  return [buf.readUInt16LE(off), off + 2]
}

function readU64LE(buf: Buffer, off: number): [bigint, number] {
  return [buf.readBigUInt64LE(off), off + 8]
}

function readI64LE(buf: Buffer, off: number): [bigint, number] {
  return [buf.readBigInt64LE(off), off + 8]
}

function readPubkey(buf: Buffer, off: number): [string, number] {
  const bytes = buf.slice(off, off + 32)
  return [bs58.encode(bytes), off + 32]
}

function readBytes32(buf: Buffer, off: number): [Buffer, number] {
  return [buf.slice(off, off + 32), off + 32]
}

/** Borsh string: u32 little-endian length prefix followed by UTF-8 bytes */
function readBorshString(buf: Buffer, off: number): [string, number] {
  const len = buf.readUInt32LE(off)
  off += 4
  const str = buf.slice(off, off + len).toString('utf8')
  return [str, off + len]
}

/** Borsh Vec<String>: u32 count, then count × borshString */
function readBorshVecString(buf: Buffer, off: number): [string[], number] {
  const count = buf.readUInt32LE(off)
  off += 4
  const items: string[] = []
  for (let i = 0; i < count; i++) {
    const [s, nextOff] = readBorshString(buf, off)
    items.push(s)
    off = nextOff
  }
  return [items, off]
}

// ---------------------------------------------------------------------------
// Discriminators — from packages/contracts/target/idl/*.json
// ---------------------------------------------------------------------------

// skill_registry IDL → accounts[0].discriminator
const SKILL_ACCOUNT_DISCRIMINATOR = Buffer.from([122, 1, 17, 219, 180, 43, 180, 20])

// escrow_payment IDL → accounts[0].discriminator
const CALL_ACCOUNT_DISCRIMINATOR = Buffer.from([5, 20, 115, 18, 10, 223, 182, 97])

// ---------------------------------------------------------------------------
// CallStatus enum (must match Rust enum order: Pending=0, Completed=1, Cancelled=2)
// ---------------------------------------------------------------------------
const CALL_STATUS = ['pending', 'completed', 'cancelled'] as const

// ---------------------------------------------------------------------------
// Parsed account shapes
// ---------------------------------------------------------------------------

interface ParsedSkillAccount {
  owner: string          // base58 pubkey
  skillIdHex: string     // 32-byte hex (first 16 bytes = UUID hex used as Supabase id)
  name: string
  description: string
  tags: string[]
  priceLamports: bigint
  reputationScore: number
  totalCalls: bigint
  isActive: boolean
  tier: number
  createdAt: bigint
}

interface ParsedCallAccount {
  callIdHex: string      // first 16 bytes as hex = Supabase call id
  skillIdHex: string
  caller: string
  skillOwner: string
  amountLamports: bigint
  status: typeof CALL_STATUS[number]
  createdAt: bigint
  completedAt: bigint
}

// ---------------------------------------------------------------------------
// Account parsers
// ---------------------------------------------------------------------------

/**
 * SkillAccount layout (after 8-byte discriminator):
 *   owner          pubkey   32
 *   skill_id       [u8;32]  32
 *   name           String   4 + len
 *   description    String   4 + len
 *   tags           Vec<str> 4 + n*(4+len)
 *   price_lamports u64      8
 *   reputation     u16      2
 *   total_calls    u64      8
 *   is_active      bool     1
 *   tier           u8       1
 *   created_at     i64      8
 *   bump           u8       1
 */
function parseSkillAccount(data: Buffer): ParsedSkillAccount | null {
  try {
    if (data.length < 8) return null
    if (!data.slice(0, 8).equals(SKILL_ACCOUNT_DISCRIMINATOR)) return null

    let off = 8
    const [owner, o1] = readPubkey(data, off); off = o1
    const [skillIdBuf, o2] = readBytes32(data, off); off = o2
    const [name, o3] = readBorshString(data, off); off = o3
    const [description, o4] = readBorshString(data, off); off = o4
    const [tags, o5] = readBorshVecString(data, off); off = o5
    const [priceLamports, o6] = readU64LE(data, off); off = o6
    const [reputationScore, o7] = readU16LE(data, off); off = o7
    const [totalCalls, o8] = readU64LE(data, off); off = o8
    const [isActiveNum, o9] = readU8(data, off); off = o9
    const [tier, o10] = readU8(data, off); off = o10
    const [createdAt] = readI64LE(data, off)

    return {
      owner,
      // First 16 bytes are the UUID bytes; convert to 32-char hex = Supabase id
      skillIdHex: skillIdBuf.slice(0, 16).toString('hex'),
      name,
      description,
      tags,
      priceLamports,
      reputationScore,
      totalCalls,
      isActive: isActiveNum !== 0,
      tier,
      createdAt,
    }
  } catch {
    return null
  }
}

/**
 * CallAccount layout (after 8-byte discriminator):
 *   call_id        [u8;32]  32
 *   skill_id       [u8;32]  32
 *   caller         pubkey   32
 *   skill_owner    pubkey   32
 *   amount_lamports u64     8
 *   input_hash     [u8;32]  32
 *   result_hash    [u8;32]  32
 *   status         u8 (enum) 1
 *   created_at     i64      8
 *   completed_at   i64      8
 *   bump           u8       1
 */
function parseCallAccount(data: Buffer): ParsedCallAccount | null {
  try {
    if (data.length < 8) return null
    if (!data.slice(0, 8).equals(CALL_ACCOUNT_DISCRIMINATOR)) return null

    let off = 8
    const [callIdBuf, o1] = readBytes32(data, off); off = o1
    const [skillIdBuf, o2] = readBytes32(data, off); off = o2
    const [caller, o3] = readPubkey(data, off); off = o3
    const [skillOwner, o4] = readPubkey(data, off); off = o4
    const [amountLamports, o5] = readU64LE(data, off); off = o5
    off += 32 // skip input_hash
    off += 32 // skip result_hash
    const [statusNum, o6] = readU8(data, off); off = o6
    const [createdAt, o7] = readI64LE(data, off); off = o7
    const [completedAt] = readI64LE(data, off)

    return {
      callIdHex: callIdBuf.slice(0, 16).toString('hex'),
      skillIdHex: skillIdBuf.slice(0, 16).toString('hex'),
      caller,
      skillOwner,
      amountLamports,
      status: CALL_STATUS[statusNum] ?? 'pending',
      createdAt,
      completedAt,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Sync helpers
// ---------------------------------------------------------------------------

async function syncSkillAccount(parsed: ParsedSkillAccount, pdaAddress: string) {
  // Match by Supabase id (first 16 bytes of skill_id as hex = UUID without dashes)
  // Fallback: match by owner_wallet if skill_id doesn't match (unlikely)
  const { error } = await supabaseServiceRole
    .from('skills')
    .update({
      owner_wallet: parsed.owner,
      name: parsed.name,
      description: parsed.description,
      tags: parsed.tags,
      price_lamports: Number(parsed.priceLamports),
      reputation_score: parsed.reputationScore,
      total_calls: Number(parsed.totalCalls),
      is_active: parsed.isActive,
      tier: parsed.tier,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', parsed.skillIdHex)

  if (error) {
    // Fallback: update by owner_wallet (for Tier 1/2 skills where skillId comes from UUID)
    await supabaseServiceRole
      .from('skills')
      .update({
        price_lamports: Number(parsed.priceLamports),
        reputation_score: parsed.reputationScore,
        total_calls: Number(parsed.totalCalls),
        is_active: parsed.isActive,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('owner_wallet', parsed.owner)
      .eq('id', pdaAddress) // PDA address as secondary match if owner has multiple skills
  }
}

async function syncCallAccount(parsed: ParsedCallAccount) {
  const completedAt = parsed.completedAt > 0n
    ? new Date(Number(parsed.completedAt) * 1000).toISOString()
    : null

  await supabaseServiceRole
    .from('calls')
    .update({
      status: parsed.status,
      ...(completedAt ? { completed_at: completedAt } : {}),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('call_id', parsed.callIdHex)
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

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

    const updates: PromiseLike<unknown>[] = []

    for (const event of events) {
      if (!event.accountData) continue

      for (const acctChange of event.accountData) {
        if (!acctChange.data) continue

        let buf: Buffer
        try {
          buf = Buffer.from(acctChange.data, 'base64')
        } catch {
          continue
        }

        if (buf.length < 8) continue

        const disc = buf.slice(0, 8)

        if (disc.equals(SKILL_ACCOUNT_DISCRIMINATOR)) {
          const parsed = parseSkillAccount(buf)
          if (parsed) {
            updates.push(syncSkillAccount(parsed, acctChange.account))
          } else {
            // Discriminator matched but parse failed — at least bump updated_at
            updates.push(
              supabaseServiceRole
                .from('skills')
                .update({ updated_at: new Date().toISOString() } as never)
                .eq('id', acctChange.account)
                .then((r) => r)
            )
          }
        } else if (disc.equals(CALL_ACCOUNT_DISCRIMINATOR)) {
          const parsed = parseCallAccount(buf)
          if (parsed) {
            updates.push(syncCallAccount(parsed))
          }
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
