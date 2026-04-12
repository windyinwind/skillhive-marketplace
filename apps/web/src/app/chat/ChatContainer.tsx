'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { Bot } from 'lucide-react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import type { ChatMessage, ToolStep, SSEEvent } from './types'

function uid() {
  return Math.random().toString(36).slice(2)
}

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
          body: JSON.stringify({ messages: history }),
        })

        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

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
                    if (matchById || matchByName) {
                      return { ...s, result: event.result, state: 'done' as const }
                    }
                    return s
                  })
                  return { ...m, toolSteps: steps }
                }

                if (event.type === 'text-delta') {
                  return { ...m, content: m.content + event.text }
                }

                if (event.type === 'done' && event.text) {
                  return { ...m, content: event.text }
                }

                if (event.type === 'error') {
                  return { ...m, content: event.error }
                }

                return m
              })
            )
          }
        }
      } catch (err) {
        console.error('[ChatContainer] stream error', err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Something went wrong. Please try again.' }
              : m
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading]
  )

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-[#0f1117]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#2a3147] bg-[#0f1117] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#9945FF]/20">
          <Bot className="h-3.5 w-3.5 text-[#9945FF]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#F8FAFC]">SWARM Chat</p>
          <p className="text-[10px] text-[#4A5568]">Multi-agent orchestration</p>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onPrompt={sendMessage}
      />

      {/* Input */}
      <ChatInput
        input={input}
        isLoading={isLoading}
        onChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
