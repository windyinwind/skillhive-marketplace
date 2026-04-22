-- 006: Chat Persistence Schema
-- Link conversations and messages to wallet addresses

-- ── Conversations (Header/Meta) ──────────────────────────────────────────────
CREATE TABLE chat_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  TEXT NOT NULL,
  title           TEXT NOT NULL DEFAULT 'New Conversation',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Only owner can see/manage their conversations
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_owner_all" ON chat_conversations
  FOR ALL
  USING (wallet_address = (auth.jwt() ->> 'wallet_address'))
  WITH CHECK (wallet_address = (auth.jwt() ->> 'wallet_address'));

-- NOTE: If Dynamic/Supabase auth is not using 'wallet_address' claim, 
-- we will use a simpler policy for local development if needed, 
-- but for production, we expect the wallet address to be the identifier.
-- If the project doesn't use Supabase Auth for wallet (just anon key for DB),
-- we will rely on application-level filtering for now since the wallet is provided in the client.

-- ── Messages (Content) ────────────────────────────────────────────────────────
CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  tool_calls      JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Only owner of the conversation can see messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_owner_select" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.wallet_address = (auth.jwt() ->> 'wallet_address')
    )
  );

-- Indexes
CREATE INDEX chat_conv_wallet_idx ON chat_conversations(wallet_address);
CREATE INDEX chat_msg_conv_idx ON chat_messages(conversation_id);
