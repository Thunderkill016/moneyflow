# #570 — Production Supabase migration reconciliation

**Status:** selector candidate; executable only after owner merge
**Execution state:** planning
**Active role:** planner / evaluator
**Permission scope:** selector PR is documentation/authority only; hosted database writes remain forbidden until selector owner merge and fresh authority resolution
**Owner:** ThunderK
**Issue/PR:** GitHub #570 / selector PR #572
**Parent program:** GitHub #432 — MoneyFlow master development program
**Selector base:** `main@3c9794926effd3d0f0f0786ac286a8619d0518ca`
**Last updated:** 2026-09-10

## Outcome

Reconcile MoneyFlow's hosted Supabase schema with the exact migration chain already merged on `main`, without inventing migration variants, changing financial truth, or treating repository merge as production deployment evidence.

The selected operational slice is exactly four contiguous migrations currently absent from hosted production history:

1. `20260909090000_import_batch_atomic_commit.sql`;
2. `20260909120000_import_batch_measurement.sql`;
3. `20260910181500_function_default_acl_hardening.sql`;
4. `20260910182000_reconciliation_snapshot_security_invoker.sql`.

This is a Class 3 production database operation. The selector does not authorize any production write. Owner merge of the selector is required before execution, and execution must re-check authority and hosted state immediately before the first write.

## Repository reconnaissance

Fresh baseline is owner-merged `main@3c9794926effd3d0f0f0786ac286a8619d0518ca`, where `docs/plans/PLAN_AUTHORITY.json.current` is `null`.

Repository evidence establishes:

- the four target migration files are already part of merged main and migration identity is repository-pinned;
- the first two migrations are covered by dedicated pgTAP suites for atomic/replay-safe import commit and privacy-safe maintenance measurement;
- the two #567 migrations passed a fresh local reset and the complete database suite in PR #571, including security catalog, browser-role privileges, cross-tenant RPC, reconciliation lifecycle, source/import suites and archive round trips;
- PR #571 final exact-head CI, CodeQL and Secret History passed before owner merge;
- the application intentionally treats import maintenance measurement as best-effort so missing measurement is not by itself evidence of ledger corruption;
- there is no repository GitHub Actions workflow that pushes production Supabase migrations; current CI proves local migration/reset behavior but does not deploy hosted schema.

Read-only production inspection after PR #571 merge establishes:

- hosted `supabase_migrations.schema_migrations` still ends at `20260825090000_direct_csv_rule_atomic_ingestion`;
- the four target versions are absent from hosted migration history;
- expected measurement columns/RPC are not live;
- no global postgres default-function ACL override is live;
- `public.reconciliation_snapshot_for_user(uuid,uuid,date)` is still `SECURITY DEFINER`.

Therefore the current problem is a proven repo/production migration divergence, not an inferred application defect.

## Research

Official Supabase references refreshed on 2026-09-10:

1. Supabase CLI reference documents `supabase migration list` for local/remote migration-history comparison and `supabase db push --dry-run` to preview migrations before applying them.
2. Supabase local-development workflow documents `supabase db push` as the migration-file deployment path and explicitly warns that `supabase db reset --linked` is destructive and must never be used on production.
3. Supabase database-migration guidance says remote schema changes should flow through migration files once migration history is authoritative; direct remote editor changes bypass migration history and can create synchronization failures.
4. Current Supabase breaking-change changelog contains no migration-workflow breaking change that alters this execution model.

Research consequence:

- reconcile history before execution;
- preview the exact chain before execution;
- use canonical migration files and the normal migration mechanism;
- never reset production and never include seed data;
- do not use ad-hoc remote SQL variants merely because an MCP DDL primitive exists;
- stop rather than repair history blindly if remote-only drift appears.

## Specification

### S1 — preflight and immutable execution set

Immediately before any hosted write:

- resolve `PLAN_AUTHORITY` from fresh merged main and require this #570 packet to be current;
- capture the current production migration-history tail and affected catalog state privately;
- verify the four canonical migration files from the exact execution main commit;
- compare local and remote migration versions and require one contiguous pending chain containing exactly the four selected versions;
- preview the migration application with the normal dry-run mechanism when available in the execution environment;
- fail closed if any unexpected remote-only migration, missing earlier migration, filename/version mismatch, migration-content mismatch, or affected-object collision is observed.

