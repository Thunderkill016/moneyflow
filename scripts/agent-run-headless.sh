#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs/agent"
mkdir -p "$LOG_DIR"
export PATH="/home/thunder/.local/bin:${PATH}"

# Prefer IDEA.md next checkbox over backlog spam
ITEM=$(python3 - <<'PY'
from pathlib import Path
import re
text = Path("IDEA.md").read_text(encoding="utf-8")
for line in text.splitlines():
    m = re.match(r"^- \[ \] \*\*(Q\d+)\*\* (.+)$", line)
    if m:
        print(f"{m.group(1)}: {m.group(2)}")
        break
    m2 = re.match(r"^- \[ \] (.+)$", line)
    if m2 and not m2.group(1).startswith("~~"):
        print(m2.group(1))
        break
PY
)

if [[ -z "${ITEM}" ]]; then
  # fallback backlog
  bash "$ROOT/scripts/agent-pick-task.sh" >/dev/null || true
  TASK_ID=$(python3 -c "import json; print(json.load(open('$LOG_DIR/.next-task.json')).get('task_id',''))" 2>/dev/null || true)
  TASK_DESC=$(python3 -c "import json; print(json.load(open('$LOG_DIR/.next-task.json')).get('task_desc',''))" 2>/dev/null || true)
  if [[ -z "$TASK_ID" ]]; then
    echo "✅ IDEA.md Quality bar complete — no work"
    exit 0
  fi
  ITEM="$TASK_ID: $TASK_DESC"
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SAFE=$(echo "$ITEM" | tr -cd 'A-Za-z0-9_-' | cut -c1-40)
LOG_FILE="$LOG_DIR/${STAMP}_${SAFE}.log"
PROMPT_FILE="$LOG_DIR/${STAMP}_${SAFE}.prompt.txt"

cat > "$PROMPT_FILE" <<PROMPT
You are MoneyFlow autopilot at $ROOT. AFK user. No questions.

MISSION: Ship the next item using Claude/Shipkit-style skills (not busywork).

READ FIRST:
1. IDEA.md (source of truth checklist)
2. AGENTS.md (G5 product law)
3. .agents/skills/ship-feature/SKILL.md
4. .agents/skills/test-driven-development/SKILL.md
5. .agents/skills/verification-before-completion/SKILL.md
6. If UI: .agents/skills/frontend-qa/SKILL.md
7. If auth/RLS: .agents/skills/security-pass/SKILL.md + supabase-rls

NEXT ITEM ONLY:
$ITEM

EXECUTE:
1. Follow ship-feature: smallest vertical slice for THIS item only
2. TDD when changing behavior
3. Implement under src/ (Next app)
4. verification-before-completion: run npm run lint && npm run typecheck && npm run test
   (e2e if Q1; build if Q2/Q3)
5. Check off the item in IDEA.md
6. Commit + push origin main
7. Do NOT invent new backlog spam tasks

FORBIDDEN: bank sync, AI advisor, family, OCR, AGPL paste, inbox-first brand
PROMPT

echo "🤖 $ITEM"
echo "📝 $LOG_FILE"

if ! command -v grok >/dev/null 2>&1; then
  echo "❌ grok CLI not found"
  exit 1
fi

cd "$ROOT"
set +e
grok --prompt-file "$PROMPT_FILE" \
  --cwd "$ROOT" \
  --yolo \
  --max-turns 80 \
  --output-format plain \
  2>&1 | tee "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}
set -e
echo "exit_code=$EXIT_CODE" >> "$LOG_FILE"
exit "$EXIT_CODE"
