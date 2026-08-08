# MoneyFlow Trust — Provider Sync

**Status:** in progress
**Execution state:** production DB aligned; Edge pending
**Active role:** evaluator
**Permission scope:** provider_read
**Owner:** Thunderkill016
**Issue/PR:** #325 reconciliation; production DB checkpoint owner-approved on 2026-08-08; Edge deployment still requires a separate explicit owner approval
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent:** `docs/plans/active/public-beta-trust.md`
**Current main audited:** `8d0070b3d039fc80647e888aa1bd89f18b4de0b4`
**Supabase project:** MoneyFlow / `fwpldsdkpzhswpuctbke`

## Outcome

Align production Supabase database history/schema and the `delete-account` Edge Function with accepted current `main` before Phase 1 Secure can advance from `merged` to `deployed/accepted` and before Phase 2 Recover implementation begins.

The production database portion is now aligned and structurally verified. The production `delete-account` Edge Function remains v5 and is still behind the merged recent-auth/current-tenant contract. No Edge deployment or destructive real-user deletion has been performed.

## Repository and provider truth

### Current Edge drift

Production inspection on 2026-08-08 showed `delete-account` v5 with `verify_jwt=true`, but without the merged recent-auth evaluator/current tenant inventory from #324. Vercel `READY` proves the Next.js deployment only; it does not deploy Supabase Edge Functions.

Current `main` requires recent interactive `password` or `oauth` AMR before destructive tenant purge and includes provenance/rules/reconciliation/audit ownership in the tenant inventory.

### Exact database migration set

The exact ten MoneyFlow migrations reviewed and applied, in dependency order, are:

1. `20260802060004_cover_foreign_key_indexes.sql`
2. `20260803090000_transaction_review_bulk_correction.sql`
3. `20260803142000_account_reconciliation_current_main.sql`
4. `20260803144500_account_reconciliation_ci_hardening.sql`
5. `20260803153000_account_reconciliation_workspace_read_model.sql`
6. `20260804110000_authenticated_deterministic_rules.sql`
7. `20260804160000_financial_mutation_audit.sql`
8. `20260804160100_financial_read_plan_indexes.sql`
9. `20260804160200_financial_audit_service_role_inspection.sql`
10. `20260804160300_financial_audit_request_id_token.sql`

Seven legitimate Atoryn migration-history rows in the same Supabase project were preserved unchanged:

- `20260804171954_create_atoryn_design_agent_bridge`
- `20260804184225_atoryn_design_cloud_v07`
- `20260804184624_atoryn_design_cloud_lockdown`
- `20260805050340_atoryn_native_editor_direct_control_v1`
- `20260805050355_atoryn_native_editor_project_metadata_v1`
- `20260805050413_atoryn_native_editor_activity_metadata_v1`
- `20260805050429_atoryn_native_editor_list_commands_v1`

## Pre-write evidence and accepted limitation

Exact-head CI #2070 had already replayed the complete current migration chain and passed **25 pgTAP files / 478 tests**.

A zero-cost Provider Sync probe was then run on PR #326 at exact head `0662ef8690ad204b145d91da0c9d29576e2abfc7`. GitHub Actions run `31259696558` reconstructed the live union-history shape in an ephemeral local Supabase database and ran:

`supabase db push --local --include-all --dry-run`

The dry-run selected exactly the ten MoneyFlow migrations above and no Atoryn migration. Fresh live production history immediately before the write still matched the simulated history shape.

**Accepted limitation:** PS-AC6's actual linked-production CLI dry-run was **not executed**. The owner explicitly said **“Go”** after being told the next checkpoint was applying the exact ten migrations to production, thereby approving the DB write using the free local union-history CLI simulation plus fresh live production-history/preflight evidence. This does not retroactively turn PS-AC6 into a pass.

PR #326 was closed unmerged after evidence capture; its branch-only workflow did not enter `main`.

## Production DB execution — 2026-08-08

### Immediate preflight

Immediately before the write:

