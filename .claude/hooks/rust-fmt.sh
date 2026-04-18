#!/usr/bin/env bash
# SkillHive Marketplace — Rust Format Check (PostToolUse on Edit|Write, asyncRewake)
# Runs `cargo fmt --check` after editing .rs files in packages/contracts/.
# Exits 2 (asyncRewake) to wake the model if formatting issues are found.

set -uo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only run for Rust files inside packages/contracts/
if ! printf '%s' "$FILE" | grep -qE 'packages/contracts/.*\.rs$'; then
  exit 0
fi

ROOT="/Users/weiliang/Code/SkillHive-Marketplace"

# Skip gracefully if cargo not available or project not initialized
if ! command -v cargo &>/dev/null || [ ! -f "$ROOT/packages/contracts/Cargo.toml" ]; then
  exit 0
fi

FMT_OUTPUT=$(cd "$ROOT/packages/contracts" && cargo fmt --check 2>&1 | head -20)
FMT_EXIT=$?

if [ "$FMT_EXIT" -ne 0 ]; then
  jq -cn --arg out "$FMT_OUTPUT" \
    '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":("Rust formatting issues found — run `cargo fmt` in packages/contracts/ or fix manually:\n\n" + $out)}}'
  exit 2  # asyncRewake: wakes model to fix formatting
fi

exit 0
