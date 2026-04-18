import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'
import { verifyWalletSignature, checkRateLimit } from '@/lib/security'

export const runtime = 'nodejs'

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json() as { walletAddress?: string; signature?: string; nonce?: number }
    const { walletAddress, signature, nonce } = body

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (Date.now() - nonce > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Request expired' }, { status: 400 })
    }

    await checkRateLimit(`rate:toggle-skill:${walletAddress}`, 30, 3600)

    try {
      verifyWalletSignature(walletAddress, `${id}${nonce}`, signature)
    } catch {
      return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 })
    }

    const { data: existing, error: fetchErr } = await supabaseServiceRole
      .from('skills')
      .select('owner_wallet, is_active')
      .eq('id', id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const row = existing as Record<string, unknown>
    if (row['owner_wallet'] !== walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const newActive = !row['is_active']

    const { error: updateErr } = await supabaseServiceRole
      .from('skills')
      .update({ is_active: newActive, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateErr) {
      console.error('[PATCH /api/skills/[id]/toggle]', updateErr)
      return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 })
    }

    return NextResponse.json({ is_active: newActive })
  } catch (err) {
    console.error('[PATCH /api/skills/[id]/toggle]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
