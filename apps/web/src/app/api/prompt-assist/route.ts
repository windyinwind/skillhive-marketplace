import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getModel } from '@/lib/ai-providers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { name, description, tags, draft } = (await req.json()) as {
      name: string
      description?: string
      tags?: string[]
      draft?: string
    }

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const context = [
      `Skill name: ${name}`,
      description ? `Description: ${description}` : null,
      tags?.length ? `Tags: ${tags.join(', ')}` : null,
      draft ? `Current draft:\n${draft}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const { text } = await generateText({
      model: getModel(null), // uses platform default (OpenRouter)
      maxOutputTokens: 512,
      messages: [
        {
          role: 'user',
          content: `Write a concise, effective system prompt for an AI skill with the following context:\n\n${context}\n\nThe system prompt should define the AI's role, expertise, and output format clearly. Output only the system prompt text, no preamble.`,
        },
      ],
    })

    return NextResponse.json({ suggestion: text })
  } catch (err) {
    console.error('[POST /api/prompt-assist]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
