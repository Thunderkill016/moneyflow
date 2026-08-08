# MoneyFlow Trust — Provider Sync

**Status:** planned
**Execution state:** planned
**Active role:** planner
**Permission scope:** provider_read
**Owner:** Thunderkill016
**Issue/PR:** #325 reconciliation; provider write requires a later explicit owner approval
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent:** `docs/plans/active/public-beta-trust.md`  
**Current main audited:** `fd984a18201f1663d3d8c622d51c41dfd650c816`  
**Supabase project:** MoneyFlow / `fwpldsdkpzhswpuctbke`

## Outcome

Align production Supabase database history/schema and the `delete-account` Edge Function with accepted current `main` before Phase 1 Secure can advance from `merged` to `deployed/accepted` and before Phase 2 Recover implementation begins.

Provider Sync is now sufficiently specified to return to an owner write checkpoint. This packet does **not** authorize or execute production DDL, migration-history repair, Edge deployment, provider configuration changes, production-data mutation or destructive account deletion.

## Repository reconnaissance

### Production provider drift

Read-only inspection on 2026-08-08 proved two independent drifts.

#### Edge Function drift

Production `delete-account`:

- active version: **5**;
- `verify_jwt=true`;
- deployed source verifies the bearer user with `getUser()` and then calls `purge_user_tenant_data`;
- no `evaluateAccountDeletionRecentAuth` import;
- no verified AMR recent-auth gate;
- tenant inventory predates current provenance/rules/reconciliation/audit ownership.

Current `main`:

- evaluates verified JWT AMR evidence before tenant purge;
- only current `password`/`oauth` evidence can satisfy deletion recency;
- returns `recent_auth_required` before destructive authority when evidence is stale/unsupported;
- current tenant inventory includes `transaction_import_provenance`, `inbox_rules`, `account_reconciliations`, `account_reconciliation_events` and `financial_mutation_audit_events`.

Vercel `READY` for #324 therefore proves the Next.js deployment only. It does not deploy the Supabase database or Edge Function.

#### Database migration drift

Remote MoneyFlow migration history reaches `20260802022923_dashboard_read_bundle`. Seven later remote entries belong to Atoryn design/editor work and are legitimate remote history that MoneyFlow must preserve.

Exact-head CI #2070 fresh-reset logs enumerate the complete MoneyFlow migration sequence after the remote MoneyFlow tail. Comparing those versions with production `supabase_migrations.schema_migrations` proves this **10-file missing set** on current `main`:

| Order | Migration | Merged provenance | Main effect |
|---:|---|---|---|
| 1 | `20260802060004_cover_foreign_key_indexes.sql` | #236 | FK-supporting indexes |
| 2 | `20260803090000_transaction_review_bulk_correction.sql` | #255 | review enum/column/index/view + bounded bulk RPCs |
| 3 | `20260803142000_account_reconciliation_current_main.sql` | #261 | reconciliation types/tables/entry state/RPCs/triggers |
| 4 | `20260803144500_account_reconciliation_ci_hardening.sql` | #261 | FK indexes + snapshot authorization hardening |
| 5 | `20260803153000_account_reconciliation_workspace_read_model.sql` | #263 | account reconciliation entry view |
| 6 | `20260804110000_authenticated_deterministic_rules.sql` | #265 | `inbox_rules`, RLS/triggers/RPCs + candidate rule evidence |
| 7 | `20260804160000_financial_mutation_audit.sql` | #270 | audit table/triggers + current tenant purge function |
| 8 | `20260804160100_financial_read_plan_indexes.sql` | #270 | guarded budget read index |
| 9 | `20260804160200_financial_audit_service_role_inspection.sql` | #270 | service-role read-only audit inspection |
| 10 | `20260804160300_financial_audit_request_id_token.sql` | #270 | bounded request-id constraint/helper |

A production query checked all ten versions directly; all ten are absent from remote migration history. Exact-head CI #2070 `supabase db reset --local` applied all ten in this order as part of the full migration chain, then `supabase test db` passed **25 pgTAP files / 478 tests / all successful**.

This establishes the 10-file MoneyFlow missing set for `main@fd984a...`; the remote-only Atoryn migrations remain a separate legitimate history branch inside the same Supabase project and must not be deleted or falsely repaired away.

### Production catalog/preflight state

Read-only catalog inspection confirms:

- missing types: `transaction_review_status`, `entry_reconciliation_state`, `financial_audit_action`;
- missing columns: `financial_transactions.review_status`; `transaction_entries.reconciliation_state/cleared_at/reconciliation_id`; `inbox_candidates.applied_rule_id/applied_rule_version`;
- missing tables: `account_reconciliations`, `account_reconciliation_events`, `inbox_rules`, `financial_mutation_audit_events`;
- target index names checked during preflight are absent, so there is no known same-name collision;
- current affected row counts are small: 47 financial transactions, 47 transaction entries, 6 Inbox candidates, 3 accounts, 33 categories, 0 monthly budgets and 0 transaction-import provenance rows at inspection time.

