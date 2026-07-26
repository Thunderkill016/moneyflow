#!/usr/bin/env bash
set -euo pipefail

export NEXT_PUBLIC_APP_MODE=demo
export NEXT_PUBLIC_SITE_URL=https://preview.example.test

npm run check:knowledge
npm run check:deployment-env
npm run lint
npm run typecheck
node --experimental-strip-types --test --test-concurrency=1 \
  src/lib/*.test.ts \
  src/lib/*/*.test.ts
npm run build
