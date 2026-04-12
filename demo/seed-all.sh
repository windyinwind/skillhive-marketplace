#!/usr/bin/env bash
# seed-all.sh — Register all 3 demo skills on SWARM Marketplace.
#
# Prerequisites:
#   - SWARM_MARKETPLACE_URL and AGENT_WALLET_KEYPAIR set in env or .env file
#   - pnpm installed, demo packages built
#
# Usage:
#   export SWARM_MARKETPLACE_URL=http://localhost:3000
#   export AGENT_WALLET_KEYPAIR=<base58-private-key>
#   bash demo/seed-all.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env from demo/ if present
if [ -f "$SCRIPT_DIR/.env" ]; then
  # shellcheck disable=SC1091
  set -a && source "$SCRIPT_DIR/.env" && set +a
fi

: "${SWARM_MARKETPLACE_URL:?SWARM_MARKETPLACE_URL is required}"
: "${AGENT_WALLET_KEYPAIR:?AGENT_WALLET_KEYPAIR is required}"

echo "====================================================="
echo " SWARM Marketplace — Demo Skill Seeder"
echo "====================================================="
echo " API URL : $SWARM_MARKETPLACE_URL"
echo "====================================================="

SKILLS=("skill-price-agent" "skill-news-agent" "skill-sentiment-agent")
FAILED=()

for skill in "${SKILLS[@]}"; do
  echo ""
  echo "--- $skill ---"
  seed_path="$SCRIPT_DIR/$skill"

  if [ ! -d "$seed_path" ]; then
    echo "  SKIP: $seed_path not found"
    continue
  fi

  if pnpm --dir "$seed_path" seed 2>&1; then
    echo "  OK: $skill registered"
  else
    echo "  FAILED: $skill"
    FAILED+=("$skill")
  fi
done

echo ""
echo "====================================================="
if [ ${#FAILED[@]} -eq 0 ]; then
  echo " All skills registered successfully."
else
  echo " Failed skills: ${FAILED[*]}"
  exit 1
fi
echo "====================================================="
