#!/usr/bin/env bash
# Static RLS surface check for MoneyFlow migrations (no Docker / no prod).
# Delegates to src/lib/rls-migrations.test.ts — single source of truth.
# See docs/security-rls-check.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

exec node --experimental-strip-types --test \
  --test-name-pattern='rls migrations' \
  src/lib/rls-migrations.test.ts
