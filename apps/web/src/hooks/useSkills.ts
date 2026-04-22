'use client'

import { useQuery } from '@tanstack/react-query'

export interface SkillPublic {
  id: string
  owner_wallet: string
  skill_type: 'prompt' | 'tool' | 'custom_agent'
  tier: 1 | 2 | 3
  name: string
  description: string | null
  tags: string[] | null
  price_lamports: number
  reputation_score: number
  total_calls: number
  rating_count: number
  rating_avg: number
  is_active: boolean
  created_at: string | null
  logo_url: string | null
  provider_name: string | null
  long_description: string | null
  category: string | null
  is_featured: boolean
}

export interface SkillsResponse {
  skills: SkillPublic[]
  total: number
  page: number
  limit: number
}

export interface SkillFilters {
  tag?: string
  skillType?: string
  minReputation?: number
  maxPrice?: number
  search?: string
  category?: string
  isFeatured?: boolean
  page?: number
  limit?: number
}

function buildParams(filters: SkillFilters): string {
  const p = new URLSearchParams()
  if (filters.tag) p.set('tag', filters.tag)
  if (filters.skillType) p.set('skillType', filters.skillType)
  if (filters.minReputation) p.set('minReputation', String(filters.minReputation))
  if (filters.maxPrice) p.set('maxPrice', String(filters.maxPrice))
  if (filters.search) p.set('search', filters.search)
  if (filters.category) p.set('category', filters.category)
  if (filters.isFeatured) p.set('isFeatured', 'true')
  if (filters.page) p.set('page', String(filters.page))
  if (filters.limit) p.set('limit', String(filters.limit))
  return p.toString()
}

export function useSkills(filters: SkillFilters = {}) {
  return useQuery<SkillsResponse>({
    queryKey: ['skills', filters],
    queryFn: () =>
      fetch(`/api/skills?${buildParams(filters)}`).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch skills')
        return r.json()
      }),
    staleTime: 30_000,
  })
}

export function useSkill(id: string) {
  return useQuery<SkillPublic & { recentCalls: number; avgRating: number | null }>({
    queryKey: ['skill', id],
    queryFn: () =>
      fetch(`/api/skills/${id}`).then((r) => {
        if (!r.ok) throw new Error('Skill not found')
        return r.json()
      }),
    enabled: !!id,
  })
}

export function useSolPrice() {
  return useQuery<{ solUsd: number | null; timestamp: number }>({
    queryKey: ['sol-usd'],
    queryFn: () => fetch('/api/pyth/sol-usd').then((r) => {
      if (!r.ok) throw new Error('Failed to fetch SOL price')
      return r.json()
    }),
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}
