'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Trophy, Zap, TrendingUp, Clock, Search, ExternalLink } from 'lucide-react'
import { tierLabel, tierColor, formatCallCount } from '@/lib/format'
import { useTranslations } from 'next-intl'
import type { LeaderboardRow } from '@/app/arena/types'

type SortKey = 'total_sol_earned' | 'wins' | 'win_rate' | 'total_calls' | 'reputation_score' | 'total_votes'

interface LeaderboardResponse {
  rows: LeaderboardRow[]
  total: number
  page: number
  limit: number
  sort: SortKey
}

export default function LeaderboardPage() {
  const t = useTranslations('leaderboard')
  const [sort, setSort] = useState<SortKey>('total_sol_earned')
  const [tag, setTag] = useState('')
  const [page, setPage] = useState(1)

  const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: 'total_sol_earned', label: t('sortSolEarned'),  icon: <Trophy className="w-3.5 h-3.5" /> },
    { key: 'wins',             label: t('sortWins'),       icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'win_rate',         label: t('sortWinRate'),    icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'total_calls',      label: t('sortTotalCalls'), icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'reputation_score', label: t('sortReputation'), icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'total_votes',      label: t('sortVotes'),      icon: <Zap className="w-3.5 h-3.5" /> },
  ]

  const { data, isLoading } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', sort, tag, page],
    queryFn: () => {
      const p = new URLSearchParams({ sort, page: String(page), limit: '25' })
      if (tag) p.set('tag', tag)
      return fetch(`/api/leaderboard?${p}`).then((r) => r.json())
    },
    staleTime: 30_000,
  })

  const rows = data?.rows ?? []
  const totalPages = data ? Math.ceil(data.total / 25) : 1

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-medium mb-4">
          <Trophy className="w-3.5 h-3.5" />
          {t('badge')}
        </div>
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { setSort(opt.key); setPage(1) }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sort === opt.key
                  ? 'bg-violet-600 text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
              }`}
            >
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={t('filterByTag')}
            value={tag}
            onChange={(e) => { setTag(e.target.value); setPage(1) }}
            className="pl-8 h-8 w-40 bg-card border-border text-foreground text-xs placeholder:text-muted-foreground focus:border-violet-500"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {t('noSkillsRanked')}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">{t('colRank')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('colSkill')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('colWins')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('colWinRate')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('colSolEarned')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('colCalls')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('colVotes')}</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => {
                const rank = (page - 1) * 25 + i + 1
                return (
                  <tr key={row.skill_id} className="hover:bg-accent/50 transition-colors group">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {rank <= 3 ? (
                        <span className={rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-foreground' : 'text-orange-400'}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : rank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {row.logo_url ? (
                          <img src={row.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-muted flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground group-hover:text-foreground transition-colors">
                              {row.name}
                            </span>
                            <Badge className={`text-xs px-1.5 py-0 ${tierColor(row.tier)}`}>
                              {tierLabel(row.tier)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {row.provider_name && (
                              <span className="text-xs text-muted-foreground">{row.provider_name}</span>
                            )}
                            {row.tags && row.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="text-xs text-muted-foreground/60">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground hidden md:table-cell">
                      {row.wins}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className={`text-sm font-medium ${
                        row.win_rate >= 0.6 ? 'text-emerald-400' :
                        row.win_rate >= 0.3 ? 'text-yellow-400' : 'text-muted-foreground'
                      }`}>
                        {Math.round(row.win_rate * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-yellow-400">
                        {(row.total_sol_earned / 1e9).toFixed(4)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">SOL</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                      {formatCallCount(row.total_calls)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                      {row.total_votes}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/skill/${row.skill_id}`}
                        className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                        aria-label={t('viewSkill')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:border-border/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('previous')}
          </button>
          <span className="text-sm text-muted-foreground">
            {t('pageOf', { page, total: totalPages })}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:border-border/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('next')}
          </button>
        </div>
      )}
    </div>
  )
}
