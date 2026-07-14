#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/home/thunder/.local/bin:${PATH}"

systemctl --user daemon-reload 2>/dev/null || true
if systemctl --user enable --now moneyflow-autopilot.service 2>/dev/null; then
  echo "Started moneyflow-autopilot.service"
  systemctl --user status moneyflow-autopilot.service --no-pager | head -20 || true
  exit 0
fi

# fallback without systemd
nohup bash "$ROOT/scripts/agent-daemon.sh" >> "$ROOT/logs/agent/daemon.log" 2>&1 &
echo "Started daemon pid $! (nohup fallback)"
echo $! > "$ROOT/logs/agent/.daemon.pid"
