'use client'

import { useEffect, useRef, useState } from 'react'
import { Zap, CheckCircle2, Loader2 } from 'lucide-react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
  const [open, setOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const totalLamports = debts.reduce((sum, d) => sum + d.costLamports, 0)

  if (alreadyPaid) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#14F195]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Paid {lamportsToSol(totalLamports)} SOL to {debts.length} skill{debts.length !== 1 ? 's' : ''}
      </div>
    )
  }

  async function handleConfirm() {
    setPaying(true)
    try {
      await onSettle(msgId, debts)
      setOpen(false)
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-[#9945FF]/20 bg-[#9945FF]/5 px-3 py-2">
        <Zap className="h-3.5 w-3.5 shrink-0 text-[#9945FF]" />
        <div className="flex-1 text-xs text-muted-foreground">
          {debts.length} skill{debts.length !== 1 ? 's' : ''} used ·{' '}
          <span className="font-medium text-foreground">{lamportsToSol(totalLamports)} SOL</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-[#9945FF] px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97]"
        >
          Pay {lamportsToSol(totalLamports)} SOL
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              You are about to pay skill creator{debts.length !== 1 ? 's' : ''} on Solana.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {debts.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-sm">
                <span className="text-foreground font-medium">{d.skillName || 'Skill'}</span>
                <span className="font-mono text-[#14F195]">{lamportsToSol(d.costLamports)} SOL</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-1 pt-1 text-sm font-semibold">
              <span>Total</span>
              <span className="font-mono text-[#14F195]">{lamportsToSol(totalLamports)} SOL</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={paying}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={paying}
              className="bg-[#9945FF] hover:bg-[#8535EF] text-white"
            >
              {paying ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending…</> : 'Confirm & Pay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
                          {/* Gradient overlay — payment handled by SettleBar below */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-card/70 to-card/95 px-4 py-3 gap-2">
                            <p className="text-xs text-muted-foreground text-center">
                              Pay <span className="font-semibold text-foreground">{lamportsToSol(totalLamports)} SOL</span> to unlock the full response
                            </p>
                            <p className="text-[11px] text-muted-foreground/70">Use the Pay button below to confirm</p>
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
