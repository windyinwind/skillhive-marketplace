'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { LayoutDashboard, Plus, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [mobileOpen, setMobileOpen] = useState(false)
  const { connected } = useWallet()

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  const userLinks = [
    { href: '/marketplace', label: t('marketplace') },
    { href: '/arena',       label: t('arena') },
    { href: '/chat',        label: t('chat') },
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
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6">

          {/* ── Logo ── */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5 mr-2">
            <Image src="/logo.png" alt="SWARM" width={30} height={30} className="rounded-md" />
            <span className="font-heading text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              SWARM<span className="text-[#9945FF]">.</span>
            </span>
          </Link>

          {/* ── Desktop centre nav ── */}
          <div className="hidden flex-1 items-center gap-0.5 lg:flex">
            {/* User links */}
            {userLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                  isActive(href)
                    ? 'bg-[#9945FF]/10 text-[#9945FF]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                )}
              >
                {label}
              </Link>
            ))}

            {/* Divider */}
            <div className="mx-3 h-4 w-px shrink-0" style={{ background: 'var(--border-subtle)' }} />

            {/* Provider action — Publish */}
            <Link
              href="/create"
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
                isActive('/create') || isActive('/register')
                  ? 'border-[#9945FF]/40 bg-[#9945FF]/10 text-[#9945FF]'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[#9945FF]/30 hover:text-[var(--text-primary)]'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('publishSkill')}
            </Link>
          </div>

          {/* ── Right side: account controls ── */}
          <div className="flex shrink-0 items-center gap-1.5 ml-auto lg:ml-0">
            <ThemeToggle className="hidden sm:flex" />
            <LanguageSwitcher className="hidden sm:block" />

            {/* Dashboard — only when wallet connected */}
            {connected && (
              <Link
                href="/dashboard"
                title={t('dashboard')}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                  isActive('/dashboard')
                    ? 'bg-[#9945FF]/10 text-[#9945FF]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                )}
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            )}

            {/* Wallet — identity + connect */}
            <WalletMultiButton
              style={{
                background: connected
                  ? 'var(--bg-elevated)'
                  : 'linear-gradient(135deg, #9945FF, #14F195)',
                border: connected ? '1px solid var(--border-subtle)' : 'none',
                borderRadius: '10px',
                fontSize: '13px',
                height: '36px',
                padding: '0 14px',
                color: connected ? 'var(--text-primary)' : '#0f1117',
                fontWeight: '600',
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

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div
            className="lg:hidden px-4 pb-5 pt-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="flex flex-col gap-0.5">

              {/* Discover section */}
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                Discover
              </p>
              {userLinks.map(({ href, label }) => (
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

              {/* Build & Earn section */}
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                Build & Earn
              </p>
              <Link
                href="/create"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: isActive('/create') ? '#9945FF' : 'var(--text-secondary)',
                  background: isActive('/create') ? 'rgba(153,69,255,0.08)' : 'transparent',
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('publishSkill')}
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: isActive('/register') ? '#9945FF' : 'var(--text-secondary)',
                  background: isActive('/register') ? 'rgba(153,69,255,0.08)' : 'transparent',
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('registerAgent')}
              </Link>
              <Link
                href="/publish"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Provider guide & FAQ →
              </Link>

              {/* Account section — only when connected */}
              {connected && (
                <>
                  <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                    Account
                  </p>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      color: isActive('/dashboard') ? '#9945FF' : 'var(--text-secondary)',
                      background: isActive('/dashboard') ? 'rgba(153,69,255,0.08)' : 'transparent',
                    }}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    {t('dashboard')}
                  </Link>
                </>
              )}

              {/* Utilities */}
              <div className="mt-3 flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
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
