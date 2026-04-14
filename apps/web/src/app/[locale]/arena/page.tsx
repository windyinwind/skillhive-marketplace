'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('arena')
  const router = useRouter()
  const { publicKey } = useWallet()

  const [query, setQuery] = useState('')
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('auto')
  const [sortMode, setSortMode] = useState<SortMode>('reputation')
  const [competitorCount, setCompetitorCount] = useState(3)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')

  const { data: feedData, isLoading: feedLoading } = useQuery<ArenaRoundsResponse>({
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

  const STATUS_FILTERS = [
    { value: 'open' as StatusFilter,    label: t('statusOpen') },
    { value: 'running' as StatusFilter, label: t('statusRunning') },
    { value: 'closed' as StatusFilter,  label: t('statusClosed') },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-medium">
          <Swords className="w-3.5 h-3.5" />
          {t('badge')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {t('subtitle')}
        </p>
      </div>

      {/* Problem form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t('questionLabel')}
          </label>
          <Textarea
            placeholder={t('questionPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            className="bg-background border-border text-foreground placeholder:text-muted-foreground resize-none focus:border-violet-500"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t('charsMinimum', { count: query.trim().length })}
          </p>
        </div>

        {/* Selection mode */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectionMode('auto')}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
              selectionMode === 'auto'
                ? 'border-violet-500/60 bg-violet-900/20'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectionMode === 'auto' ? 'text-violet-400' : 'text-muted-foreground'}`} />
            <div>
              <p className={`text-sm font-medium ${selectionMode === 'auto' ? 'text-violet-300' : 'text-foreground'}`}>
                {t('autoSelectTitle')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('autoSelectDesc')}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode('manual')}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
              selectionMode === 'manual'
                ? 'border-violet-500/60 bg-violet-900/20'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <List className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectionMode === 'manual' ? 'text-violet-400' : 'text-muted-foreground'}`} />
            <div>
              <p className={`text-sm font-medium ${selectionMode === 'manual' ? 'text-violet-300' : 'text-foreground'}`}>
                {t('pickSkillsTitle')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('pickSkillsDesc')}</p>
            </div>
          </button>
        </div>

        {/* Manual skill picker */}
        {selectionMode === 'manual' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('selectSkillsLabel')}
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
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {t('advancedOptions')}
        </button>

        {showAdvanced && selectionMode === 'auto' && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('sortByLabel')}</label>
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                <SelectTrigger className="bg-background border-border text-foreground text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="reputation">{t('sortReputation')}</SelectItem>
                  <SelectItem value="usage">{t('sortMostUsed')}</SelectItem>
                  <SelectItem value="cheapest">{t('sortCheapest')}</SelectItem>
                  <SelectItem value="newest">{t('sortNewest')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('competitorsLabel')}</label>
              <Select value={String(competitorCount)} onValueChange={(v) => setCompetitorCount(Number(v))}>
                <SelectTrigger className="bg-background border-border text-foreground text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="2">{t('skills2')}</SelectItem>
                  <SelectItem value="3">{t('skills3')}</SelectItem>
                  <SelectItem value="4">{t('skills4')}</SelectItem>
                  <SelectItem value="5">{t('skills5')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t('creating')}</>
          ) : (
            <><Swords className="w-4 h-4 mr-2" />{t('startRound')}</>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">{t('subsidy')}</p>
      </form>

      {/* Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('recentRounds')}</h2>
          <div className="flex gap-1">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === value
                    ? 'bg-[#9945FF] text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
          <div className="text-center py-12 text-muted-foreground">
            {t('noRoundsYet', { status: statusFilter })}{' '}
            {statusFilter === 'open' && t('beFirstToStart')}
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
