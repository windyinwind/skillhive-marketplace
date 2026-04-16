'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

const YEAR = new Date().getFullYear()

const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta'
  ? 'mainnet'
  : 'devnet'

export function Footer() {
  const t = useTranslations('footer')

  const networkLabel = network === 'mainnet' ? t('networkMainnet') : t('networkDevnet')

  const columns = [
    {
      heading: t('col1Heading'),
      links: [
        { label: t('col1Link1'), href: '/marketplace' },
        { label: t('col1Link2'), href: '/arena' },
        { label: t('col1Link3'), href: '/chat' },
        { label: t('col1Link4'), href: '/leaderboard' },
      ],
    },
    {
      heading: t('col2Heading'),
      links: [
        { label: t('col2Link1'), href: '/create' },
        { label: t('col2Link2'), href: '/register' },
        { label: t('col2Link3'), href: '/publish' },
        { label: t('col2Link4'), href: '/dashboard' },
      ],
    },
    {
      heading: t('col3Heading'),
      links: [
        { label: t('col3Link1'), href: '/faq' },
        { label: t('col3Link2'), href: '/fees' },
        { label: t('col3Link3'), href: '/usage' },
      ],
    },
    {
      heading: t('col4Heading'),
      links: [
        { label: t('col4Link1'), href: '/privacy' },
        { label: t('col4Link2'), href: '/terms' },
        { label: t('col4Link3'), href: '/cookies' },
      ],
    },
  ]

  return (
    <footer
      className="mt-auto border-t"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      {/* Main footer grid */}
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">

          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="SkillHive" width={28} height={28} className="rounded-md" />
              <span className="font-heading text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                SkillHive<span className="text-[#9945FF]">.</span>
              </span>
            </Link>
            <p className="mt-3 max-w-[220px] text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {t('tagline')}
            </p>
            <div className="mt-4 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#14F195]" />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('liveOn')} {networkLabel}</span>
            </div>

            {/* Social / external links */}
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://github.com/windyinwind/skillhive-marketplace"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-[#9945FF]/40"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a
                href="https://x.com/skillhive.market"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-[#9945FF]/40"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm transition-colors hover:text-[#9945FF]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {t('copyright', { year: YEAR })}
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/privacy" className="transition-colors hover:text-[#9945FF]">{t('bottomPrivacy')}</Link>
            <span>·</span>
            <Link href="/terms" className="transition-colors hover:text-[#9945FF]">{t('bottomTerms')}</Link>
            <span>·</span>
            <Link href="/fees" className="transition-colors hover:text-[#9945FF]">{t('bottomFees')}</Link>
            <span>·</span>
            <Link href="/faq" className="transition-colors hover:text-[#9945FF]">{t('bottomFaq')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
