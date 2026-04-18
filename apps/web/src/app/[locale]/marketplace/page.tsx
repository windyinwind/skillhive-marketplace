'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, SearchX } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillCard } from '@/components/SkillCard'
import { useSkills } from '@/hooks/useSkills'
import { useDebounce } from '@/hooks/useDebounce'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-xl bg-card" />
      ))}
    </div>
  )
}

export default function MarketplacePage() {
  const t = useTranslations('marketplace')
  const [search, setSearch] = useState('')
  const [skillType, setSkillType] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isError } = useSkills({
    search: debouncedSearch || undefined,
    skillType: skillType || undefined,
    page,
    limit: 18,
  })

  const { data: featuredData } = useSkills({ limit: 3 })

  const skills = data?.skills ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 18)
  const featuredSkills = featuredData?.skills ?? []
  const isFiltered = !!debouncedSearch || !!skillType

  const SKILL_TYPES = [
    { value: '', label: t('filterAll') },
    { value: 'prompt', label: t('filterPrompt') },
    { value: 'tool', label: t('filterTool') },
    { value: 'custom_agent', label: t('filterAgent') },
  ]

  const QUICK_CATEGORIES = [
    { label: t('categoryFinance'), query: 'finance' },
    { label: t('categoryResearch'), query: 'research' },
    { label: t('categoryCode'), query: 'code' },
    { label: t('categoryWriting'), query: 'writing' },
    { label: t('categoryData'), query: 'data' },
    { label: t('categoryImage'), query: 'image' },
  ]

  const handleCategoryClick = (query: string) => {
    setSearch(query)
    setPage(1)
    setSkillType('')
  }

  const clearFilters = () => {
    setSearch('')
    setSkillType('')
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">

      {/* Page header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {total > 0
              ? t('subtitleCount', { count: total.toLocaleString() })
              : t('subtitleDefault')}
          </p>
        </div>
        <Link href="/create" className="hidden sm:block">
          <button className="rounded-lg border border-border bg-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[#9945FF]/25 hover:text-foreground">
            {t('publishSkill')}
          </button>
        </Link>
      </div>

      {/* Featured strip */}
      {!isFiltered && featuredSkills.length > 0 && (
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {t('featured')}
            </h2>
            <button
              onClick={() => setSkillType('')}
              className="text-xs text-[#9945FF] transition-opacity hover:opacity-80"
            >
              {t('seeAll')}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {featuredSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} featured />
            ))}
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[#9945FF] focus:ring-1 focus:ring-[#9945FF]"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex gap-1.5">
            {SKILL_TYPES.map((st) => (
              <button
                key={st.value}
                onClick={() => { setSkillType(st.value); setPage(1) }}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  skillType === st.value
                    ? 'border-[#9945FF] bg-[#9945FF]/10 text-[#9945FF]'
                    : 'border-border bg-card text-muted-foreground hover:border-[#9945FF]/25 hover:text-foreground'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick category pills */}
      {!isFiltered && (
        <div className="mb-6 flex flex-wrap gap-2">
          {QUICK_CATEGORIES.map(({ label, query }) => (
            <button
              key={label}
              onClick={() => handleCategoryClick(query)}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-all hover:border-[#9945FF]/25 hover:text-foreground"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Active filter summary */}
      {isFiltered && (
        <div className="mb-4 flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? t(total !== 1 ? 'resultCountPlural' : 'resultCount', { count: total })
              : t('noResults')}
            {debouncedSearch ? ' ' + t('forQuery', { query: debouncedSearch }) : ''}
            {skillType ? ` · ${SKILL_TYPES.find((st) => st.value === skillType)?.label}` : ''}
          </p>
          <button
            onClick={clearFilters}
            className="text-xs text-[#9945FF] transition-opacity hover:opacity-80"
          >
            {t('clearFilters')}
          </button>
        </div>
      )}

      {/* Section label when filtered */}
      {isFiltered && (
        <div className="mb-4">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t('results')}
          </h2>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid />
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center">
          <p className="text-muted-foreground">{t('failedToLoad')}</p>
          <button onClick={() => setPage(1)} className="mt-3 text-sm text-[#9945FF] transition-opacity hover:opacity-80">
            {t('retry')}
          </button>
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center">
          <SearchX className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-foreground">{t('noSkillsMatch')}</p>
          {debouncedSearch && (
            <p className="mt-1 text-sm text-muted-foreground">
              No results for <span className="font-medium text-foreground">&ldquo;{debouncedSearch}&rdquo;</span>
            </p>
          )}
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm text-[#9945FF] transition-colors hover:border-[#9945FF]/25"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-[#9945FF]/25 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('previous')}
          </button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-[#9945FF]/25 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('next')}
          </button>
        </div>
      )}

      {/* Creator callout */}
      <div className="mt-16 rounded-xl border border-border bg-card p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">{t('creatorCalloutTitle')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('creatorCalloutDesc')}</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link href="/create">
              <button className="rounded-lg bg-[#9945FF] px-5 py-2 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF]">
                {t('publishSkillBtn')}
              </button>
            </Link>
            <Link href="/register">
              <button className="rounded-lg border border-border bg-transparent px-5 py-2 text-sm text-muted-foreground transition-colors hover:border-[#9945FF]/25 hover:text-foreground">
                {t('registerAgentBtn')}
              </button>
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
