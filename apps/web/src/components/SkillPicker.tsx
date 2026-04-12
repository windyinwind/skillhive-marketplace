'use client'

import { useState, useRef, useEffect } from 'react'
import { useSkills, type SkillPublic } from '@/hooks/useSkills'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { X, Search, Check } from 'lucide-react'

interface SkillPickerProps {
  selected: string[]
  onChange: (ids: string[]) => void
  max?: number
}

export function SkillPicker({ selected, onChange, max = 5 }: SkillPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useSkills({ search: query || undefined, limit: 20 })
  const skills = data?.skills ?? []

  // Ref-based cache: accumulates skill objects as they come in from the API.
  // Using a ref avoids triggering re-renders and breaks the setState→effect loop.
  const skillCache = useRef<Map<string, SkillPublic>>(new Map())
  skills.forEach((s) => skillCache.current.set(s.id, s))
  const selectedSkillObjects = selected
    .map((id) => skillCache.current.get(id))
    .filter((s): s is SkillPublic => s !== undefined)

  function toggle(skill: SkillPublic) {
    skillCache.current.set(skill.id, skill)
    if (selected.includes(skill.id)) {
      onChange(selected.filter((x) => x !== skill.id))
    } else if (selected.length < max) {
      onChange([...selected, skill.id])
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {/* Selected pills */}
      {selectedSkillObjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedSkillObjects.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs"
            >
              {s.name}
              <button
                type="button"
                onClick={() => toggle(s)}
                className="hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={selected.length >= max ? `Max ${max} skills selected` : 'Search skills by name or tag…'}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          disabled={selected.length >= max}
          className="pl-9 bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-violet-500"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-slate-500 text-sm text-center">Searching…</div>
          ) : skills.length === 0 ? (
            <div className="p-3 text-slate-500 text-sm text-center">No skills found</div>
          ) : (
            skills.map((skill) => {
              const isSelected = selected.includes(skill.id)
              const isDisabled = !isSelected && selected.length >= max
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => !isDisabled && toggle(skill)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800 cursor-pointer'
                  } ${isSelected ? 'bg-violet-900/20' : ''}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-slate-600'}`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-200 font-medium truncate">{skill.name}</span>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 flex-shrink-0">
                        Tier {skill.tier}
                      </Badge>
                    </div>
                    {(skill.tags ?? []).length > 0 && (
                      <div className="flex gap-1.5 mt-0.5">
                        {(skill.tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs text-slate-500">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex-shrink-0">
                    {((skill.price_lamports ?? 0) / 1e9).toFixed(4)} SOL
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {selected.length > 0 && (
        <p className="mt-1.5 text-xs text-slate-500">
          {selected.length} skill{selected.length !== 1 ? 's' : ''} selected
          {selected.length < max ? ` · ${max - selected.length} more allowed` : ' · max reached'}
        </p>
      )}
    </div>
  )
}
