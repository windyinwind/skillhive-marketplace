'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Badge } from '@/components/ui/badge'
import { ArenaEntryCard } from '@/components/ArenaEntryCard'
import { Loader2, RefreshCw, Clock, Zap, Trophy } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { ArenaRoundWithEntries } from '@/app/arena/types'

interface ArenaRoundClientProps {
  roundId: string
  initialData: ArenaRoundWithEntries
}

const statusConfig = {
  running: { label: 'Skills competing…', className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40' },
  open:    { label: 'Choose your answer', className: 'bg-[#14F195]/15 text-[#14F195] border-[#14F195]/30' },
  closed:  { label: 'Closed', className: 'bg-secondary text-muted-foreground border-border' },
}

export function ArenaRoundClient({ roundId, initialData }: ArenaRoundClientProps) {
  const { publicKey } = useWallet()
  const [data, setData] = useState<ArenaRoundWithEntries>(initialData)
  const [refreshing, setRefreshing] = useState(false)

  const isCreator = !data.creator_wallet || publicKey?.toBase58() === data.creator_wallet

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/arena/${roundId}`)
      if (res.ok) setData(await res.json())
    } finally {
      setRefreshing(false)
    }
  }, [roundId])

  useEffect(() => {
    if (data.status !== 'running') return
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [data.status, refresh])

  // Sort by sol_earned desc, then by votes
  const sorted = [...data.entries].sort((a, b) => b.sol_earned - a.sol_earned || b.votes - a.votes)
  const cfg = statusConfig[data.status]
  const answeredCount = sorted.filter((e) => e.result && !e.error).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Badge className={`text-xs ${cfg.className}`}>
            {data.status === 'running' && <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />}
            {cfg.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDate(data.created_at)}</span>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="ml-auto p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-card"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <h1 className="text-xl font-bold text-foreground leading-snug">{data.query}</h1>

        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {data.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-5 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />{data.competitor_count} skills competing
          </span>
          {answeredCount > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />{answeredCount} answered
            </span>
          )}
          {data.total_sol_staked > 0 && (
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />{(data.total_sol_staked / 1e9).toFixed(4)} SOL paid out
            </span>
          )}
        </div>
      </div>

      {/* Running state */}
      {data.status === 'running' && sorted.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#9945FF] mx-auto" />
          <p className="text-muted-foreground">Skills are processing your query…</p>
          <p className="text-muted-foreground text-sm">This usually takes 5–30 seconds</p>
        </div>
      )}

      {/* How it works — only shown to the creator */}
      {data.status === 'open' && answeredCount > 0 && isCreator && (
        <div className="rounded-xl border border-[#9945FF]/20 bg-[#9945FF]/5 px-4 py-3 text-sm text-foreground space-y-1">
          <p className="font-semibold text-foreground">Choose the answer that helped you most</p>
          <p className="text-muted-foreground">
            Read all the answers below. If one helped you, pay for it — the SOL goes directly
            to that skill&apos;s creator. No payment required if none of them helped.
          </p>
        </div>
      )}

      {/* Non-creator view */}
      {data.status === 'open' && !isCreator && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          This is a private comparison. Connect the wallet that created this round to pay for an answer.
        </div>
      )}

      {/* Entries */}
      {sorted.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {data.status === 'running' ? 'Answers coming in…' : `${answeredCount} Answer${answeredCount !== 1 ? 's' : ''}`}
            </h2>
            <span className="text-xs text-muted-foreground">{sorted.length} skill{sorted.length !== 1 ? 's' : ''}</span>
          </div>
          {sorted.map((entry, i) => (
            <ArenaEntryCard
              key={entry.id}
              entry={entry}
              rank={i + 1}
              roundStatus={isCreator ? data.status : 'closed'}
              onPaid={refresh}
            />
          ))}
        </div>
      )}

      {/* Closed summary */}
      {data.status === 'closed' && sorted.length > 0 && sorted[0].sol_earned > 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
          <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">
            <Trophy className="w-4 h-4 inline mr-1" />Winner: {sorted[0].skill_name}
          </p>
          <p className="text-muted-foreground">
            Earned {(sorted[0].sol_earned / 1e9).toFixed(4)} SOL from {sorted[0].votes} payment{sorted[0].votes !== 1 ? 's' : ''}.
          </p>
        </div>
      )}
    </div>
  )
}
