'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RoundCard } from '@/components/RoundCard'
import { SkillPicker } from '@/components/SkillPicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Swords, Sparkles, List, ChevronDown, ChevronUp } from 'lucide-react'

type SelectionMode = 'auto' | 'manual'
type SortMode = 'reputation' | 'usage' | 'cheapest' | 'newest'
type StatusFilter = 'open' | 'running' | 'closed'

interface ArenaRoundsResponse {
  rounds: Array<{
    id: string
    query: string
    tags: string[] | null
    status: 'running' | 'open' | 'closed'
    competitor_count: number
    created_at: string
    total_sol_staked: number
    total_votes: number
    entry_count: number
  }>
  total: number
  page: number
  limit: number
}

export default function ArenaPage() {
  const router = useRouter()
  const { publicKey } = useWallet()

  // Form state
  const [query, setQuery] = useState('')
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('auto')
  const [sortMode, setSortMode] = useState<SortMode>('reputation')
  const [competitorCount, setCompetitorCount] = useState(3)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Feed state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')

  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useQuery<ArenaRoundsResponse>({
    queryKey: ['arena-rounds', statusFilter],
    queryFn: () => fetch(`/api/arena?status=${statusFilter}&limit=20`).then((r) => r.json()),
    refetchInterval: 10_000,
  })

  const canSubmit = query.trim().length >= 10 && (
    selectionMode === 'auto' || selectedSkillIds.length >= 2
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/arena/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          selectionMode,
          skillIds: selectionMode === 'manual' ? selectedSkillIds : undefined,
          sortMode,
          competitorCount,
          creatorWallet: publicKey?.toBase58(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create round')
      router.push(`/arena/${data.roundId}`)
    } catch (err) {
      setSubmitError((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-medium">
          <Swords className="w-3.5 h-3.5" />
          Skill Arena
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-100">
          Get multiple AI answers, pay for the best one
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          Ask once. Multiple skills answer in parallel for free. Read them all, then pay only for the answer that actually helped you — SOL goes directly to that skill&apos;s creator.
        </p>
      </div>

      {/* Problem form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Your problem or question
          </label>
          <Textarea
            placeholder="e.g. Analyze the risk/reward of buying NVIDIA stock this week given current macro conditions and recent earnings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            className="bg-slate-900/60 border-slate-700 text-slate-200 placeholder:text-slate-600 resize-none focus:border-violet-500"
          />
          <p className="mt-1 text-xs text-slate-600">{query.trim().length} / 10 chars minimum</p>
        </div>

        {/* Selection mode */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectionMode('auto')}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
              selectionMode === 'auto'
                ? 'border-violet-500/60 bg-violet-900/20'
                : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
            }`}
          >
            <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectionMode === 'auto' ? 'text-violet-400' : 'text-slate-500'}`} />
            <div>
              <p className={`text-sm font-medium ${selectionMode === 'auto' ? 'text-violet-300' : 'text-slate-300'}`}>
                Auto-select
              </p>
              <p className="text-xs text-slate-500 mt-0.5">AI picks the best skills for your query</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode('manual')}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
              selectionMode === 'manual'
                ? 'border-violet-500/60 bg-violet-900/20'
                : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
            }`}
          >
            <List className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectionMode === 'manual' ? 'text-violet-400' : 'text-slate-500'}`} />
            <div>
              <p className={`text-sm font-medium ${selectionMode === 'manual' ? 'text-violet-300' : 'text-slate-300'}`}>
                Pick skills
              </p>
              <p className="text-xs text-slate-500 mt-0.5">You choose which skills compete</p>
            </div>
          </button>
        </div>

        {/* Manual skill picker */}
        {selectionMode === 'manual' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Select 2–5 skills to compete
            </label>
            <SkillPicker
              selected={selectedSkillIds}
              onChange={setSelectedSkillIds}
              max={5}
            />
          </div>
        )}

        {/* Advanced options toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Advanced options
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            {selectionMode === 'auto' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Sort by</label>
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-300 text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="reputation">Reputation</SelectItem>
                      <SelectItem value="usage">Most Used</SelectItem>
                      <SelectItem value="cheapest">Cheapest</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Competitors</label>
                  <Select value={String(competitorCount)} onValueChange={(v) => setCompetitorCount(Number(v))}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-300 text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="2">2 skills</SelectItem>
                      <SelectItem value="3">3 skills</SelectItem>
                      <SelectItem value="4">4 skills</SelectItem>
                      <SelectItem value="5">5 skills</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        {submitError && (
          <p className="text-sm text-red-400 bg-red-900/10 border border-red-800/30 rounded-lg px-3 py-2">
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold h-11"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating round…</>
          ) : (
            <><Swords className="w-4 h-4 mr-2" />Start Arena Round</>
          )}
        </Button>

        <p className="text-xs text-center text-slate-600">
          Skill calls are platform-subsidized. You only pay SOL if an answer genuinely helps you.
        </p>
      </form>

      {/* Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Recent Rounds</h2>
          <div className="flex gap-1">
            {([
              { value: 'open',    label: 'Awaiting payment' },
              { value: 'running', label: 'Running' },
              { value: 'closed',  label: 'Closed' },
            ] as { value: StatusFilter; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === value
                    ? 'bg-[#9945FF] text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {feedLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto" />
          </div>
        ) : !feedData?.rounds.length ? (
          <div className="text-center py-12 text-slate-500">
            No {statusFilter} rounds yet.{' '}
            {statusFilter === 'open' && 'Be the first to start one above!'}
          </div>
        ) : (
          <div className="space-y-3">
            {feedData.rounds.map((round) => (
              <RoundCard key={round.id} {...round} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
