# MoneyFlow Trust — Provider Sync

**Status:** specified
**Execution state:** specified
**Active role:** planner
**Permission scope:** provider_read
**Owner:** Thunderkill016
**Issue/PR:** #325 reconnaissance; provider write requires later explicit owner approval
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent:** `docs/plans/active/public-beta-trust.md`  
**Current main audited:** `fd984a18201f1663d3d8c622d51c41dfd650c816`  
**Supabase project:** MoneyFlow / `fwpldsdkpzhswpuctbke`

## Outcome

Bring the production Supabase schema and `delete-account` Edge Function into deliberate alignment with the already-merged MoneyFlow repository before Phase 1 Secure can be called deployed/accepted and before Phase 2 Recover implementation begins.

This packet records drift and a safe rollout design. It does **not** authorize or execute production DDL, Edge Function deployment or production-data mutation.

## Repository reconnaissance

### Current behavior

Read-only inspection on 2026-08-08 found two independent provider drifts.

#### 1. Production Edge Function is older than current main

Supabase production reports:

- function: `delete-account`;
- active version: **5**;
- `verify_jwt=true`;
- deployed source verifies the bearer user with `getUser()` and then calls `purge_user_tenant_data`;
- deployed source has **no** `evaluateAccountDeletionRecentAuth` import;
- deployed source has **no** verified AMR recent-auth gate;
- deployed tenant inventory ends at the older account/import tables and does not include current repository ownership for provenance, rules, reconciliation or financial mutation audit.

Current `main` source differs materially:

- imports `evaluateAccountDeletionRecentAuth`;
- verifies JWT claims and returns `recent_auth_required` before purge when AMR is stale/invalid;
- includes `transaction_import_provenance`, `inbox_rules`, `account_reconciliations`, `account_reconciliation_events` and `financial_mutation_audit_events` in the tenant inventory.

Therefore Vercel `READY` for #324 proves only the Next.js deployment. It does **not** deploy or prove the Supabase Edge Function.

#### 2. Production database migration history is behind merged MoneyFlow schema

Production `supabase_migrations.schema_migrations` currently contains MoneyFlow migrations through:

- `20260802022923_dashboard_read_bundle`

After that point the inspected remote history contains Atoryn design/editor migrations, while the following **confirmed current-main MoneyFlow migrations are absent from remote migration history**:

| Migration | Merged provenance | Purpose |
|---|---|---|
| `20260802060004_cover_foreign_key_indexes.sql` | #236 merged | public FK index coverage |
| `20260803142000_account_reconciliation_current_main.sql` | #261 merged | reconciliation domain/tables/state/RPC foundation |
| `20260803144500_account_reconciliation_ci_hardening.sql` | #261 merged | reconciliation verification hardening |
| `20260803153000_account_reconciliation_workspace_read_model.sql` | #263 merged | reconciliation workspace read model |
| `20260804110000_authenticated_deterministic_rules.sql` | #265 merged | authenticated `inbox_rules` domain/RPCs |
| `20260804160000_financial_mutation_audit.sql` | #270 merged | financial mutation audit domain/triggers |
| `20260804160100_financial_read_plan_indexes.sql` | #270 merged | plan/index correctness |
| `20260804160200_financial_audit_service_role_inspection.sql` | #270 merged | audit service-role inspection boundary |
| `20260804160300_financial_audit_request_id_token.sql` | #270 merged | bounded request-correlation token contract |

Direct catalog checks confirm these current-main tables are absent in production:

- `public.account_reconciliations`;
- `public.account_reconciliation_events`;
- `public.inbox_rules`;
- `public.financial_mutation_audit_events`.

The reconciliation migrations are also absent from the remote migration history even though their files are merged on current main.

### Account-deletion impact already proven read-only

Production does contain `transaction_import_provenance`, but deployed Edge version 5 and its deployed purge RPC predate that domain.

The production `purge_user_tenant_data` definition does not explicitly delete or verify `transaction_import_provenance`.

Production FK inspection shows:

- provenance → Inbox candidate: `ON DELETE RESTRICT`;
- provenance → financial transaction: `ON DELETE RESTRICT`;
- provenance → Auth user: `ON DELETE CASCADE`.

