#!/usr/bin/env bash
# Continuous Money Flow autopilot — until MVP_BEST_BAR / MVP_SHIPPED
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs/agent"
PIDFILE="$LOG_DIR/.daemon.pid"
LOGFILE="$LOG_DIR/daemon.log"
SHIPPED="$ROOT/docs/MVP_SHIPPED.md"
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

log "🟢 Autopilot until best MVP (MVP_BEST_BAR) pid $$"
FAIL_STREAK=0

while true; do
  bash "$ROOT/scripts/agent-ensure-work.sh" >> "$LOGFILE" 2>&1 || true

  if [[ -f "$SHIPPED" ]]; then
    READY=$(grep -c '\*\*Status:\*\* `ready`' "$ROOT/AGENT_BACKLOG.md" 2>/dev/null || true)
    if [[ "${READY:-0}" -eq 0 ]]; then
      log "🏆 MVP_SHIPPED + 0 ready — idle 1h"
      sleep 3600
      continue
    fi
    log "🏆 MVP_SHIPPED but polish remains ($READY ready)"
  fi

  READY=$(grep -c '\*\*Status:\*\* `ready`' "$ROOT/AGENT_BACKLOG.md" 2>/dev/null || true)
  if [[ "${READY:-0}" -eq 0 ]]; then
    log "📭 0 ready — sleep 3m + ensure-work again"
    sleep 180
    continue
  fi

  log "📋 $READY ready — orchestrator"
  set +e
  bash "$ROOT/scripts/agent-orchestrator.sh" >> "$LOGFILE" 2>&1
  EXIT=$?
  set -e

  if [[ "$EXIT" -eq 2 ]]; then
    sleep 120
    continue
  fi
  if [[ "$EXIT" -eq 0 ]]; then
    FAIL_STREAK=0
    sleep 30
    continue
  fi
  FAIL_STREAK=$((FAIL_STREAK + 1))
  log "❌ fail streak $FAIL_STREAK"
  if [[ "$FAIL_STREAK" -ge 3 ]]; then
    rm -f "$LOG_DIR/.orchestrator-state"
    FAIL_STREAK=0
    bash "$ROOT/scripts/agent-ensure-work.sh" >> "$LOGFILE" 2>&1 || true
    sleep 300
  else
    sleep 90
  fi
done
