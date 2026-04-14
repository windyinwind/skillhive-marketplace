'use client'

import { Loader2, Search, Zap, AlertCircle, TrendingUp, Globe } from 'lucide-react'
import { formatSol } from '@/lib/format'
import { useTranslations } from 'next-intl'
import type { ToolStep } from './types'

interface SkillCallCardProps {
  step: ToolStep
}

export function SkillCallCard({ step }: SkillCallCardProps) {
  const t = useTranslations('skillCall')
  const isDiscovery = step.toolName === 'discover_skills'
  const isLoading = step.state === 'calling'
  const hasError = step.state === 'error'

  if (step.toolName === 'search_web') {
    const query = step.args.query as string
    const count = step.result ? (step.result.results as unknown[])?.length : null
    const searchedAt = step.result?.searchedAt as string | undefined
    return (
      <div className="my-1.5 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9945FF]" />
        ) : (
          <Globe className="h-3.5 w-3.5 text-[#9945FF]" />
        )}
        <span className="text-muted-foreground">
          {isLoading
            ? t('searchingWeb', { query })
            : `${t('webSearchDone', { query, count: count ?? 0 })}${searchedAt ? ` · ${new Date(searchedAt).toLocaleTimeString()}` : ''}`}
        </span>
      </div>
    )
  }

  if (step.toolName === 'get_live_data') {
    const symbols = (step.args.symbols as string[])?.join(', ') ?? ''
    const fetchedAt = step.result ? (step.result.fetchedAt as string) : null
    return (
      <div className="my-1.5 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#14F195]" />
        ) : (
          <TrendingUp className="h-3.5 w-3.5 text-[#14F195]" />
        )}
        <span className="text-muted-foreground">
          {isLoading
            ? t('fetchingLiveData', { symbols })
            : `${t('liveDataDone', { symbols })}${fetchedAt ? ` · ${new Date(fetchedAt).toLocaleTimeString()}` : ''}`}
        </span>
      </div>
    )
  }

  if (isDiscovery) {
    const count = step.result ? (step.result.count as number) : null
    const query = step.args.query as string
    return (
      <div className="my-1.5 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9945FF]" />
        ) : (
          <Search className="h-3.5 w-3.5 text-[#14F195]" />
        )}
        <span className="text-muted-foreground">
          {isLoading
            ? t('discoveringSkills', { query })
            : t(count === 1 ? 'discoveredSkills' : 'discoveredSkillsPlural', { count: count ?? 0, query })}
        </span>
      </div>
    )
  }

  const skillName = (step.args.skillName as string) ?? 'Skill'
  const costLamports = step.result ? (step.result.costLamports as number | undefined) : undefined

  return (
    <div
      className={`my-1.5 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
        hasError
          ? 'border-red-500/30 bg-red-900/10'
          : step.state === 'done'
          ? 'border-[#14F195]/20 bg-[#14F195]/5'
          : 'border-[#9945FF]/30 bg-[#9945FF]/5'
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#9945FF]" />
      ) : hasError ? (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
      ) : (
        <Zap className="h-3.5 w-3.5 shrink-0 text-[#14F195]" />
      )}

      <span className={`font-medium ${hasError ? 'text-red-300' : step.state === 'done' ? 'text-foreground' : 'text-[#9945FF]'}`}>
        {skillName}
      </span>

      <span className="text-muted-foreground">
        {isLoading ? t('calling') : hasError ? t('failed') : t('done')}
      </span>

      {costLamports !== undefined && costLamports > 0 && (
        <span className="ml-auto font-mono text-[#14F195]">{formatSol(costLamports)}</span>
      )}
    </div>
  )
}