No `migration repair`, manual history insertion, direct SQL-editor patch, `db reset --linked`, or seed deployment is authorized by this slice unless new evidence proves it necessary and a revised selector is owner-merged first.

### S2 — canonical ordered rollout

Apply only the four selected migrations, in timestamp order, through the normal migration deployment mechanism.

The execution must not hand-edit migration SQL. If an already-merged migration proves unsafe against current production state, stop and open a new corrective migration through normal repository review rather than mutating the historical file or forcing the rollout.

### S3 — import commit and measurement verification

After `20260909090000` and `20260909120000` are live, verify expected catalog and bounded behavior:

- atomic authenticated preview→Inbox commit entrypoint exists with intended execution/grant model;
- exact replay does not duplicate candidate/ledger effects;
- changed intent remains fail-closed;
- cross-tenant access remains denied;
- measurement objects exist only as designed;
- measurement function remains `SECURITY INVOKER`, authenticated-only and RLS-bound;
- event vocabulary/counters stay bounded and replay count cannot exceed attempt count;
- raw statement content or other sensitive payloads are not introduced as generic telemetry.

Production smoke must use bounded controlled evidence and must not blindly retry an ambiguous commit result.

### S4 — #567 security rollout verification

After `20260910181500` and `20260910182000` are live, verify:

- a postgres global default function ACL override exists;
- effective defaults do not automatically grant function EXECUTE to PUBLIC, `anon` or `authenticated`;
- intended explicit additive schema grants, including provider-managed storage grants, remain present;
- `public.reconciliation_snapshot_for_user(uuid,uuid,date)` is `SECURITY INVOKER`;
- authenticated owner reconciliation summaries still work;
- cross-tenant snapshot access remains denied;
- start, clear, complete and reopen reconciliation behavior remains intact;
- completed historical reconciliation snapshots remain stable;
- no financial table becomes directly browser-writable.

Rerun relevant catalog/Security Advisor evidence after rollout. Advisor findings are evidence to interpret, not permission for unrelated remediation.

### S5 — production truth and lifecycle completion

Completion requires hosted evidence, not only merged code:

- all four migration versions appear in hosted history;
- expected catalog state is live;
- bounded import/replay and reconciliation/security verification passes;
- application production health remains normal;
- #567/THU-47 is updated from "code merged, production pending" to production-verified only after S4 passes;
- THU-44 may treat import maintenance measurement as durable production capability only after S3 passes;
- #570 is closed only after production verification and lifecycle evidence are recorded.

## Non-goals

- no new migration or schema design beyond the four already-merged files;
- no migration-history repair unless separately selected after new evidence;
- no destructive reset or seed push;
- no direct user-data rewrite or backfill;
- no provider Auth, CAPTCHA, WAF or rate-limit work;
- no UI/design work;
- no Vietnamese bank/provider integration expansion;
- no broad SECURITY DEFINER cleanup beyond the already-merged #567 migration;
- no analytics vendor or new telemetry event taxonomy.

## Financial and security invariants

- VND remains integer đồng.
- Transfers remain equal/opposite and neutral to income/expense/net.
- Source/provider observations remain evidence and never silently overwrite ledger facts.
- Exact-intent replay remains idempotent; changed intent remains fail-closed.
- Reconciliation locking, zero-difference completion, reopen behavior and stored historical snapshots remain unchanged.
- Tenant ownership remains database-enforced.
- PUBLIC/anon receive no new privileged function path.
- Sensitive financial tables receive no new direct browser-write grants.
- Production migration history remains an auditable sequence of canonical repository migrations.

## Implementation plan

After owner merges the selector PR:

1. refresh from exact post-selector main and resolve authority;
2. re-read #570, this packet, current project memory and the four target migration files/tests;
3. re-query hosted migration history and affected catalog state read-only;
4. verify the current Supabase CLI/help/docs in the actual execution environment; do not guess command flags;
5. reconcile local/remote migration list and preview exact pending migrations with dry-run;
6. stop if the pending set is not exactly the selected contiguous four-migration chain;
7. deploy the four canonical migrations in timestamp order through the normal migration path;
8. verify migration-history insertion and catalog state after the rollout;
9. run bounded import/replay/measurement and reconciliation/security production smoke without user-data exposure or blind retry;
10. rerun Security Advisor/catalog evidence and production health checks;
11. update #567/THU-47 and THU-44 dependencies only if corresponding hosted evidence passes;
12. record exact production evidence, archive this packet and return `PLAN_AUTHORITY.current` to `null` only after production verification is complete;
13. hand completion PR/records to owner; merge remains an explicit owner action where repository changes are required.

