#!/usr/bin/env bash
# Pull pool tasks from AGENT_ROADMAP.md into backlog when ready < MIN_READY
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKLOG="$ROOT/AGENT_BACKLOG.md"
ROADMAP="$ROOT/AGENT_ROADMAP.md"
MIN_READY="${MIN_READY:-2}"
REFILL_TARGET="${REFILL_TARGET:-4}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

READY=$(grep -c '\*\*Status:\*\* `ready`' "$BACKLOG" 2>/dev/null || true)
READY=${READY:-0}
if [[ "$READY" -ge "$MIN_READY" ]]; then
  echo "[refill] OK ready=$READY ≥ $MIN_READY"
  exit 0
fi
NEED=$((REFILL_TARGET - READY))
echo "[refill] ready=$READY need up to $NEED from roadmap"

python3 - "$BACKLOG" "$ROADMAP" "$NEED" "$DRY_RUN" <<'PY'
import re, sys, os
backlog_path, roadmap_path, need_s, dry = sys.argv[1:5]
need = int(need_s)
dry = dry == "1"
backlog = open(backlog_path, encoding="utf-8").read()
roadmap = open(roadmap_path, encoding="utf-8").read() if os.path.isfile(roadmap_path) else ""
existing = set(re.findall(r"^### (TASK-\d+)", backlog, re.M))
added = 0
blocks = []
for block in re.split(r"(?=^### TASK-\d+)", roadmap, flags=re.M):
    m = re.match(r"^### (TASK-\d+) — (.+)$", block, re.M)
    if not m:
        continue
    tid = m.group(1)
    if tid in existing:
        continue
    if not re.search(r"- \*\*Status:\*\* `pool`", block):
        continue
    title = m.group(2).strip()
    desc_m = re.search(r"- \*\*Mô tả:\*\* (.+)", block)
    desc = desc_m.group(1).strip() if desc_m else title
    entry = f"\n### {tid} — {title}\n- **Status:** `ready`\n- **Mô tả:** {desc}\n- **Source:** roadmap pool refill\n"
    blocks.append(entry)
    existing.add(tid)
    added += 1
    if added >= need:
        break
if dry:
    print(f"[refill] dry-run would add {added}")
    raise SystemExit(0)
if blocks:
    marker = "## Nhật ký"
    if marker in backlog:
        backlog = backlog.replace(marker, "".join(blocks) + "\n" + marker, 1)
    else:
        backlog += "\n" + "".join(blocks)
    open(backlog_path, "w", encoding="utf-8").write(backlog)
print(f"[refill] added {added}")
PY