- all ten target migration versions were absent from production history;
- MoneyFlow history still ended at `20260802022923_dashboard_read_bundle` before the target set;
- all seven legitimate Atoryn history rows were present;
- no unexpected active/long-running database transaction was found;
- source SQL was read from exact `main@8d0070b3d039fc80647e888aa1bd89f18b4de0b4`.

### Tracked-apply compatibility method

The connected Supabase Management/MCP `apply_migration` endpoint executes supplied SQL transactionally and records it in `supabase_migrations.schema_migrations`, but the provider generates the migration version from the current timestamp instead of accepting the repository filename version.

To preserve repository/provider identity without marking unapplied SQL as applied, each migration used this bounded sequence:

1. execute the exact reviewed source SQL through `apply_migration`;
2. require successful transactional application and locate the unique generated history row by generated version + source migration name;
3. guarded-update **only the history `version` field** from the provider-generated timestamp to the exact repository migration timestamp;
4. preserve the tracked name, statement payload and other history metadata;
5. verify the exact original version and expected catalog effects before starting the next migration.

No failed migration was marked applied. No Atoryn history row was repaired, reverted or rewritten.

### Per-migration result

| Order | Exact version | Result | Verification |
|---:|---|---|---|
| 1 | `20260802060004` | applied | exact history + 14/14 FK-supporting indexes |
| 2 | `20260803090000` | applied | review type/column/view + 2 RPCs |
| 3 | `20260803142000` | applied | 3 types, 2 RLS tables, 3 entry columns, summary view, 4 reconciliation RPCs |
| 4 | `20260803144500` | applied | exact history + 3/3 supporting indexes |
| 5 | `20260803153000` | applied | `account_reconciliation_entry_feed`, `security_invoker=true`, authenticated SELECT only |
| 6 | `20260804110000` | applied | `inbox_rules`, RLS, 4 policies, rule-evidence columns and authenticated RPC/DML boundary |
| 7 | `20260804160000` | applied | audit table/RLS, 3 audit triggers, current tenant purge contract |
| 8 | `20260804160100` | applied | required budget read-plan index shape present |
| 9 | `20260804160200` | applied | audit inspection grant applied; legacy service-role default ACL limitation recorded below |
| 10 | `20260804160300` | applied | bounded request-id constraint validated; helper EXECUTE revoked from public/browser/service roles |

After the sequence, all ten original MoneyFlow versions/names were present exactly once. No temporary provider-generated `2026080814...` migration version remained.

## Post-write verification

### Catalog and data invariants

Direct production verification returned:

- **27/27** checked target indexes present; **0** invalid or unready;
- **10/10** checked constraints present and validated; **0** unvalidated;
- existing rows preserved across the affected baseline: 47 financial transactions, 47 transaction entries, 6 Inbox candidates, 3 accounts, 33 categories, 0 monthly budgets, 0 import-provenance rows;
- new-domain row counts remained 0 for reconciliations, reconciliation events, Inbox rules and audit events, as expected from an additive rollout with no fabricated user data;
- `financial_transactions.review_status`: 0 null rows;
- `transaction_entries.reconciliation_state`: 0 null rows;
- `transaction_review_feed`: 45 active rows;
- `account_reconciliation_entry_feed`: 45 active logical account-leg rows;
- `account_reconciliation_summaries`: 0 rows because no reconciliation session exists;
- `transaction_review_feed`, `account_reconciliation_entry_feed` and `account_reconciliation_summaries` are `security_invoker=true`;
- `account_reconciliations`, `account_reconciliation_events`, `inbox_rules` and `financial_mutation_audit_events` have RLS enabled;
- a final activity check found 0 other active database sessions.

### Advisors and least-privilege finding

Security/performance advisors were re-run after the migration sequence.

Findings that do **not** invalidate the ten-file alignment:

- newly created and low-traffic indexes currently appear as `unused_index` INFO, which is expected immediately after rollout;
- an Atoryn audit-table foreign key lacks a covering index; it is outside this MoneyFlow rollout;
- existing/generic security advisor findings remain for leaked-password protection, a pre-existing `transaction_feed` security-definer view, some RLS init-plan optimizations, Atoryn permissive RLS and authenticated security-definer RPC exposure.

