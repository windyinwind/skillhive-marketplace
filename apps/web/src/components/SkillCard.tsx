'use client'

import Link from 'next/link'
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
}

const TIER_LABELS: Record<number, string> = {
  1: 'Prompt',
  2: 'Tool',
  3: 'Agent',
}

export function SkillCard({ skill, featured = false }: { skill: Skill; featured?: boolean }) {
  // Prefer off-chain user ratings; fall back to on-chain reputation
  const displayRating = skill.rating_count > 0 ? skill.rating_avg : reputationToStars(skill.reputation_score)
  const fullStars = Math.floor(displayRating)

  return (
    <Link href={`/skill/${skill.id}`} className="block">
      <div className={`skill-card group flex h-full flex-col rounded-xl border bg-[#161b27] p-6 ${featured ? 'border-[#9945FF]/30 shadow-[0_0_0_1px_#9945FF20]' : 'border-[#2a3147]'}`}>
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-heading font-semibold text-[#F8FAFC] line-clamp-1">{skill.name}</h3>
          <span className="shrink-0 rounded-md border border-[#2a3147] bg-[#1e2435] px-2 py-0.5 text-xs text-[#8B9BB4]">
            {TIER_LABELS[skill.tier] ?? `Tier ${skill.tier}`}
          </span>
        </div>

        {/* Description */}
        <p className="mb-4 flex-1 text-sm text-[#8B9BB4] line-clamp-2">
          {skill.description ?? 'No description provided.'}
        </p>

        {/* Tags */}
        {skill.tags && skill.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {skill.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-[#2a3147] bg-[#0f1117] px-2 py-0.5 text-xs text-[#4A5568] transition-opacity hover:opacity-80"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#2a3147] pt-4">
          <div>
            <span className="font-semibold text-[#14F195]">{lamportsToSol(skill.price_lamports)} SOL</span>
            <span className="ml-1 text-xs text-[#4A5568]">/ call</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#4A5568]">
            {skill.rating_count > 0 ? (
              <span className="flex items-center gap-0.5">
                <span className="text-[#9945FF]">{'★'.repeat(fullStars)}{'☆'.repeat(5 - fullStars)}</span>
                <span className="ml-1">({skill.rating_count})</span>
              </span>
            ) : (
              <span className="rounded-md border border-[#2a3147] bg-[#1e2435] px-1.5 py-0.5 text-xs text-[#4A5568]">New</span>
            )}
            <span>{skill.total_calls.toLocaleString()} calls</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
