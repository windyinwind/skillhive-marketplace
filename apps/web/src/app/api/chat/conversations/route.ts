import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase'

export const runtime = 'nodejs'

// GET /api/chat/conversations?wallet=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')

  if (!wallet) {
    return NextResponse.json({ error: 'wallet_required' }, { status: 400 })
  }

  const { data, error } = await supabaseServiceRole
    .from('chat_conversations')
    .select('*')
    .eq('wallet_address', wallet)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('[GET /api/chat/conversations] Table missing, returning empty list')
      return NextResponse.json({ conversations: [] })
    }
    console.error('[GET /api/chat/conversations]', error)
    return NextResponse.json({ error: 'database_error' }, { status: 500 })
  }

  return NextResponse.json({ conversations: data ?? [] })
}

// POST /api/chat/conversations
// Create a new conversation
export async function POST(req: NextRequest) {
  const { wallet, title } = await req.json()

  if (!wallet) {
    return NextResponse.json({ error: 'wallet_required' }, { status: 400 })
  }

  const { data, error } = await supabaseServiceRole
    .from('chat_conversations')
    .insert({
      wallet_address: wallet,
      title: title || 'New Conversation'
    })
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST205') {
      return NextResponse.json({ error: 'persistence_not_available', message: 'Chat history requires database migrations (006) to be applied.' }, { status: 503 })
    }
    console.error('[POST /api/chat/conversations]', error)
    return NextResponse.json({ error: 'database_error' }, { status: 500 })
  }

  return NextResponse.json({ conversation: data })
}