Therefore an account that has retained provenance can cause the current purge transaction to fail when it tries to delete referenced candidate/transaction rows. This is a fail-closed cleanup failure rather than evidence that current repository deletion behavior is deployed.

No destructive production request was executed to prove this counterexample.

### Relevant repository/provider areas

| Area | Why it matters |
|---|---|
| `supabase/migrations/` | Git-owned schema history that remote migration history must reconcile with |
| `supabase/functions/delete-account/index.ts` | current merged destructive authority |
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | recent-auth helper required by current function |
| `supabase_migrations.schema_migrations` | remote applied-migration authority |
| production `delete-account` function version/source | actual provider runtime authority |
| migration/pgTAP suites | replay/security/financial invariant evidence before provider writes |

### Existing tests and constraints

- Production DDL is a separate explicit owner action even after repository merge.
- Edge Function deployment is a provider write and requires explicit owner approval.
- Financial/data schema changes require migration replay + pgTAP before production application.
- Current account deletion must remain fail-closed throughout rollout.
- No real financial row or destructive real-user deletion is required for verification.

### Open questions

- [x] Is #324 fully deployed just because Vercel is READY? No.
- [x] Is current production `delete-account` source equal to current main? No.
- [x] Is remote database migration history aligned with current main? No.
- [x] Are reconciliation/rules/audit tables present in production? No.
- [ ] Is the confirmed nine-migration missing set exhaustive against the complete current `supabase/migrations/` directory? Must be proven by a local/remote migration-list diff before any write.
- [ ] Do any missing migrations require special rollout sequencing beyond filename order due to currently deployed application fallbacks? Recheck migration SQL and current app fallback behavior before owner approval.

## Research

### Research scope and source selection

Repository and provider state were inspected first. Official Supabase documentation was then checked for current deployment/migration mechanics.

### Sources

| Source | Authority | Applied decision | Limitation |
|---|---|---|---|
| production Supabase catalog + migration history | live provider truth | establishes actual schema/migration drift | read-only snapshot at inspection time |
| production `delete-account` source/version | live provider truth | establishes Edge Function drift | does not itself prove any destructive flow |
| current MoneyFlow main/migration files and merged PRs #236/#261/#263/#265/#270/#324 | repository truth | establishes intended merged provider contract | merge is not provider deployment |
| Supabase Database Migrations docs | official/current | remote history and local files are separate systems; compare migration status before push | CLI command still requires authenticated linked project for execution |
| Supabase Edge Function deployment docs | official/current | functions require an explicit Supabase deployment; Vercel deployment is unrelated | deployment remains an owner-authorized provider write |

### Relevant current Supabase changes

The 2026 Supabase changelog was checked before planning provider work. No inspected breaking change changes the basic database migration or Edge Function deployment contract used here. The July 2026 `logs.all` Management API change is unrelated to this rollout; extension-version deprecation is also unrelated because these confirmed migrations do not depend on pinning extension versions in this packet.

### Alternatives considered

| Option | Risk | Decision |
|---|---|---|
| continue P2 Recover while ignoring drift | design/verify against provider state that differs from current main | reject |
| call #324 deployed based on Vercel only | false security claim; Supabase function remains old | reject |
| deploy Edge Function only | recent-auth improves, but current function's tenant inventory references tables not yet present if deployed before schema sync | reject as first action |
| push DB migrations blindly then deploy function | may be correct but lacks exhaustive migration diff and pre-write replay evidence | reject until planned/evaluated |
| reconcile complete remote migration list, replay locally, then apply missing DB migrations in order, verify, then deploy current Edge Function and perform safe provider smoke | explicit, recoverable, evidence-driven | selected candidate rollout |

### Research decision

Treat provider alignment as a prerequisite checkpoint inside MoneyFlow Trust. Do not advance P1 to `deployed` or P2 to implementation until remote schema and Edge Function match the accepted current-main contract and are independently verified.

### Adoption review

No new dependency/service/provider is adopted. This is alignment of the existing Supabase provider with already-merged repository contracts.

## Specification

### Problem

The Git repository has moved ahead of the production Supabase database and Edge Function. Current application code includes schema-skew fallbacks for some capabilities, which prevents obvious crashes but can hide provider drift. Security-sensitive deletion code is also newer in Git than the production Edge Function.

### User stories

