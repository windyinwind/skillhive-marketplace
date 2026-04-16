'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { Bot, Wallet } from 'lucide-react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import type { ChatMessage, ToolStep, SSEEvent, SkillDebt } from './types'

function uid() {
  return Math.random().toString(36).slice(2)
}

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasPendingDebt, setHasPendingDebt] = useState(false)
  const [freeUsesRemaining, setFreeUsesRemaining] = useState<number | null>(null)
  const { publicKey, signTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()

  const settleDebts = useCallback(async (msgId: string, debts: SkillDebt[]): Promise<boolean> => {
    if (!publicKey || !signTransaction || !connected || debts.length === 0) return false

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

    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, paid: true } : m)
    )
    setHasPendingDebt(false)
    return true
  }, [publicKey, signTransaction, connected, connection])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      const userMsg: ChatMessage = { id: uid(), role: 'user', content: text }
      const assistantId = uid()
      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', toolSteps: [] }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')
      setIsLoading(true)

      try {
        const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, walletAddress: publicKey?.toBase58() }),
        })

        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        const collectedDebts: SkillDebt[] = []
        let finalText = ''
        let responseWasFree = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue

            let event: SSEEvent
            try { event = JSON.parse(raw) as SSEEvent } catch { continue }

            if (event.type === 'done' && event.text) {
              finalText = event.text
              responseWasFree = !!(event as Record<string, unknown>).isFree
            }

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId) return m

                if (event.type === 'tool-call') {
                  const step: ToolStep = {
                    id: event.toolCallId,
                    toolName: event.toolName,
                    args: event.args,
                    state: 'calling',
                  }
                  return { ...m, toolSteps: [...(m.toolSteps ?? []), step] }
                }

                if (event.type === 'tool-result') {
                  const steps = (m.toolSteps ?? []).map((s) => {
                    const matchById = event.toolCallId && s.id === event.toolCallId
                    const matchByName = !event.toolCallId && s.toolName === event.toolName && s.state === 'calling'
                    if (matchById || matchByName) return { ...s, result: event.result, state: 'done' as const }
                    return s
                  })
                  if (event.toolName === 'call_skill' && event.result) {
                    const r = event.result as { skillId?: string; ownerWallet?: string; costLamports?: number; error?: string }
                    if (!r.error && r.skillId && r.ownerWallet && r.costLamports) {
                      const args = m.toolSteps?.find((s) => s.id === event.toolCallId)?.args
                      collectedDebts.push({
                        skillId: r.skillId,
                        skillName: (args?.skillName as string) ?? r.skillId,
                        ownerWallet: r.ownerWallet,
                        costLamports: r.costLamports,
                      })
                    }
                  }
                  return { ...m, toolSteps: steps }
                }

                if (event.type === 'text-delta') return { ...m, content: m.content + event.text }
                if (event.type === 'done' && event.text) {
                  if (typeof event.freeUsesRemaining === 'number') setFreeUsesRemaining(event.freeUsesRemaining)
                  return { ...m, content: event.text }
                }
                if (event.type === 'error') return { ...m, content: event.error }
                return m
              })
            )
          }
        }

        // Attach debts — only trigger payment if this was NOT a free use
        if (collectedDebts.length > 0) {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId
              ? { ...m, content: finalText || m.content, skillDebts: collectedDebts }
              : m
            )
          )
          // Free uses: no payment needed. Paid uses: auto-trigger wallet approval.
          if (!responseWasFree) {
            setHasPendingDebt(true)
            await settleDebts(assistantId, collectedDebts)
          }
        }
      } catch (err) {
        console.error('[ChatContainer] stream error', err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.' } : m
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, settleDebts]
  )

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!connected) { setVisible(true); return }
    sendMessage(input)
  }

  // Gate: require wallet to use Chat
  if (!connected) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#9945FF]/30 bg-[#9945FF]/10">
          <Bot className="h-7 w-7 text-[#9945FF]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">SkillHive Chat</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect your wallet to use Chat. Skills are called on your behalf and you pay skill owners directly after each response.
          </p>
        </div>
        <button
          onClick={() => setVisible(true)}
          className="flex items-center gap-2 rounded-xl bg-[#9945FF] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97]"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-background">
      {/* Free-use badge — only shown when quota is known */}
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

      {/* Messages */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onPrompt={sendMessage}
        onSettle={settleDebts}
        walletConnected={connected}
      />

      {/* Input — blocked if there's an unpaid debt */}
      <ChatInput
        input={input}
        isLoading={isLoading || hasPendingDebt}
        onChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
