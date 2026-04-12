#!/usr/bin/env bash
# SWARM Marketplace — Security Guard (PreToolUse on Edit|Write)
# Blocks 3 critical violations from CLAUDE.md before they're written to disk.
# Exits 0 with deny decision JSON to block; exits 0 silently to allow.

set -uo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')
CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // ""')

deny() {
  jq -cn --arg r "$1" \
    '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$r}}'
  exit 0
}

# ── Guard 1: SERVICE_ROLE key with NEXT_PUBLIC_ prefix ───────────────────────
# CLAUDE.md rule #1: Never put SUPABASE_SERVICE_ROLE_KEY in any NEXT_PUBLIC_* var.
if printf '%s' "$CONTENT" | grep -qE 'NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE'; then
  deny "SECURITY VIOLATION [Guard 1] — Service role key with NEXT_PUBLIC_ prefix detected. This exposes the key to the browser/client bundle. Per CLAUDE.md: SUPABASE_SERVICE_ROLE_KEY must never have a NEXT_PUBLIC_ prefix. Use server-side env vars only."
fi

# ── Guard 2: endpoint field in on-chain SkillAccount (Rust/Anchor) ───────────
# CLAUDE.md: SkillAccount on Solana has NO endpoint field — anyone calling
# getProgramAccounts can read all on-chain fields and bypass payment entirely.
if printf '%s' "$FILE" | grep -qE 'packages/contracts/.*\.rs$'; then
  if printf '%s' "$CONTENT" | grep -qE 'pub\s+endpoint\s*:'; then
    deny "SECURITY VIOLATION [Guard 2] — 'endpoint' field detected in on-chain Rust struct in $(basename "$FILE"). Per CLAUDE.md: SkillAccount must have NO endpoint field. Competitors can call getProgramAccounts to read it and bypass payment. Store endpoints in Supabase only (service role key)."
  fi
fi

# ── Guard 3: endpoint/system_prompt/tool_config in API response ──────────────
# CLAUDE.md rules #2–#4: These fields must never appear in any API response.
# Check files inside the web API routes directory.
if printf '%s' "$FILE" | grep -qE 'apps/web/(src/)?(app|pages)/api/'; then
  for field in endpoint system_prompt tool_config; do
    # Matches: leading `field:`, or `{field:`, or `,field:` (object key patterns)
    if printf '%s' "$CONTENT" | grep -qE "(^\s*${field}\s*:|[{,]\s*${field}\s*:)"; then
      deny "SECURITY VIOLATION [Guard 3] — '${field}' field detected as an object key in API route '$(basename "$FILE")'. Per CLAUDE.md rule #2: endpoint, system_prompt, and tool_config must never be returned to the browser. Use the skills_public view for browser-facing queries — it explicitly excludes these fields."
    fi
  done
fi

# ── Guard 4: select('*') in API routes — wildcard would return endpoint ───────
# A Supabase .select('*') in an API route accidentally returns all columns,
# including the private endpoint/system_prompt/tool_config fields.
if printf '%s' "$FILE" | grep -qE 'apps/web/(src/)?(app|pages)/api/'; then
  if printf '%s' "$CONTENT" | grep -qE "\.select\s*\(\s*['\"]?\*['\"]?\s*\)"; then
    deny "SECURITY VIOLATION [Guard 4] — .select('*') detected in API route '$(basename "$FILE")'. Wildcard select returns all Supabase columns including private 'endpoint', 'system_prompt', and 'tool_config'. Use explicit column names or query the skills_public view instead."
  fi
fi

# ── Guard 5: supabaseServiceRole used outside server API routes ──────────────
# The service role client bypasses RLS and must only exist in /api/ routes.
# Using it in components, pages, or lib files risks it being bundled for the browser.
if ! printf '%s' "$FILE" | grep -qE 'apps/web/(src/)?(app|pages)/api/|apps/web/(src/)?lib/supabase'; then
  if printf '%s' "$CONTENT" | grep -qE 'supabaseServiceRole|createClient.*SERVICE_ROLE'; then
    deny "SECURITY VIOLATION [Guard 5] — supabaseServiceRole client detected in '$(basename "$FILE")'. The service role client bypasses Row-Level Security and must only be used inside server-side API routes (apps/web/app/api/ or apps/web/pages/api/). Never import it in components, pages, or client-side lib files."
  fi
fi

exit 0
