import { NextRequest } from 'next/server'
import { generateText, tool, jsonSchema, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { tavily } from '@tavily/core'
import { supabaseAnon, supabaseServiceRole } from '@/lib/supabase'
import { getModel, DEFAULT_PROVIDER } from '@/lib/ai-providers'

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

// ── Web search (requires TAVILY_API_KEY) ─────────────────────────────────────
type SearchInput = { query: string; topic?: 'general' | 'news' }
type SearchOutput = { results: { title: string; url: string; snippet: string; publishedDate?: string }[]; query: string; searchedAt: string }

async function webSearch(query: string, topic: 'general' | 'news' = 'general'): Promise<SearchOutput> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY not configured — add it to .env.local to enable web search')

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

// ── Live data fetchers (no API key required) ──────────────────────────────────

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

// Map common names to CoinGecko IDs
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
  const encoder = new TextEncoder()
  const body = (await req.json()) as { messages?: { role: string; content: string }[]; walletAddress?: string }
  const messages = (body.messages ?? []) as Parameters<typeof generateText>[0]['messages']
  const walletAddress = body.walletAddress ?? null
  const useGoogleSearch = DEFAULT_PROVIDER === 'google'
  const llm = getModel(null)
  const baseUrl = new URL(req.url).origin
  const systemPrompt = buildSystemPrompt(useGoogleSearch)

  // Check free-use quota before streaming
  const quota = await consumeFreeUse(walletAddress)
  if (!quota.allowed) {
    return new Response(
      JSON.stringify({ error: 'wallet_required', message: 'Connect your wallet to use SkillHive Chat.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        const genResult = await generateText({
          model: llm,
          system: systemPrompt,
          messages: messages ?? [],
          stopWhen: stepCountIs(10),
          tools: {
            ...(useGoogleSearch ? { google_search: google.tools.googleSearch({}) } : {}),
            search_web: tool<SearchInput, SearchOutput>({
              description: 'Search the internet for current information: latest news, recent product releases, current events, newest AI models, company announcements, etc. Use this for anything your training data may not have. Requires TAVILY_API_KEY.',
              inputSchema: jsonSchema<SearchInput>({
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Specific search query — be precise for better results' },
                  topic: { type: 'string', enum: ['general', 'news'], description: 'Use "news" for recent events/announcements, "general" for everything else' },
                },
                required: ['query'],
              }),
              execute: async ({ query, topic }: SearchInput): Promise<SearchOutput> => {
                const callId = `search-${Date.now()}`
                send({ type: 'tool-call', toolCallId: callId, toolName: 'search_web', args: { query, topic } })
                try {
                  const result = await webSearch(query, topic ?? 'general')
                  send({ type: 'tool-result', toolCallId: callId, toolName: 'search_web', result })
                  return result
                } catch (e) {
                  const err = { query, searchedAt: new Date().toISOString(), results: [], error: (e as Error).message }
                  send({ type: 'tool-result', toolCallId: callId, toolName: 'search_web', result: err })
                  return { ...err }
                }
              },
            }),

            get_live_data: tool<LiveDataInput, LiveDataOutput>({
              description: 'Fetch REAL-TIME prices for stocks (e.g. NVDA, AAPL, TSLA) or crypto (bitcoin, ethereum, solana). Call this BEFORE calling skills when the user asks about current prices or recent performance.',
              inputSchema: jsonSchema<LiveDataInput>({
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['stock', 'crypto', 'both'], description: 'Type of assets to fetch' },
                  symbols: { type: 'array', items: { type: 'string' }, description: 'Stock tickers (e.g. ["NVDA","AAPL"]) or crypto names (e.g. ["bitcoin","solana"])' },
                },
                required: ['type', 'symbols'],
              }),
              execute: async ({ type, symbols }: LiveDataInput): Promise<LiveDataOutput> => {
                const callId = `live-${Date.now()}`
                send({ type: 'tool-call', toolCallId: callId, toolName: 'get_live_data', args: { type, symbols } })

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

                const output: LiveDataOutput = { data: results, fetchedAt: new Date().toISOString() }
                send({ type: 'tool-result', toolCallId: callId, toolName: 'get_live_data', result: output })
                return output
              },
            }),

            discover_skills: tool<DiscoverInput, DiscoverOutput>({
              description: "Search the SkillHive skill registry for AI skills relevant to the user's question.",
              inputSchema: jsonSchema<DiscoverInput>({
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search terms to find relevant skills' },
                  tags: { type: 'array', items: { type: 'string' } },
                },
                required: ['query'],
              }),
              execute: async ({ query, tags }: DiscoverInput): Promise<DiscoverOutput> => {
                send({ type: 'tool-call', toolCallId: `discover-${Date.now()}`, toolName: 'discover_skills', args: { query, tags } })

                const queryWords = query.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3)
                const searchTags = [...(tags ?? []), ...queryWords]

                let q = supabaseAnon
                  .from('skills_public')
                  .select('id, name, description, tags, price_lamports, tier, reputation_score')
                  .eq('is_active', true)

                if (searchTags.length) q = q.overlaps('tags', searchTags)

                let { data } = await q.order('reputation_score', { ascending: false }).limit(5)

                if (!data?.length && query) {
                  const firstWord = queryWords[0] ?? query.split(' ')[0]
                  const { data: fallback } = await supabaseAnon
                    .from('skills_public')
                    .select('id, name, description, tags, price_lamports, tier, reputation_score')
                    .eq('is_active', true)
                    .or(`name.ilike.%${firstWord}%,description.ilike.%${firstWord}%`)
                    .order('reputation_score', { ascending: false })
                    .limit(5)
                  data = fallback
                }

                const result: DiscoverOutput = { skills: data ?? [], count: data?.length ?? 0 }
                send({ type: 'tool-result', toolName: 'discover_skills', result })
                return result
              },
            }),

            call_skill: tool<CallInput, CallOutput>({
              description: 'Call a specific SkillHive skill by its ID. Include any live data fetched from get_live_data in the input so the skill has current context.',
              inputSchema: jsonSchema<CallInput>({
                type: 'object',
                properties: {
                  skillId: { type: 'string' },
                  skillName: { type: 'string' },
                  input: { type: 'string', description: 'Include current prices/data from get_live_data if available' },
                  priceLamports: { type: 'number' },
                },
                required: ['skillId', 'skillName', 'input', 'priceLamports'],
              }),
              execute: async ({ skillId, skillName, input, priceLamports }: CallInput): Promise<CallOutput> => {
                const callId = `skill-${Date.now()}`
                send({ type: 'tool-call', toolCallId: callId, toolName: 'call_skill', args: { skillId, skillName, priceLamports } })

                // Skills run free during chat — user pays in one settlement after the response
                const res = await fetch(`${baseUrl}/api/skill-executor/${skillId}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
                  },
                  body: JSON.stringify({ input, callId }),
                })

                // Fetch owner wallet from public view so client can settle directly to them
                const { data: skillData } = await supabaseAnon
                  .from('skills_public')
                  .select('owner_wallet')
                  .eq('id', skillId)
                  .single()
                const ownerWallet = (skillData as { owner_wallet?: string } | null)?.owner_wallet

                let output: CallOutput
                if (!res.ok) {
                  output = { error: `Skill call failed (${res.status})`, costLamports: 0 }
                } else {
                  const data = (await res.json()) as { result?: string; error?: string }
                  // Return priceLamports + ownerWallet so client can settle directly to skill owners
                  output = { result: data.result ?? data.error ?? 'No result', costLamports: priceLamports, skillId, ownerWallet }
                }

                send({ type: 'tool-result', toolCallId: callId, toolName: 'call_skill', result: output })
                return output
              },
            }),
          },
        })

        send({ type: 'done', text: genResult.text, isFree: quota.isFree, freeUsesRemaining: quota.remaining })
      } catch (err) {
        console.error('[POST /api/chat]', err)
        send({ type: 'error', error: 'Failed to generate response' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
