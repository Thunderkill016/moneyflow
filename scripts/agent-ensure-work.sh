#!/usr/bin/env bash
# Skill-driven: do not inject busywork. Report IDEA.md remaining only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "[ensure-work] IDEA.md remaining:"
grep -E '^- \[ \] \*\*Q' IDEA.md || grep -E '^- \[ \]' IDEA.md | head -20 || true
REMAIN=$(grep -cE '^- \[ \] \*\*Q' IDEA.md || true)
if [[ "${REMAIN:-0}" -eq 0 ]]; then
  if [[ ! -f docs/MVP_SHIPPED.md ]]; then
    echo "[ensure-work] Quality bar complete — consider MVP_SHIPPED after verify"
  else
    echo "[ensure-work] MVP_SHIPPED present"
  fi
fi
# optional: soft refill only roadmap pool (no catalog spam)
bash "$ROOT/scripts/agent-refill-backlog.sh" 2>/dev/null || true
