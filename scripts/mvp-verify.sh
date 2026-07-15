#!/usr/bin/env bash
# MoneyFlow MVP / rebuild gate — lint + typecheck + unit tests + build (demo-friendly).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NEXT_TELEMETRY_DISABLED=1
# Placeholder Supabase so build does not require real secrets
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder}"

echo "==> lint"
npm run lint
echo "==> typecheck"
npm run typecheck
echo "==> test"
npm run test
echo "==> build"
npm run build

echo "✅ mvp-verify OK"
