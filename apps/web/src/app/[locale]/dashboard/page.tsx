'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useWallet } from '@/hooks/useWalletAdapter'
import { useOpenFundingOptions } from '@dynamic-labs/sdk-react-core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Zap, Star, Wallet, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { lamportsToSol, truncateWallet, formatDate, reputationToStars } from '@/lib/format'
import { StarRating } from '@/components/StarRating'
import { useTranslations } from 'next-intl'
import bs58 from 'bs58'
import { toast } from '@/hooks/use-toast'

interface UnratedCall {
  call_id: string
  skill_id: string
  skill_name: string
  amount_lamports: number
  created_at: string
}

interface DashboardData {
  totalEarned: number
  totalSpent: number
  callCount: number
  skills: Array<{
    id: string
    name: string
    price_lamports: number
    reputation_score: number
    total_calls: number
    is_active: boolean
    tier: number
  }>
  recentCalls: Array<{
    call_id: string
    skill_id: string
    amount_lamports: number
    status: string
    tx_signature: string | null
    created_at: string
  }>
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const { publicKey, connected, openAuthModal, signMessage } = useWallet()
  const { openFundingOptions } = useOpenFundingOptions()
  const queryClient = useQueryClient()
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmSkill, setConfirmSkill] = useState<{ id: string; name: string; isActive: boolean } | null>(null)

  const toggleSkill = async (skillId: string) => {
    if (!publicKey || !signMessage || togglingId) return
    setConfirmSkill(null)
    setTogglingId(skillId)
    const skill = data?.skills.find((s) => s.id === skillId)
    const wasActive = skill?.is_active ?? true
    try {
      const nonce = Date.now()
      const sigBytes = await signMessage(new TextEncoder().encode(`${skillId}${nonce}`))
      const signature = bs58.encode(sigBytes)
      const res = await fetch(`/api/skills/${skillId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toBase58(), signature, nonce }),
      })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['dashboard', publicKey.toBase58()] })
        toast({
          variant: 'success',
          title: wasActive ? 'Skill paused' : 'Skill activated',
          description: wasActive
            ? 'Your skill is now hidden from the marketplace.'
            : 'Your skill is live and callable again.',
        })
      } else {
        toast({ variant: 'destructive', title: 'Toggle failed', description: 'Please try again.' })
      }
    } catch {
      toast({ variant: 'destructive', title: 'Cancelled', description: 'Wallet sign was cancelled.' })
    } finally {
      setTogglingId(null)
    }
  }

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', publicKey?.toBase58()],
    queryFn: () =>
      fetch(`/api/dashboard/${publicKey!.toBase58()}`).then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard')
        return r.json()
      }),
    enabled: !!publicKey,
  })

  const { data: unratedData, refetch: refetchUnrated } = useQuery<{ unratedCalls: UnratedCall[] }>({
    queryKey: ['unrated-calls', publicKey?.toBase58()],
    queryFn: () =>
      fetch(`/api/my-calls?wallet=${publicKey!.toBase58()}`).then((r) => {
        if (!r.ok) throw new Error('Failed to load calls')
        return r.json()
      }),
    enabled: !!publicKey,
  })

  if (!connected) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <Wallet className="mx-auto mb-4 h-10 w-10 text-[#9945FF]" />
          <h2 className="mb-2 font-heading text-xl font-bold text-foreground">{t('connectWallet')}</h2>
          <ul className="mb-6 space-y-2 text-left text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#14F195]" />
              Earn SOL every time someone calls your published skills
            </li>
            <li className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#9945FF]" />
              Track call history and monitor usage across all your skills
            </li>
            <li className="flex items-start gap-2">
              <Star className="mt-0.5 h-4 w-4 shrink-0 text-[#14F195]" />
              Manage, pause, or update your skills from one place
            </li>
          </ul>
          <button
            onClick={() => openAuthModal()}
            className="w-full rounded-lg bg-[#9945FF] py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF]"
          >
            Connect to get started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      {/* Pause / activate confirmation dialog */}
      <Dialog open={!!confirmSkill} onOpenChange={(open) => { if (!open) setConfirmSkill(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmSkill?.isActive ? 'Pause skill?' : 'Activate skill?'}
            </DialogTitle>
            <DialogDescription>
              {confirmSkill?.isActive
                ? `"${confirmSkill.name}" will be hidden from the marketplace and cannot be called until reactivated.`
                : `"${confirmSkill?.name}" will go live and be callable by anyone on the marketplace.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <button
              onClick={() => setConfirmSkill(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => confirmSkill && toggleSkill(confirmSkill.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all active:scale-[0.97] ${
                confirmSkill?.isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#9945FF] hover:bg-[#8535EF]'
              }`}
            >
              {confirmSkill?.isActive ? 'Yes, pause it' : 'Yes, activate it'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {truncateWallet(publicKey?.toBase58() ?? '')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {publicKey && (
            <button
              onClick={openFundingOptions}
              className="rounded-lg border border-[#9945FF]/40 px-4 py-2 text-sm font-semibold text-[#9945FF] transition-all active:scale-[0.97] hover:bg-[#9945FF]/10"
            >
              Top Up
            </button>
          )}
          <Link href="/create">
            <button className="rounded-lg bg-[#9945FF] px-4 py-2 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF]">
              {t('newSkill')}
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t('totalEarned'),
            value: isLoading ? '—' : `${lamportsToSol(data?.totalEarned ?? 0)} SOL`,
            icon: TrendingUp,
            color: 'text-[#14F195]',
          },
          {
            label: t('totalSpent'),
            value: isLoading ? '—' : `${lamportsToSol(data?.totalSpent ?? 0)} SOL`,
            icon: Wallet,
            color: 'text-[#9945FF]',
          },
          {
            label: t('totalCalls'),
            value: isLoading ? '—' : String(data?.callCount ?? 0),
            icon: Zap,
            color: 'text-[#9945FF]',
          },
          {
            label: t('activeSkills'),
            value: isLoading ? '—' : String(data?.skills?.filter((s) => s.is_active).length ?? 0),
            icon: Star,
            color: 'text-[#14F195]',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </div>
            <p className="mt-2 font-heading text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-7 w-24 bg-muted" /> : value}
            </p>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="mb-8">
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">{t('mySkills')}</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl bg-muted" />)}
          </div>
        ) : (data?.skills ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {t('noSkillsYet')}{' '}
            <Link href="/create" className="text-[#9945FF] hover:underline">
              {t('createFirstSkill')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.skills ?? []).map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-[#9945FF]/25"
              >
                <Link href={`/skill/${skill.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{skill.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lamportsToSol(skill.price_lamports)} SOL · {skill.total_calls} calls ·{' '}
                    {reputationToStars(skill.reputation_score).toFixed(1)}★
                  </p>
                </Link>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <button
                    onClick={(e) => { e.preventDefault(); setConfirmSkill({ id: skill.id, name: skill.name, isActive: skill.is_active }) }}
                    disabled={togglingId === skill.id}
                    title={skill.is_active ? 'Click to pause' : 'Click to activate'}
                    className={`rounded-md border px-2 py-0.5 text-xs transition-all hover:opacity-80 disabled:cursor-wait ${
                      skill.is_active
                        ? 'border-[#14F195]/30 bg-[#14F195]/10 text-[#14F195]'
                        : 'border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    {togglingId === skill.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : skill.is_active ? t('skillActive') : t('skillPaused')
                    }
                  </button>
                  <Link
                    href={`/skill/${skill.id}/edit`}
                    className="rounded-md border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-[#9945FF]/25 hover:text-[#9945FF]"
                  >
                    {t('editSkill')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending ratings */}
      {(unratedData?.unratedCalls ?? []).length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
            {t('rateYourCalls')}
            <span className="ml-2 rounded-full bg-[#9945FF]/20 px-2 py-0.5 text-xs text-[#9945FF]">
              {unratedData!.unratedCalls.length}
            </span>
          </h2>
          <div className="space-y-3">
            {unratedData!.unratedCalls.map((call) => (
              <div
                key={call.call_id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-medium text-foreground">{call.skill_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lamportsToSol(call.amount_lamports)} SOL · {formatDate(call.created_at)}
                  </p>
                </div>
                <StarRating
                  callId={call.call_id}
                  skillId={call.skill_id}
                  callerWallet={publicKey!.toBase58()}
                  size="sm"
                  onDone={() => refetchUnrated()}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent calls */}
      <div>
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">{t('recentCalls')}</h2>
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl bg-muted" />
        ) : (data?.recentCalls ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noCallsYet')}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t('tableCallId')}</th>
                  <th className="px-4 py-3 font-medium">{t('tableAmount')}</th>
                  <th className="px-4 py-3 font-medium">{t('tableStatus')}</th>
                  <th className="px-4 py-3 font-medium">{t('tableDate')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentCalls ?? []).map((call) => (
                  <tr key={call.call_id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {call.call_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#14F195]">
                      {lamportsToSol(call.amount_lamports)} SOL
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md border border-[#14F195]/30 bg-[#14F195]/10 px-2 py-0.5 text-xs text-[#14F195]">
                        {call.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(call.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
