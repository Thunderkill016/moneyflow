#!/usr/bin/env bash
# SessionStart: print compact repository context for coding-agent sessions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
echo "[moneyflow] agent session — read CLAUDE.md and AGENTS.md before changing code"
echo "[moneyflow] gates: npm run check:knowledge && npm run lint && npm run typecheck && npm run test"
exit 0
