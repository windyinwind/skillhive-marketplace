'use client'

import Link from 'next/link'
import { useWallet } from '@/hooks/useWalletAdapter'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Zap, Star, Plus, Wallet, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { lamportsToSol, truncateWallet, formatDate, reputationToStars } from '@/lib/format'
import { StarRating } from '@/components/StarRating'

interface UnratedCall {
  call_id: string
  skill_id: string
  skill_name: string
  amount_lamports: number
  created_at: string
}

interface DashboardData {
  totalEarned: number
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

function StatCard({ label, value, icon: Icon, color, loading }: {
  label: string
  value: string
  icon: React.ElementType
  color: string
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        {label}
      </div>
      {loading
        ? <Skeleton className="h-7 w-28 bg-secondary" />
        : <p className="font-heading text-2xl font-bold text-foreground">{value}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet()
  const { openAuthModal: setVisible } = useWallet()

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
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 flex flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#9945FF]/30 bg-[#9945FF]/10">
          <Wallet className="h-7 w-7 text-[#9945FF]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Connect your wallet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Your dashboard shows earnings, active skills, call history, and pending ratings.
          </p>
        </div>
        <button
          onClick={() => setVisible(true)}
          className="flex items-center gap-2 rounded-xl bg-[#9945FF] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97]"
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </button>
      </div>
    )
  }

  const activeSkillCount = (data?.skills ?? []).filter((s) => s.is_active).length

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {truncateWallet(publicKey?.toBase58() ?? '')}
          </p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-1.5 rounded-xl bg-[#9945FF] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97] shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Skill
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Earned"
          value={`${lamportsToSol(data?.totalEarned ?? 0)} SOL`}
          icon={TrendingUp}
          color="text-[#14F195]"
          loading={isLoading}
        />
        <StatCard
          label="Total Calls"
          value={String(data?.callCount ?? 0)}
          icon={Zap}
          color="text-[#9945FF]"
          loading={isLoading}
        />
        <StatCard
          label="Active Skills"
          value={String(activeSkillCount)}
          icon={Star}
          color="text-[#14F195]"
          loading={isLoading}
        />
      </div>

      {/* My Skills */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-foreground">My Skills</h2>
          <Link href="/create" className="text-xs text-[#9945FF] hover:underline">+ Add skill</Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl bg-card" />)}
          </div>
        ) : (data?.skills ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground text-sm">No skills yet.</p>
            <Link href="/create" className="mt-2 inline-block text-sm text-[#9945FF] hover:underline">
              Create your first skill →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.skills ?? []).map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-[#9945FF]/20"
              >
                <Link href={`/skill/${skill.id}`} className="flex-1 min-w-0 group">
                  <p className="font-medium text-foreground group-hover:text-[#9945FF] transition-colors">{skill.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lamportsToSol(skill.price_lamports)} SOL · {skill.total_calls} calls · {reputationToStars(skill.reputation_score).toFixed(1)}★
                  </p>
                </Link>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                    skill.is_active
                      ? 'border-[#14F195]/30 bg-[#14F195]/10 text-[#14F195]'
                      : 'border-border bg-secondary text-muted-foreground'
                  }`}>
                    {skill.is_active ? 'Active' : 'Paused'}
                  </span>
                  <Link
                    href={`/skill/${skill.id}/edit`}
                    className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-[#9945FF]/30 hover:text-[#9945FF]"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending ratings */}
      {(unratedData?.unratedCalls ?? []).length > 0 && (
        <div>
          <h2 className="mb-4 font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            Rate Your Calls
            <span className="rounded-full bg-[#9945FF]/20 px-2 py-0.5 text-xs text-[#9945FF] font-normal">
              {unratedData!.unratedCalls.length}
            </span>
          </h2>
          <div className="space-y-2">
            {unratedData!.unratedCalls.map((call) => (
              <div
                key={call.call_id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5"
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
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Recent Calls</h2>
        {isLoading ? (
          <Skeleton className="h-40 rounded-xl bg-card" />
        ) : (data?.recentCalls ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No calls yet. Try a skill on the <Link href="/marketplace" className="text-[#9945FF] hover:underline">marketplace</Link>.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Call ID</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium w-8" />
                </tr>
              </thead>
              <tbody>
                {(data?.recentCalls ?? []).map((call) => (
                  <tr key={call.call_id} className="border-b border-border/50 last:border-0 hover:bg-card/40 transition-colors">
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
                    <td className="px-4 py-3">
                      {call.tx_signature && (
                        <a
                          href={`https://explorer.solana.com/tx/${call.tx_signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-[#9945FF] transition-colors"
                          aria-label="View on Solana Explorer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provider CTA — only for users with no skills yet */}
      {!isLoading && (data?.skills ?? []).length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Start earning SOL</p>
            <p className="text-sm text-muted-foreground mt-0.5">Publish an AI skill — no server required for Tier 1. Live in under 5 minutes.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/create" className="rounded-xl bg-[#9945FF] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#8535EF] active:scale-[0.97]">
              Create Skill
            </Link>
            <Link href="/publish" className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#9945FF]/30 hover:text-foreground">
              Learn more
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
