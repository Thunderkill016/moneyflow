#!/usr/bin/env bash
# One Grok autopilot cycle for MoneyFlow (IDEA.md R*/Q*)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs/agent"
STATE_FILE="$LOG_DIR/.orchestrator-state"
LOCKFILE="$LOG_DIR/.daemon.lock"
mkdir -p "$LOG_DIR"
export PATH="/home/thunder/.local/bin:${PATH}"
log() { echo "[$(date -Iseconds)] $*"; }

exec 9>"$LOCKFILE"
if ! flock -n 9; then
  log "⏳ Another orchestrator holds lock — skip"
  exit 2
fi

FAIL_COUNT=0
if [[ -f "$STATE_FILE" ]]; then
  FAIL_COUNT=$(tail -3 "$STATE_FILE" 2>/dev/null | grep -c '^FAIL$' || true)
fi
if [[ "${FAIL_COUNT:-0}" -ge 3 ]]; then
  log "⛔ Circuit breaker 3x FAIL — sleep 15m then reset"
  sleep 900
  rm -f "$STATE_FILE"
fi

cd "$ROOT"

BRANCH=$(git branch --show-current 2>/dev/null || echo main)
if [[ "$BRANCH" != "main" ]]; then
  log "⚠️ checkout main from $BRANCH"
  git checkout main 2>/dev/null || true
fi

# Dirty tree (except logs/) → skip. Never stash-destroy human/agent WIP.
DIRTY=$(git status --porcelain 2>/dev/null | grep -vE '^\?\? logs(/|$)' | grep -vE '^.. logs/' || true)
if [[ -n "${DIRTY}" ]]; then
  log "⏭️ dirty working tree (excluding logs/) — skip cycle to avoid stash thrash"
  echo "$DIRTY" | head -20 | while read -r line; do log "   $line"; done
  exit 0
fi

git fetch origin main --quiet 2>/dev/null || true
git pull --rebase origin main --quiet 2>/dev/null || log "⚠️ pull skipped/failed"

# Only refill backlog when IDEA has no open R*/Q* (avoid spam)
OPEN_IDEA=$(grep -cE '^- \[ \] \*\*(R|Q)[0-9]+' IDEA.md 2>/dev/null || true)
if [[ "${OPEN_IDEA:-0}" -eq 0 ]]; then
  log "📋 IDEA empty — optional backlog refill"
  bash "$ROOT/scripts/agent-refill-backlog.sh" || true
else
  log "📋 IDEA open items=$OPEN_IDEA — skip backlog refill"
fi

log "🚀 Grok headless agent"
if bash "$ROOT/scripts/agent-run-headless.sh"; then
  log "✅ cycle OK"
  echo "OK" >> "$STATE_FILE"
  tail -10 "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
  log "🏁 orchestrator done"
  exit 0
fi

log "❌ cycle FAIL"
echo "FAIL" >> "$STATE_FILE"
tail -10 "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
exit 1