These counts lower expected lock duration but do not relax production safety requirements.

### Existing account-deletion drift

Production contains `transaction_import_provenance`, while deployed Edge v5 and the deployed `purge_user_tenant_data` predate that ownership.

Production FK behavior:

- provenance → Inbox candidate: `ON DELETE RESTRICT`;
- provenance → financial transaction: `ON DELETE RESTRICT`;
- provenance → Auth user: `ON DELETE CASCADE`.

At inspection time the provenance table has zero rows, so this specific current-user-data counterexample is not active. The old purge is still structurally stale and must not be described as current deletion behavior.

No destructive production request was executed.

### Per-migration rollout review

| Migration group | Production characteristic | Risk | Rollout decision |
|---|---|---|---|
| FK index coverage | ordinary `CREATE INDEX` statements | standard builds block writes to each indexed table while building | low at current table sizes; apply in normal migration order during a bounded write window |
| transaction review | enum + `ADD COLUMN review_status NOT NULL DEFAULT 'reviewed'` + index/view/RPCs | `ALTER TABLE` needs an exclusive schema lock; index build blocks writes; existing rows receive constant default semantics | low/moderate; PostgreSQL 17 stores a non-volatile default in metadata without table rewrite, but lock acquisition still matters |
| reconciliation foundation | new types/tables; `transaction_entries` gets constant-default state + nullable fields + unique/FK/check constraints; indexes; triggers/RPCs | largest schema-lock surface; unique/FK/index creation and `ALTER TABLE` can block writes | moderate; current 47-row entry table and PK-backed identity make data conflict unlikely; apply only after preflight and during bounded window |
| reconciliation hardening/read model | supporting indexes + function/view | standard index write blocking; no historical row rewrite | low after foundation succeeds |
| authenticated rules | new table/RLS/triggers/RPCs; nullable candidate evidence columns + check/index | `ALTER TABLE inbox_candidates` lock and index build; existing rows satisfy nullable pair constraint | low/moderate at 6 candidate rows |
| financial mutation audit | new append-only table/RLS + transaction/entry/reconciliation triggers + replacement tenant purge | behavior change starts immediately for all future financial mutations; trigger failure intentionally aborts ledger mutation | moderate/high operational importance; no historical audit backfill; must be verified immediately after migration |
| financial read index | guarded ordinary index creation | write blocking while index builds if needed | low; current budgets empty |
| audit service-role grant | privilege change only | least-privilege regression if incorrect | low; pgTAP already covers expected boundary |
| request-id token | check constraint on new audit table + helper replacement | validates any audit rows created between migrations 7 and 10 | low if rollout is continuous; execute migrations 7–10 without deliberate pause |

### Dependency order

The filename order is also the semantic dependency order and must not be rearranged:

1. transaction review precedes reconciliation/audit because later code references `review_status`;
2. reconciliation foundation precedes its hardening/read model and audit triggers;
3. rules precede current tenant purge because the current purge references `inbox_rules`;
4. financial audit precedes its index/grant/request-id follow-ups and installs the current complete tenant purge;
5. database alignment must complete before deploying current `delete-account`, because current Edge tenant verification references the new provider-owned tables.

## Research

### Official migration mechanics

Current Supabase CLI documentation establishes:

- local migration files and remote `supabase_migrations.schema_migrations` are separate histories;
- `supabase migration list` compares timestamps;
- `supabase db push --dry-run` previews without applying;
- `supabase db push --include-all` includes local migrations not found in remote history, including older local migrations that sit before the latest remote version;
- `migration repair` changes only migration-history tracking and does not apply SQL;
- `supabase migration fetch` fetches migration files represented in remote history;
- Edge Functions require an explicit `supabase functions deploy`; Vercel deployment is unrelated.

Current PostgreSQL 17 documentation establishes:

- `ALTER TABLE` generally acquires `ACCESS EXCLUSIVE` unless a subcommand documents otherwise;
- adding a column with a non-volatile constant default stores the value in metadata for existing rows and does not require a table rewrite;
- ordinary `CREATE INDEX` permits reads but blocks writes until the build completes; `CREATE INDEX CONCURRENTLY` avoids that write block but cannot run inside a transaction block.

### Shared remote history problem

The Supabase project also contains seven later Atoryn migration versions that are not owned by the MoneyFlow repository. Their remote migration-history rows contain statement payloads, so they are fetchable.

Do **not** use `migration repair --status reverted` on those legitimate Atoryn rows merely to make the MoneyFlow repository look linear.

