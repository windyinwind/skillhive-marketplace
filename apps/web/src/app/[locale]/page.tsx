import Link from 'next/link'
import { ArrowRight, Search, Zap, Shield, Bot, Code2, Coins, TrendingUp, Sparkles, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SkillsRow } from '@/components/home/SkillsRow'

const featuredStats = [
  { labelKey: 'skillsLive',      value: '120+' },
  { labelKey: 'callsSettled',    value: '14k'  },
  { labelKey: 'avgResponse',     value: '1.2s' },
  { labelKey: 'solDistributed',  value: '380'  },
]

function SectionBadge({ children, variant = 'user' }: { children: React.ReactNode; variant?: 'user' | 'creator' | 'neutral' }) {
  const styles = {
    user:    'bg-[#9945FF]/10 border-[#9945FF]/20 text-[#9945FF]',
    creator: 'bg-[#14F195]/10 border-[#14F195]/25 text-[#14F195]',
    neutral: 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  )
}

function StepCard({ number, title, desc, icon: Icon, accent }: { number: string; title: string; desc: string; icon: React.ElementType; accent: string }) {
  return (
    <div
      className="relative flex flex-col rounded-2xl p-6 transition-shadow hover:shadow-md"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div
        className="absolute right-5 top-5 font-mono text-4xl font-bold opacity-[0.06]"
        style={{ color: 'var(--text-primary)' }}
      >
        {number}
      </div>
      <h3 className="mb-2 font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {desc}
      </p>
    </div>
  )
}

export default function HomePage() {
  const t = useTranslations('home')
  const tn = useTranslations('nav')

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative pb-16 pt-16 sm:pb-24 sm:pt-24 text-center">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-20"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 0%, #9945FF 0%, transparent 70%)',
          }}
        />

        {/* Status pill */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/20 bg-[#9945FF]/5 px-4 py-1.5 text-sm font-medium text-[#9945FF]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#14F195]" />
            {t('status')}
          </div>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-3xl font-heading text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl" style={{ color: 'var(--text-primary)' }}>
          {t('heroHeadline')}{' '}
          <span className="bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
            {t('heroHighlight')}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('heroSubtitle')}
        </p>

        {/* Stats */}
        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-x-10 gap-y-4">
          {featuredStats.map(({ labelKey, value }) => (
            <div key={labelKey} className="flex items-baseline gap-1.5">
              <span className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {value}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {t(`stats.${labelKey}`)}
              </span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/marketplace">
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#9945FF] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#9945FF]/25 transition-all hover:bg-[#8535EF] hover:shadow-[#9945FF]/40 active:scale-[0.97]">
              <Search className="h-4 w-4" />
              {t('ctaBrowse')}
            </button>
          </Link>
          <Link href="/create">
            <button className="inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-sm font-bold transition-all active:scale-[0.97]"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <Sparkles className="h-4 w-4 text-[#14F195]" />
              {t('ctaPublish')}
            </button>
          </Link>
        </div>
      </section>

      {/* ── How to Use ───────────────────────────────────────── */}
      <section className="mb-20">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <SectionBadge variant="user">
            <Users className="h-3 w-3" />
            {t('howToUse.badge')}
          </SectionBadge>
          <h2 className="font-heading text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('howToUse.title')}
          </h2>
          <p className="max-w-md text-base" style={{ color: 'var(--text-secondary)' }}>
            {t('howToUse.subtitle')}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <StepCard
            number="1"
            title={t('howToUse.step1Title')}
            desc={t('howToUse.step1Desc')}
            icon={Search}
            accent="bg-[#9945FF]/10 text-[#9945FF]"
          />
          <StepCard
            number="2"
            title={t('howToUse.step2Title')}
            desc={t('howToUse.step2Desc')}
            icon={Zap}
            accent="bg-[#14F195]/10 text-[#14F195]"
          />
          <StepCard
            number="3"
            title={t('howToUse.step3Title')}
            desc={t('howToUse.step3Desc')}
            icon={Shield}
            accent="bg-[#9945FF]/10 text-[#9945FF]"
          />
        </div>
      </section>

      {/* ── Staff Picks ──────────────────────────────────────── */}
      <section className="mb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <SectionBadge variant="neutral">
              <span>⭐</span>
              {t('staffPicks.badge')}
            </SectionBadge>
            <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('staffPicks.title')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('staffPicks.subtitle')}
            </p>
          </div>
          <Link
            href="/marketplace"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-[#9945FF] transition-opacity hover:opacity-75 sm:flex"
          >
            {t('staffPicks.viewAll')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <SkillsRow
          limit={4}
          showStaffBadges={true}
          viewAllHref="/marketplace"
          viewAllLabel={t('staffPicks.viewAll')}
        />
      </section>

      {/* ── Popular Skills ───────────────────────────────────── */}
      <section className="mb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <SectionBadge variant="user">
              <TrendingUp className="h-3 w-3" />
              {t('popularSkills.badge')}
            </SectionBadge>
            <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('popularSkills.title')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('popularSkills.subtitle')}
            </p>
          </div>
          <Link
            href="/marketplace"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-[#9945FF] transition-opacity hover:opacity-75 sm:flex"
          >
            {t('popularSkills.viewAll')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <SkillsRow
          limit={4}
          viewAllHref="/marketplace"
          viewAllLabel={t('popularSkills.viewAll')}
        />
      </section>

      {/* ── How to Earn ─────────────────────────────────────── */}
      <section className="mb-20">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <SectionBadge variant="creator">
            <Bot className="h-3 w-3" />
            {t('howToEarn.badge')}
          </SectionBadge>
          <h2 className="font-heading text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('howToEarn.title')}
          </h2>
          <p className="max-w-md text-base" style={{ color: 'var(--text-secondary)' }}>
            {t('howToEarn.subtitle')}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <StepCard
            number="1"
            title={t('howToEarn.step1Title')}
            desc={t('howToEarn.step1Desc')}
            icon={Code2}
            accent="bg-[#14F195]/10 text-[#14F195]"
          />
          <StepCard
            number="2"
            title={t('howToEarn.step2Title')}
            desc={t('howToEarn.step2Desc')}
            icon={Bot}
            accent="bg-[#9945FF]/10 text-[#9945FF]"
          />
          <StepCard
            number="3"
            title={t('howToEarn.step3Title')}
            desc={t('howToEarn.step3Desc')}
            icon={Coins}
            accent="bg-[#14F195]/10 text-[#14F195]"
          />
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/create">
            <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 py-3.5 text-sm font-bold text-[#0f1117] shadow-lg shadow-[#9945FF]/20 transition-all hover:opacity-90 active:scale-[0.97]">
              {t('ctaPublish')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────── */}
      <section className="mb-20 overflow-hidden rounded-2xl text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(153,69,255,0.08) 0%, rgba(20,241,149,0.06) 100%)',
          border: '1px solid rgba(153,69,255,0.15)',
        }}
      >
        <div className="px-8 py-16 sm:px-16">
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195] px-4 py-1.5 text-xs font-bold text-white">
              {t('cta.subtitle')}
            </span>
          </div>
          <h2 className="mb-4 font-heading text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
            {t('cta.title')}
          </h2>
          <Link href="/marketplace">
            <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 py-3.5 text-sm font-bold text-[#0f1117] shadow-lg shadow-[#9945FF]/20 transition-all hover:opacity-90 active:scale-[0.97]">
              {t('cta.button')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </section>

    </div>
  )
}
