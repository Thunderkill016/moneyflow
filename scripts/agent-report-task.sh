#!/usr/bin/env bash
# Build a task completion report and send via Telegram.
# Usage: agent-report-task.sh ok|fail [task_id]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATUS="${1:-ok}"
TASK_HINT="${2:-}"
BACKLOG="$ROOT/AGENT_BACKLOG.md"
LOG_DIR="$ROOT/logs/agent"

TASK_ID="$TASK_HINT"
TASK_TITLE=""
SHA=""
READY=0

if [[ -f "$BACKLOG" ]]; then
  READY=$(grep -c '\*\*Status:\*\* `ready`' "$BACKLOG" 2>/dev/null || true)
  READY=${READY:-0}
fi

# Prefer .next-task.json
if [[ -z "$TASK_ID" && -f "$LOG_DIR/.next-task.json" ]]; then
  TASK_ID=$(python3 -c "import json; print(json.load(open('$LOG_DIR/.next-task.json')).get('task_id',''))" 2>/dev/null || true)
fi

# Latest done task from backlog if still empty
if [[ -z "$TASK_ID" && -f "$BACKLOG" ]]; then
  TASK_ID=$(grep -E '^\| [0-9-]+ \| TASK-' "$BACKLOG" | tail -1 | sed -n 's/.*\(TASK-[0-9]*\).*/\1/p' || true)
fi

if [[ -n "$TASK_ID" && -f "$BACKLOG" ]]; then
  TASK_TITLE=$(python3 - "$BACKLOG" "$TASK_ID" <<'PY'
import re, sys
text=open(sys.argv[1],encoding="utf-8").read()
tid=sys.argv[2]
m=re.search(rf"### {re.escape(tid)} — (.+)$", text, re.M)
print(m.group(1).strip() if m else "")
PY
)
  # Completed SHA line
  SHA=$(python3 - "$BACKLOG" "$TASK_ID" <<'PY'
import re, sys
text=open(sys.argv[1],encoding="utf-8").read()
tid=sys.argv[2]
m=re.search(rf"### {re.escape(tid)} —[\s\S]*?- \*\*Completed:\*\* ([^\n]+)", text)
print(m.group(1).strip() if m else "")
PY
)
fi

SHA=${SHA:-$(git -C "$ROOT" log -1 --oneline 2>/dev/null || echo "")}
BRANCH=$(git -C "$ROOT" branch --show-current 2>/dev/null || echo main)

if [[ "$STATUS" == "ok" || "$STATUS" == "success" ]]; then
  TITLE="MoneyFlow · Task xong"
  BODY="Task: ${TASK_ID:-?}
${TASK_TITLE}

Commit: ${SHA}
Ready còn lại: ${READY}
Branch: ${BRANCH}
Repo: moneyflow"
  bash "$ROOT/scripts/agent-telegram-notify.sh" ok "$TITLE" "$BODY"
else
  TITLE="MoneyFlow · Task FAIL"
  BODY="Task: ${TASK_ID:-?}
${TASK_TITLE}

Commit HEAD: ${SHA}
Ready: ${READY}
Xem: logs/agent/*.log"
  bash "$ROOT/scripts/agent-telegram-notify.sh" fail "$TITLE" "$BODY"
fi
