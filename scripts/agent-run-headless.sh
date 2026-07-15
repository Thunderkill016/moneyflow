#!/usr/bin/env bash
# MoneyFlow Grok headless — VIP stack (check + memory + safety denies)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs/agent"
mkdir -p "$LOG_DIR"
export PATH="/home/thunder/.local/bin:${PATH}"
export GROK_MEMORY="${GROK_MEMORY:-1}"

# Prefer IDEA.md Rebuild R* then Quality Q*
ITEM=$(python3 - <<'PY'
from pathlib import Path
import re
text = Path("IDEA.md").read_text(encoding="utf-8")
for line in text.splitlines():
    m = re.match(r"^- \[ \] \*\*(R\d+)\*\* (.+)$", line)
    if m:
        print(f"{m.group(1)}: {m.group(2)}")
        raise SystemExit
for line in text.splitlines():
    m = re.match(r"^- \[ \] \*\*(Q\d+)\*\* (.+)$", line)
    if m:
        print(f"{m.group(1)}: {m.group(2)}")
        raise SystemExit
for line in text.splitlines():
    m2 = re.match(r"^- \[ \] (.+)$", line)
    if m2 and not m2.group(1).startswith("~~"):
        print(m2.group(1))
        break
PY
)

if [[ -z "${ITEM}" ]]; then
  echo "✅ IDEA.md Rebuild + Quality bar complete — no work"
  exit 0
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SAFE=$(echo "$ITEM" | tr -cd 'A-Za-z0-9_-' | cut -c1-40)
LOG_FILE="$LOG_DIR/${STAMP}_${SAFE}.log"
PROMPT_FILE="$LOG_DIR/${STAMP}_${SAFE}.prompt.txt"

cat > "$PROMPT_FILE" <<PROMPT
You are MoneyFlow Grok VIP autopilot at $ROOT. AFK. No questions.
Runtime: Grok only (docs/AGENT_RUNTIME.md + docs/VIP_AGENT_STACK.md).

MISSION: Ship ONE IDEA item with surgical quality.

READ / LOAD (in order):
1. AGENTS.md + .grok/rules/*
2. IDEA.md — complete only: $ITEM
3. docs/REBUILD_MASTER_PLAN.md + docs/BEST_OF_MATRIX.md
4. Skills: surgical-coding → moneyflow-rebuild → moneyflow-web
5. TDD if behavior changes; frontend-design/frontend-qa if UI
6. verification-before-completion + moneyflow-check before claim done
7. security-pass if auth/RLS

NEXT ITEM ONLY:
$ITEM

EXECUTE:
1. Think + 3–6 bullet plan if multi-file
2. Smallest vertical slice (surgical-coding)
3. Implement under src/
4. Gates: npm run lint && npm run typecheck && npm run test
   — e2e if R9/Q1; bash scripts/mvp-verify.sh if R10/Q2/Q3
5. Check off item in IDEA.md
6. Commit (complete sentences) + git push origin main
7. No backlog spam, no force-push, no .env.local, no inbox brand

FORBIDDEN: bank sync, AI advisor, family, OCR, AGPL paste
PROMPT

echo "🤖 $ITEM"
echo "📝 $LOG_FILE"

if ! command -v grok >/dev/null 2>&1; then
  echo "❌ grok CLI not found"
  exit 1
fi

cd "$ROOT"
set +e
# VIP flags: self-verify loop, memory, safety denies (hooks also apply if trusted)
grok --prompt-file "$PROMPT_FILE" \
  --cwd "$ROOT" \
  --yolo \
  --check \
  --experimental-memory \
  --max-turns 100 \
  --deny 'Bash(*force*push*)' \
  --deny 'Bash(*--force*)' \
  --deny 'Bash(rm -rf /*)' \
  --deny 'Bash(rm -rf /)' \
  --output-format plain \
  2>&1 | tee "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}
set -e
echo "exit_code=$EXIT_CODE" >> "$LOG_FILE"
exit "$EXIT_CODE"
