'use client'

import Link from 'next/link'
import { Star, Zap } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import { lamportsToSol, reputationToStars } from '@/lib/format'

interface Skill {
  id: string
  name: string
  description: string | null
  tags: string[] | null
  price_lamports: number
  reputation_score: number
  total_calls: number
  rating_count: number
  rating_avg: number
  is_active: boolean
  tier: number
  skill_type: string
  provider_name: string | null
  category: string | null
  is_featured?: boolean
}

const TIER_LABELS: Record<number, string> = {
  1: 'Prompt',
  2: 'Tool',
  3: 'Agent',
}

export function SkillCard({ skill, featured: manualFeatured = false }: { skill: Skill; featured?: boolean }) {
  const isFeatured = manualFeatured || skill.is_featured === true
  const displayRating = skill.rating_count > 0 ? skill.rating_avg : reputationToStars(skill.reputation_score)
  const fullStars = Math.floor(displayRating)

  return (
    <Link
      href={`/skill/${skill.id}`}
      className="block h-full"
      onClick={() => analytics.trackViewSkill(skill.id, skill.name)}
    >
      <div
        className="skill-card group flex h-full flex-col rounded-xl p-6 transition-all"
        style={{
          background: 'var(--bg-card)',
          border: isFeatured
            ? '1px solid rgba(153,69,255,0.4)'
            : '1px solid var(--border-subtle)',
          boxShadow: isFeatured ? '0 0 15px -5px rgba(153,69,255,0.2)' : 'none',
        }}
      >
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3
            className="font-heading font-semibold line-clamp-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {skill.name}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {skill.category && (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                style={{
                  background: 'rgba(20, 241, 149, 0.1)',
                  border: '1px solid rgba(20, 241, 149, 0.2)',
                  color: '#14F195',
                }}
              >
                {skill.category}
              </span>
            )}
            <span
              className="rounded-md px-2 py-0.5 text-xs"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {TIER_LABELS[skill.tier] ?? `Tier ${skill.tier}`}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="mb-4 flex-1 text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {skill.description ?? 'No description provided.'}
        </p>

        {/* Tags */}
        {skill.tags && skill.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {skill.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md px-2 py-0.5 text-xs transition-opacity hover:opacity-80"
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

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div>
            <span className="font-semibold text-[#14F195]">
              {lamportsToSol(skill.price_lamports)} SOL
            </span>
            <span className="ml-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              / call
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {skill.rating_count > 0 ? (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-[#9945FF] text-[#9945FF]" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {displayRating.toFixed(1)}
                </span>
                <span>({skill.rating_count})</span>
              </span>
            ) : (
              <span
                className="rounded-md px-1.5 py-0.5 text-xs"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)',
                }}
              >
                New
              </span>
            )}
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {skill.total_calls.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
