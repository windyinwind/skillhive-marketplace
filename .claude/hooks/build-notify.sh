#!/usr/bin/env bash
# SkillHive Marketplace — Build/Deploy Notification (PostToolUse on Bash)
# Shows a systemMessage when anchor deploy, anchor build, or pnpm build completes.

set -uo pipefail

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')

# Only notify for significant build/deploy commands
if ! printf '%s' "$CMD" | grep -qE 'anchor (deploy|build|test)|pnpm (build|test)'; then
  exit 0
fi

EXIT_CODE=$(printf '%s' "$INPUT" | jq -r '.tool_response.exitCode // "0"')

if [ "$EXIT_CODE" = "0" ]; then
  jq -cn --arg cmd "$CMD" '{"systemMessage": ("Build/deploy succeeded: " + $cmd)}'
else
  jq -cn --arg cmd "$CMD" --arg code "$EXIT_CODE" '{"systemMessage": ("Build/deploy FAILED (exit " + $code + "): " + $cmd + " — review output above before proceeding")}'
fi

exit 0
