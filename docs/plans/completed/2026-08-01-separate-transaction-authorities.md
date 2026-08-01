# Separate transaction contracts, category presentation and demo fixtures

**Status:** accepted  
**Execution state:** accepted  
**Owner:** Thunderkill016  
**Issue/PR:** #156 / #180  
**Accepted:** 2026-08-01

## Outcome

MoneyFlow now has distinct owners for stable transaction contracts, category presentation metadata and seeded demo fixtures. Runtime demo values no longer flow through the ambiguous `src/lib/sample-data.ts` path.

## Decision

The project applied the smallest useful part of modular-monolith and Clean Architecture guidance:

- separate code by authority and reason to change;
- point runtime dependencies toward stable contracts;
- keep demo fixtures behind explicit demo-aware boundaries;
- enforce the proven boundary with the existing architecture checker;
- avoid introducing repository/service packages, DDD infrastructure or another deployment boundary.

## Final architecture

| Authority | Path |
|---|---|
| Transaction, account/category option and mutation-input contracts | `src/lib/transactions/contracts.ts` |
| Category labels, icons and colors | `src/lib/transactions/category-presentation.ts` |
| Seeded demo accounts, categories and transactions | `src/lib/demo/transaction-fixtures.ts` |
| Temporary compatibility re-export for contracts/presentation only | `src/lib/sample-data.ts` |

`sample-data.ts` owns no runtime constant and cannot export demo fixtures. Existing type/presentation imports can migrate opportunistically without weakening the runtime boundary.

## Scope delivered

- Added the three explicit authority modules.
- Migrated all runtime fixture consumers to the demo fixture module.
- Updated `ARCHITECTURE.md` with owner and dependency direction.
- Extended `scripts/check-architecture.mjs` to require the owner files and restrict demo-fixture imports to approved demo adapters, server demo workspaces and tests.
- Preserved all transaction shapes and demo fixture values.

## Evidence

- Squash commit: `b1eabc09fc442a0955e1305ff3dde3b0755975c4`.
- Exact reviewed PR head: `44db65ed6b3a5491b542792d3e65b8ada813e2f7`.
- CI #722 / run `30682740278` passed:
  - knowledge, deployment, CSS ownership and architecture contracts;
  - lint, typecheck, unit/static RLS and production build;
  - fresh Supabase reset and pgTAP;
  - expense-path browser smoke;
  - production cross-device UI audit;
  - Playwright evidence upload.

The first database attempt failed before tests because the runner could not bind Supabase port `54322`. The failed job was rerun on the same commit and passed; no source change was used to hide the infrastructure failure.

## Financial and security review

- Integer VND behavior and transfer invariants are unchanged.
- Demo account, category and transaction IDs, amounts, dates and labels are unchanged.
- No schema, migration, RPC, RLS, provider setting or production-data write occurred.
- Authenticated mode cannot receive demo fixtures through the compatibility barrel.

## Remaining limitation

Some type-only and category-presentation consumers still import from the deprecated compatibility barrel. They do not receive demo fixture values and can be migrated when those files are otherwise modified. A mass mechanical rewrite was intentionally rejected because it would enlarge the diff without improving the runtime boundary.

## Handoff

The architecture issue is complete. Future changes to transaction types begin at `src/lib/transactions/contracts.ts`; changes to category appearance begin at `src/lib/transactions/category-presentation.ts`; changes to demo seed data begin at `src/lib/demo/transaction-fixtures.ts`.