A specific forward-hardening finding was recorded for `financial_mutation_audit_events`: the migration grants `service_role` SELECT for inspection, but this older Supabase project's direct table ACL also gives `service_role` the platform's historical full table privileges. The same legacy pattern exists on established tables such as `accounts`. Current Supabase documentation describes this older default-grant behavior and its 2026 transition. This was **not** patched ad hoc because the approved boundary was the exact ten merged migrations; privilege tightening needs a new reviewed migration/spec.

### Runtime/log boundary

Postgres logs show the successful transactional migration statements. One `could not implement GROUP BY` error came from a read-only exploratory ACL verification query and was corrected; it was not a migration failure.

Older API 404/400 entries for the previously missing review/rule schema remain evidence of the pre-migration drift. The inspected post-write API slice did not contain enough new application traffic to claim a clean post-deploy runtime window. Edge-function logs were empty. Therefore PS-AC13 remains open.

## Acceptance criteria

- [x] PS-AC1: remote migration history and Edge source/version captured read-only.
- [x] PS-AC2: current-main/provider drift recorded.
- [x] PS-AC3: exact MoneyFlow set proven as ten files.
- [x] PS-AC4: current migration chain including all ten replays and 478 pgTAP assertions pass.
- [x] PS-AC5: per-migration dependency/lock/data/privilege risks and production preflight recorded.
- [ ] PS-AC6: actual linked union-history CLI dry-run lists exactly the ten reviewed MoneyFlow migrations and no unrelated write. **Not executed; accepted free-simulation substitution for the owner-approved DB checkpoint.**
- [x] PS-AC7: owner explicitly approved the exact production DB write boundary with “Go”.
- [x] PS-AC8: approved migrations were applied in order; original remote history versions/catalog now match current main and Atoryn history remains preserved.
- [x] PS-AC9: post-migration RLS/grants/functions/indexes/advisors and core DB invariants were verified; legacy service-role default ACL is recorded as a forward-hardening finding.
- [ ] PS-AC10: owner explicitly approves current `delete-account` Edge deployment.
- [ ] PS-AC11: production Edge read-back proves recent-auth/current tenant inventory/`verify_jwt=true`.
- [ ] PS-AC12: safe stale-auth/password/Google step-up evidence is recorded without destructive real-user deletion.
- [ ] PS-AC13: no affected provider/runtime error cluster appears during a post-deployment verification window.
- [ ] PS-AC14: P1/current memory advances only after provider evidence exists.

## Financial and security constraints

- No fabricated rows, data repair or destructive real-user test.
- Preserve integer money, transfer neutrality, split exactness, RLS and tenant ownership.
- Do not deploy current Edge before a separate owner checkpoint.
- Preserve legitimate Atoryn remote migration history.
- Never copy provider credentials/secrets into repository evidence.
- Do not make an ad-hoc service-role ACL correction outside a reviewed forward migration.

## Edge deployment candidate

After separate explicit owner approval:

1. recapture current production Edge v5 metadata/source immediately before write;
2. deploy current `delete-account` bundle including `_shared/account-deletion-recent-auth.ts`;
3. preserve `verify_jwt=true`;
4. read back deployed version/source/hash;
5. prove the recent-auth gate and current tenant inventory exist;
6. exercise safe ordinary/stale/fresh provider flows without confirmed destructive deletion;
7. inspect Auth/Edge/API/Postgres runtime errors;
8. reconcile P1 Secure and parent Trust state only from evidence.

## Rollback / forward-fix

The ten database migrations are additive/behavioral history expected by current application code. Blind rollback is not the default.