The safe CLI candidate is an **ephemeral provider-sync working copy**:

1. start from exact MoneyFlow `main`;
2. use read-only `supabase migration fetch --linked` (or otherwise materialize the seven legitimate remote-only migration files from remote history) in that ephemeral copy so local migration history represents the union required by the shared project;
3. verify the fetched Atoryn versions match remote history and do not commit them into MoneyFlow product history by default;
4. run `supabase migration list --linked`;
5. run `supabase db push --linked --include-all --dry-run`;
6. require the dry-run to list **exactly the ten MoneyFlow files above and nothing else** before any production write.

If the current CLI still reports a remote/local mismatch after this read-only reconciliation, stop. Do not repair or mutate migration history automatically. Re-plan the shared-project history explicitly.

### Alternatives considered

| Option | Decision |
|---|---|
| continue Recover while provider state differs from Git | reject |
| call #324 deployed based on Vercel only | reject |
| deploy current Edge before DB alignment | reject; current function references provider objects not present |
| use ad-hoc `execute_sql` DDL | reject; would bypass migration ownership/history |
| use `migration repair` to remove legitimate Atoryn history | reject |
| use MCP `apply_migration` with newly generated versions | reject for this historical sync; it would not preserve the accepted original MoneyFlow migration versions |
| use ephemeral union history + `--include-all --dry-run`, then owner-approved standard migration push | selected candidate |

## Specification

### Problem

Git and production Supabase are materially split. Security-sensitive deletion code is newer in Git than the production Edge Function, while multiple merged DB-backed features are absent from production schema. Schema-skew fallbacks keep parts of the UI functioning but cannot substitute for provider alignment.

### Acceptance criteria

- [x] PS-AC1: remote migration history and Edge source/version captured read-only.
- [x] PS-AC2: current-main/provider drift recorded without writes.
- [x] PS-AC3: missing MoneyFlow migration set is mechanically reconciled to exactly ten files.
- [x] PS-AC4: current migration chain including all ten replays from fresh local DB and full pgTAP passes (25 files / 478 tests).
- [x] PS-AC5: per-migration lock/data/privilege/behavior risks are reviewed and current production preflight state is recorded.
- [ ] PS-AC6: an ephemeral union-history CLI dry-run lists exactly the ten MoneyFlow migrations and no unrelated write.
- [ ] PS-AC7: owner explicitly approves the exact production DB write boundary after seeing the dry-run/risk plan.
- [ ] PS-AC8: approved migrations are applied in repository order and remote history/catalog matches the accepted contract.
- [ ] PS-AC9: post-migration RLS/grants/functions/indexes/advisors and core DB invariants are verified.
- [ ] PS-AC10: owner explicitly approves current `delete-account` Edge deployment after DB alignment.
- [ ] PS-AC11: production Edge read-back proves recent-auth gate/current tenant inventory/`verify_jwt=true`.
- [ ] PS-AC12: production-safe stale-auth/password/Google step-up evidence is recorded without destructive real-user deletion.
- [ ] PS-AC13: no affected Supabase/Vercel error cluster appears during verification.
- [ ] PS-AC14: P1/current memory advances to deployed/accepted only after provider evidence exists.

### Financial and security constraints

- No fabricated rows, data repair or destructive real-user test.
- Preserve integer-money, transfer neutrality, split exactness and tenant ownership.
- Do not deploy current Edge tenant inventory before required tables exist.
- Do not edit migration history as a shortcut for unapplied SQL.
- Preserve legitimate Atoryn remote migration history.
- Do not commit fetched Atoryn migration payloads into MoneyFlow unless a separate architecture decision makes the shared provider history an intentional repository contract.
- Secrets/service-role credentials must not enter repo/docs/chat evidence.

## Implementation plan

### Database write candidate

After PS-AC6 dry-run and explicit owner approval:

1. capture remote pre-state again immediately before write;
2. ensure no unexpected long-running/locking transaction blocks the affected tables;
3. run the standard Supabase migration push from the exact reviewed ephemeral union-history working copy with `--include-all` and no seed/role flags;
4. stop immediately on the first error; do not manually mark anything applied;
5. verify all ten original MoneyFlow versions now exist in remote migration history;
6. verify expected types/columns/tables/indexes/functions/RLS/grants;
7. run read-only integrity checks and advisors;
8. exercise safe non-destructive application reads/RPCs that depend on the new schema;
9. only then consider Edge deployment.

### Edge deployment candidate

After database verification and explicit owner approval:

1. capture current production Edge v5 metadata/hash for provenance;
2. deploy current `delete-account` bundle including `_shared/account-deletion-recent-auth.ts`;
3. preserve `verify_jwt=true`;
4. read back deployed version/source/hash;
5. prove the recent-auth gate and current tenant inventory are present;
6. exercise ordinary/stale/fresh provider flows without sending confirmed destructive deletion;
7. inspect provider/runtime errors;
8. reconcile Secure lifecycle.

