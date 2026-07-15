#!/usr/bin/env bash
# MoneyFlow MVP / rebuild gate — lint + typecheck + unit tests + build (demo-friendly).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NEXT_TELEMETRY_DISABLED=1
# Force demo/placeholder Supabase so build never needs real secrets
# (overrides host .env.local; matches README Quality one-liner + config.ts).
export NEXT_PUBLIC_SUPABASE_URL=placeholder
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=placeholder

echo "==> lint"
npm run lint
echo "==> typecheck"
npm run typecheck
echo "==> test"
npm run test
echo "==> build"
npm run build

echo "✅ mvp-verify OK"
