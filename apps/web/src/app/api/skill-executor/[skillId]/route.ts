import { NextRequest, NextResponse } from 'next/server'
import { generateText, tool, jsonSchema } from 'ai'
import { supabaseServiceRole } from '@/lib/supabase'
import { getModel, type ModelConfig } from '@/lib/ai-providers'

export const runtime = 'nodejs'

// MCP config stored in tool_config column for Tier 2 skills
type McpConfig = { mcpUrl: string; mcpToken?: string }

// MCP tool descriptor returned by tools/list
interface McpTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

// ── Minimal MCP JSON-RPC client (Streamable HTTP transport) ──────────────────
// Implements just enough of the MCP protocol to list and call tools.
// Spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports

async function mcpRequest<T = unknown>(
  mcpUrl: string,
  method: string,
  params: Record<string, unknown> = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(mcpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  })

  if (!res.ok) {
    throw new Error(`MCP server responded ${res.status} ${res.statusText}`)
  }

  const contentType = res.headers.get('content-type') ?? ''

  // Streamable HTTP can return SSE; parse first data event if so
  if (contentType.includes('text/event-stream')) {
    const text = await res.text()
    const dataLine = text.split('\n').find((l) => l.startsWith('data: '))
    if (!dataLine) throw new Error('MCP SSE response contained no data')
    const json = JSON.parse(dataLine.slice(6)) as { result?: T; error?: { message: string } }
    if (json.error) throw new Error(`MCP error: ${json.error.message}`)
    return json.result as T
  }

  const json = (await res.json()) as { result?: T; error?: { message: string } }
  if (json.error) throw new Error(`MCP error: ${json.error.message}`)
  return json.result as T
}

async function mcpListTools(mcpUrl: string, token?: string): Promise<McpTool[]> {
  const result = await mcpRequest<{ tools: McpTool[] }>(mcpUrl, 'tools/list', {}, token)
  return result?.tools ?? []
}

async function mcpCallTool(
  mcpUrl: string,
  name: string,
  args: Record<string, unknown>,
  token?: string
): Promise<unknown> {
  const result = await mcpRequest<{ content: { type: string; text?: string }[] }>(
    mcpUrl,
    'tools/call',
    { name, arguments: args },
    token
  )
  // Extract text content from MCP result
  const texts = (result?.content ?? [])
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text)
  return texts.length === 1 ? texts[0] : texts.length > 1 ? texts.join('\n') : result
}

// ── Request handler ───────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const internalKey = req.headers.get('x-internal-key')
    if (internalKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { skillId } = await params
    const { input } = (await req.json()) as { input: string; callId: string }
    if (!input) return NextResponse.json({ error: 'input required' }, { status: 400 })

    // Fetch private config — never returned to browser
    const { data, error } = await supabaseServiceRole
      .from('skills')
      .select('system_prompt, model_config, tool_config')
      .eq('id', skillId)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

    const d = data as Record<string, unknown>
    const sysPrompt = d['system_prompt'] as string | null
    const modelCfg  = d['model_config']  as ModelConfig | null
    const mcpCfg    = d['tool_config']   as McpConfig | null  // Tier 2: MCP server URL

    const model           = getModel(modelCfg)
    const maxOutputTokens = modelCfg?.maxTokens ?? 1024
    const temperature     = modelCfg?.temperature

    // Tier 2: discover MCP tools and wire them into the AI SDK call
    let tools: Parameters<typeof generateText>[0]['tools'] | undefined
    let maxSteps: number | undefined

    if (mcpCfg?.mcpUrl) {
      const mcpTools = await mcpListTools(mcpCfg.mcpUrl, mcpCfg.mcpToken)

      if (mcpTools.length > 0) {
        // Record<string, unknown> avoids the Tool<never,never> generic mismatch;
        // cast to the correct type at the generateText call site.
        const toolMap: Record<string, unknown> = {}

        for (const mcpTool of mcpTools) {
          const schema = mcpTool.inputSchema ?? { type: 'object', properties: {}, required: [] }
          toolMap[mcpTool.name] = tool<Record<string, unknown>, unknown>({
            description: mcpTool.description ?? mcpTool.name,
            inputSchema: jsonSchema<Record<string, unknown>>(schema as Parameters<typeof jsonSchema>[0]),
            execute: async (args: Record<string, unknown>) =>
              mcpCallTool(mcpCfg.mcpUrl, mcpTool.name, args, mcpCfg.mcpToken),
          })
        }

        tools    = toolMap as Parameters<typeof generateText>[0]['tools']
        maxSteps = mcpTools.length + 1  // one step per tool + final synthesis
      }
    }

    // Prepend today's date and live-data instruction so the model has current temporal context.
    // When the input already contains real-time data (injected by Arena/Chat), the model must
    // use it as the primary source and must NOT add knowledge-cutoff disclaimers.
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const hasLiveContext = input.includes('REAL-TIME MARKET DATA') || input.includes('LIVE WEB SEARCH RESULTS')
    const liveDataInstruction = hasLiveContext
      ? '\nReal-time market data and/or live web search results have been injected into the user query. Use them as your primary source. Do NOT hedge with knowledge cutoff disclaimers or suggest the data may be outdated — it was fetched moments ago.'
      : ''
    const systemWithDate = sysPrompt
      ? `Today's date: ${today}${liveDataInstruction}\n\n${sysPrompt}`
      : `Today's date: ${today}${liveDataInstruction}`

    const { text } = await generateText({
      model,
      system: systemWithDate,
      messages: [{ role: 'user', content: input }],
      ...(tools ? { tools, maxSteps } : {}),
      maxOutputTokens,
      ...(temperature !== undefined ? { temperature } : {}),
    })

    return NextResponse.json({ result: text })
  } catch (err) {
    console.error('[POST /api/skill-executor/[skillId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
