#!/usr/bin/env bash
# SkillHive Marketplace — Secret Scanner (PostToolUse on Edit|Write)
# Scans the written file for common hardcoded secret patterns.
# Outputs a systemMessage warning if secrets are detected (non-blocking).

set -uo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

# Skip if no file path or file does not exist
[ -z "$FILE" ] || [ ! -f "$FILE" ] && exit 0

# Skip .env files themselves (they're expected to have secrets) and lock files
if printf '%s' "$FILE" | grep -qE '(\.env|\.lock|node_modules|dist|\.next|target/)'; then
  exit 0
fi

HITS=""

# Pattern 1: Solana keypair bytes / base58 private keys assigned to a variable
MATCH=$(grep -nE "(const|let|var)\s+\w*(keypair|privateKey|secretKey|private_key)\w*\s*=\s*['\"][1-9A-HJ-NP-Za-km-z]{87,88}['\"]" "$FILE" 2>/dev/null | head -3)
[ -n "$MATCH" ] && HITS+="Possible Solana private key (base58):\n${MATCH}\n\n"

# Pattern 2: Generic long secret assigned inline (not from process.env / import.meta.env)
MATCH=$(grep -nE "(secret|api_key|apikey|auth_token|authtoken)\s*[=:]\s*['\"][a-zA-Z0-9_\-]{40,}['\"]" -i "$FILE" 2>/dev/null \
        | grep -vE 'process\.env|import\.meta\.env|placeholder|your_|example|REPLACE' \
        | head -3)
[ -n "$MATCH" ] && HITS+="Possible hardcoded secret/API key:\n${MATCH}\n\n"

# Pattern 3: Supabase JWT (service role or anon key) hardcoded as string literal
MATCH=$(grep -nE "['\"]eyJ[a-zA-Z0-9_\-]{80,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}['\"]" "$FILE" 2>/dev/null | head -3)
[ -n "$MATCH" ] && HITS+="Possible hardcoded JWT (Supabase service role or anon key):\n${MATCH}\n\n"

if [ -n "$HITS" ]; then
  MSG="SECRET SCAN — potential secrets in $(basename "$FILE"):\n\n${HITS}Move all secrets to apps/web/.env.local and access via process.env. Never commit .env.local."
  jq -cn --arg m "$MSG" '{"systemMessage": $m}'
fi

exit 0