## Stop conditions and recovery

Stop before the first write if local/remote history differs from the expected chain.

Stop during rollout if any migration errors, unexpected lock/timeout, object conflict, role/grant delta, affected-flow regression or ambiguous transaction result occurs.

Do not edit already-merged migration files to make production accept them. Diagnose the exact state and, if correction is required, create a new forward migration under a newly reviewed plan.

If the migration mechanism reports an ambiguous network/result state, inspect hosted migration history/catalog before any retry. Never blindly replay a potentially committed production migration.

## Acceptance matrix

The slice is complete only when all applicable evidence is green:

- fresh authority resolution selects #570;
- hosted preflight is captured privately;
- local/remote migration history shows exactly four selected pending versions before rollout;
- dry-run/preview shows exactly the four selected migrations and no seed/destructive action;
- all four canonical migrations apply in order;
- hosted history includes all four versions exactly once;
- atomic import commit entrypoint and replay/cross-tenant invariants are intact;
- measurement function/grants/counters are live and bounded;
- global postgres future-function defaults deny automatic EXECUTE to PUBLIC/anon/authenticated;
- existing explicit provider-managed additive function grants remain intact;
- reconciliation snapshot helper is invoker and owner/cross-tenant/lifecycle/history behavior remains correct;
- no financial table direct browser-write privilege is introduced;
- Security Advisor/catalog delta is explained;
- production `/api/health` and affected application smoke remain healthy;
- no production user data, credential, private provider identifier or sensitive evidence is exposed in public artifacts.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| 570.1 | fresh repo/production reconnaissance | main + hosted migration/catalog reads | done |
| 570.2 | refresh official Supabase migration guidance | current CLI/workflow/docs/changelog | done |
| 570.3 | define four-migration bounded runbook | this packet | done |
| 570.4 | selector + authority projection | selector PR #572 | in_progress |
| 570.5 | preflight local/remote migration chain | production execution evidence | blocked |
| 570.6 | canonical production migration rollout | hosted migration history | blocked |
| 570.7 | import/measurement production verification | catalog + bounded smoke | blocked |
| 570.8 | #567 security production verification | catalog + reconciliation/security smoke | blocked |
| 570.9 | lifecycle/tracker closeout | issue/Plate/project memory | blocked |

## Evaluation

Evaluator must answer directly from #570, this packet, current main and production evidence:

1. Is the pending migration chain exactly the selected four versions with no unexpected remote drift?
2. Are the canonical merged files being deployed unchanged rather than re-created manually?
3. Does the chosen deployment mechanism preserve migration history and avoid seed/reset/destructive behavior?
4. Does atomic import replay remain safe and cross-tenant isolated after rollout?
5. Is maintenance measurement live without becoming a financial correctness dependency or sensitive raw telemetry sink?
6. Does the global default ACL actually remove automatic PUBLIC/anon/authenticated EXECUTE while preserving explicit additive grants?
7. Does reconciliation snapshot invoker execution preserve tenant/RLS and lifecycle semantics?
8. Did any direct browser financial-table write privilege appear?
9. Are #567 and THU-44 updated only after their specific hosted evidence exists?
10. Is any unrelated provider/UI/security cleanup being smuggled into the production operation?

Success means repository and hosted migration truth agree, the already-reviewed capabilities are actually live, and production evidence—not merge status—supports lifecycle completion.

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-10 | post-#571 verification | planner | divergence confirmed | hosted migration history + catalog | select operational slice | docs-only selector |
| 2026-09-10 | planner | selector evaluation | candidate | #570 + PR #572 + this packet + current Supabase guidance | exact-head governance/evaluation, owner merge | selector-only changes |

## Current permission boundary

Before selector merge, this branch may change only planning/authority/project-memory artifacts required to select #570. It may not apply hosted migrations, repair migration history, edit migration SQL, change runtime code, provider settings, user data or UI.

After selector owner merge and fresh authority resolution, execution permission is bounded to the four canonical migrations plus read-only pre/post evidence and bounded production smoke described above. Any unexpected divergence requires stop-and-replan. Repository merge actions remain explicit owner decisions.