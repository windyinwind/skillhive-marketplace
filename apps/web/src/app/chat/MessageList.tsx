'use client'

import { useEffect, useRef } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SkillCallCard } from './SkillCallCard'
import { CostTally } from './CostTally'
import { useTranslations } from 'next-intl'
import type { ChatMessage } from './types'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  onPrompt: (prompt: string) => void
}

export function MessageList({ messages, isLoading, onPrompt }: MessageListProps) {
  const t = useTranslations('chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  const EXAMPLE_PROMPTS = [
    t('prompt1'),
    t('prompt2'),
    t('prompt3'),
  ]

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
          <h2 className="text-xl font-semibold text-foreground">{t('emptyTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('emptySubtitle')}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPrompt(prompt)}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-[#9945FF]/40 hover:text-foreground"
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
                <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-[#9945FF]/30 bg-[#9945FF]/10 px-4 py-3 text-sm text-foreground">
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
                  <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm text-foreground">
                    <div className="prose prose-sm max-w-none leading-relaxed dark:prose-invert
                      prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0
                      prose-p:my-1.5
                      prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                      prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
                      prose-a:text-[#9945FF] prose-a:no-underline hover:prose-a:underline
                      prose-li:my-0.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                {!message.content && (message.toolSteps ?? []).length === 0 && (
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
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
