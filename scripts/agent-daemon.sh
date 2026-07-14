#!/usr/bin/env bash
# Continuous Money Flow autopilot
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
    log "Daemon already running pid $OLD"
    exit 0
  fi
fi
echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"; log "Daemon stopped"; exit 0' INT TERM

log "🟢 Money Flow autopilot daemon started pid $$"
FAIL_STREAK=0

while true; do
  READY=$(grep -c '\*\*Status:\*\* `ready`' "$ROOT/AGENT_BACKLOG.md" 2>/dev/null || true)
  READY=${READY:-0}
  if [[ "$READY" -lt 1 ]]; then
    bash "$ROOT/scripts/agent-refill-backlog.sh" >> "$LOGFILE" 2>&1 || true
    READY=$(grep -c '\*\*Status:\*\* `ready`' "$ROOT/AGENT_BACKLOG.md" 2>/dev/null || true)
  fi
  if [[ "${READY:-0}" -eq 0 ]]; then
    log "📭 0 ready — sleep 10m"
    sleep 600
    continue
  fi

  log "📋 $READY ready — orchestrator cycle"
  set +e
  bash "$ROOT/scripts/agent-orchestrator.sh" >> "$LOGFILE" 2>&1
  EXIT=$?
  set -e

  if [[ "$EXIT" -eq 2 ]]; then
    log "lock busy — sleep 2m"
    sleep 120
    continue
  fi
  if [[ "$EXIT" -eq 0 ]]; then
    FAIL_STREAK=0
    log "✅ OK — pause 45s"
    sleep 45
    continue
  fi
  FAIL_STREAK=$((FAIL_STREAK + 1))
  log "❌ fail streak $FAIL_STREAK"
  if [[ "$FAIL_STREAK" -ge 3 ]]; then
    log "reset breaker, sleep 10m"
    rm -f "$LOG_DIR/.orchestrator-state"
    FAIL_STREAK=0
    sleep 600
  else
    sleep 120
  fi
done
