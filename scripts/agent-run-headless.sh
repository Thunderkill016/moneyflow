#!/usr/bin/env bash
# One Grok headless session for next Money Flow backlog task
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs/agent"
TASK_FILE="$LOG_DIR/.next-task.json"
mkdir -p "$LOG_DIR"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

export PATH="/home/thunder/.local/bin:${PATH}"

bash "$ROOT/scripts/agent-pick-task.sh" >/dev/null
TASK_ID=$(python3 -c "import json; print(json.load(open('$TASK_FILE'))['task_id'])")
TASK_DESC=$(python3 -c "import json; print(json.load(open('$TASK_FILE'))['task_desc'])")

if [[ -z "$TASK_ID" ]]; then
  echo "✅ No ready tasks"
  exit 0
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$LOG_DIR/${STAMP}_${TASK_ID}.log"
PROMPT_FILE="$LOG_DIR/${STAMP}_${TASK_ID}.prompt.txt"

cat > "$PROMPT_FILE" <<PROMPT
You are the 24/7 autopilot agent for Money Flow at $ROOT.
User is AFK (sleeping). Do NOT ask questions. Decide and ship.

PHASE 1 — READ:
- AGENTS.md, AGENT_BACKLOG.md, AGENT_AUTOPILOT.md
- docs/wireframes-inbox.md, docs/UX_RESEARCH_AND_REDESIGN.md, docs/design-system.md (relevant sections)
- Inspect existing src/ for patterns (AppShell, landing, auth, money as integers)

PHASE 2 — SINGLE TASK ONLY: $TASK_ID
$TASK_DESC

PHASE 3 — EXECUTE:
1. Set this task Status to in_progress in AGENT_BACKLOG.md
2. Minimal implementation for THIS task only
3. Run: npm run lint && npm run typecheck && npm run test
4. If routes/layout changed strongly: npm run build when feasible
5. On success: git add (never .env.local), commit message "feat(autopilot): $TASK_ID short summary", git push origin main
6. Set Status to done, add Completed line + short SHA; append nhat ky row
7. On hard block: Status blocked + reason; never force-push

Rules:
- Inbox-first; no competitor UI clones; money = integer minor units
- Never edit .env.local or delete migrations
- Vietnamese UI copy
- Every new data page: loading/empty/error states
PROMPT

echo "🤖 $TASK_ID"
echo "📝 $LOG_FILE"

if [[ "$DRY_RUN" == 1 ]]; then
  cat "$PROMPT_FILE"
  exit 0
fi

if ! command -v grok >/dev/null 2>&1; then
  echo "❌ grok CLI not found"
  exit 1
fi

cd "$ROOT"
set +e
grok --prompt-file "$PROMPT_FILE" \
  --cwd "$ROOT" \
  --yolo \
  --max-turns 100 \
  --output-format plain \
  2>&1 | tee "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}
set -e
echo "exit_code=$EXIT_CODE" >> "$LOG_FILE"
exit "$EXIT_CODE"
