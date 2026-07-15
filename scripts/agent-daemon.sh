#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs/agent"
PIDFILE="$LOG_DIR/.daemon.pid"
LOGFILE="$LOG_DIR/daemon.log"
mkdir -p "$LOG_DIR"
export PATH="/home/thunder/.local/bin:${PATH}"
log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOGFILE"; }

if [[ -f "$PIDFILE" ]]; then
  OLD=$(cat "$PIDFILE" 2>/dev/null || true)
  if [[ -n "$OLD" ]] && kill -0 "$OLD" 2>/dev/null; then
    log "Daemon already running pid $OLD"; exit 0
  fi
fi
echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"; log "Daemon stopped"; exit 0' INT TERM

log "🟢 Grok skill-driven autopilot (IDEA.md R*/Q*) pid $$ — docs/AGENT_RUNTIME.md"
FAIL=0
while true; do
  if [[ -f "$ROOT/docs/MVP_SHIPPED.md" ]]; then
    LEFT=$(grep -cE '^- \[ \] \*\*(R|Q)[0-9]+' "$ROOT/IDEA.md" 2>/dev/null || true)
    if [[ "${LEFT:-0}" -eq 0 ]]; then
      log "🏆 MVP shipped + IDEA clear — idle 1h"
      sleep 3600
      continue
    fi
  fi
  LEFT=$(grep -cE '^- \[ \] \*\*(R|Q)[0-9]+' "$ROOT/IDEA.md" 2>/dev/null || true)
  if [[ "${LEFT:-0}" -eq 0 ]]; then
    log "📭 IDEA Rebuild/Quality bar empty — idle 30m"
    sleep 1800
    continue
  fi
  log "📋 IDEA items left=$LEFT (R*/Q*) — Grok orchestrator"
  set +e
  bash "$ROOT/scripts/agent-orchestrator.sh" >> "$LOGFILE" 2>&1
  EXIT=$?
  set -e
  if [[ "$EXIT" -eq 0 ]]; then
    FAIL=0
    # Longer pause: let commits settle; avoid back-to-back thrash
    sleep 60
  else
    FAIL=$((FAIL+1))
    log "❌ fail streak $FAIL"
    [[ "$FAIL" -ge 3 ]] && { FAIL=0; sleep 300; } || sleep 120
  fi
done
