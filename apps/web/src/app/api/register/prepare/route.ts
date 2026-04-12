import { NextRequest, NextResponse } from 'next/server'
import { buildRegisterSkillTx } from '@/app/api/_lib/tx-builder'
import { checkRateLimit } from '@/lib/security'

export const runtime = 'nodejs'

interface PrepareBody {
  name: string
  description: string
  tags: string[]
  priceLamports: number
  ownerWallet: string
}

function validateBody(body: unknown): body is PrepareBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (typeof b.name !== 'string' || b.name.trim() === '') return false
  if (typeof b.description !== 'string') return false
  if (!Array.isArray(b.tags)) return false
  if (typeof b.priceLamports !== 'number' || b.priceLamports < 0) return false
  if (typeof b.ownerWallet !== 'string' || b.ownerWallet.trim() === '') return false
  return true
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()

    if (!validateBody(body)) {
      return NextResponse.json(
        { error: 'Invalid request body. Required: name, description, tags, priceLamports, ownerWallet' },
        { status: 400 }
      )
    }

    const { name, description, tags, priceLamports, ownerWallet } = body

    // Rate limit: 5 registrations per wallet per hour
    await checkRateLimit(`rate:register:${ownerWallet}`, 5, 3600)

    const skillId = crypto.randomUUID().replace(/-/g, '')

    // Tier 3 — no Supabase insert yet; endpoint is stored in /register/complete
    // after the provider proves ownership via wallet signature.
    const unsignedTx = await buildRegisterSkillTx({
      skillId,
      ownerWallet,
      name: name.trim(),
      description: description.trim(),
      tags,
      priceLamports,
      tier: 3,
    })

    return NextResponse.json({ skillId, unsignedTx }, { status: 200 })
  } catch (err) {
    console.error('[POST /api/register/prepare] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
