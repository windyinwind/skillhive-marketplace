import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { SkillDetailClient } from '@/components/skill/SkillDetailClient'

interface Props {
  params: Promise<{ locale: string; id: string }>
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
    return { title: 'Skill not found — SkillHive Marketplace' }
  }

  const title = `${skill.name} — SkillHive Marketplace`
  const description = skill.description ?? 'An AI skill available on the SkillHive Marketplace on Solana.'
  const priceSOL = skill.price_lamports ? (skill.price_lamports / 1e9).toFixed(4) : '0'

  return {
    title,
    description,
    openGraph: {
      title,
      description: `${description} · ${priceSOL} SOL per call`,
      type: 'website',
      siteName: 'SkillHive Marketplace',
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
