'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillCard } from '@/components/SkillCard'
import { useSkills } from '@/hooks/useSkills'
import { useDebounce } from '@/hooks/useDebounce'
import Link from 'next/link'

const SKILL_TYPES = [
  { value: '', label: 'All skills' },
  { value: 'prompt', label: 'Prompt' },
  { value: 'tool', label: 'Tool' },
  { value: 'custom_agent', label: 'Agent' },
]

// Curated category shortcuts that set the search term — surface common entry points.
const QUICK_CATEGORIES = [
  { label: 'Finance', query: 'finance' },
  { label: 'Research', query: 'research' },
  { label: 'Code', query: 'code' },
  { label: 'Writing', query: 'writing' },
  { label: 'Data', query: 'data' },
  { label: 'Image', query: 'image' },
]

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-xl bg-[#161b27]" />
      ))}
    </div>
  )
}

export default function MarketplacePage() {
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

  // Featured slice: first 3 results when no filter is active (editorial top picks)
  const { data: featuredData } = useSkills({ limit: 3 })

  const skills = data?.skills ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 18)
  const featuredSkills = featuredData?.skills ?? []

  const isFiltered = !!debouncedSearch || !!skillType

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
          <h1 className="font-heading text-3xl font-bold text-[#F8FAFC]">Marketplace</h1>
          <p className="mt-1 text-[#8B9BB4]">
            {total > 0
              ? `${total.toLocaleString()} AI skills available on Solana`
              : 'Discover AI skills on Solana'}
          </p>
        </div>
        <Link href="/create" className="hidden sm:block">
          <button className="rounded-lg border border-[#2a3147] bg-transparent px-4 py-2 text-sm text-[#8B9BB4] transition-colors hover:border-[#9945FF]/25 hover:text-[#F8FAFC]">
            + Publish a skill
          </button>
        </Link>
      </div>

      {/* Featured strip — only when no active filter */}
      {!isFiltered && featuredSkills.length > 0 && (
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-[#4A5568]">
              Featured
            </h2>
            <button
              onClick={() => setSkillType('')}
              className="text-xs text-[#9945FF] transition-opacity hover:opacity-80"
            >
              See all
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5568]" />
          <input
            placeholder="Search by name, tag, or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-[#2a3147] bg-[#161b27] py-2 pl-9 pr-4 text-sm text-[#F8FAFC] placeholder:text-[#4A5568] outline-none transition-colors focus:border-[#9945FF] focus:ring-1 focus:ring-[#9945FF]"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#4A5568]" />
          <div className="flex gap-1.5">
            {SKILL_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setSkillType(t.value); setPage(1) }}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  skillType === t.value
                    ? 'border-[#9945FF] bg-[#9945FF]/10 text-[#9945FF]'
                    : 'border-[#2a3147] bg-[#161b27] text-[#8B9BB4] hover:border-[#9945FF]/25 hover:text-[#F8FAFC]'
                }`}
              >
                {t.label}
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
              className="rounded-full border border-[#2a3147] bg-[#161b27] px-3 py-1 text-xs text-[#8B9BB4] transition-all hover:border-[#9945FF]/25 hover:text-[#F8FAFC]"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Active filter summary */}
      {isFiltered && (
        <div className="mb-4 flex items-center gap-3">
          <p className="text-sm text-[#8B9BB4]">
            {total > 0 ? `${total} result${total !== 1 ? 's' : ''}` : 'No results'}
            {debouncedSearch ? ` for "${debouncedSearch}"` : ''}
            {skillType ? ` · ${SKILL_TYPES.find(t => t.value === skillType)?.label}` : ''}
          </p>
          <button
            onClick={clearFilters}
            className="text-xs text-[#9945FF] transition-opacity hover:opacity-80"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Section label when filtered */}
      {isFiltered && (
        <div className="mb-4">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-[#4A5568]">
            Results
          </h2>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid />
      ) : isError ? (
        <div className="rounded-xl border border-[#2a3147] bg-[#161b27] py-20 text-center">
          <p className="text-[#4A5568]">Failed to load skills.</p>
          <button
            onClick={() => setPage(1)}
            className="mt-3 text-sm text-[#9945FF] transition-opacity hover:opacity-80"
          >
            Retry
          </button>
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-[#2a3147] bg-[#161b27] py-20 text-center">
          <p className="text-[#4A5568]">No skills match your search.</p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-[#9945FF] transition-opacity hover:opacity-80"
          >
            Clear filters
          </button>
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
            className="rounded-lg border border-[#2a3147] bg-[#161b27] px-4 py-1.5 text-sm text-[#8B9BB4] transition-colors hover:border-[#9945FF]/25 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-[#8B9BB4]">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-[#2a3147] bg-[#161b27] px-4 py-1.5 text-sm text-[#8B9BB4] transition-colors hover:border-[#9945FF]/25 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Creator callout — bottom of page */}
      <div className="mt-16 rounded-xl border border-[#2a3147] bg-[#161b27] p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#F8FAFC]">Built something useful?</h3>
            <p className="mt-1 text-sm text-[#8B9BB4]">
              Publish your AI skill and earn SOL every time someone calls it.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link href="/create">
              <button className="rounded-lg bg-[#9945FF] px-5 py-2 text-sm font-semibold text-white transition-all active:scale-[0.97] hover:bg-[#8535EF]">
                Publish a Skill
              </button>
            </Link>
            <Link href="/register">
              <button className="rounded-lg border border-[#2a3147] bg-transparent px-5 py-2 text-sm text-[#8B9BB4] transition-colors hover:border-[#9945FF]/25 hover:text-[#F8FAFC]">
                Register Agent
              </button>
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
