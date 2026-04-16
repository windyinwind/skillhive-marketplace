#!/usr/bin/env tsx
/**
 * seed-skills-sh.ts — Seed SkillHive from skills.sh
 *
 * Fetches top skills from skills.sh, downloads each SKILL.md from GitHub,
 * and upserts them as Tier 1 Prompt skills in Supabase.
 *
 * Usage (from repo root):
 *   npx tsx scripts/seed-skills-sh.ts
 *   npx tsx scripts/seed-skills-sh.ts --pages 5   # fetch more pages (200/page)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ── Load .env.local ───────────────────────────────────────────────────────────
const envFile = path.resolve('apps/web/.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim()
    if (k && !process.env[k]) process.env[k] = v
  }
}

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SRK      = process.env.SUPABASE_SERVICE_ROLE_KEY!
const PLATFORM_WALLET   = process.env.NEXT_PUBLIC_PLATFORM_TREASURY!

if (!SUPABASE_URL || !SUPABASE_SRK || !PLATFORM_WALLET) {
  console.error('Missing env vars. Ensure apps/web/.env.local is populated.')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_SRK)

// ── CLI args ──────────────────────────────────────────────────────────────────
const pagesArg = process.argv.indexOf('--pages')
const MAX_PAGES = pagesArg !== -1 ? Number(process.argv[pagesArg + 1]) : 3
const CONCURRENCY = 4
const DELAY_MS = 150   // between GitHub fetches to avoid rate limiting

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShEntry { source: string; skillId: string; name: string; installs: number }
interface Parsed  {
  id: string; name: string; description: string; system_prompt: string
  tags: string[]; installs: number; source: string
}

// ── skills.sh paginated list ──────────────────────────────────────────────────
async function fetchPage(page: number): Promise<ShEntry[]> {
  try {
    const r = await fetch(`https://skills.sh/api/skills/all-time/${page}`)
    if (!r.ok) return []
    const d = await r.json() as { skills?: ShEntry[] }
    return d.skills ?? []
  } catch { return [] }
}

// ── GitHub SKILL.md — try several path conventions ───────────────────────────
const PATHS = [
  (src: string, id: string) => `https://raw.githubusercontent.com/${src}/main/skills/${id}/SKILL.md`,
  (src: string, id: string) => `https://raw.githubusercontent.com/${src}/main/${id}/SKILL.md`,
  (src: string, id: string) => `https://raw.githubusercontent.com/${src}/main/${id}.md`,
  (src: string, id: string) => `https://raw.githubusercontent.com/${src}/main/SKILL.md`,
]

async function fetchSkillMd(source: string, skillId: string): Promise<string | null> {
  for (const p of PATHS) {
    try {
      const r = await fetch(p(source, skillId))
      if (r.ok) {
        const t = await r.text()
        if (t.length > 80 && !t.startsWith('<!')) return t
      }
    } catch { /* try next */ }
    await sleep(DELAY_MS)
  }
  return null
}

