'use client'

import { useState, useCallback, useEffect, useRef, type FormEvent, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { useWallet } from '@/hooks/useWalletAdapter'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { Wallet, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ChatSidebar } from './ChatSidebar'
import type { ChatMessage, ToolStep, SkillDebt } from './types'

export function ChatContainer() {
  const { publicKey, signTransaction, connected, isAuthenticated, userId, openAuthModal: setVisible } = useWallet()
  const { connection } = useConnection()
  const walletStr = publicKey?.toBase58()
  // Use wallet address if available, else Dynamic user ID (social login without Solana wallet)
  const userIdentifier = walletStr ?? userId

  // State for conversation context
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isConversationsLoading, setIsConversationsLoading] = useState(false)
  const [freeUsesRemaining, setFreeUsesRemaining] = useState<number | null>(null)
  const [hasPendingDebt, setHasPendingDebt] = useState(false)
  const [input, setInput] = useState('')
  const [streamData, setStreamData] = useState<any[]>([])

  // Load existing messages when conversationId changes
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([])

  const walletStrRef = useRef(userIdentifier)
  walletStrRef.current = userIdentifier

  const {
    messages: aiMessages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    onData: (dataPart: any) => {
      if (dataPart.type?.startsWith('data-')) {
        setStreamData(prev => [...prev, dataPart.data])
      }
    },
    onFinish: async ({ message }: any) => {
      if (conversationId) {
        const content = Array.isArray(message.parts)
          ? message.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
          : (message.content ?? '')
        await saveMessageToDb(conversationId, 'assistant', content)
      }
      // Mark pending debt so the pay button appears — user must click to confirm
      const lastDebts = (streamData as any[])?.filter(d => d.type === 'tool-result' && d.skillId && d.ownerWallet)
      if (lastDebts?.length > 0) {
        const quota = (streamData as any[])?.find(d => d.type === 'quota')
        if (quota && !quota.isFree) {
          setHasPendingDebt(true)
        }
      }
    }
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Format AI SDK messages into local ChatMessage format
  const formattedMessages = useMemo(() => {
    return aiMessages.map((m: any) => {
      // 1. Extract plain text content from parts (AI SDK v6) or content property (legacy)
      let content = "";
      if (Array.isArray(m.parts)) {
        content = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join("");
      } else {
        content = m.content || "";
      }

      // 2. Extract tool invocations from parts (AI SDK v6) or toolInvocations (legacy)
      const toolSteps: any[] = [];
      if (Array.isArray(m.parts)) {
        m.parts.forEach((p: any) => {
          if (p.type?.startsWith('tool-') || p.type === 'dynamic-tool') {
            // In AI SDK v6, static tool parts have type `tool-${toolName}` with no toolName field
            const toolName = p.toolName ?? (p.type?.startsWith('tool-') ? p.type.slice(5) : undefined)
            toolSteps.push({
              id: p.toolCallId,
              toolName,
              args: p.input ?? p.args ?? {},
              result: p.output ?? p.result,
              state: p.state
            });
          }
        });
      } else if (Array.isArray(m.toolInvocations)) {
        m.toolInvocations.forEach((ti: any) => {
          toolSteps.push({
            id: ti.toolCallId,
            toolName: ti.toolName,
            args: ti.args || {},
            result: 'result' in ti ? ti.result : undefined,
            state: ti.state
          });
        });
      }

      const quota = (streamData as any[])?.find(d => d.type === 'quota')
      const skillDebts = m.role === 'assistant'
        ? (streamData as any[])?.filter(d => d.type === 'tool-result' && d.skillId)
        : []
      return {
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content,
        toolSteps,
        isFree: quota?.isFree ?? true,
        skillDebts,
      }
    })
  }, [aiMessages, streamData])

  // Sync quota info from stream data
  useEffect(() => {
    if (!streamData) return
    const quota = (streamData as any[]).find(d => d.type === 'quota')
    if (quota && typeof quota.remaining === 'number') {
      setFreeUsesRemaining(quota.remaining)
    }
  }, [streamData])

  // Handle conversation switching
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }

    async function loadMessages() {
      setIsConversationsLoading(true)
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`)
        const data = await res.json()
        if (data.messages) {
          const formatted = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            toolInvocations: m.tool_calls // align with AI SDK format
          }))
          setMessages(formatted)
        }
      } catch (err) {
        console.error('Failed to load messages', err)
      } finally {
        setIsConversationsLoading(false)
      }
    }

    loadMessages()
  }, [conversationId, setMessages])

  const settleDebts = useCallback(async (msgId: string, debts: SkillDebt[]): Promise<boolean> => {
    if (!publicKey || !signTransaction || !connected || debts.length === 0) return false
    try {
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey })
      for (const debt of debts) {
        if (debt.ownerWallet && debt.costLamports > 0) {
          tx.add(SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(debt.ownerWallet),
            lamports: debt.costLamports,
          }))
        }
      }
      if (tx.instructions.length === 0) return true

      const signed = await signTransaction(tx)
      await connection.sendRawTransaction(signed.serialize())
      setHasPendingDebt(false)
      return true
    } catch (err) {
      console.error('Debt settlement failed', err)
      return false
    }
  }, [publicKey, signTransaction, connected, connection])

  const saveMessageToDb = async (convId: string, role: string, content: string, toolCalls: any[] = []) => {
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          messages: [{ role, content, tool_calls: toolCalls }]
        })
      })
    } catch (err) {
      console.error('Failed to save message to DB', err)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { setVisible(true); return }
    if (!userIdentifier) return  // still initializing
    if (!input?.trim() || isLoading) return

    let currentConvId = conversationId

    // Create conversation if it doesn't exist
    if (!currentConvId && userIdentifier) {
      try {
        const res = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: userIdentifier, title: input.slice(0, 40) + (input.length > 40 ? '...' : '') })
        })
        const data = await res.json()
        if (data.conversation) {
          currentConvId = data.conversation.id
          setConversationId(currentConvId)
        }
      } catch (err) {
        console.error('Failed to create conversation', err)
      }
    }

    // Save user message to DB
    if (currentConvId) {
      await saveMessageToDb(currentConvId, 'user', input || '')
    }

    // Trigger AI SDK sendMessage
    sendMessage({ text: input }, { headers: { 'x-wallet-address': userIdentifier } })
    setInput('')
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#9945FF]/30 bg-[#9945FF]/10 overflow-hidden">
          <Image src="/logo.png" alt="SkillHive Logo" width={56} height={56} className="object-cover" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">SkillHive Chat</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Log in to use Chat. Skills are called on your behalf and settled on Solana.
          </p>
        </div>
        <button
          onClick={() => setVisible(true)}
          className="flex items-center gap-2 rounded-xl bg-[#9945FF] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97]"
        >
          <Wallet className="h-4 w-4" />
          Login
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      <ChatSidebar
        wallet={userIdentifier ?? ''}
        currentId={conversationId ?? undefined}
        onSelect={setConversationId}
        onNew={() => setConversationId(null)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {freeUsesRemaining !== null && (
          <div className="flex justify-end px-4 pt-2">
            <div className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
              freeUsesRemaining > 0
                ? 'bg-[#14F195]/10 text-[#14F195] border border-[#14F195]/20'
                : 'bg-muted text-muted-foreground border border-border'
            }`}>
              {freeUsesRemaining > 0 ? `${freeUsesRemaining} free use${freeUsesRemaining !== 1 ? 's' : ''} left` : 'Paying per response'}
            </div>
          </div>
        )}

        {isConversationsLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-[#9945FF]" />
          </div>
        )}

        <MessageList
          messages={formattedMessages as any}
          isLoading={isLoading}
          onPrompt={(t) => sendMessage({ text: t }, { body: { walletAddress: walletStr } })}
          onSettle={settleDebts}
          walletConnected={connected}
        />

        <ChatInput
          input={input}
          isLoading={isLoading || hasPendingDebt}
          onChange={setInput}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

