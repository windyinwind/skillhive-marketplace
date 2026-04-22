import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

// GET /api/chat/messages?conversationId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')

  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id_required' }, { status: 400 })
  }

  const { data, error } = await supabaseServiceRole
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('[GET /api/chat/messages] Table missing, returning empty list')
      return NextResponse.json({ messages: [] })
    }
    console.error('[GET /api/chat/messages]', error)
    return NextResponse.json({ error: 'database_error' }, { status: 500 })
  }

  return NextResponse.json({ messages: data ?? [] })
}

// POST /api/chat/messages
// Save single message or array of messages
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { conversationId, messages } = body

  if (!conversationId || !messages) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // Ensure messages is an array (can be single message object or array)
  const msgs = Array.isArray(messages) ? messages : [messages]

  const inserts = msgs.map((m: any) => ({
    conversation_id: conversationId,
    role: m.role,
    content: m.content,
    tool_calls: m.tool_calls || [],
    created_at: m.created_at || new Date().toISOString()
  }))

  const { data, error } = await supabaseServiceRole
    .from('chat_messages')
    .insert(inserts)
    .select()

  if (error) {
    if (error.code === 'PGRST205') {
      return NextResponse.json({ error: 'persistence_not_available', message: 'Chat history requires database migrations (006) to be applied.' }, { status: 503 })
    }
    console.error('[POST /api/chat/messages]', error)
    return NextResponse.json({ error: 'database_error' }, { status: 500 })
  }

  return NextResponse.json({ messages: data })
}
