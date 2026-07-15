#!/usr/bin/env bash
# One autopilot cycle for Money Flow
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

STASHED=0
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null || [[ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]]; then
  log "📦 stash local WIP"
  if git stash push -u -m "moneyflow-autopilot-$(date -u +%Y%m%dT%H%M%SZ)" --quiet 2>/dev/null; then
    STASHED=1
  fi
fi

git fetch origin main --quiet 2>/dev/null || true
git pull --rebase origin main --quiet 2>/dev/null || log "⚠️ pull skipped/failed"

log "📋 refill backlog if needed"
bash "$ROOT/scripts/agent-refill-backlog.sh" || true

log "🚀 headless agent"
if bash "$ROOT/scripts/agent-run-headless.sh"; then
  log "✅ cycle OK"
  echo "OK" >> "$STATE_FILE"
  tail -10 "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
  bash "$ROOT/scripts/agent-report-task.sh" ok || true
  # Ship notify
  if [[ -f "$ROOT/docs/MVP_SHIPPED.md" ]]; then
    bash "$ROOT/scripts/agent-telegram-notify.sh" ship "MoneyFlow · MVP SHIPPED" "docs/MVP_SHIPPED.md present — best-in-class bar met." || true
  fi
  [[ "$STASHED" == 1 ]] && git stash pop --quiet 2>/dev/null || true
  log "🏁 orchestrator done"
  exit 0
fi

log "❌ cycle FAIL"
echo "FAIL" >> "$STATE_FILE"
tail -10 "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
bash "$ROOT/scripts/agent-report-task.sh" fail || true
[[ "$STASHED" == 1 ]] && git stash pop --quiet 2>/dev/null || true
exit 1
