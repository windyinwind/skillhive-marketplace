'use client'

import { useEffect, useRef } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SkillCallCard } from './SkillCallCard'
import { CostTally } from './CostTally'
import type { ChatMessage } from './types'

const EXAMPLE_PROMPTS = [
  'Should I buy NVIDIA stock today?',
  'Summarize the latest AI industry news',
  'What is the current market sentiment for Bitcoin?',
]

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  onPrompt: (prompt: string) => void
}

export function MessageList({ messages, isLoading, onPrompt }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#9945FF]/30 bg-[#9945FF]/10">
          <Bot className="h-8 w-8 text-[#9945FF]" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#F8FAFC]">Ask SWARM anything</h2>
          <p className="mt-1 text-sm text-[#8B9BB4]">
            The orchestrator discovers and calls marketplace skills to answer your question
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPrompt(prompt)}
              className="rounded-xl border border-[#2a3147] bg-[#161b27] px-4 py-2.5 text-left text-xs text-[#8B9BB4] transition-colors hover:border-[#9945FF]/40 hover:text-[#F8FAFC]"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {messages.map((message) => {
          if (message.role === 'user') {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-[#9945FF]/30 bg-[#9945FF]/10 px-4 py-3 text-sm text-[#F8FAFC]">
                  {message.content}
                </div>
              </div>
            )
          }

          return (
            <div key={message.id} className="flex gap-3">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#9945FF]/20">
                <Sparkles className="h-3.5 w-3.5 text-[#9945FF]" />
              </div>
              <div className="flex-1">
                {(message.toolSteps ?? []).map((step) => (
                  <SkillCallCard key={step.id} step={step} />
                ))}
                {message.content && (
                  <div className="rounded-2xl rounded-tl-sm border border-[#2a3147] bg-[#161b27] px-4 py-3 text-sm text-[#C8D3E8]">
                    <div className="prose prose-invert prose-sm max-w-none leading-relaxed
                      prose-headings:text-[#F8FAFC] prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0
                      prose-p:text-[#C8D3E8] prose-p:my-1.5
                      prose-strong:text-[#F8FAFC]
                      prose-code:text-[#14F195] prose-code:bg-[#0f1117] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                      prose-pre:bg-[#0f1117] prose-pre:border prose-pre:border-[#2a3147] prose-pre:rounded-lg
                      prose-table:text-xs prose-th:text-[#8B9BB4] prose-td:text-[#C8D3E8] prose-td:border-[#2a3147] prose-th:border-[#2a3147]
                      prose-a:text-[#9945FF] prose-a:no-underline hover:prose-a:underline
                      prose-ul:text-[#C8D3E8] prose-ol:text-[#C8D3E8]
                      prose-li:my-0.5 prose-li:marker:text-[#9945FF]
                      prose-blockquote:border-[#9945FF] prose-blockquote:text-[#8B9BB4]
                      prose-hr:border-[#2a3147]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                {!message.content && (message.toolSteps ?? []).length === 0 && (
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-[#2a3147] bg-[#161b27] px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9945FF]" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9945FF]" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9945FF]" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
                <CostTally toolSteps={message.toolSteps ?? []} />
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
