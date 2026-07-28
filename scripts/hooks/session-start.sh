#!/usr/bin/env bash
# Claude Code SessionStart: print compact MoneyFlow operating context.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BRANCH="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "$BRANCH" ]]; then
  BRANCH="detached-head"
fi

DIRTY_COUNT="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"

printf '[moneyflow] Claude Code session\n'
printf '[moneyflow] branch: %s | dirty paths: %s\n' "$BRANCH" "$DIRTY_COUNT"

if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  printf '[moneyflow] safety: plan/read only on %s; create a focused branch before edits\n' "$BRANCH"
else
  printf '[moneyflow] safety: keep changes scoped to the approved work packet\n'
fi

shopt -s nullglob
PACKETS=(docs/plans/active/*.md)
if (( ${#PACKETS[@]} == 0 )); then
  printf '[moneyflow] active work packets: none\n'
else
  printf '[moneyflow] active work packets:'
  LIMIT=${#PACKETS[@]}
  if (( LIMIT > 6 )); then
    LIMIT=6
  fi
  for ((i = 0; i < LIMIT; i++)); do
    printf ' %s' "$(basename "${PACKETS[$i]}")"
  done
  if (( ${#PACKETS[@]} > LIMIT )); then
    printf ' (+%s more)' "$(( ${#PACKETS[@]} - LIMIT ))"
  fi
  printf '\n'
fi

printf '[moneyflow] workflow: docs/engineering/CLAUDE_CODE_WORKFLOW.md\n'
printf '[moneyflow] baseline gates: npm run check:knowledge && npm run check:deployment-env && npm run lint && npm run typecheck && npm run test && npm run build\n'
printf '[moneyflow] completion: evaluator evidence + human merge; production verification when affected\n'

exit 0
