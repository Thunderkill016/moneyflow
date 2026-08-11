#!/usr/bin/env bash
set -euo pipefail

printf 'Refreshing cached Codex Cloud environment for MoneyFlow\n'

# Cached environments can resume on a newer commit. Reconcile node_modules with
# the checked-out lockfile while preferring the npm cache populated at setup.
npm ci --prefer-offline --no-audit --no-fund

# Keep the Playwright browser cache aligned with the installed package version.
npm run test:e2e:install

printf 'Codex Cloud maintenance complete.\n'
