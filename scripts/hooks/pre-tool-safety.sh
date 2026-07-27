#!/usr/bin/env bash
# PreToolUse safety for MoneyFlow Grok sessions.
# stdin: JSON event. stdout: {"decision":"allow"|"deny",...}
set -euo pipefail

INPUT=$(cat || true)

PARSED=$(INPUT_JSON="$INPUT" python3 - <<'PY'
import json, os
raw = os.environ.get("INPUT_JSON", "")
try:
    data = json.loads(raw) if raw.strip() else {}
except Exception:
    data = {}
tool = str(data.get("toolName") or data.get("tool_name") or "")
inp = data.get("toolInput") or data.get("tool_input") or {}
cmd = ""
path = ""
if isinstance(inp, dict):
    cmd = str(inp.get("command") or inp.get("cmd") or "")
    path = str(
        inp.get("path")
        or inp.get("file_path")
        or inp.get("target_file")
        or inp.get("filePath")
        or ""
    )
# tab-separated safe for shell
print(tool.replace("\t", " "))
print(cmd.replace("\n", " ").replace("\t", " "))
print(path.replace("\t", " "))
PY
)

TOOL=$(echo "$PARSED" | sed -n '1p')
COMMAND=$(echo "$PARSED" | sed -n '2p')
PATHF=$(echo "$PARSED" | sed -n '3p')

deny() {
  # Claude Code drops stdout JSON whenever a hook exits 2 (stderr becomes the
  # reason instead), so blocking must exit 0 and use hookSpecificOutput.
  python3 -c '
import json, sys
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": sys.argv[1],
    }
}))
' "$1"
  exit 0
}

if [[ "$TOOL" == "run_terminal_command" || "$TOOL" == "Bash" || "$TOOL" == "bash" ]]; then
  case "$COMMAND" in
    *force*push*|*"push --force"*|*"push -f "*)
      deny "Force-push is forbidden on MoneyFlow main"
      ;;
    *"rm -rf /"*|*"rm -rf /*"*|*"rm -rf ~"*|*"rm -rf \$HOME"*)
      deny "Destructive rm -rf of system/home paths blocked"
      ;;
    *".env.local"*)
      deny "Do not touch .env.local via agent shell"
      ;;
    *"drop database"*|*"DROP DATABASE"*|*"migrate:reset"*)
      deny "Destructive DB reset blocked without human"
      ;;
  esac
fi

if [[ "$PATHF" == *".env.local"* || "$PATHF" == *"/secrets/"* ]]; then
  deny "Editing secrets/env.local is forbidden"
fi

exit 0
