import { NextRequest } from 'next/server'
import { streamText, tool, jsonSchema, createUIMessageStream, createUIMessageStreamResponse, convertToModelMessages, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { tavily } from '@tavily/core'
import { supabaseAnon, supabaseServiceRole } from '@/lib/supabase'
import { getModel, DEFAULT_PROVIDER } from '@/lib/ai-providers'
import { createHmac } from 'crypto'

function makeInternalToken(skillId: string): string {
  const key = process.env.INTERNAL_API_KEY ?? ''
  const window = Math.floor(Date.now() / 30000)
  return createHmac('sha256', key).update(`${skillId}:${window}`).digest('hex')
}

const CHAT_FREE_LIMIT = 3

// Returns remaining free uses after this call, or -1 if wallet is paying (no limit applied)
async function consumeFreeUse(walletAddress: string | null): Promise<{ allowed: boolean; remaining: number; isFree: boolean }> {
  // No wallet = blocked (Chat requires wallet)
  if (!walletAddress) return { allowed: false, remaining: 0, isFree: false }

  const { data } = await supabaseServiceRole
    .from('chat_free_uses')
    .select('uses_count')
    .eq('wallet_address', walletAddress)
    .single()

  const current = (data as { uses_count: number } | null)?.uses_count ?? 0

  if (current >= CHAT_FREE_LIMIT) {
    // Quota exhausted — caller must pay (allowed but not free)
    return { allowed: true, remaining: 0, isFree: false }
  }

  // Increment count
  await supabaseServiceRole
    .from('chat_free_uses')
    .upsert(
      { wallet_address: walletAddress, uses_count: current + 1, last_used_at: new Date().toISOString() },
      { onConflict: 'wallet_address' }
    )

  return { allowed: true, remaining: CHAT_FREE_LIMIT - (current + 1), isFree: true }
}

export const runtime = 'nodejs'
export const maxDuration = 60

// ── Web search ──────────────────────────────────────────────────────────────
type SearchInput = { query: string; topic?: 'general' | 'news' }
type SearchOutput = { results: { title: string; url: string; snippet: string; publishedDate?: string }[]; query: string; searchedAt: string }

async function webSearch(query: string, topic: 'general' | 'news' = 'general'): Promise<SearchOutput> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY not configured')

  const client = tavily({ apiKey })
  const res = await client.search(query, {
    searchDepth: 'basic',
    topic,
    maxResults: 5,
    includeAnswer: false,
  })

  return {
    query,
    searchedAt: new Date().toISOString(),
    results: (res.results ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.content ?? '',
      publishedDate: r.publishedDate ?? undefined,
    })),
  }
}

function buildSystemPrompt(hasNativeSearch = false): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
  const searchInstruction = hasNativeSearch
    ? '2. For current events, news, latest releases, recent announcements → use your built-in Google Search grounding (it runs automatically).'
    : '2. For current events, news, latest releases, recent announcements → call search_web FIRST.'
  return `You are the SkillHive Orchestrator — an AI that answers user questions by discovering and calling specialized AI skills from the SkillHive marketplace on Solana.

CURRENT DATE AND TIME: ${dateStr}, ${timeStr}

IMPORTANT: You have access to real-time tools. When you fetch live prices or web search results, that data is current as of right now — do NOT add disclaimers like "as of my knowledge cutoff" or "data may be outdated". Give direct, confident answers using the live data you fetched.

When a user asks a question:
1. For current prices/market data → call get_live_data FIRST.
${searchInstruction}
3. ALWAYS call discover_skills to find relevant marketplace skills.
4. Call call_skill for each relevant skill, injecting live data + search results into the input.
5. Synthesize everything into a clear final answer. Do not hedge with training cutoff caveats.`
}

type DiscoverInput = { query: string; tags?: string[] }
type DiscoverOutput = { skills: unknown[]; count: number }
type CallInput = { skillId: string; skillName: string; input: string; priceLamports: number }
type CallOutput = { result?: string; error?: string; costLamports: number; skillId?: string; ownerWallet?: string }
type LiveDataInput = { type: 'stock' | 'crypto' | 'both'; symbols: string[] }
type LiveDataOutput = { data: Record<string, unknown>; fetchedAt: string }

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

