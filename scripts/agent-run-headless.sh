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
You are the 24/7 autopilot agent for MoneyFlow at $ROOT.
User is AFK. Do NOT ask questions. Decide and ship.

PHASE 1 — READ:
- AGENTS.md (G5 product law + skill routing)
- AGENT_BACKLOG.md, docs/BEST_OF_MATRIX.md, docs/research/05_PRODUCT_AND_ARCHITECTURE.md
- .grok/skills/moneyflow-web/SKILL.md and moneyflow-check/SKILL.md
- Inspect existing src/ patterns (AppShell, money integers, EmptyState)

PHASE 2 — SINGLE TASK ONLY: $TASK_ID
$TASK_DESC

PHASE 3 — EXECUTE:
1. Set this task Status to in_progress in AGENT_BACKLOG.md
2. Minimal implementation for THIS task only (no feature dump)
3. Run: npm run lint && npm run typecheck && npm run test
4. If routes/layout/perf: npm run build when feasible; e2e if expense path
5. On success: git add (never .env.local, never logs/), commit "feat(autopilot): $TASK_ID short summary", git push origin main
6. Set Status to done, Completed + SHA; append nhật ký row
7. On hard block: Status blocked + reason; never force-push

Rules (G5):
- Product = thu chi cá nhân — NOT inbox-first brand / NOT landing "Hộp thư"
- Money = integer VND đồng; transfer never counts as expense
- Lab (inbox/import/rules) stays under Nâng cao
- Forbidden without human: bank sync, AI advisor, family, OCR, AGPL copy
- Calm Vietnamese UI; empty state one primary CTA
- Use moneyflow-web / moneyflow-check skill patterns
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
