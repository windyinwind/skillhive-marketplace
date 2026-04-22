'use client'

import { useRef, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface ChatInputProps {
  input: string
  isLoading: boolean
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
}

export function ChatInput({ input = '', isLoading, onChange, onSubmit }: ChatInputProps) {
  const t = useTranslations('chat')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function resize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && input?.trim()) {
        onSubmit(e as unknown as FormEvent)
      }
    }
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl items-end gap-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          placeholder={t('inputPlaceholder')}
          disabled={isLoading}
          onInput={resize}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#9945FF]/50 disabled:opacity-50"
          style={{ minHeight: '48px', maxHeight: '160px' }}
        />
        <Button
          type="submit"
          disabled={isLoading || !input?.trim()}
          className="h-12 w-12 shrink-0 rounded-xl bg-[#9945FF] p-0 hover:bg-[#8535EF] disabled:opacity-40"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </form>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        {t('footerNote')}
      </p>
    </div>
  )
}