const CRYPTO_ID_MAP: Record<string, string> = {
  btc: 'bitcoin', bitcoin: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum',
  sol: 'solana', solana: 'solana',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  avax: 'avalanche-2',
  dot: 'polkadot',
  link: 'chainlink',
  matic: 'matic-network', pol: 'matic-network',
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const messages = await convertToModelMessages(body.messages ?? [])
  const walletAddress: string | null = req.headers.get('x-wallet-address') || req.headers.get('x-user-id') || body.walletAddress || null
  const useGoogleSearch = DEFAULT_PROVIDER === 'google'
  const llm = getModel(null)
  const baseUrl = new URL(req.url).origin
  const systemPrompt = buildSystemPrompt(useGoogleSearch)

  // Check free-use quota
  const quota = await consumeFreeUse(walletAddress)
  if (!quota.allowed) {
    return new Response(
      JSON.stringify({ error: 'wallet_required', message: 'Connect your wallet to use SkillHive Chat.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // 1. Send quota info to client immediately via data channel
      writer.write({ type: 'data-quota', data: { type: 'quota', isFree: quota.isFree, remaining: quota.remaining }, transient: true })

      const result = streamText({
        model: llm,
        system: systemPrompt,
        messages: messages,
        stopWhen: stepCountIs(10),
        tools: {
          ...(useGoogleSearch ? { google_search: google.tools.googleSearch({}) } : {}),

          search_web: tool<SearchInput, SearchOutput>({
            description: 'Search the internet for current events/news.',
            inputSchema: jsonSchema<SearchInput>({
              type: 'object',
              properties: {
                query: { type: 'string' },
                topic: { type: 'string', enum: ['general', 'news'] },
              },
              required: ['query'],
            }),
            execute: async ({ query, topic }) => {
              try {
                return await webSearch(query, topic ?? 'general')
              } catch (e) {
                return { query, searchedAt: new Date().toISOString(), results: [], error: (e as Error).message }
              }
            },
          }),

          get_live_data: tool<LiveDataInput, LiveDataOutput>({
            description: 'Fetch real-time stock or crypto prices.',
            inputSchema: jsonSchema<LiveDataInput>({
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['stock', 'crypto', 'both'] },
                symbols: { type: 'array', items: { type: 'string' } },
              },
              required: ['type', 'symbols'],
            }),
            execute: async ({ type, symbols }) => {
              const results: Record<string, unknown> = {}
              if (type === 'stock' || type === 'both') {
                const stockSymbols = type === 'both' ? symbols.filter((s) => s.toUpperCase() === s || s.length <= 5) : symbols
                await Promise.all(stockSymbols.map(async (sym) => {
                  results[sym.toUpperCase()] = await fetchStockQuote(sym.toUpperCase())
                }))
              }
              if (type === 'crypto' || type === 'both') {
                const cryptoSymbols = type === 'both' ? symbols.filter((s) => s.toLowerCase() !== s.toUpperCase()) : symbols
                await Promise.all(cryptoSymbols.map(async (sym) => {
                  const coinId = CRYPTO_ID_MAP[sym.toLowerCase()] ?? sym.toLowerCase()
                  results[sym] = await fetchCryptoPrice(coinId)
                }))
              }
              return { data: results, fetchedAt: new Date().toISOString() }
            },
          }),

          discover_skills: tool<DiscoverInput, DiscoverOutput>({
            description: "Search for relevant AI skills.",
            inputSchema: jsonSchema<DiscoverInput>({
              type: 'object',
              properties: {
                query: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
              },
              required: ['query'],
            }),
            execute: async ({ query, tags }) => {
              const queryWords = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
              const searchTags = [...(tags ?? []), ...queryWords]
              let q = supabaseAnon
                .from('skills_public')
                .select('id, name, description, tags, price_lamports, tier, reputation_score')
                .eq('is_active', true)
              if (searchTags.length) q = q.overlaps('tags', searchTags)
              let { data } = await q.order('reputation_score', { ascending: false }).limit(5)
              return { skills: data ?? [], count: data?.length ?? 0 }
            },
          }),

          call_skill: tool<CallInput, CallOutput>({
            description: 'Call a specific SkillHive skill.',
            inputSchema: jsonSchema<CallInput>({
              type: 'object',
              properties: {
                skillId: { type: 'string' },
                skillName: { type: 'string' },
                input: { type: 'string' },
                priceLamports: { type: 'number' },
              },
              required: ['skillId', 'skillName', 'input', 'priceLamports'],
            }),
            execute: async ({ skillId, input, priceLamports }) => {
              const res = await fetch(`${baseUrl}/api/skill-executor/${skillId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-internal-key': makeInternalToken(skillId) },
                body: JSON.stringify({ input }),
              })
              const { data: skillData } = await supabaseAnon
                .from('skills_public')
                .select('owner_wallet')
                .eq('id', skillId)
                .single()
              const ownerWallet = (skillData as any)?.owner_wallet
              if (!res.ok) return { error: `Skill call failed`, costLamports: 0 }
              const data = await res.json()
              const output = { result: data.result ?? data.error ?? 'No result', costLamports: priceLamports, skillId, ownerWallet }
              // 2. Write tool result to data channel so client can track skill debts in real-time
              writer.write({ type: 'data-tool-result', data: { type: 'tool-result', ...output }, transient: true })
              return output
            },
          }),
        },
        onFinish: async ({ text }) => {
          const cleanText = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
          writer.write({ type: 'data-finish', data: { type: 'finish', text: cleanText }, transient: true })
        },
        ...(DEFAULT_PROVIDER === 'openrouter' && {
          providerOptions: { openrouter: { include_reasoning: false } },
        }),
      })

      writer.merge(result.toUIMessageStream())
    },
    onError: (err) => {
      console.error('[POST /api/chat]', err)
      return 'Failed to generate response'
    }
  })

  return createUIMessageStreamResponse({ stream })
}