- As a user, permanent deletion is protected by the current merged recent-auth policy at the provider that actually performs deletion.
- As a user, merged reconciliation/rules/audit capabilities are backed by their intended production schema rather than silently degraded fallbacks.
- As the owner, production migration/function state is traceable to the exact repository contract before public beta.

### Acceptance criteria

- [x] PS-AC1: read-only inspection records remote migration history and current Edge Function source/version.
- [x] PS-AC2: confirmed current-main/production drift is named without applying writes.
- [ ] PS-AC3: complete current local-vs-remote migration list is compared and missing set is exhaustive.
- [ ] PS-AC4: every missing migration replays from a fresh local database and all pgTAP/security invariants pass before production application.
- [ ] PS-AC5: owner explicitly approves the exact production migration set/order and rollback boundary.
- [ ] PS-AC6: approved missing migrations are applied in repository order and remote migration history matches the intended set.
- [ ] PS-AC7: production catalog confirms expected tables/functions/indexes/RLS/grants after migration.
- [ ] PS-AC8: owner explicitly approves deploying current `delete-account` function + shared helper.
- [ ] PS-AC9: production `delete-account` source/version contains the recent-auth gate and current tenant inventory.
- [ ] PS-AC10: production-safe stale-auth/ordinary-login/provider step-up behavior is verified without destructive real-user deletion.
- [ ] PS-AC11: no new provider/database error cluster appears in the affected verification window.
- [ ] PS-AC12: current memory and P1 lifecycle are reconciled to `deployed`/`accepted` only after evidence exists.

### Required states

- Before writes: remote drift known, writes forbidden.
- DB rollout: exact missing set + order + replay evidence + owner approval.
- Function rollout: only after schema supports current tenant inventory; exact current source + helper deployed.
- Verification: provider/catalog/function source and safe behavior inspected independently.
- Failure: stop, preserve fail-closed behavior and follow rollback/remediation plan; do not continue to P2.

### Financial and security constraints

- No data repair, fabricated rows or destructive real-user test.
- Preserve integer-money, transfer-neutrality and split exactness.
- Preserve RLS/ownership and least privilege.
- Do not deploy current Edge tenant inventory before required tables exist.
- Do not bypass migration history by manually editing `supabase_migrations.schema_migrations` as a shortcut.
- Do not mark migrations applied unless provider schema actually matches them.
- Secrets/service-role credentials must never be copied into repo/docs/chat evidence.

### Out of scope

- Phase 2 backup/restore implementation.
- New product features.
- UI redesign.
- Atoryn design/editor schema cleanup unless it directly blocks MoneyFlow migration application.
- Deleting real production users.

## Implementation plan

### Architecture fit

This is provider alignment, not a new architecture. PostgreSQL migrations remain the schema authority and Supabase Edge Functions remain the deletion runtime.

### Candidate rollout order

1. Freeze provider writes for this task until exact migration diff is complete.
2. Compare complete current repo migration list against remote `supabase_migrations.schema_migrations`.
3. Inspect every missing migration and dependency; confirm no unexpected MoneyFlow migration is omitted.
4. Fresh local reset/replay all current migrations and full pgTAP/security suite.
5. Record exact remote pre-state (migration tail, relevant table/function presence, current Edge version/hash).
6. Return to owner with exact migration files, risk and rollback; obtain explicit `provider_write_approved` boundary.
7. Apply missing migrations **in repository order**, using the standard Supabase migration mechanism rather than ad-hoc DDL.
8. Verify remote migration history, expected catalog objects, RLS/grants and advisors.
9. Obtain/confirm explicit approval for current `delete-account` Edge deployment.
10. Deploy current `delete-account` function with its relative shared helper and preserve `verify_jwt=true`.
11. Read back deployed function/version/source to prove provider identity.
12. Perform production-safe auth routing + authenticated step-up evidence without sending a destructive confirmed deletion.
13. Inspect Supabase/Vercel error signals; reconcile P1 and parent memory.

### Rollback

A generic blind rollback is unsafe because these are additive/behavioral historical migrations already expected by current application code. Before production write, each missing migration must be reviewed for a migration-specific rollback or forward-fix strategy. If a migration fails partway, stop and inspect actual transaction/history state before any repair. Do not mark failed migrations applied manually to make history look green.

The Edge Function can be rolled back to the previously captured version only if the rollback does not reintroduce a known destructive security defect. Prefer a forward fix when the database has already advanced to the current schema.