- If a newly exposed valid financial path fails because of the rollout, prefer a reviewed forward fix under an explicit emergency owner boundary.
- Do not alter the historical ten migrations in place.
- Do not remove the seven shared Atoryn history rows.
- Edge rollback to v5 would reintroduce a known recent-auth gap; after any later Edge rollout, prefer forward fix unless the new deployment is itself unsafe.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| PS-T1 | capture production migration/function baseline | live provider reads | complete |
| PS-T2 | prove exact ten-file MoneyFlow set | CI sequence + remote version checks | complete |
| PS-T3 | review SQL/dependencies/lock/data risks | source + production preflight | complete |
| PS-T4 | prove full migration replay | CI #2070: 25 pgTAP files / 478 pass | complete |
| PS-T5 | run actual linked union-history `--include-all --dry-run` | not executed; PR #326 local union-history run `31259696558` used as accepted substitution | accepted limitation |
| PS-T6 | owner DB provider-write checkpoint | explicit “Go” | complete |
| PS-T7 | apply/verify approved ten migrations | exact remote history/catalog/integrity/advisor evidence | complete |
| PS-T8 | owner Edge provider-write checkpoint | separate explicit approval | todo |
| PS-T9 | deploy/read back current `delete-account` | version/source/hash | blocked by PS-T8 |
| PS-T10 | production-safe recent-auth provider acceptance | stale/fresh password/Google evidence; no destructive deletion | blocked by PS-T9 |
| PS-T11 | reconcile P1/parent/current memory | accepted provider evidence | in progress |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | researcher | planner | specified | provider migration/catalog/Edge reads | exact set/replay/risk review incomplete | continue read-only |
| 2026-08-08 | planner | evaluator | planned | exact ten-file diff; CI #2070 replay/478 pgTAP; per-file risk review | actual linked CLI dry-run unavailable | run non-writing free simulation |
| 2026-08-08 | evaluator | owner | DB checkpoint | PR #326 local union-history dry-run + fresh live history/preflight | linked-production dry-run not executed | owner accepted limitation and said “Go” |
| 2026-08-08 | owner/implementer | evaluator | **production DB aligned** | ten exact versions, 27 valid indexes, 10 validated constraints, RLS/grants/invariants/advisors | Edge v5 still stale; post-write runtime acceptance pending; service-role legacy ACL hardening candidate | remain read-only and request separate Edge approval |

### Current permission boundary

- The owner-approved DB write authorization has been consumed and completed.
- Current provider scope returns to `provider_read`.
- Allowed now: GitHub docs/evidence work and read-only GitHub/Vercel/Supabase verification.
- Forbidden without a new explicit owner checkpoint: Edge deployment, new production DDL/ACL changes, provider configuration changes, production-data mutation and destructive account deletion.
- DB alignment evidence is now sufficient to request the separate Edge deployment approval.

## Evaluation

### Acceptance evidence

- exact ten-file current-main migration chain replayed locally with 478 pgTAP assertions: **pass**;
- free local union-history Supabase CLI dry-run selected exactly the ten MoneyFlow migrations: **pass as simulation**;
- actual linked-production CLI dry-run: **not executed / accepted limitation for DB checkpoint**;
- owner production DB approval: **pass**;
- ten source migrations applied and remote history normalized to the exact original versions: **pass**;
- seven legitimate Atoryn history rows preserved: **pass**;
- target indexes/constraints/RLS/views/RPC boundaries and core data invariants: **verified**;
- post-write advisors: **reviewed with recorded existing/generic findings and one service-role default-ACL hardening candidate**;
- production Edge v5 recent-auth/current-tenant alignment: **pending**;
- post-Edge safe recent-auth acceptance: **pending**;
- destructive real-user deletion: **not performed and not required as evidence**.

### Current review finding

**The database half of Provider Sync is aligned. The remaining high-priority Trust blocker is the production `delete-account` Edge v5 plus safe recent-auth provider acceptance.**

## Delivery record

- Discovery/reconciliation PR: #325.
- Free dry-run probe: #326, closed unmerged.
- Database source: exact `main@8d0070b3d039fc80647e888aa1bd89f18b4de0b4`.
- Production DB migrations: 10/10 applied on 2026-08-08; original versions preserved in remote history.
- Atoryn shared history: preserved.
- Edge writes: none after DB alignment.
- Destructive production-data tests: none.
- Current state: **production DB aligned; Edge/provider acceptance pending**.
