/**
 * DISCOVER_SKILLS action
 *
 * Queries the SWARM Marketplace public API (/api/skills) for skills matching
 * the requested tags/capabilities. The API returns the skills_public view from
 * Supabase — endpoint, system_prompt, and tool_config are never included.
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import { SkillPublic } from '../types.js'

export interface DiscoverSkillsInput {
  tags?: string[]
  query?: string
  maxPrice?: number // lamports
  limit?: number
}

export interface DiscoverSkillsResult {
  skills: SkillPublic[]
  total: number
}

function extractInput(
  _runtime: IAgentRuntime,
  message: Memory,
  _state?: State,
): DiscoverSkillsInput {
  const content = message.content as Record<string, unknown>
  return {
    tags: Array.isArray(content.tags) ? (content.tags as string[]) : undefined,
    query: typeof content.query === 'string' ? content.query : undefined,
    maxPrice: typeof content.maxPrice === 'number' ? content.maxPrice : undefined,
    limit: typeof content.limit === 'number' ? content.limit : 10,
  }
}

async function fetchSkills(input: DiscoverSkillsInput): Promise<DiscoverSkillsResult> {
  const marketplaceUrl = process.env.SWARM_MARKETPLACE_URL
  if (!marketplaceUrl) {
    throw new Error('[DISCOVER_SKILLS] SWARM_MARKETPLACE_URL env var is not set')
  }

  const params = new URLSearchParams()
  if (input.tags && input.tags.length > 0) {
    params.set('tags', input.tags.join(','))
  }
  if (input.query) {
    params.set('q', input.query)
  }
  if (input.maxPrice !== undefined) {
    params.set('maxPrice', String(input.maxPrice))
  }
  if (input.limit !== undefined) {
    params.set('limit', String(input.limit))
  }

  const url = `${marketplaceUrl}/api/skills?${params.toString()}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
  } catch (err) {
    throw new Error(`[DISCOVER_SKILLS] Network error fetching ${url}: ${String(err)}`)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `[DISCOVER_SKILLS] API returned ${response.status} ${response.statusText}: ${body}`,
    )
  }

  const data = (await response.json()) as { skills: SkillPublic[]; total: number }
  return {
    skills: data.skills ?? [],
    total: data.total ?? data.skills?.length ?? 0,
  }
}

export const discoverSkillsAction: Action = {
  name: 'DISCOVER_SKILLS',
  similes: ['FIND_SKILLS', 'SEARCH_SKILLS', 'LIST_SKILLS', 'BROWSE_MARKETPLACE'],
  description:
    'Discover AI skills available on the SWARM Marketplace. ' +
    'Returns skill summaries including id, name, price (in lamports), and reputation score. ' +
    'Accepts tags (string[]), query (string), maxPrice (lamports), and limit (number).',

  validate: async (_runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    if (!process.env.SWARM_MARKETPLACE_URL) {
      console.warn('[DISCOVER_SKILLS] SWARM_MARKETPLACE_URL is not set — action will fail')
      return false
    }
    return true
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    const input = extractInput(runtime, message, state)

    let result: DiscoverSkillsResult
    try {
      result = await fetchSkills(input)
    } catch (err) {
      const errMsg = String(err)
      console.error('[DISCOVER_SKILLS]', errMsg)
      if (callback) {
        await callback({ text: `Failed to discover skills: ${errMsg}`, error: true })
      }
      return
    }

    const summary =
      result.skills.length === 0
        ? 'No skills found matching your criteria.'
        : result.skills
            .map(
              (s) =>
                `• ${s.name} (id: ${s.id}) — ${s.price_lamports} lamports — ` +
                `reputation: ${s.reputation_score}/1000 — tags: [${s.tags.join(', ')}]`,
            )
            .join('\n')

    const text = `Found ${result.total} skill(s):\n${summary}`

    if (callback) {
      await callback({ text, skills: result.skills, total: result.total })
    }
  },

  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Find me skills for financial analysis',
          tags: ['finance', 'analysis'],
          limit: 5,
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Found 3 skill(s):\n• Stock Analyst (id: abc123) — 10000 lamports — reputation: 850/1000 — tags: [finance, stocks, analysis]',
        },
      },
    ],
  ],
}
