import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { ArenaRoundClient } from './ArenaRoundClient'
import type { ArenaRoundWithEntries } from '@/app/arena/types'

interface PageProps {
  params: Promise<{ roundId: string }>
}

async function fetchRound(roundId: string): Promise<ArenaRoundWithEntries | null> {
  try {
    // Derive base URL from the incoming request host so port is always correct
    const hdrs = await headers()
    const host = hdrs.get('host') ?? 'localhost:3000'
    const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
    const res = await fetch(`${baseUrl}/api/arena/${roundId}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roundId } = await params
  const round = await fetchRound(roundId)
  if (!round) return { title: 'Round Not Found · SkillHive Arena' }
  const status = round.status === 'open' ? 'Open for voting' : round.status === 'running' ? 'Running' : 'Closed'
  return {
    title: `${round.query.slice(0, 60)} · SkillHive Arena`,
    description: `${status} · ${round.competitor_count} skills competing · ${round.total_votes} votes · ${(round.total_sol_staked / 1e9).toFixed(4)} SOL staked`,
    openGraph: {
      title: `SkillHive Arena: ${round.query.slice(0, 60)}`,
      description: `${round.competitor_count} AI skills competing. ${round.total_votes} community votes. ${(round.total_sol_staked / 1e9).toFixed(4)} SOL at stake.`,
    },
  }
}

export default async function ArenaRoundPage({ params }: PageProps) {
  const { roundId } = await params
  const round = await fetchRound(roundId)
  if (!round) notFound()

  return <ArenaRoundClient roundId={roundId} initialData={round} />
}
