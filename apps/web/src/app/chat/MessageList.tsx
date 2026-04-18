'use client'

import { useEffect, useRef, useState } from 'react'
import { Zap, CheckCircle2, Loader2 } from 'lucide-react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SkillCallCard } from './SkillCallCard'
import { CostTally } from './CostTally'
import { lamportsToSol } from '@/lib/format'
import { useTranslations } from 'next-intl'
import type { ChatMessage, SkillDebt } from './types'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  onPrompt: (prompt: string) => void
  onSettle: (msgId: string, debts: SkillDebt[]) => Promise<boolean>
  walletConnected: boolean
}

function SettleBar({ msgId, debts, onSettle, alreadyPaid }: {
  msgId: string
  debts: SkillDebt[]
  onSettle: (msgId: string, debts: SkillDebt[]) => Promise<boolean>
  alreadyPaid: boolean
}) {
  const [retrying, setRetrying] = useState(false)
  const totalLamports = debts.reduce((sum, d) => sum + d.costLamports, 0)

  if (alreadyPaid) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#14F195]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Paid {lamportsToSol(totalLamports)} SOL to {debts.length} skill{debts.length !== 1 ? 's' : ''}
      </div>
    )
  }

  // Payment was auto-triggered but user cancelled — show retry
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
      <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
      <div className="flex-1 text-xs text-muted-foreground">
        Payment cancelled · {debts.length} skill{debts.length !== 1 ? 's' : ''} ·{' '}
        <span className="font-medium text-foreground">{lamportsToSol(totalLamports)} SOL</span> owed
      </div>
      <button
        onClick={async () => {
          setRetrying(true)
          try { await onSettle(msgId, debts) } finally { setRetrying(false) }
        }}
        disabled={retrying}
        className="rounded-md border border-yellow-500/30 px-2.5 py-1 text-xs font-medium text-yellow-400 transition-all hover:bg-yellow-500/10 disabled:opacity-50 active:scale-[0.97]"
      >
        {retrying ? 'Retrying…' : 'Retry payment'}
      </button>
    </div>
  )
}

export function MessageList({ messages, isLoading, onPrompt, onSettle }: MessageListProps) {
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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#9945FF]/30 bg-[#9945FF]/10 overflow-hidden">
          <Image src="/logo.png" alt="SkillHive Logo" width={64} height={64} className="object-cover" />
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
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#9945FF]/20 overflow-hidden">
                <Image src="/logo.png" alt="SkillHive" width={28} height={28} className="object-cover" />
              </div>
              <div className="flex-1">
                {(message.toolSteps ?? []).map((step) => (
                  <SkillCallCard key={step.id} step={step} />
                ))}
                {message.content && (() => {
                  const hasUnpaidDebt = !message.isFree && !message.paid && (message.skillDebts?.length ?? 0) > 0
                  const totalLamports = message.skillDebts?.reduce((s, d) => s + d.costLamports, 0) ?? 0

                  // Split at ~40% for the paywall preview
                  const cut = Math.min(320, Math.floor(message.content.length * 0.4))
                  const preview = hasUnpaidDebt ? message.content.slice(0, cut) : message.content
                  const locked  = hasUnpaidDebt ? message.content.slice(cut) : ''

                  const proseClass = `prose prose-sm max-w-none leading-relaxed dark:prose-invert
                    prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0
                    prose-p:my-1.5
                    prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
                    prose-a:text-[#9945FF] prose-a:no-underline hover:prose-a:underline
                    prose-li:my-0.5`

                  return (
                    <div className="rounded-2xl rounded-tl-sm border border-border bg-card text-sm text-foreground overflow-hidden">
                      {/* Preview (always visible) */}
                      <div className="px-4 py-3">
                        <div className={proseClass}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Locked section — blurred until paid */}
                      {hasUnpaidDebt && locked && (
                        <div className="relative border-t border-[#9945FF]/20">
                          {/* Blurred text */}
                          <div className="select-none pointer-events-none px-4 py-3 bg-[#9945FF]/5">
                            <div className={`blur-[5px] opacity-50 ${proseClass} line-clamp-4`}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{locked}</ReactMarkdown>
                            </div>
                          </div>
                          {/* Gradient + pay CTA */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-card/70 to-card/95 px-4 py-3 gap-2">
                            <p className="text-xs text-muted-foreground text-center">
                              Pay <span className="font-semibold text-foreground">{lamportsToSol(totalLamports)} SOL</span> to unlock the full response
                            </p>
                            <button
                              onClick={async () => { await onSettle(message.id, message.skillDebts!) }}
                              className="flex items-center gap-1.5 rounded-lg bg-[#9945FF] px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97]"
                            >
                              <Zap className="h-3 w-3" />
                              Unlock · {lamportsToSol(totalLamports)} SOL
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
                {!message.content && (message.toolSteps ?? []).length === 0 && (
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9945FF]" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9945FF]" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9945FF]" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
                <CostTally toolSteps={message.toolSteps ?? []} />
                {message.skillDebts && message.skillDebts.length > 0 && (
                  <SettleBar
                    msgId={message.id}
                    debts={message.skillDebts}
                    onSettle={onSettle}
                    alreadyPaid={message.paid ?? false}
                  />
                )}
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
