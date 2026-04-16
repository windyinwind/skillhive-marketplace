/**
 * SkillHive MCP Server — Streamable HTTP transport (MCP spec 2025-03-26)
 *
 * Add to Claude Code:   claude mcp add skillhive https://skillhive.market/api/mcp
 * Add to Gemini CLI:    add MCP server: https://skillhive.market/api/mcp
 * Add to Cursor:        MCP server URL → https://skillhive.market/api/mcp
 *
 * Implements two tools:
 *   discover_skills  — query the SkillHive marketplace (wraps GET /api/skills)
 *   call_skill       — preview-call a skill (wraps POST /api/call/execute, preview:true)
 *                      Rate-limited: 3 calls / skill / day per IP. Result truncated to 200 chars.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'discover_skills',
    description:
      'Search the SkillHive marketplace for AI agent skills. Returns skill IDs, names, descriptions, tags, prices (in lamports), and reputation scores. Use this before calling call_skill to find the right skill ID.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Full-text search query (matches skill name). E.g. "stock analysis"',
        },
        tag: {
          type: 'string',
          description: 'Filter by tag. E.g. "finance", "code", "research"',
        },
        maxPrice: {
          type: 'number',
          description: 'Maximum price in lamports (1 SOL = 1,000,000,000 lamports)',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (1–50, default 10)',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'call_skill',
    description:
      'Preview-call a SkillHive skill by ID. Free, no wallet required. Rate-limited to 3 calls per skill per day. Results are truncated to 200 characters — for full results, visit the skill detail page on skillhive.market.',
    inputSchema: {
      type: 'object',
      properties: {
        skillId: {
          type: 'string',
          description: 'The skill UUID from discover_skills (e.g. "abc123...")',
        },
        input: {
          type: 'string',
          description: 'The question or input to send to the skill',
        },
      },
      required: ['skillId', 'input'],
      additionalProperties: false,
    },
  },
]

// ─── Tool handlers ────────────────────────────────────────────────────────────

async function handleDiscoverSkills(
  args: Record<string, unknown>,
  baseUrl: string
): Promise<{ content: { type: string; text: string }[] }> {
  const params = new URLSearchParams()
  if (args.query) params.set('search', String(args.query))
  if (args.tag) params.set('tag', String(args.tag))
  if (args.maxPrice) params.set('maxPrice', String(args.maxPrice))
  const limit = Math.min(50, Math.max(1, Number(args.limit ?? 10)))
  params.set('limit', String(limit))

  const res = await fetch(`${baseUrl}/api/skills?${params.toString()}`)
  if (!res.ok) {
    return {
      content: [{ type: 'text', text: `Error fetching skills: ${res.status} ${res.statusText}` }],
    }
  }

  const { skills, total } = (await res.json()) as {
    skills: Array<{
      id: string
      name: string
      description: string
      tags: string[]
      price_lamports: number
      reputation_score: number
      tier: number
      provider_name?: string
    }>
    total: number
  }

  if (!skills || skills.length === 0) {
    return { content: [{ type: 'text', text: 'No skills found matching your query.' }] }
  }

  const lines: string[] = [
    `Found ${total} skill(s) (showing ${skills.length}):`,
    '',
  ]
  for (const s of skills) {
    const price = s.price_lamports === 0 ? 'Free' : `${(s.price_lamports / 1e9).toFixed(4)} SOL`
    lines.push(`• ${s.name} [Tier ${s.tier}]`)
    lines.push(`  ID: ${s.id}`)
    lines.push(`  ${s.description}`)
    lines.push(`  Tags: ${(s.tags ?? []).join(', ') || 'none'}`)
    lines.push(`  Price: ${price} | Reputation: ${s.reputation_score}`)
    if (s.provider_name) lines.push(`  Provider: ${s.provider_name}`)
    lines.push('')
  }
  lines.push('Use call_skill with one of the IDs above to try a skill.')

  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

async function handleCallSkill(
  args: Record<string, unknown>,
  baseUrl: string,
  clientIp: string
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const { skillId, input } = args as { skillId: string; input: string }

  if (!skillId || !input) {
    return {
      content: [{ type: 'text', text: 'skillId and input are required.' }],
      isError: true,
    }
  }

  const res = await fetch(`${baseUrl}/api/call/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Forward the real client IP so the preview rate limit applies per end-user
      'x-forwarded-for': clientIp,
    },
    body: JSON.stringify({ skillId, input, preview: true }),
  })

  if (res.status === 429) {
    return {
      content: [
        {
          type: 'text',
          text: 'Preview limit reached (3 calls/skill/day). Visit skillhive.market to call this skill with a Solana wallet for full access.',
        },
      ],
      isError: true,
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    return {
      content: [{ type: 'text', text: `Error: ${(body.error as string) ?? res.statusText}` }],
      isError: true,
    }
  }

  const { result, truncated } = (await res.json()) as { result: string; truncated: boolean }

  const text = truncated
    ? `${result}\n\n[Preview truncated at 200 chars. Visit skillhive.market for the full result.]`
    : result

  return { content: [{ type: 'text', text }] }
}

// ─── JSON-RPC helpers ─────────────────────────────────────────────────────────

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(jsonRpcError(null, -32700, 'Parse error'), { status: 400 })
  }

  const rpc = body as { jsonrpc?: string; id?: unknown; method?: string; params?: unknown }

  if (rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
    return NextResponse.json(jsonRpcError(rpc.id ?? null, -32600, 'Invalid Request'), {
      status: 400,
    })
  }

  const { id, method, params } = rpc
  const origin = req.headers.get('origin') ?? ''
  const host = req.headers.get('host') ?? 'skillhive.market'
  const proto = origin.startsWith('https') ? 'https' : process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${proto}://${host}`
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  // ── initialize ──────────────────────────────────────────────────────────────
  if (method === 'initialize') {
    return NextResponse.json(
      jsonRpcResult(id, {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'skillhive-marketplace', version: '1.0.0' },
        capabilities: { tools: {} },
      })
    )
  }

  // ── notifications/initialized (no response needed) ──────────────────────────
  if (method === 'notifications/initialized') {
    return new NextResponse(null, { status: 204 })
  }

  // ── tools/list ──────────────────────────────────────────────────────────────
  if (method === 'tools/list') {
    return NextResponse.json(jsonRpcResult(id, { tools: TOOLS }))
  }

  // ── tools/call ──────────────────────────────────────────────────────────────
  if (method === 'tools/call') {
    const p = params as { name?: string; arguments?: Record<string, unknown> } | undefined
    const toolName = p?.name
    const toolArgs = p?.arguments ?? {}

    if (toolName === 'discover_skills') {
      const result = await handleDiscoverSkills(toolArgs, baseUrl)
      return NextResponse.json(jsonRpcResult(id, result))
    }

    if (toolName === 'call_skill') {
      const result = await handleCallSkill(toolArgs, baseUrl, clientIp)
      return NextResponse.json(jsonRpcResult(id, result))
    }

    return NextResponse.json(jsonRpcError(id, -32601, `Unknown tool: ${toolName}`), {
      status: 404,
    })
  }

  // ── Unknown method ──────────────────────────────────────────────────────────
  return NextResponse.json(jsonRpcError(id, -32601, `Method not found: ${method}`), {
    status: 404,
  })
}

// MCP clients may send OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
