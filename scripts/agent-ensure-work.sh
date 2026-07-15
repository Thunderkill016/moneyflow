#!/usr/bin/env bash
# Keep autopilot fed with *meaningful* work only.
# Sources (in order):
#   1) AGENT_ROADMAP pool refill
#   2) Promote deferred that are product-valuable (not spam)
#   3) Knowledge-driven competitor/best-in-class gap scan → COMP tasks
#   4) Cancel busywork ready tasks if any slipped in
# Ship when COMPETITOR_GAP_REPORT all pass AND ready=0 AND deferred=0
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKLOG="$ROOT/AGENT_BACKLOG.md"
SHIPPED="$ROOT/docs/MVP_SHIPPED.md"
MIN_READY="${MIN_READY:-2}"
export PATH="/home/thunder/.local/bin:${PATH}"

cd "$ROOT"
bash "$ROOT/scripts/agent-refill-backlog.sh" 2>/dev/null || true

python3 - "$ROOT" "$MIN_READY" <<'PY'
import re, sys
from pathlib import Path
from datetime import datetime, timezone

root = Path(sys.argv[1])
min_ready = int(sys.argv[2])
backlog_path = root / "AGENT_BACKLOG.md"
text = backlog_path.read_text(encoding="utf-8")

def count_status(st: str) -> int:
    return len(re.findall(rf"\*\*Status:\*\* `{st}`", text))

notes = []

# --- Cancel busywork ready tasks (knowledge policy) ---
BUSY_PATTERNS = [
    r"re-run full test suite and fix failures",
    r"If green, document in nhật ký only",
    r"quality cycle \d+",
    r"document in nhật ký only",
    r"Full verify lint\+typecheck\+test\+e2e\+build; fix failures only\. Cycle",
]
for pat in BUSY_PATTERNS:
    def cancel_busy(m, _pat=pat):
        block = m.group(0)
        if re.search(r"\*\*Status:\*\* `ready`", block) and re.search(_pat, block, re.I):
            block = re.sub(
                r"\*\*Status:\*\* `ready`",
                "**Status:** `cancelled`",
                block,
                count=1,
            )
            if "busywork" not in block.lower():
                block = block.rstrip() + "\n- **Cancelled:** busywork — not knowledge-driven (08_PFM_BEST_IN_CLASS)\n"
            notes.append("cancelled busywork block")
        return block

    text = re.sub(
        r"### TASK-\d+ — [\s\S]*?(?=\n### TASK-|\n## Nhật ký|\n## MVP|\n## OSS|\Z)",
        cancel_busy,
        text,
    )

# --- Promote deferred only if title looks product-valuable ---
VALUABLE = re.compile(
    r"(empty|export|transfer|budget|ghi chi|search|safe-to-spend|attention|"
    r"onboarding|landing|e2e|build|LCP|prefetch|undo|CTA|insights|CSV|"
    r"commitments|goals|categories|a11y|demo banner|weekly)",
    re.I,
)
ready = count_status("ready")
if ready < min_ready:
    deferred = []
    for block in re.split(r"(?=^### TASK-\d+)", text, flags=re.M):
        m = re.match(r"^### (TASK-\d+) — (.+)$", block, re.M)
        if not m:
            continue
        if not re.search(r"\*\*Status:\*\* `deferred`", block):
            continue
        title = m.group(2)
        if not VALUABLE.search(title):
            continue
        deferred.append((int(m.group(1).split("-")[1]), m.group(1), title))
    deferred.sort()
    for _n, tid, title in deferred:
        if count_status("ready") >= min_ready:
            break
        text2, n = re.subn(
            rf"(### {re.escape(tid)} —[\s\S]*?- \*\*Status:\*\* )`deferred`",
            r"\1`ready`",
            text,
            count=1,
        )
        if n:
            text = text2
            text = re.sub(
                rf"(### {re.escape(tid)} —[\s\S]*?)- \*\*Deferred:\*\*[^\n]*\n",
                r"\1",
                text,
                count=1,
            )
            notes.append(f"promoted valuable deferred {tid}")

backlog_path.write_text(text, encoding="utf-8")
print(f"[ensure-work] pre-gap ready={count_status('ready')}; {', '.join(notes) or 'no local edits'}")
PY

# Knowledge-driven competitor / best-in-class gaps (PRIMARY task source)
python3 "$ROOT/scripts/agent-competitor-gap.py" "$ROOT" || true

python3 - "$ROOT" <<'PY'
import re, sys
from pathlib import Path
from datetime import datetime, timezone

root = Path(sys.argv[1])
backlog = (root / "AGENT_BACKLOG.md").read_text(encoding="utf-8")
ready = len(re.findall(r"\*\*Status:\*\* `ready`", backlog))
deferred = len(re.findall(r"\*\*Status:\*\* `deferred`", backlog))
in_prog = len(re.findall(r"\*\*Status:\*\* `in_progress`", backlog))
report = root / "docs" / "COMPETITOR_GAP_REPORT.md"
all_pass = False
if report.exists():
    txt = report.read_text(encoding="utf-8")
    m = re.search(r"\*\*Passed:\*\* (\d+) / (\d+)", txt)
    if m and m.group(1) == m.group(2) and int(m.group(1)) >= 10:
        all_pass = True

shipped = root / "docs" / "MVP_SHIPPED.md"
print(f"[ensure-work] final ready={ready} deferred={deferred} in_prog={in_prog} gap_all_pass={all_pass}")

if all_pass and ready == 0 and deferred == 0 and in_prog == 0:
    shipped.write_text(
        f"""# MVP SHIPPED — MoneyFlow

**Date (UTC):** {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")}

## Bars passed
- `docs/research/08_PFM_BEST_IN_CLASS.md` (knowledge criteria)
- `docs/COMPETITOR_GAP_REPORT.md` — **all checks ✅**
- `docs/MVP_BEST_BAR.md` / `docs/MVP_DEFINITION.md`

## Meaning
Autopilot may idle. Product matches **best-in-class Core patterns** for a VN thu-chi web MVP without bank sync/AI/family.

Re-open work: delete this file or fail a gap check after code drift.
""",
        encoding="utf-8",
    )
    print("[ensure-work] wrote MVP_SHIPPED.md — best-in-class bar green")
elif ready == 0 and not all_pass:
    print("[ensure-work] WARNING: 0 ready but gaps remain — gap injector should have run")
PY
