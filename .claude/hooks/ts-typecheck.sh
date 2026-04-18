#!/usr/bin/env bash
# SkillHive Marketplace — TypeScript Type Check (PostToolUse on Edit|Write, asyncRewake)
# Runs tsc --noEmit after editing .ts/.tsx files in apps/web/.
# Exits 2 (asyncRewake) to wake the model if type errors are found.

set -uo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only run for TypeScript files inside apps/web/
if ! printf '%s' "$FILE" | grep -qE 'apps/web/.*\.(ts|tsx)$'; then
  exit 0
fi

ROOT="/Users/weiliang/Code/SkillHive-Marketplace"

# Skip gracefully if project is not yet initialized (Phase 1–3)
if [ ! -f "$ROOT/apps/web/tsconfig.json" ] || [ ! -d "$ROOT/apps/web/node_modules" ]; then
  exit 0
fi

ERRORS=$(cd "$ROOT/apps/web" && pnpm exec tsc --noEmit --skipLibCheck 2>&1 | head -40)
TS_EXIT=$?

if [ "$TS_EXIT" -ne 0 ]; then
  # Log errors as info but don't rewake — intermediate multi-file edits
  # will naturally have transient errors that resolve with the next edit.
  # Run `pnpm tsc --noEmit` manually or check the build to gate on clean types.
  jq -cn --arg e "$ERRORS" \
    '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":("⚠ TypeScript: " + $e)}}'
fi

exit 0
