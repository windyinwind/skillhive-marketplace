'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/hooks/useWalletAdapter'
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
import { Loader2, Swords, Sparkles, List, ChevronDown, ChevronUp, DollarSign, Zap, Shield } from 'lucide-react'
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

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'open',    label: t('statusOpen') },
    { value: 'running', label: t('statusRunning') },
    { value: 'closed',  label: t('statusClosed') },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-12">

      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 px-3 py-1 text-xs font-medium text-[#9945FF]">
          <Swords className="w-3.5 h-3.5" />
          {t('badge')}
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
          {t('subtitle')}
        </p>

        {/* How it works — 3 pillars */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-2">
          {[
            { icon: Sparkles, label: 'Multiple skills answer', sub: 'in parallel' },
            { icon: DollarSign, label: 'Pay only for the best', sub: 'answer' },
            { icon: Shield,  label: 'SOL goes directly', sub: 'to the creator' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="rounded-xl border border-border bg-card px-3 py-4 text-center">
              <Icon className="h-4 w-4 text-[#9945FF] mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create round form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="font-heading text-base font-semibold text-foreground">Start a new round</h2>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('questionLabel')}
          </label>
          <Textarea
            placeholder={t('questionPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            className="bg-background border-border text-foreground placeholder:text-muted-foreground resize-none focus:border-[#9945FF] focus:ring-[#9945FF]"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t('charsMinimum', { count: query.trim().length })}
          </p>
        </div>

        {/* Selection mode */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              mode: 'auto' as SelectionMode,
              icon: Sparkles,
              title: t('autoSelectTitle'),
              desc: t('autoSelectDesc'),
            },
            {
              mode: 'manual' as SelectionMode,
              icon: List,
              title: t('pickSkillsTitle'),
              desc: t('pickSkillsDesc'),
            },
          ].map(({ mode, icon: Icon, title, desc }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectionMode(mode)}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                selectionMode === mode
                  ? 'border-[#9945FF]/60 bg-[#9945FF]/10'
                  : 'border-border bg-background hover:border-[#9945FF]/20'
              }`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${selectionMode === mode ? 'text-[#9945FF]' : 'text-muted-foreground'}`} />
              <div>
                <p className={`text-sm font-medium ${selectionMode === mode ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Manual skill picker */}
        {selectionMode === 'manual' && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('selectSkillsLabel')}
            </label>
            <SkillPicker selected={selectedSkillIds} onChange={setSelectedSkillIds} max={5} />
          </div>
        )}

        {/* Advanced options */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {t('advancedOptions')}
        </button>

        {showAdvanced && selectionMode === 'auto' && (
          <div className="grid grid-cols-2 gap-4">
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
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full bg-[#9945FF] hover:bg-[#8535EF] text-white font-semibold h-11"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t('creating')}</>
          ) : (
            <><Swords className="w-4 h-4 mr-2" />{t('startRound')}</>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {t('subsidy')}
        </p>
      </form>

      {/* Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-foreground">{t('recentRounds')}</h2>
          <div className="flex gap-1">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === value
                    ? 'bg-[#9945FF] text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card border border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {feedLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#9945FF]" />
          </div>
        ) : !feedData?.rounds.length ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center">
            <Swords className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {t('noRoundsYet', { status: statusFilter })}
            </p>
            {statusFilter === 'open' && (
              <p className="text-xs text-muted-foreground mt-1">{t('beFirstToStart')}</p>
            )}
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
