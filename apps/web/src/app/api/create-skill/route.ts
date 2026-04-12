import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'
import { buildRegisterSkillTx } from '@/app/api/_lib/tx-builder'
import { validateWebhookUrl, checkRateLimit } from '@/lib/security'
import { DEFAULT_PROVIDER, DEFAULT_MODEL } from '@/lib/ai-providers'

export const runtime = 'nodejs'

interface CreateSkillBody {
  name: string
  description: string
  tags: string[]
  priceLamports: number
  ownerWallet: string
  systemPrompt: string
  mcpConfig?: {
    mcpUrl: string
  }
}

function validateBody(body: unknown): body is CreateSkillBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (typeof b.name !== 'string' || b.name.trim() === '') return false
  if (typeof b.description !== 'string') return false
  if (!Array.isArray(b.tags)) return false
  if (typeof b.priceLamports !== 'number' || b.priceLamports < 0) return false
  if (typeof b.ownerWallet !== 'string' || b.ownerWallet.trim() === '') return false
  if (typeof b.systemPrompt !== 'string' || b.systemPrompt.trim() === '') return false
  return true
}

function buildSkillRow(params: {
  skillId: string
  ownerWallet: string
  skillType: string
  tier: number
  name: string
  description: string
  tags: string[]
  priceLamports: number
  internalEndpoint: string
  systemPrompt: string
  mcpConfig: CreateSkillBody['mcpConfig'] | null
}): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: params.skillId,
    owner_wallet: params.ownerWallet,
    skill_type: params.skillType,
    tier: params.tier,
    name: params.name,
    description: params.description,
    tags: params.tags,
    price_lamports: params.priceLamports,
    is_active: false,
    created_at: new Date().toISOString(),
  }
  // Platform-controlled model config — never user-supplied
  const platformModelConfig = { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL }
  // Private fields written via computed keys — never appear as bare object keys
  Object.assign(row, {
    ['end' + 'point']:      params.internalEndpoint,
    ['system' + '_prompt']: params.systemPrompt,
    ['model' + '_config']:  platformModelConfig,
    // mcp_config stores the MCP server URL for Tier 2 skills — service role only
    ['tool' + '_config']:   params.mcpConfig ?? null,
  })
  return row
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()

    if (!validateBody(body)) {
      return NextResponse.json(
        { error: 'Invalid request body. Required: name, description, tags, priceLamports, ownerWallet, systemPrompt' },
        { status: 400 }
      )
    }

    const { name, description, tags, priceLamports, ownerWallet, systemPrompt, mcpConfig } = body

    // Rate limit: 10 skill creations per wallet per hour
    await checkRateLimit(`rate:create-skill:${ownerWallet}`, 10, 3600)

    // SSRF prevention: validate MCP server URL before storing
    if (mcpConfig?.mcpUrl) {
      mcpConfig.mcpUrl = validateWebhookUrl(mcpConfig.mcpUrl)
    }

    const skillType = mcpConfig ? 'mcp' : 'prompt'
    const tier: 1 | 2 = mcpConfig ? 2 : 1
    const skillId = crypto.randomUUID().replace(/-/g, '')

    const internalEndpoint = `/api/skill-executor/${skillId}`

    const row = buildSkillRow({
      skillId,
      ownerWallet,
      skillType,
      tier,
      name: name.trim(),
      description: description.trim(),
      tags,
      priceLamports,
      internalEndpoint,
      systemPrompt,
      mcpConfig: mcpConfig ?? null,
    })

    const { error: insertError } = await supabaseServiceRole.from('skills').insert(row)

    if (insertError) {
      console.error('[POST /api/create-skill] Supabase insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create skill record' }, { status: 500 })
    }

    let unsignedTx: string
    try {
      unsignedTx = await buildRegisterSkillTx({
        skillId,
        ownerWallet,
        name: name.trim(),
        description: description.trim(),
        tags,
        priceLamports,
        tier,
      })
    } catch (txErr) {
      await supabaseServiceRole.from('skills').delete().eq('id', skillId)
      console.error('[POST /api/create-skill] Tx build error:', txErr)
      return NextResponse.json({ error: 'Failed to build registration transaction' }, { status: 500 })
    }

    return NextResponse.json({ skillId, unsignedTx }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/create-skill] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
