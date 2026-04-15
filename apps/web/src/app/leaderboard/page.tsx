'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Trophy, Zap, TrendingUp, Clock, Search, ExternalLink } from 'lucide-react'
import { tierLabel, tierColor, formatCallCount } from '@/lib/format'
import type { LeaderboardRow } from '@/app/arena/types'

type SortKey = 'total_sol_earned' | 'wins' | 'win_rate' | 'total_calls' | 'reputation_score' | 'total_votes'

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'total_sol_earned', label: 'SOL Earned',  icon: <Trophy className="w-3.5 h-3.5" /> },
  { key: 'wins',             label: 'Wins',         icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'win_rate',         label: 'Win Rate',     icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'total_calls',      label: 'Total Calls',  icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'reputation_score', label: 'Reputation',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'total_votes',      label: 'Votes',        icon: <Zap className="w-3.5 h-3.5" /> },
]

interface LeaderboardResponse {
  rows: LeaderboardRow[]
  total: number
  page: number
  limit: number
  sort: SortKey
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function LeaderboardPage() {
  const [sort, setSort] = useState<SortKey>('total_sol_earned')
  const [tag, setTag] = useState('')
  const [page, setPage] = useState(1)

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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-8">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 px-3 py-1 text-xs font-medium text-[#9945FF] mb-4">
          <Trophy className="w-3.5 h-3.5" />
          Global Leaderboard
        </div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Skill Rankings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ranked by real economic signal — SOL staked by the community in Arena rounds.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { setSort(opt.key); setPage(1) }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === opt.key
                  ? 'border-[#9945FF] bg-[#9945FF]/10 text-[#9945FF]'
                  : 'border-border text-muted-foreground hover:border-[#9945FF]/30 hover:text-foreground'
              }`}
            >
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter by tag…"
            value={tag}
            onChange={(e) => { setTag(e.target.value); setPage(1) }}
            className="pl-8 h-8 w-40 bg-card border-border text-foreground text-xs placeholder:text-muted-foreground focus:border-[#9945FF]"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#9945FF]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No skills ranked yet. Start an Arena round to generate data.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Wins</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Win Rate</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">SOL Earned</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Calls</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Votes</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => {
                const rank = (page - 1) * 25 + i + 1
                const winRateColor =
                  row.win_rate >= 0.6 ? 'text-[#14F195]' :
                  row.win_rate >= 0.3 ? 'text-yellow-400' :
                  'text-muted-foreground'

                return (
                  <tr key={row.skill_id} className="hover:bg-card/40 transition-colors group">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {MEDAL[rank] ?? <span className="text-muted-foreground">{rank}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {row.logo_url ? (
                          <img src={row.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-[#9945FF]/10 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{row.name}</span>
                            <Badge className={`text-xs px-1.5 py-0 ${tierColor(row.tier)}`}>
                              {tierLabel(row.tier)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {row.provider_name && (
                              <span className="text-xs text-muted-foreground">{row.provider_name}</span>
                            )}
                            {(row.tags ?? []).slice(0, 2).map((tag) => (
                              <span key={tag} className="text-xs text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground hidden md:table-cell">
                      {row.wins}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className={`text-sm font-medium ${winRateColor}`}>
                        {Math.round(row.win_rate * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-[#14F195]">
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
                        className="p-1 text-muted-foreground hover:text-[#9945FF] transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="View skill"
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
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:border-[#9945FF]/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:border-[#9945FF]/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">Want to appear on the leaderboard?</p>
          <p className="text-sm text-muted-foreground mt-0.5">Publish a skill and let Arena rounds build your reputation score.</p>
        </div>
        <Link
          href="/create"
          className="shrink-0 rounded-xl bg-[#9945FF] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97]"
        >
          Publish a Skill
        </Link>
      </div>
    </div>
  )
}
