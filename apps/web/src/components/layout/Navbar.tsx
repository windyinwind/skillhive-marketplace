'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Coins, Store, LayoutDashboard, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => pathname?.includes(href)

  const exploreLinks = [
    { href: '/marketplace', label: t('marketplace'), icon: Store },
    { href: '/arena',       label: t('arena') },
    { href: '/chat',        label: t('chat') },
  ]

  const earnLinks = [
    { href: '/create',    label: t('publishSkill'), icon: Coins, highlight: true },
    { href: '/dashboard', label: t('dashboard'),    icon: LayoutDashboard },
  ]

  return (
    <>
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'color-mix(in srgb, var(--bg-base) 85%, transparent)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.png" alt="SWARM" width={30} height={30} className="rounded-md" />
            <span className="font-heading text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              SWARM<span className="text-[#9945FF]">.</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {/* Explore group */}
            {exploreLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                  isActive(href)
                    ? 'text-[#9945FF]'
                    : 'hover:bg-[var(--bg-elevated)]'
                )}
                style={{ color: isActive(href) ? '#9945FF' : 'var(--text-secondary)' }}
              >
                {label}
              </Link>
            ))}

            <div className="mx-3 h-4 w-px" style={{ background: 'var(--border-subtle)' }} />

            {/* Earn group label */}
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[#14F195]">
              {t('earn')}
            </span>
            {earnLinks.map(({ href, label, highlight }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                  highlight
                    ? isActive(href)
                      ? 'bg-gradient-to-r from-[#9945FF] to-[#14F195] text-[#0f1117]'
                      : 'bg-gradient-to-r from-[#9945FF] to-[#14F195] text-[#0f1117] opacity-90 hover:opacity-100'
                    : isActive(href)
                      ? 'text-[#9945FF]'
                      : 'hover:bg-[var(--bg-elevated)]'
                )}
                style={!highlight ? { color: isActive(href) ? '#9945FF' : 'var(--text-secondary)' } : {}}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side controls */}
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="hidden sm:flex" />
            <LanguageSwitcher className="hidden sm:block" />

            {/* Wallet button */}
            <WalletMultiButton
              style={{
                background: 'linear-gradient(135deg, #9945FF, #14F195)',
                borderRadius: '10px',
                fontSize: '13px',
                height: '36px',
                padding: '0 14px',
                color: '#0f1117',
                fontWeight: '700',
                flexShrink: 0,
              }}
            />

            {/* Mobile hamburger */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors lg:hidden"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="lg:hidden px-4 pb-4 pt-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="flex flex-col gap-1">
              {exploreLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    color: isActive(href) ? '#9945FF' : 'var(--text-secondary)',
                    background: isActive(href) ? 'rgba(153,69,255,0.08)' : 'transparent',
                  }}
                >
                  {label}
                </Link>
              ))}

              <div className="my-2 h-px" style={{ background: 'var(--border-subtle)' }} />
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#14F195]">
                {t('earn')}
              </div>
              {earnLinks.map(({ href, label, highlight }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    highlight && 'bg-gradient-to-r from-[#9945FF] to-[#14F195] text-[#0f1117]'
                  )}
                  style={!highlight ? {
                    color: isActive(href) ? '#9945FF' : 'var(--text-secondary)',
                    background: isActive(href) ? 'rgba(153,69,255,0.08)' : 'transparent',
                  } : {}}
                >
                  {label}
                </Link>
              ))}

              <div className="my-2 h-px" style={{ background: 'var(--border-subtle)' }} />
              <div className="flex items-center gap-2 px-3 py-2">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