### Risks and counterexamples

| Risk | Control |
|---|---|
| Vercel READY hides Supabase drift | treat providers separately |
| current Edge deployed before missing tables | DB sync must precede Edge deployment |
| migration filename list is incomplete | require exhaustive migration-list diff before write |
| migration history repaired instead of schema | prohibit history-only shortcut |
| live user data violates a new constraint | inspect migrations + safe preflight queries before write |
| account deletion purges around provenance incorrectly | current schema/function tests + no destructive live deletion |
| schema-skew fallbacks hide missing capability | verify provider catalog directly after rollout |
| unrelated Atoryn tables confuse MoneyFlow archive/provider scope | explicit MoneyFlow allowlist and current-main migrations only |

### Verification plan

- Repository: exact main migration inventory and current function/helper source.
- Local DB: fresh reset + complete pgTAP/security suite.
- Production preflight: read-only migration history/catalog/constraints/function source.
- Production post-write: migration history/catalog/RLS/grants/advisors.
- Edge: read-back deployed source/version/hash with `verify_jwt=true`.
- Product: safe login/reauth boundary smoke; no destructive real-user deletion.
- Observability: affected Supabase Edge/Auth/Postgres logs plus Vercel runtime errors where applicable.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| PS-T1 | capture production migration/function baseline | live read-only provider evidence | complete |
| PS-T2 | identify confirmed missing merged MoneyFlow migrations | migration history + merged PR/file evidence | complete, not yet exhaustive |
| PS-T3 | compare complete repo/local vs remote migration list | migration-list diff | todo |
| PS-T4 | review missing SQL + preflight risks | per-migration review | todo |
| PS-T5 | fresh local replay + full pgTAP | CI/local evidence | todo |
| PS-T6 | owner provider-write checkpoint for exact DB set/order | explicit approval | blocked by PS-T3–T5 |
| PS-T7 | apply approved production migrations | remote history/catalog evidence | blocked |
| PS-T8 | owner provider-write checkpoint for Edge deployment | explicit approval | blocked by PS-T7 |
| PS-T9 | deploy/read-back current `delete-account` | version/source/hash evidence | blocked |
| PS-T10 | production-safe recent-auth provider acceptance | auth/provider evidence | blocked |
| PS-T11 | reconcile P1 + parent/current memory | accepted provider evidence | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | researcher | planner | specified | production migration history/catalog; production Edge v5 source; current-main source; merged PR migration files | missing migration set not yet proven exhaustive | finish complete migration diff + replay plan; no provider writes |

### Current permission boundary

- Allowed: repository branch/docs work, GitHub/provider read-only inspection, external official research.
- Current provider scope: `provider_read`.
- Forbidden: production DDL, Supabase migration application/repair, Edge deployment, provider config change, production-data mutation, real-account deletion.
- Required before DB write: exact file list/order + replay evidence + owner `provider_write_approved` decision.
- Required before Edge write: database alignment evidence + exact function bundle + owner `provider_write_approved` decision.

## Evaluation

### Acceptance evidence

- Current main Edge source has recent-auth gate and expanded tenant inventory: pass.
- Production Edge source/version lacks those changes: drift confirmed.
- Production migration history does not contain confirmed merged MoneyFlow migrations listed above: drift confirmed.
- Reconciliation/rules/audit production tables are absent: drift confirmed.
- `transaction_import_provenance` exists while production purge/function inventory predates it: lifecycle drift confirmed.
- No provider write performed: pass.

### Review findings

**P0 blocker:** Security-sensitive provider runtime and production schema do not match current merged repository contracts. Phase 1 cannot truthfully remain `deployed`, and Phase 2 implementation must not start before provider alignment.

### Remaining limitations

- Full repo-vs-remote migration list has not yet been mechanically diffed; confirmed nine-file set must not be called exhaustive yet.
- No production migration has been applied.
- No Edge Function has been deployed.
- No live authenticated provider step-up has been exercised.

## Delivery record

- Discovery branch/PR: `agent/moneyflow-trust-reconcile-p1` / #325.
- Provider writes: none.
- Production data writes: none.
- Current next state: remain `specified` until exhaustive diff/replay plan is complete, then `planned` and return to owner provider-write checkpoint.
