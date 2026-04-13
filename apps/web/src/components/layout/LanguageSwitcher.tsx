'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const LOCALES = [
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'zh', label: '中文',        flag: '🇨🇳' },
  { code: 'ja', label: '日本語',      flag: '🇯🇵' },
  { code: 'ko', label: '한국어',      flag: '🇰🇷' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'ar', label: 'العربية',    flag: '🇸🇦' },
] as const

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function switchLocale(code: string) {
    setOpen(false)
    // Build new path: strip current locale prefix if present, then add new one
    const segments = pathname.split('/')
    const currentLocaleInPath = LOCALES.find((l) => segments[1] === l.code)
    const rest = currentLocaleInPath ? '/' + segments.slice(2).join('/') : pathname
    const newPath = code === 'en' ? rest || '/' : `/${code}${rest}`
    router.push(newPath)
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
          'border border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          open && 'text-[var(--text-primary)]'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="font-medium">{current.flag} {current.code.toUpperCase()}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute right-0 top-full z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl',
            'border border-[var(--border-subtle)] bg-[var(--bg-card)]',
            'shadow-lg shadow-black/10 dark:shadow-black/40'
          )}
        >
          {LOCALES.map(({ code, label, flag }) => (
            <button
              key={code}
              role="option"
              aria-selected={code === locale}
              onClick={() => switchLocale(code)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
                code === locale
                  ? 'bg-[#9945FF]/10 text-[#9945FF] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              )}
            >
              <span className="text-base">{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
