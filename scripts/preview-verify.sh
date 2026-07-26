#!/usr/bin/env bash
set -euo pipefail

export NEXT_PUBLIC_APP_MODE=demo
export NEXT_PUBLIC_SITE_URL=https://preview.example.test

find src/lib -maxdepth 1 -name '*.test.ts' \
  | sort \
  | head -n 5 \
  | xargs node --experimental-strip-types --test --test-concurrency=1
npm run build
