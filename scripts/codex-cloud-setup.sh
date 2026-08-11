#!/usr/bin/env bash
set -euo pipefail

printf 'Codex Cloud setup for MoneyFlow\n'
printf 'Node: %s\n' "$(node --version)"
printf 'npm: %s\n' "$(npm --version)"

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 20 ]; then
  echo "MoneyFlow requires Node 20+ for the configured Codex Cloud environment." >&2
  exit 1
fi

# Reproduce the dependency graph exactly from package-lock.json.
npm ci --no-audit --no-fund

# Browser binaries must be downloaded during setup because setup has network
# access even when the agent phase is restricted.
npm run test:e2e:install

printf 'Codex Cloud setup complete.\n'
