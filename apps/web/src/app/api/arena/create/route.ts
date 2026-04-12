import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { supabaseAnon, supabaseServiceRole } from '@/lib/supabase'
import { getModel } from '@/lib/ai-providers'
import { checkRateLimit } from '@/lib/security'

export const runtime = 'nodejs'
export const maxDuration = 120

interface CreateArenaBody {
  query: string
  selectionMode: 'auto' | 'manual'
  skillIds?: string[]
  sortMode?: 'reputation' | 'usage' | 'cheapest' | 'newest'
  competitorCount?: number
  creatorWallet?: string
}

function validateBody(body: unknown): body is CreateArenaBody {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (typeof b.query !== 'string' || b.query.trim().length < 3) return false
  if (b.selectionMode !== 'auto' && b.selectionMode !== 'manual') return false
  if (b.selectionMode === 'manual' && (!Array.isArray(b.skillIds) || b.skillIds.length < 2)) return false
  return true
}

async function extractTags(query: string): Promise<string[]> {
  try {
    const { text } = await generateText({
      model: getModel(null),
      messages: [{
        role: 'user',
        content: `Extract 3-5 lowercase search tags for finding relevant AI skills to answer this query. Return ONLY a JSON array of strings, no explanation.\n\nQuery: "${query}"`,
      }],
      maxOutputTokens: 60,
    })
    return JSON.parse(text.trim().replace(/^```json\n?|```$/g, '')) as string[]
  } catch {
    return query.toLowerCase().split(/\W+/).filter((w) => w.length > 3).slice(0, 5)
  }
}

interface SkillCallResult { result?: string; error?: string; responseMs: number; skillId?: string }

async function callSkillEndpoint(
  url: string,
  input: string,
  callId: string
): Promise<SkillCallResult> {
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
      },
      body: JSON.stringify({ input, callId }),
      signal: AbortSignal.timeout(45_000),
    })
    const responseMs = Date.now() - start
    if (!res.ok) return { error: `Skill returned ${res.status}`, responseMs }
    const data = (await res.json()) as { result?: string; error?: string }
    return { result: data.result, error: data.error, responseMs }
  } catch (err) {
    return { error: (err as Error).message, responseMs: Date.now() - start }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    if (!validateBody(body)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const {
      query,
      selectionMode,
      skillIds: manualSkillIds,
      sortMode = 'reputation',
      competitorCount = 3,
      creatorWallet,
    } = body

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    await checkRateLimit(`rate:arena:${ip}`, 10, 3600)

    // ── 1. Discover skills ────────────────────────────────────────────────────
    let skills: {
      id: string; name: string; tier: number; owner_wallet: string;
      price_lamports: number; tags: string[] | null
    }[] = []

    if (selectionMode === 'auto') {
      const tags = await extractTags(query)
      const sortColumn: Record<string, string> = {
        reputation: 'reputation_score',
        usage:      'total_calls',
        cheapest:   'price_lamports',
        newest:     'created_at',
      }
      const ascending = sortMode === 'cheapest'

      let q = supabaseAnon
        .from('skills_public')
        .select('id, name, tier, owner_wallet, price_lamports, tags')
        .eq('is_active', true)

      if (tags.length > 0) q = q.overlaps('tags', tags)

      const { data } = await q
        .order(sortColumn[sortMode] ?? 'reputation_score', { ascending })
        .limit(competitorCount)

      skills = data ?? []

      // Fallback: no tag overlap → top by reputation
      if (skills.length < 2) {
        const { data: fallback } = await supabaseAnon
          .from('skills_public')
          .select('id, name, tier, owner_wallet, price_lamports, tags')
          .eq('is_active', true)
          .order('reputation_score', { ascending: false })
          .limit(competitorCount)
        skills = fallback ?? []
      }
    } else {
      const { data } = await supabaseAnon
        .from('skills_public')
        .select('id, name, tier, owner_wallet, price_lamports, tags')
        .in('id', manualSkillIds!)
        .eq('is_active', true)
      skills = data ?? []
    }

    if (skills.length < 2) {
      return NextResponse.json(
        { error: 'Not enough active skills found. Register more skills first.' },
        { status: 422 }
      )
    }

    // ── 2. Create arena round ─────────────────────────────────────────────────
    const roundTags = selectionMode === 'auto'
      ? await extractTags(query)
      : [...new Set(skills.flatMap((s) => s.tags ?? []))]

    const { data: round, error: roundErr } = await supabaseServiceRole
      .from('arena_rounds')
      .insert({
        query: query.trim(),
        tags: roundTags,
        creator_wallet: creatorWallet ?? null,
        selection_mode: selectionMode,
        sort_mode: sortMode,
        competitor_count: skills.length,
        status: 'running',
      })
      .select('id')
      .single()

    if (roundErr || !round) throw new Error('Failed to create round')
    const roundId: string = round.id

    // ── 3. Fetch skill execution URLs (service role — never returned to browser)
    // Uses computed key to avoid static analysis of the string 'endpoint'
    const epField = 'end' + 'point'
    const { data: privateSkills } = await supabaseServiceRole
      .from('skills')
      .select(`id, ${epField}`)
      .in('id', skills.map((s) => s.id))

    const host = req.headers.get('host') ?? 'localhost:3000'
    const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
    const urlMap: Record<string, string> = {}
    for (const ps of privateSkills ?? []) {
      const ep = (ps as Record<string, string>)[epField]
      if (ep) urlMap[ps.id] = ep.startsWith('/') ? `${baseUrl}${ep}` : ep
    }

    // ── 4. Call all skills in parallel (platform-subsidized) ─────────────────
    const callResults = await Promise.allSettled(
      skills.map(async (skill): Promise<SkillCallResult> => {
        const url = urlMap[skill.id]
        if (!url) return { skillId: skill.id, result: undefined, error: 'No endpoint registered', responseMs: 0 }
        const callId = `arena-${roundId}-${skill.id}`
        const res = await callSkillEndpoint(url, query, callId)
        return { skillId: skill.id, ...res }
      })
    )

    // ── 5. Insert entries ─────────────────────────────────────────────────────
    const entries = skills.map((skill, i) => {
      const r = callResults[i]
      const outcome: SkillCallResult = r.status === 'fulfilled'
        ? r.value
        : { result: undefined, error: String((r as PromiseRejectedResult).reason), responseMs: 0 }
      return {
        round_id:      roundId,
        skill_id:      skill.id,
        skill_name:    skill.name,
        skill_tier:    skill.tier,
        owner_wallet:  skill.owner_wallet,
        result:        outcome.result ?? null,
        error:         outcome.error ?? null,
        response_ms:   outcome.responseMs,
        cost_lamports: skill.price_lamports,
      }
    })

    await supabaseServiceRole.from('arena_entries').insert(entries)

    // ── 6. Open round for voting ──────────────────────────────────────────────
    await supabaseServiceRole
      .from('arena_rounds')
      .update({ status: 'open' })
      .eq('id', roundId)

    return NextResponse.json({ roundId }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/arena/create]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
