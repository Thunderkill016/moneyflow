#!/usr/bin/env bash
# Pick next ready task (lowest TASK number). Writes logs/agent/.next-task.json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKLOG="$ROOT/AGENT_BACKLOG.md"
OUT="$ROOT/logs/agent/.next-task.json"
mkdir -p "$(dirname "$OUT")"

if [[ ! -f "$BACKLOG" ]]; then
  echo '{"task_id":"","task_desc":""}' > "$OUT"
  exit 1
fi

READY_PRE=$(grep -c '\*\*Status:\*\* `ready`' "$BACKLOG" 2>/dev/null || true)
READY_PRE=${READY_PRE:-0}
if [[ "$READY_PRE" -lt 2 ]]; then
  bash "$(dirname "$0")/agent-refill-backlog.sh" >/dev/null 2>&1 || true
fi

python3 - "$BACKLOG" "$OUT" <<'PY'
import json, re, sys
path, out = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
candidates = []
for block in re.split(r"(?=^### TASK-\d+)", text, flags=re.M):
    m = re.match(r"^### (TASK-\d+) — (.+)$", block, re.M)
    if not m or not re.search(r"- \*\*Status:\*\* `ready`", block):
        continue
    tid, title = m.group(1), m.group(2).strip()
    desc_m = re.search(r"- \*\*Mô tả:\*\* (.+)", block)
    desc = desc_m.group(1).strip() if desc_m else title
    num = int(tid.split("-")[1])
    candidates.append((num, tid, desc))
candidates.sort(key=lambda x: x[0])
result = {"task_id": "", "task_desc": ""}
if candidates:
    result["task_id"] = candidates[0][1]
    result["task_desc"] = candidates[0][2]
json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(f"TASK_ID={result['task_id']}")
print(f"TASK_DESC={result['task_desc'][:120]}")
PY
