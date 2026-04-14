'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const LOCALES = [
  { code: 'en', label: 'English'   },
  { code: 'zh', label: '中文'       },
  { code: 'ja', label: '日本語'     },
  { code: 'ko', label: '한국어'     },
  { code: 'es', label: 'Español'   },
  { code: 'fr', label: 'Français'  },
  { code: 'de', label: 'Deutsch'   },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية'   },
] as const

type LocaleCode = (typeof LOCALES)[number]['code']

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

  function switchLocale(code: LocaleCode) {
    setOpen(false)
    router.push(pathname, { locale: code })
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
        <span className="font-medium">{current.code.toUpperCase()}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute right-0 top-full z-50 mt-1.5 min-w-[140px] overflow-hidden rounded-xl',
            'border border-[var(--border-subtle)] bg-[var(--bg-card)]',
            'shadow-lg shadow-black/10 dark:shadow-black/40'
          )}
        >
          {LOCALES.map(({ code, label }) => (
            <button
              key={code}
              role="option"
              aria-selected={code === locale}
              onClick={() => switchLocale(code)}
              className={cn(
                'flex w-full items-center px-3 py-2 text-sm transition-colors text-left',
                code === locale
                  ? 'bg-[#9945FF]/10 text-[#9945FF] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
