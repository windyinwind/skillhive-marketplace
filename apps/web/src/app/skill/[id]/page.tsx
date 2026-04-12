import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { SkillDetailClient } from './SkillDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

async function fetchSkillMeta(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('skills_public')
    .select('name, description, tags, price_lamports')
    .eq('id', id)
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const skill = await fetchSkillMeta(id)

  if (!skill) {
    return { title: 'Skill not found — SWARM Marketplace' }
  }

  const title = `${skill.name} — SWARM Marketplace`
  const description = skill.description ?? 'An AI skill available on the SWARM Marketplace on Solana.'
  const priceSOL = skill.price_lamports ? (skill.price_lamports / 1e9).toFixed(4) : '0'

  return {
    title,
    description,
    openGraph: {
      title,
      description: `${description} · ${priceSOL} SOL per call`,
      type: 'website',
      siteName: 'SWARM Marketplace',
    },
    twitter: {
      card: 'summary',
      title,
      description: `${description} · ${priceSOL} SOL per call`,
    },
    keywords: skill.tags ?? [],
  }
}

export default async function SkillDetailPage({ params }: Props) {
  const { id } = await params
  return <SkillDetailClient id={id} />
}
