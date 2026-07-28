#!/usr/bin/env bash
# Claude Code PreToolUse safety policy for MoneyFlow.
# stdin: Claude Code hook event JSON. A denied call exits 0 with hookSpecificOutput.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

INPUT="$(cat || true)"

PARSED="$(INPUT_JSON="$INPUT" python3 - <<'PY'
import json
import os

raw = os.environ.get("INPUT_JSON", "")
try:
    data = json.loads(raw) if raw.strip() else {}
except Exception:
    data = {}

tool = str(data.get("toolName") or data.get("tool_name") or "")
inputs = data.get("toolInput") or data.get("tool_input") or {}
command = ""
path = ""
if isinstance(inputs, dict):
    command = str(inputs.get("command") or inputs.get("cmd") or "")
    path = str(
        inputs.get("path")
        or inputs.get("file_path")
        or inputs.get("target_file")
        or inputs.get("filePath")
        or ""
    )

print(tool.replace("\t", " "))
print(command.replace("\n", " ").replace("\t", " "))
print(path.replace("\t", " "))
PY
)"

TOOL="$(printf '%s\n' "$PARSED" | sed -n '1p')"
COMMAND="$(printf '%s\n' "$PARSED" | sed -n '2p')"
PATHF="$(printf '%s\n' "$PARSED" | sed -n '3p')"
BRANCH="$(git branch --show-current 2>/dev/null || true)"
LOWER_COMMAND="$(printf '%s' "$COMMAND" | tr '[:upper:]' '[:lower:]')"

deny() {
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

is_secret_path() {
  local candidate="$1"
  [[ -z "$candidate" ]] && return 1

  case "$candidate" in
    .env.example|*/.env.example)
      return 1
      ;;
    .env|*/.env|.env.*|*/.env.*|*/secrets/*|secrets/*|*/credentials/*|credentials/*)
      return 0
      ;;
  esac

  return 1
}

if is_secret_path "$PATHF"; then
  deny "Reading or editing local environment/secret files is forbidden; use .env.example and provider settings documentation"
fi

case "$LOWER_COMMAND" in
  *".env.local"*|*".env.production"*|*"/secrets/"*|*"/credentials/"*)
    deny "Agent shell access to local environment or secret material is forbidden"
    ;;
esac

if [[ "$TOOL" == "Edit" || "$TOOL" == "Write" ]]; then
  if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    deny "Do not edit MoneyFlow on $BRANCH; create a focused branch first"
  fi
fi

if [[ "$TOOL" == "run_terminal_command" || "$TOOL" == "Bash" || "$TOOL" == "bash" ]]; then
  case "$LOWER_COMMAND" in
    *"git push --force"*|*"git push -f"*)
      deny "Force-pushing is forbidden for MoneyFlow agent sessions"
      ;;
    *"git reset --hard"*|*"git clean -f"*|*"git checkout -- ."*|*"git restore ."*)
      deny "Destructive working-tree or history reset is forbidden"
      ;;
    *"rm -rf /"*|*"rm -rf /*"*|*"rm -rf ~"*|*"rm -rf \$home"*)
      deny "Destructive removal of system or home paths is forbidden"
      ;;
    *"gh pr merge"*|*"git push origin main"*|*"git push origin master"*)
      deny "Merging or pushing directly to the default branch requires explicit human action"
      ;;
    *"vercel --prod"*|*"npx vercel --prod"*|*"vercel deploy --prod"*)
      deny "Production deployment is human-gated"
      ;;
    *"supabase db push"*|*"npx supabase db push"*|*"supabase link"*|*"supabase secrets set"*|*"supabase functions deploy"*)
      deny "Remote Supabase mutation/deployment is human-gated"
      ;;
    *"drop database"*)
      deny "Destructive database commands are forbidden"
      ;;
  esac

  if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    case "$LOWER_COMMAND" in
      *"git commit"*|*"git merge"*|*"git rebase"*)
        deny "Do not mutate Git history on $BRANCH; create a focused branch first"
        ;;
    esac
  fi
fi

exit 0
