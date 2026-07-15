#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs/agent"
mkdir -p "$LOG_DIR"
export PATH="/home/thunder/.local/bin:${PATH}"

# Prefer IDEA.md Rebuild R* then Quality Q* (not backlog spam)
ITEM=$(python3 - <<'PY'
from pathlib import Path
import re
text = Path("IDEA.md").read_text(encoding="utf-8")
# First pass: R* rebuild track
for line in text.splitlines():
    m = re.match(r"^- \[ \] \*\*(R\d+)\*\* (.+)$", line)
    if m:
        print(f"{m.group(1)}: {m.group(2)}")
        raise SystemExit
# Second pass: Q* quality bar
for line in text.splitlines():
    m = re.match(r"^- \[ \] \*\*(Q\d+)\*\* (.+)$", line)
    if m:
        print(f"{m.group(1)}: {m.group(2)}")
        raise SystemExit
# Fallback any other open checkbox (not strikethrough)
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
You are MoneyFlow Grok autopilot at $ROOT. AFK user. No questions.
Runtime locked: Grok CLI only (see docs/AGENT_RUNTIME.md). Do not suggest switching to Claude/Hermes/OpenClaw.

MISSION: Ship ONE IDEA.md item (R* then Q*). Quality > busywork.

READ FIRST (in order):
1. IDEA.md — check off only the item you complete
2. docs/REBUILD_MASTER_PLAN.md + docs/BEST_OF_MATRIX.md
3. AGENTS.md (G5: thu chi VN, no inbox brand, no bank/AI/family)
4. .grok/skills/moneyflow-web/SKILL.md (if present)
5. .agents/skills/ship-feature/SKILL.md
6. .agents/skills/test-driven-development/SKILL.md when behavior changes
7. .agents/skills/verification-before-completion/SKILL.md before done
8. UI: .grok/skills/frontend-design/SKILL.md + .agents/skills/frontend-qa/SKILL.md
9. Auth/RLS: .agents/skills/security-pass/SKILL.md

NEXT ITEM ONLY:
$ITEM

EXECUTE:
1. Smallest vertical slice for THIS item only
2. TDD when money/domain/behavior changes
3. Implement under src/ (Next App Router)
4. Run: npm run lint && npm run typecheck && npm run test
   — also e2e if item is R9 or Q1; build if R10/Q2/Q3
5. Check off the item in IDEA.md ([x])
6. Commit with clear message + git push origin main
7. Do NOT invent AGENT_BACKLOG spam tasks
8. Do NOT force-push, edit .env.local, or delete migrations
9. Minimal diff; preserve integer VND + transfer ≠ expense

FORBIDDEN: bank sync, AI advisor, family, OCR, AGPL paste, inbox-first brand on landing/auth
PROMPT

echo "🤖 $ITEM"
echo "📝 $LOG_FILE"

if ! command -v grok >/dev/null 2>&1; then
  echo "❌ grok CLI not found in PATH"
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
