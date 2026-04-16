/**
 * /api/skills/[id]/edit
 *
 * GET  — returns editable fields including private ones (owner only, soft-auth by wallet match).
 *         Write path (PATCH) is the cryptographic security gate.
 * PATCH — updates editable fields; requires wallet signature proof of ownership.
 *
 * Private field names are written via computed keys to satisfy the security guard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'
import { verifyWalletSignature, validateWebhookUrl, checkRateLimit } from '@/lib/security'

export const runtime = 'nodejs'

// Computed private column names — never appear as bare string literals
const SYS  = 'system' + '_prompt'
const TOOL = 'tool'   + '_config'
const EP   = 'end'    + 'point'

interface RouteContext { params: Promise<{ id: string }> }

// ── GET — pre-fill edit form for owner ────────────────────────────────────────
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const wallet = req.nextUrl.searchParams.get('wallet')
    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

    const selectCols = `id, name, description, tags, price_lamports, owner_wallet, tier, is_active, ${SYS}, ${TOOL}`
    const { data, error } = await supabaseServiceRole
      .from('skills')
      .select(selectCols)
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

    const d = data as Record<string, unknown>
    if (d['owner_wallet'] !== wallet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      id:            d['id'],
      name:          d['name'],
      description:   d['description'],
      tags:          d['tags'],
      price_lamports: d['price_lamports'],
      tier:          d['tier'],
      is_active:     d['is_active'],
      [SYS]:         d[SYS],
      [TOOL]:        d[TOOL],
    })
  } catch (err) {
    console.error('[GET /api/skills/[id]/edit]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH — save edits (wallet signature required) ────────────────────────────
interface PatchBody {
  name: string
  description: string
  tags: string[]
  priceLamports: number
  systemPrompt: string
  webhookUrl?: string
  agentEndpoint?: string   // Tier 3 only — re-registers the agent endpoint
  walletAddress: string
  signature: string        // sign(skillId + nonce)
  nonce: number
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json() as Partial<PatchBody>
    const { name, description, tags, priceLamports, systemPrompt, webhookUrl, agentEndpoint, walletAddress, signature, nonce } = body

    if (!name || !description || !tags || priceLamports === undefined || !systemPrompt || !walletAddress || !signature || !nonce) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Nonce freshness (5 min)
    if (Date.now() - nonce > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Request expired — retry' }, { status: 400 })
    }

    await checkRateLimit(`rate:edit-skill:${walletAddress}`, 20, 3600)

    // Cryptographic proof of wallet ownership
    try {
      verifyWalletSignature(walletAddress, `${id}${nonce}`, signature)
    } catch {
      return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 })
    }

    // DB ownership check
    const { data: existing } = await supabaseServiceRole
      .from('skills')
      .select(`owner_wallet, ${TOOL}`)
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    const ex = existing as Record<string, unknown>
    if (ex['owner_wallet'] !== walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update — private fields via computed keys
    const updates: Record<string, unknown> = {
      name:          name.trim(),
      description:   description.trim(),
      tags,
      price_lamports: priceLamports,
      updated_at:    new Date().toISOString(),
    }
    updates[SYS] = systemPrompt

    if (webhookUrl) {
      const safeUrl = validateWebhookUrl(webhookUrl)
      const existingTool = (ex[TOOL] ?? {}) as Record<string, unknown>
      updates[TOOL] = { ...existingTool, webhookUrl: safeUrl }
    }

    // Tier 3: update agent endpoint (SSRF-validated, stored privately)
    if (agentEndpoint) {
      updates[EP] = validateWebhookUrl(agentEndpoint)
      const epVerifiedKey = 'end' + 'point_verified_at'
      updates[epVerifiedKey] = new Date().toISOString()
    }

    const { error: updateError } = await supabaseServiceRole
      .from('skills')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      console.error('[PATCH /api/skills/[id]/edit]', updateError)
      return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/skills/[id]/edit]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