### Rollback / forward-fix

The ten migrations are additive/behavioral history already expected by current application code; blindly rolling the database backwards is not the default recovery strategy.

- If a migration fails transactionally: stop, inspect schema/history state, verify whether it rolled back, and repair forward only from observed state.
- Do not mark a failed migration applied.
- Index-only failures can generally be forward-fixed after inspecting invalid/partial indexes.
- If audit triggers break a valid financial mutation after successful migration, disable/revert only through an explicit emergency owner-approved plan; because audit and current purge are security/trust features, prefer a forward fix.
- Edge rollback to v5 would reintroduce a known security gap, so after current Edge is deployed prefer a forward fix unless the current deployment itself makes deletion or auth unsafe; any rollback requires an explicit owner decision.

### Verification plan

- CLI dry-run: exact ten-file write set only.
- Local DB: existing exact-head fresh reset + 478 pgTAP pass remains baseline; rerun if migration files/main change before write.
- Remote post-DB: migration history, catalog, RLS/grants, function definitions, indexes and advisors.
- Application: reconciliation/rules/audit-dependent safe paths and deletion preconditions, no destructive delete.
- Edge: read-back version/source/hash + safe provider auth flow.
- Observability: Supabase DB/Auth/Edge and Vercel error windows appropriate to affected paths.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| PS-T1 | capture production migration/function baseline | live read-only provider evidence | complete |
| PS-T2 | prove exhaustive ten-file MoneyFlow missing set | exact-head reset migration sequence + remote version checks | complete |
| PS-T3 | review ten SQL files/dependencies/lock/data risks | source review + production preflight | complete |
| PS-T4 | prove full current migration replay | CI #2070 database job: 25 files / 478 pgTAP / PASS | complete |
| PS-T5 | reconcile shared Atoryn remote history in ephemeral local working copy and run exact `--include-all --dry-run` | CLI read-only output | todo |
| PS-T6 | owner provider-write checkpoint for exact DB set/order | explicit approval | blocked by PS-T5 |
| PS-T7 | apply/verify approved ten migrations | remote history/catalog/integrity evidence | blocked |
| PS-T8 | owner provider-write checkpoint for Edge deployment | explicit approval | blocked by PS-T7 |
| PS-T9 | deploy/read-back current `delete-account` | version/source/hash evidence | blocked |
| PS-T10 | production-safe recent-auth provider acceptance | password/Google evidence | blocked |
| PS-T11 | reconcile P1 + parent/current memory | accepted provider evidence | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | researcher | planner | specified | provider migration/catalog/Edge reads | migration set/replay risk review incomplete | continue read-only |
| 2026-08-08 | planner | evaluator | planned | exact 10-file diff; CI #2070 full replay/478 pgTAP; per-file risk review; official CLI/Postgres research | exact linked CLI dry-run not yet captured | perform read-only ephemeral union-history dry-run; no provider writes |

### Current permission boundary

- Allowed: GitHub branch/docs work; GitHub/Vercel/Supabase read-only inspection; official external research; local/ephemeral CLI dry-run that does not mutate provider state.
- Current provider scope: `provider_read`.
- Forbidden: production DDL, actual `db push`, migration repair, Edge deployment, provider configuration change, production-data mutation and real-account deletion.
- Required before DB write: exact dry-run + explicit owner `provider_write_approved` decision.
- Required before Edge write: DB alignment evidence + exact bundle + explicit owner `provider_write_approved` decision.

## Evaluation

### Acceptance evidence

- Production Edge v5 lacks current recent-auth: **drift confirmed**.
- Production DB lacks exact 10 merged MoneyFlow migrations: **drift confirmed**.
- Exact current migration chain replays all ten and passes 478 pgTAP assertions: **pass**.
- Current production preflight objects/counts reveal no known same-name/index collision or data-shape blocker: **pass for planning**, not a write guarantee.
- Ordinary index builds and `ALTER TABLE` locks are explicitly accounted for: **pass**.
- Legitimate Atoryn remote migrations are preserved rather than repaired away: **required**.
- No provider write has occurred: **pass**.
- Exact linked CLI dry-run from union history: **pending**.

### Review finding

**Provider Sync remains the highest-priority MoneyFlow Trust blocker.** Recover implementation must not start until production Supabase schema and destructive Edge runtime align with current `main` and Secure provider acceptance is completed.

## Delivery record

- Discovery/reconciliation branch: `agent/moneyflow-trust-reconcile-p1`.
- PR: #325.
- Provider writes: none.
- Production data writes: none.
- Current state: `planned` at read-only dry-run boundary.
