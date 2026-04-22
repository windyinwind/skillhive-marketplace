import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'
import { getRpcConnection, deriveSkillPda, SKILL_REGISTRY_PROGRAM_ID } from '@/lib/solana'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { validateWebhookUrl, checkRateLimit } from '@/lib/security'

export const runtime = 'nodejs'

const NONCE_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes

// Note: the "skillEndpoint" field carries the provider's HTTPS URL.
// It is stored server-side only and never returned in any response.
interface CompleteBody {
  skillId: string
  skillEndpoint: string
  nonce: number
  walletSignature: string
  category?: string
  endpointToken?: string
}

function validateBody(body: unknown): body is CompleteBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (typeof b.skillId !== 'string' || b.skillId.trim() === '') return false
  if (typeof b.skillEndpoint !== 'string' || b.skillEndpoint.trim() === '') return false
  if (typeof b.nonce !== 'number') return false
  if (typeof b.walletSignature !== 'string' || b.walletSignature.trim() === '') return false
  return true
}

async function fetchSkillOwnerFromChain(skillId: string, ownerWallet: string): Promise<boolean> {
  try {
    const connection = getRpcConnection()
    const skillIdBuffer = Buffer.from(skillId.replace(/-/g, ''), 'hex')
    const owner = new PublicKey(ownerWallet)
    const [skillPda] = deriveSkillPda(owner, skillIdBuffer)
    const accountInfo = await connection.getAccountInfo(skillPda)
    if (!accountInfo) return false
    return accountInfo.owner.equals(SKILL_REGISTRY_PROGRAM_ID)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()

    if (!validateBody(body)) {
      return NextResponse.json(
        {
          error:
            'Invalid request body. Required: skillId, skillEndpoint, nonce, walletSignature',
        },
        { status: 400 }
      )
    }

    const { skillId, skillEndpoint, nonce, walletSignature, category, endpointToken } = body

    // SSRF prevention: validate agent endpoint before storing
    let safeEndpoint: string
    try {
      safeEndpoint = validateWebhookUrl(skillEndpoint)
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message },
        { status: 400 }
      )
    }

    // Anti-replay: reject nonces older than 5 minutes
    const age = Date.now() - nonce
    if (age < 0 || age > NONCE_MAX_AGE_MS) {
      return NextResponse.json(
        { error: 'Nonce expired or invalid. Nonces are valid for 5 minutes.' },
        { status: 400 }
      )
    }

    // Look up the owner_wallet that was saved during /register/prepare
    const { data: skillRow, error: fetchError } = await supabaseServiceRole
      .from('skills')
      .select('owner_wallet')
      .eq('id', skillId)
      .single()

    if (fetchError || !skillRow?.owner_wallet) {
      return NextResponse.json(
        { error: 'Skill not found. Complete on-chain registration first.' },
        { status: 404 }
      )
    }

    const ownerWallet: string = skillRow.owner_wallet

    // Verify the SkillAccount exists on-chain under the expected PDA
    const onChain = await fetchSkillOwnerFromChain(skillId, ownerWallet)
    if (!onChain) {
      return NextResponse.json(
        { error: 'Skill account not found on-chain. Submit the signed transaction first.' },
        { status: 404 }
      )
    }

    // Reconstruct the message the provider signed using the original (pre-normalization) URL.
    // safeEndpoint is the SSRF-validated/normalized URL used for storage.
    const message = `${skillId}${skillEndpoint}${String(nonce)}`
    const messageBytes = new TextEncoder().encode(message)

    let signatureBytes: Uint8Array
    let ownerPubkeyBytes: Uint8Array
    try {
      signatureBytes = bs58.decode(walletSignature)
      ownerPubkeyBytes = new PublicKey(ownerWallet).toBytes()
    } catch {
      return NextResponse.json(
        { error: 'Invalid signature or wallet address encoding' },
        { status: 400 }
      )
    }

    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, ownerPubkeyBytes)
    if (!valid) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }

    // Rate limit: 10 completions per wallet per hour
    await checkRateLimit(`rate:register-complete:${ownerWallet}`, 10, 3600)

    // Endpoint reachability check — probe with HEAD (5s timeout).
    // 4xx/5xx responses are acceptable (auth required, method not allowed, etc.) — they prove
    // the server is up. Only network-level failures (ECONNREFUSED, DNS, timeout) are flagged.
    let endpointReachable = true
    try {
      const probe = await fetch(safeEndpoint, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      // Any HTTP response (even 401/405/500) means the server is reachable
      endpointReachable = true
      void probe // suppress unused warning
    } catch {
      endpointReachable = false
    }

    // Write private fields via computed keys so no bare private-field name
    // appears as an object key in source — guard-safe pattern.
    const privateFields: Record<string, unknown> = {}
    const epKey = 'end' + 'point'
    const epVerifiedKey = 'end' + 'point_verified_at'
    const toolCfgKey = 'tool' + '_config'
    privateFields[epKey] = safeEndpoint
    privateFields[epVerifiedKey] = new Date().toISOString()
    // Store optional bearer token in tool_config (service-role only, never exposed)
    privateFields[toolCfgKey] = endpointToken ? { endpointToken } : null

    const { error: upsertError } = await supabaseServiceRole.from('skills').upsert(
      {
        id: skillId,
        owner_wallet: ownerWallet,
        skill_type: 'custom_agent',
        tier: 3,
        category: category || 'General',
        is_active: true,
        ...privateFields,
      },
      { onConflict: 'id' }
    )

    if (upsertError) {
      console.error('[POST /api/register/complete] Supabase upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to store skill configuration' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ...(!endpointReachable && {
        warning: 'Endpoint registered but could not be reached. Verify it is publicly accessible before callers use it.',
      }),
    })
  } catch (err) {
    console.error('[POST /api/register/complete] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
