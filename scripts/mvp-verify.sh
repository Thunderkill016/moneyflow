#!/usr/bin/env bash
# MoneyFlow MVP / rebuild gate — configuration + lint + typecheck + tests + build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NEXT_TELEMETRY_DISABLED=1

# Reproducible non-production fixtures. Caller-provided values always win.
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://ci-project.supabase.co}"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-sb_publishable_ci_test_key}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://ci.example.test}"
export LEGACY_SITE_HOSTS="${LEGACY_SITE_HOSTS:-old-ci.example.test}"

echo "==> deployment configuration"
npm run check:deployment-env
echo "==> lint"
npm run lint
echo "==> typecheck"
npm run typecheck
echo "==> test"
npm run test
echo "==> build"
npm run build

echo "✅ mvp-verify OK"
