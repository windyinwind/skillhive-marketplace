'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Zap, Trophy } from 'lucide-react'
import { formatDate } from '@/lib/format'

interface RoundCardProps {
  id: string
  query: string
  tags: string[] | null
  status: 'running' | 'open' | 'closed'
  competitor_count: number
  created_at: string
  total_sol_staked: number
  total_votes: number
  entry_count: number
}

const statusConfig = {
  running: { label: 'Running', className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40' },
  open:    { label: 'Open for Voting', className: 'bg-[#14F195]/15 text-[#14F195] border-[#14F195]/30' },
  closed:  { label: 'Closed', className: 'bg-secondary text-muted-foreground border-border' },
}

export function RoundCard({
  id, query, tags, status, competitor_count,
  created_at, total_sol_staked, total_votes, entry_count,
}: RoundCardProps) {
  const cfg = statusConfig[status]

  return (
    <Link href={`/arena/${id}`}>
      <div className="group rounded-xl border border-border bg-card/40 hover:border-[#9945FF]/40 hover:bg-card/70 transition-all p-4 cursor-pointer">
        {/* Status + date */}
        <div className="flex items-center justify-between mb-2">
          <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
          <span className="text-xs text-muted-foreground">{formatDate(created_at)}</span>
        </div>

        {/* Query */}
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed mb-3 group-hover:text-[#9945FF] transition-colors">
          {query}
        </p>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-xs rounded bg-secondary text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {competitor_count} skill{competitor_count !== 1 ? 's' : ''}
          </span>
          {total_votes > 0 && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {total_votes} vote{total_votes !== 1 ? 's' : ''}
            </span>
          )}
          {total_sol_staked > 0 && (
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {(total_sol_staked / 1e9).toFixed(4)} SOL staked
            </span>
          )}
          {status === 'running' && entry_count < competitor_count && (
            <span className="flex items-center gap-1 text-blue-400">
              <Clock className="w-3 h-3 animate-spin" />
              Calling skills…
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