// ── Parse SKILL.md frontmatter ────────────────────────────────────────────────
function parseFm(md: string): { name?: string; description: string; tags: string[] } {
  const m = md.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return { description: '', tags: [] }
  const fm   = m[1]
  const desc = (fm.match(/^description:\s*(.+)/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
  const name = (fm.match(/^name:\s*(.+)/m)?.[1] ?? '').trim() || undefined
  const tagLine = fm.match(/^tags:\s*\[(.+)\]/m)?.[1] ?? ''
  const tags = tagLine ? tagLine.split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')) : []
  return { description: desc, name, tags }
}

// ── Derive tags from name + description ──────────────────────────────────────
const STOP = new Set(['this','that','with','from','have','when','your','will','their',
  'about','which','create','build','generate','design','using','provides','skill'])

function deriveTags(name: string, desc: string, parsed: string[]): string[] {
  if (parsed.length > 0) return parsed.slice(0, 8)
  const fromName = name.toLowerCase().split(/[-_\s]+/).filter((w) => w.length > 2)
  const fromDesc = desc.toLowerCase().split(/\W+/).filter((w) => w.length > 4 && !STOP.has(w)).slice(0, 6)
  return [...new Set([...fromName, ...fromDesc])].slice(0, 8)
}

// ── Map installs → reputation_score (log scale, 200–1000) ────────────────────
function reputation(installs: number): number {
  if (installs <= 0) return 400
  return Math.min(1000, Math.max(200,
    Math.round(200 + (Math.log10(installs + 1) / Math.log10(1_000_000)) * 800)
  ))
}

// ── Process a batch in parallel ───────────────────────────────────────────────
async function processBatch(entries: ShEntry[]): Promise<Parsed[]> {
  const out: Parsed[] = []
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const slice = entries.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(slice.map(async (e) => {
      const md = await fetchSkillMd(e.source, e.skillId)
      if (!md) return null
      const { name: fmName, description, tags: fmTags } = parseFm(md)
      const name = fmName || e.name.replace(/-/g, ' ')
      const desc = description || `${name} — from ${e.source}`
      return {
        id:            `skillssh-${e.source.replace('/', '-')}-${e.skillId}`.slice(0, 80),
        name,
        description:   desc,
        system_prompt: md,
        tags:          deriveTags(e.name, desc, fmTags),
        installs:      e.installs,
        source:        e.source,
      } satisfies Parsed
    }))
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) out.push(r.value)
    }
    process.stdout.write(`\r  GitHub: ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length} fetched`)
  }
  console.log()
  return out
}

// ── Upsert into Supabase ──────────────────────────────────────────────────────
async function upsert(skills: Parsed[]): Promise<void> {
  const rows = skills.map((s) => ({
    id:               s.id,
    owner_wallet:     PLATFORM_WALLET,
    skill_type:       'prompt' as const,
    tier:             1,
    name:             s.name,
    description:      s.description,
    tags:             s.tags,
    price_lamports:   0,
    reputation_score: reputation(s.installs),
    total_calls:      s.installs,
    is_active:        true,
    system_prompt:    s.system_prompt,
    endpoint:         `/api/skill-executor/${s.id}`,
    provider_name:    s.source,
    long_description: `Published on skills.sh from ${s.source} with ${s.installs.toLocaleString()} installs.`,
  }))

  const BATCH = 50
  let ok = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await db.from('skills').upsert(batch, { onConflict: 'id' })
    if (error) console.error(`\n  ✗ batch ${i}:`, error.message)
    else { ok += batch.length; process.stdout.write(`\r  DB: ${ok}/${rows.length} upserted`) }
  }
  console.log()
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱  Seeding SkillHive from skills.sh (${MAX_PAGES} pages × 200 = up to ${MAX_PAGES * 200} skills)\n`)

  // 1. Collect list
  const all: ShEntry[] = []
  for (let p = 1; p <= MAX_PAGES; p++) {
    const page = await fetchPage(p)
    if (!page.length) break
    all.push(...page)
    console.log(`  Page ${p}: ${page.length} entries  (total: ${all.length})`)
    await sleep(400)
  }

  // Deduplicate
  const seen = new Set<string>()
  const unique = all.filter((e) => {
    const k = `${e.source}/${e.skillId}`
    return seen.has(k) ? false : (seen.add(k), true)
  })
  console.log(`\n  ${unique.length} unique skills to process`)

  // 2. Fetch SKILL.md
  console.log('\n  Fetching SKILL.md from GitHub…')
  const parsed = await processBatch(unique)
  console.log(`  ${parsed.length}/${unique.length} had parseable SKILL.md content`)

  // 3. Upsert
  console.log('\n  Upserting into Supabase…')
  await upsert(parsed)

  console.log(`\n✅  Done! ${parsed.length} skills seeded.\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
