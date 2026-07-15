#!/usr/bin/env bash
# SessionStart: print compact context for Grok logs (passive; exit 0).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
echo "[moneyflow] Grok VIP session — runtime locked (docs/AGENT_RUNTIME.md)"
if [[ -f IDEA.md ]]; then
  NEXT=$(python3 - <<'PY'
from pathlib import Path
import re
text = Path("IDEA.md").read_text(encoding="utf-8")
for line in text.splitlines():
    m = re.match(r"^- \[ \] \*\*((?:R|Q)\d+)\*\* (.+)$", line)
    if m:
        print(f"{m.group(1)}: {m.group(2)[:80]}")
        break
else:
    print("(no open R*/Q*)")
PY
)
  echo "[moneyflow] next IDEA: $NEXT"
fi
echo "[moneyflow] gates: npm run lint && npm run typecheck && npm run test"
exit 0
