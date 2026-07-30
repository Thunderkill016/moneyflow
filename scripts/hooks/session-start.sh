#!/usr/bin/env bash
# SessionStart: print compact repository context for coding-agent sessions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
echo "[moneyflow] agent session — read CLAUDE.md and AGENTS.md before changing code"
echo "[moneyflow] product plan: docs/product/PRODUCT_DEVELOPMENT_PLAN.md"
echo "[moneyflow] sequence: docs/engineering/DEVELOPMENT_SEQUENCE.md; use /next-initiative when no task is named"
echo "[moneyflow] gates: npm run check:knowledge && npm run lint && npm run typecheck && npm run test"
exit 0
