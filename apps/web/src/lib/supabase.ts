import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singletons — clients are created on first use, not at module load time.
// This prevents "supabaseUrl is required" errors during Next.js build-time
// static analysis when env vars are not present.

let _anon: SupabaseClient | null = null
let _serviceRole: SupabaseClient | null = null

// Strip whitespace and reject anything after a newline — guards against env-var
// paste mistakes (e.g. another `KEY=value` line appended to a Supabase JWT)
// that would otherwise propagate as an invalid HTTP header at request time.
function cleanEnvKey(name: string, raw: string | undefined): string {
  if (!raw) {
    throw new Error(`[supabase] ${name} is not set`)
  }
  const firstLine = raw.split('\n')[0].trim()
  if (firstLine !== raw.trim()) {
    console.warn(`[supabase] ${name} contained a newline — using first line only. Fix the env var.`)
  }
  return firstLine
}

// ── Browser-safe client (RLS enforced, anon key) ──────────────────────────────
// Use for all browser-side queries. Always query skills_public view, never skills.
export function getSupabaseAnon(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(
      cleanEnvKey('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
      cleanEnvKey('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    )
  }
  return _anon
}

// ── Server-side only client (bypasses RLS, service role key) ─────────────────
// ONLY call this in /api/ routes. Never in components, pages, or client code.
// Use for: endpoint lookups, system_prompt reads, internal writes.
export function getSupabaseServiceRole(): SupabaseClient {
  if (!_serviceRole) {
    _serviceRole = createClient(
      cleanEnvKey('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
      cleanEnvKey('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return _serviceRole
}

// Convenience re-exports for files that already use these names.
// These are getters so the client is still created lazily.
export const supabaseAnon = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const client = getSupabaseAnon()
    const val = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

export const supabaseServiceRole = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const client = getSupabaseServiceRole()
    const val = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})
