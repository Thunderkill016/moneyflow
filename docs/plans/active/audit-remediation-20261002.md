# Audit remediation — 2026-10-02

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** owner request to fix the five current-project audit findings; PR pending

## Outcome

Repair OAuth mutation authorization, historical-reference editing, offline cache
session races, demo report authority and concurrent proposal replay.

## Repository reconnaissance

Baseline `3c642077`. Browser probes reproduced historical-account reassignment
and demo Reports/CSV using seeds rather than the persisted ledger. Deterministic
probes reproduced cache repopulation after logout and concurrent agent proposals.
OAuth scopes do not limit database access: current RPCs enforce user ownership
without distinguishing third-party clients.

## Research

Supabase OAuth token-security documentation establishes that database/RPC
authorization must enforce `client_id`; application capability allowlists alone
do not restrict direct PostgREST access. Existing first-party mutation and tenant
contracts remain the authorities. No dependency is introduced.

## Specification

- OAuth writes are rejected at every owned-table boundary, including writes
  inside SECURITY DEFINER RPCs.
- Only explicitly database-allowlisted OAuth clients may insert pending agent
  proposals belonging to the caller; they cannot approve or mutate ledger facts.
- Missing database allowlist denies proposals even if the application allowlist
  contains the client. Provider configuration is a separately approved operation.
- Historical editor references never silently fall back to another record.
- Session cleanup invalidates in-flight offline cache writes.
- Demo Reports page derives from the browser-owned ledger; the demo CSV route
  keeps its server href/download contract, so demo CSV content still reflects
  server seeds (documented remaining gap — the server cannot observe
  browser-local rows).
- Concurrent agent requests share one durable proposal identity.

## Implementation plan

Class 3. Add an additive database trigger boundary with catalog and caller tests;
repair each existing client owner in place with regressions. No provider setting,
production migration or data write is authorized by this task.

Verification: unit, lint, typecheck, build, focused browser proof and real pgTAP
in CI. Local environment has no Docker/PostgreSQL; local checks cannot substitute
for database evidence. Rollback is a reviewed follow-up migration removing guards
plus reverting the affected application changes; never edit deployed migrations.

## Tasks

- [x] OAuth table/RPC guard and client tests.
- [x] Historical editor references and regression.
- [x] Offline session generation and race regression.
- [x] Demo report/export ledger hydration.
- [x] Atomic agent proposal and replay handling.
- [ ] Exact-head verification and review handoff.

## Evaluation

Local verification on `3c642077` plus this diff:

- `npm test`: 1970 passed, including new session-rotation and concurrent-replay regressions.
- `npm run lint`, `typecheck`, production build: pass.
- `check:knowledge`, `check:architecture`, `check:capabilities`, `check:migrations`: pass (74 pinned).
- Browser probe (production build, demo): archived-account save is blocked with
  "Tài khoản cũ không còn hoạt động", stored account stays MB Bank.
- Browser probe (production build, demo): local 777.000₫ ledger row appears in
  Reports totals. Demo CSV keeps the server href/download contract, so its
  content still reflects server seeds; recorded below as the remaining gap.
- CI browser smoke initially failed on the removed demo export href; the export
  contract was restored and the page hydration kept, preserving both the fix
  and the existing `a[href]`/download assertions.
- `supabase/tests/database/oauth_mutation_boundary.test.sql` and the agent
  identity unique index require real pgTAP in CI; local env has no
  Docker/PostgreSQL so database evidence is still pending. Migration must not
  ship until that CI gate passes.

## Handoff record

Owner → implementer: fixes authorized on a focused branch. Next allowed action:
implementation and local/CI verification. Deployment/provider writes require a
separate owner decision. No destructive cleanup of historical candidates.
