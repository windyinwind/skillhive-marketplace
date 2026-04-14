'use client'

import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Zap, Star } from 'lucide-react'
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

export default function DashboardPage() {
  const { publicKey, connected } = useWallet()

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
      <div className="mx-auto max-w-[1200px] px-4 py-20 text-center sm:px-6">
        <p className="text-muted-foreground">Connect your wallet to view your dashboard.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {truncateWallet(publicKey?.toBase58() ?? '')}
          </p>
        </div>
        <Link href="/create">
          <button className="rounded-lg bg-[#9945FF] px-4 py-2 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF]">
            + New Skill
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total Earned',
            value: isLoading ? '—' : `${lamportsToSol(data?.totalEarned ?? 0)} SOL`,
            icon: TrendingUp,
            color: 'text-[#14F195]',
          },
          {
            label: 'Total Calls',
            value: isLoading ? '—' : String(data?.callCount ?? 0),
            icon: Zap,
            color: 'text-[#9945FF]',
          },
          {
            label: 'Active Skills',
            value: isLoading ? '—' : String(data?.skills?.filter((s) => s.is_active).length ?? 0),
            icon: Star,
            color: 'text-[#14F195]',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className={`flex items-center gap-2 text-sm text-muted-foreground`}>
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </div>
            <p className="mt-2 font-heading text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-7 w-24 bg-secondary" /> : value}
            </p>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="mb-8">
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">My Skills</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl bg-card" />)}
          </div>
        ) : (data?.skills ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No skills yet.{' '}
            <Link href="/create" className="text-[#9945FF] hover:underline">
              Create your first skill
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.skills ?? []).map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-[#9945FF40]"
              >
                <Link href={`/skill/${skill.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{skill.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lamportsToSol(skill.price_lamports)} SOL · {skill.total_calls} calls ·{' '}
                    {reputationToStars(skill.reputation_score).toFixed(1)}★
                  </p>
                </Link>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs ${
                      skill.is_active
                        ? 'border-[#14F195]/30 bg-[#14F195]/10 text-[#14F195]'
                        : 'border-border bg-secondary text-muted-foreground'
                    }`}
                  >
                    {skill.is_active ? 'Active' : 'Paused'}
                  </span>
                  <Link
                    href={`/skill/${skill.id}/edit`}
                    className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-[#9945FF40] hover:text-[#9945FF]"
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
        <div className="mb-8">
          <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
            Rate Your Calls
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
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">Recent Calls</h2>
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl bg-card" />
        ) : (data?.recentCalls ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No calls yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Call ID</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
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
