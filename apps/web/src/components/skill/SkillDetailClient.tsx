'use client'

import { Star, Users, Zap, ArrowLeft, Copy, PauseCircle } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { TryItPanel } from '@/components/TryItPanel'
import { useSkill } from '@/hooks/useSkills'
import {
  lamportsToSol,
  formatCallCount,
  reputationToStars,
  tierLabel,
  truncateWallet,
} from '@/lib/format'

interface SkillDetailClientProps {
  id: string
}

export function SkillDetailClient({ id }: SkillDetailClientProps) {
  const { data: skill, isLoading, isError } = useSkill(id)

  const copyUrl = () => navigator.clipboard.writeText(window.location.href)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-64 bg-card" />
            <Skeleton className="h-4 w-full bg-card" />
            <Skeleton className="h-4 w-3/4 bg-card" />
          </div>
          <Skeleton className="h-64 rounded-xl bg-card" />
        </div>
      </div>
    )
  }

  if (isError || !skill) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-20 text-center sm:px-6">
        <p className="text-muted-foreground">Skill not found.</p>
        <Link href="/marketplace" className="mt-4 inline-block text-[#9945FF] hover:underline">
          Back to marketplace
        </Link>
      </div>
    )
  }

  const hasRatings = skill.rating_count > 0
  const displayScore = hasRatings ? skill.rating_avg : reputationToStars(skill.reputation_score)
  const fullStars = Math.floor(displayScore)

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <Link
        href="/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Marketplace
      </Link>

      {!skill.is_active && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <PauseCircle className="h-4 w-4 shrink-0" />
            This skill is currently paused by its provider and cannot be called.
          </div>
          <Link
            href="/marketplace"
            className="shrink-0 rounded-lg border border-yellow-500/30 px-3 py-1.5 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/10"
          >
            Browse alternatives →
          </Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Skill info */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start gap-3">
            <h1 className="font-heading text-3xl font-bold text-foreground">{skill.name}</h1>
            <span className="rounded-md border border-[#9945FF]/30 bg-[#9945FF]/10 px-2 py-0.5 text-xs text-[#9945FF]">
              Tier {skill.tier} · {tierLabel(skill.tier)}
            </span>
          </div>

          <p className="mb-6 text-muted-foreground">{skill.description}</p>

          {/* Stats row */}
          <div className="mb-6 flex flex-wrap gap-6 text-sm">
            {hasRatings ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[#9945FF]">{'★'.repeat(fullStars)}{'☆'.repeat(5 - fullStars)}</span>
                <span className="font-semibold text-foreground">{skill.rating_avg.toFixed(1)}</span>
                <span className="text-muted-foreground">({skill.rating_count} ratings)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>☆☆☆☆☆</span>
                <span className="text-xs">No ratings yet — be the first</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">{formatCallCount(skill.total_calls)}</span>
              <span className="text-muted-foreground">calls</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#14F195]" />
              <span className="font-semibold text-[#14F195]">{lamportsToSol(skill.price_lamports)} SOL</span>
              <span className="text-muted-foreground">per call</span>
            </div>
          </div>

          {/* Tags */}
          {skill.tags && skill.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground transition-opacity hover:opacity-80"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Long description */}
          {skill.long_description && (
            <div className="mb-6 rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 font-heading font-semibold text-foreground">About this skill</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{skill.long_description}</p>
            </div>
          )}

          {/* Provider */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">Provider</p>
              <p className="font-mono text-sm text-muted-foreground">
                {skill.provider_name ?? truncateWallet(skill.owner_wallet)}
              </p>
            </div>
            <button
              onClick={copyUrl}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[#9945FF40] hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        </div>

        {/* Try-it panel */}
        <div>
          <TryItPanel skillId={skill.id} />
        </div>
      </div>
    </div>
  )
}
