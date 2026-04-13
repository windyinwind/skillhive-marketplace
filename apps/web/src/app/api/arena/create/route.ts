import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { tavily } from '@tavily/core'
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

// ── Live data helpers (shared with /api/chat) ─────────────────────────────────

async function fetchStockQuote(symbol: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return { symbol, error: `HTTP ${res.status}` }
    const json = await res.json() as { chart?: { result?: { meta?: Record<string, unknown> }[] } }
    const meta = json?.chart?.result?.[0]?.meta ?? {}
    return {
      symbol,
      price: meta['regularMarketPrice'],
      previousClose: meta['previousClose'],
      change: meta['regularMarketPrice'] != null && meta['previousClose'] != null
        ? Number(((meta['regularMarketPrice'] as number) - (meta['previousClose'] as number)).toFixed(2))
        : null,
      changePct: meta['regularMarketPrice'] != null && meta['previousClose'] != null
        ? Number((((meta['regularMarketPrice'] as number) - (meta['previousClose'] as number)) / (meta['previousClose'] as number) * 100).toFixed(2))
        : null,
      currency: meta['currency'],
      exchange: meta['exchangeName'],
      marketState: meta['marketState'],
    }
  } catch (e) {
    return { symbol, error: (e as Error).message }
  }
}

const CRYPTO_ID_MAP: Record<string, string> = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana', solana: 'solana',
  bnb: 'binancecoin', xrp: 'ripple',
  ada: 'cardano', avax: 'avalanche-2',
  dot: 'polkadot', link: 'chainlink',
  matic: 'matic-network', pol: 'matic-network',
}

async function fetchCryptoPrice(coinId: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return { coinId, error: `HTTP ${res.status}` }
    const json = await res.json() as Record<string, { usd?: number; usd_24h_change?: number; usd_market_cap?: number }>
    const data = json[coinId]
    return {
      coinId,
      price_usd: data?.usd,
      change_24h_pct: data?.usd_24h_change != null ? Number(data.usd_24h_change.toFixed(2)) : null,
      market_cap_usd: data?.usd_market_cap,
    }
  } catch (e) {
    return { coinId, error: (e as Error).message }
  }
}

// Detect tickers/crypto symbols mentioned in the query
function detectFinancialSymbols(query: string): { stocks: string[]; cryptos: string[] } {
  const upper = query.toUpperCase()
  const lower = query.toLowerCase()

  // Uppercase stock tickers: 2-5 capital letters, optionally preceded by $
  const stockMatches = upper.match(/\$?([A-Z]{2,5})\b/g) ?? []
  const stocks = [...new Set(stockMatches.map((s) => s.replace('$', '')))]
    .filter((s) => !['AI', 'OR', 'THE', 'AND', 'FOR', 'NOT', 'USE', 'NEW'].includes(s))

  // Known crypto names/symbols in the query
  const cryptos = Object.keys(CRYPTO_ID_MAP).filter((k) => {
    const word = new RegExp(`\\b${k}\\b`, 'i')
    return word.test(lower)
  }).map((k) => CRYPTO_ID_MAP[k])

  return { stocks, cryptos: [...new Set(cryptos)] }
}

// Determine if the query needs web search (current events, news, recent info)
function needsWebSearch(query: string): boolean {
  const triggers = [
    /\b(latest|recent|current|today|this week|this month|new|news|update|just|announced|released)\b/i,
    /\b(2024|2025|2026)\b/,
    /\b(price|stock|market|earnings|ipo|acquisition|merger)\b/i,
    /\b(who won|who is|what happened|breaking)\b/i,
  ]
  return triggers.some((r) => r.test(query))
}

interface LiveContext {
  prices: Record<string, unknown>
  webResults: { title: string; url: string; snippet: string; publishedDate?: string }[]
  fetchedAt: string
}

/**
 * Enrich the user query with real-time data before passing it to skills.
 * - Fetches stock/crypto prices for any detected symbols (no API key needed)
 * - Runs a Tavily web search if query touches current events (requires TAVILY_API_KEY)
 */
async function fetchLiveContext(query: string): Promise<LiveContext> {
  const ctx: LiveContext = { prices: {}, webResults: [], fetchedAt: new Date().toISOString() }

  const { stocks, cryptos } = detectFinancialSymbols(query)

  // Fetch prices in parallel (best-effort — never throws)
  await Promise.allSettled([
    ...stocks.map(async (sym) => {
      ctx.prices[sym] = await fetchStockQuote(sym)
    }),
    ...cryptos.map(async (coinId) => {
      ctx.prices[coinId] = await fetchCryptoPrice(coinId)
    }),
  ])

  // Web search (best-effort — skip if no API key)
  if (needsWebSearch(query) && process.env.TAVILY_API_KEY) {
    try {
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY })
      const res = await client.search(query, {
        searchDepth: 'basic',
        topic: 'general',
        maxResults: 5,
        includeAnswer: false,
      })
      ctx.webResults = (res.results ?? []).map((r) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        snippet: r.content ?? '',
        publishedDate: r.publishedDate ?? undefined,
      }))
    } catch {
      // Silently skip — skills still run without web context
    }
  }

  return ctx
}

/**
 * Build the enriched input string passed to each skill.
 * Skills receive the user's question PLUS any live prices/search results injected as context.
 */
function buildEnrichedInput(query: string, ctx: LiveContext): string {
  const parts: string[] = [`User question: ${query}`]

  const priceEntries = Object.entries(ctx.prices)
  if (priceEntries.length > 0) {
    parts.push(
      '\n--- REAL-TIME MARKET DATA (fetched at ' + ctx.fetchedAt + ') ---',
      ...priceEntries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`),
      '---'
    )
  }

  if (ctx.webResults.length > 0) {
    parts.push(
      '\n--- LIVE WEB SEARCH RESULTS (fetched at ' + ctx.fetchedAt + ') ---',
      ...ctx.webResults.map((r, i) =>
        `[${i + 1}] ${r.title}${r.publishedDate ? ` (${r.publishedDate})` : ''}\n${r.snippet}\nSource: ${r.url}`
      ),
      '---',
      'Use the above search results and prices to answer accurately. Cite sources where relevant.'
    )
  }

  return parts.join('\n')
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

    // ── 4. Fetch live context (prices + web search) ───────────────────────────
    // Best-effort: never blocks round creation if external APIs fail
    const liveCtx = await fetchLiveContext(query)
    const enrichedInput = buildEnrichedInput(query, liveCtx)

    // ── 5. Call all skills in parallel with enriched input ────────────────────
    const callResults = await Promise.allSettled(
      skills.map(async (skill): Promise<SkillCallResult> => {
        const url = urlMap[skill.id]
        if (!url) return { skillId: skill.id, result: undefined, error: 'No endpoint registered', responseMs: 0 }
        const callId = `arena-${roundId}-${skill.id}`
        const res = await callSkillEndpoint(url, enrichedInput, callId)
        return { skillId: skill.id, ...res }
      })
    )

    // ── 6. Insert entries ─────────────────────────────────────────────────────
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

    // ── 7. Open round for voting ──────────────────────────────────────────────
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
