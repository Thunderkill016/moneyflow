#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

systemctl --user stop moneyflow-autopilot.service 2>/dev/null || true
systemctl --user disable moneyflow-autopilot.service 2>/dev/null || true

PIDFILE="$ROOT/logs/agent/.daemon.pid"
if [[ -f "$PIDFILE" ]]; then
  PID=$(cat "$PIDFILE" 2>/dev/null || true)
  if [[ -n "${PID:-}" ]]; then
    kill "$PID" 2>/dev/null || true
  fi
  rm -f "$PIDFILE"
fi

# Kill by pidfile only — avoid pkill -f self-match
echo "Stopped Money Flow autopilot"
