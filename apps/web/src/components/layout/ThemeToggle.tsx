'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const modes = [
  { value: 'light',  Icon: Sun,     labelKey: 'light'  },
  { value: 'system', Icon: Monitor, labelKey: 'system' },
  { value: 'dark',   Icon: Moon,    labelKey: 'dark'   },
] as const

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = useTranslations('nav.theme')

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-lg p-0.5',
        'bg-[var(--bg-elevated)] border border-[var(--border-subtle)]',
        className
      )}
      role="group"
      aria-label="Theme selector"
    >
      {modes.map(({ value, Icon, labelKey }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={t(labelKey)}
          aria-pressed={theme === value}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md transition-all',
            theme === value
              ? 'bg-[#9945FF] text-white shadow-sm'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-base)]'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
