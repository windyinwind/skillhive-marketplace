'use client'

import Link from 'next/link'
import { ArrowRight, Star, Zap } from 'lucide-react'
import { useSkills, type SkillPublic } from '@/hooks/useSkills'
import { lamportsToSol } from '@/lib/format'

const TIER_LABELS: Record<number, string> = { 1: 'Prompt', 2: 'Tool', 3: 'Agent' }

function SkillMiniCard({ skill, showStaffBadge = false }: { skill: SkillPublic; showStaffBadge?: boolean }) {
  const stars = skill.rating_count > 0 ? skill.rating_avg : 0
  const fullStars = Math.floor(stars)

  return (
    <Link href={`/skill/${skill.id}`} className="group block h-full">
      <div
        className="relative flex h-full flex-col rounded-xl p-5 transition-all duration-200 group-hover:-translate-y-0.5"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(153,69,255,0.3)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(153,69,255,0.1), 0 4px 16px rgba(0,0,0,0.1)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.border = '1px solid var(--border-subtle)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
        }}
      >
        {showStaffBadge && (
          <div className="absolute -top-2.5 right-3">
            <span className="rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              ★ Staff Pick
            </span>
          </div>
        )}

        <div className="mb-3 flex items-start justify-between gap-2">
          <h3
            className="line-clamp-1 font-heading font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {skill.name}
          </h3>
          <div className="flex gap-1.5">
            {skill.category && (
              <span
                className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-tight"
                style={{
                  background: 'rgba(153,69,255,0.1)',
                  border: '1px solid rgba(153,69,255,0.2)',
                  color: '#9945FF',
                }}
              >
                {skill.category}
              </span>
            )}
            <span
              className="shrink-0 rounded-md px-2 py-0.5 text-xs text-muted-foreground"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {TIER_LABELS[skill.tier] ?? `Tier ${skill.tier}`}
            </span>
          </div>
        </div>

        <p
          className="mb-4 flex-1 text-sm line-clamp-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {skill.description ?? 'No description provided.'}
        </p>

        {skill.tags && skill.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {skill.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md px-2 py-0.5 text-xs"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[#14F195]">
              {lamportsToSol(skill.price_lamports)} SOL
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              /call
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {skill.rating_count > 0 ? (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-[#9945FF] text-[#9945FF]" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {stars.toFixed(1)}
                </span>
                <span>({skill.rating_count})</span>
              </span>
            ) : (
              <span
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                New
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Zap className="h-3 w-3" />
              {skill.total_calls.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div
      className="h-[180px] animate-pulse rounded-xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    />
  )
}

interface SkillsRowProps {
  limit?: number
  showStaffBadges?: boolean
  viewAllHref: string
  viewAllLabel: string
}

export function SkillsRow({
  limit = 4,
  showStaffBadges = false,
  viewAllHref,
  viewAllLabel,
}: SkillsRowProps) {
  const { data, isLoading } = useSkills({ limit })
  const skills = data?.skills ?? []

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: limit }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (skills.length === 0) {
    return (
      <div
        className="rounded-xl py-12 text-center text-sm"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
      >
        No skills available yet.
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((skill, i) => (
          <SkillMiniCard key={skill.id} skill={skill} showStaffBadge={showStaffBadges && i < 2} />
        ))}
      </div>
      <div className="mt-5 text-center">
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
          }}
        >
          {viewAllLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </>
  )
}
