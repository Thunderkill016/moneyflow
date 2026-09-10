# #570 — Production Supabase migration reconciliation

**Status:** active; selector owner-merged
**Execution state:** temporary version-preserving runner prepared in PR #573; production remains untouched until owner merge + exact preflight
**Active role:** operator / evaluator
**Permission scope:** exactly four canonical migrations, temporary fail-closed executor, read-only pre/post evidence and bounded production smoke; no provider/UI/unrelated schema work
**Owner:** ThunderK
**Issue/PR:** GitHub #570 / production rollout execution pending
**Enabler:** GitHub PR #573 — temporary production migration runner/evidence
**Selector:** GitHub PR #572, owner-merged as `ab02529b954c59dfe7335776ee9ec47c8cc18f9c`
**Parent program:** GitHub #432 — MoneyFlow master development program
**Execution base:** protected `main`; migration identity pinned below
**Last updated:** 2026-09-11

## Outcome

Reconcile MoneyFlow's hosted Supabase schema with the exact migration chain already merged on `main`, without inventing migration variants, changing financial truth, or treating repository merge as production deployment evidence.

The selected operation is exactly four contiguous migrations:

1. `20260909090000_import_batch_atomic_commit.sql`;
2. `20260909120000_import_batch_measurement.sql`;
3. `20260910181500_function_default_acl_hardening.sql`;
4. `20260910182000_reconciliation_snapshot_security_invoker.sql`.

Authority is active because owner-merged PR #572 selected this packet. Production writes are allowed only through a mechanism that preserves the canonical migration versions and only after exact preflight. PR #573 proposes the bounded version-preserving execution surface; it has no production effect before owner merge.

## Repository reconnaissance

Fresh baseline remains `main@ab02529b954c59dfe7335776ee9ec47c8cc18f9c` unless a later protected-main commit is present at execution time. `PLAN_AUTHORITY.current` must still select this packet via PR #572 when the runner starts.

The four canonical migration Git blob identities are frozen for this slice:

- `20260909090000_import_batch_atomic_commit.sql` → `9968c56e70e1eb7427bec8a146de9705d8071985`;
- `20260909120000_import_batch_measurement.sql` → `745588452f68f7ad42c0eac4b11b02acb846b5b2`;
- `20260910181500_function_default_acl_hardening.sql` → `b25bb94bdc73932926f1fac206db753f2716c6bb`;
- `20260910182000_reconciliation_snapshot_security_invoker.sql` → `0b9898e316057e88834a66b74044e7bccd96e4fe`.

Repository evidence establishes:

- the first migration adds replay-safe preview→Inbox batch commit state and `commit_import_batch_candidates(uuid,text,jsonb)` as SECURITY INVOKER;
- the second adds bounded privacy-safe measurement fields and `record_import_batch_measurement(uuid,text)` as SECURITY INVOKER;
- the third hardens postgres-owned future function defaults at the global ACL layer;
- the fourth changes only `reconciliation_snapshot_for_user(uuid,uuid,date)` execution identity to SECURITY INVOKER;
- the selected files contain no destructive reset, seed, user-data backfill, `set role`/`reset role` choreography, or unrelated schema redesign;
- repo CI previously passed fresh local reset/full pgTAP and archive round trips with the migrations;
- existing repository workflows verify local database behavior but do not deploy hosted production migrations.

## Production preflight

Read-only hosted inspection on 2026-09-11 after selector merge confirms:

- Supabase project is ACTIVE_HEALTHY on PostgreSQL 17.6;
- `supabase_migrations.schema_migrations` still ends at `20260825090000_direct_csv_rule_atomic_ingestion`;
- all four selected target versions are absent;
- `commit_import_batch_candidates(uuid,text,jsonb)` and `record_import_batch_measurement(uuid,text)` are absent;
- target `import_batches` columns are absent;
- postgres has no global default-function ACL override yet;
- `reconciliation_snapshot_for_user(uuid,uuid,date)` remains STABLE + SECURITY DEFINER, authenticated executable, anon/PUBLIC denied;
- `import_batches` and `inbox_candidates` have RLS enabled and authenticated own-row policies for the relevant paths;
- `import_batches` had 1 row and about 80 KiB total relation size; `inbox_candidates` had 7 rows at capture time;
- no blocked sessions and no non-idle transaction older than 30 seconds were present at capture time.

The pre-rollout catalog model therefore matches the selected four-file gap. This evidence must be refreshed immediately before apply.

## Research

Official Supabase references refreshed on 2026-09-11 define the production migration-file workflow as:

1. `supabase migration list` to compare local and remote history;
2. `supabase db push --dry-run` to preview the exact pending set;
3. `supabase db push` to apply timestamped migration files and record their canonical versions;
4. never use `db reset --linked` or production seed data.

Supabase's current environment guidance recommends GitHub Actions/CI for production migrations. The current latest stable CLI is 2.117.0; PR #573 pins that version rather than floating to `latest`.

The connected Supabase MCP `apply_migration` exposes only `name + query`, not a caller-supplied canonical version. Upstream Supabase MCP issue #241 documents server-generated migration timestamps for that path. It remains rejected for these existing timestamped files.

## Temporary executor scope — PR #573

PR #573 may add one temporary workflow, `.github/workflows/production-supabase-migrations.yml`, solely to execute #570 after owner merge. This is the separately reviewed scope required by the earlier blocker; it is not a general-purpose permanent deployment pipeline.

The workflow must fail closed before any database write unless all of the following are true:

- execution is from protected `main` after owner merge;
- manual dispatch actor is the repository owner, or the trigger is an exact OWNER-authored command on GitHub issue #570;
- `PLAN_AUTHORITY.current` still selects #570 through PR #572;
- all four migration files match the frozen Git blob identities above;
- configured Supabase project identity matches the privately selected production-project fingerprint;
- required production connection secrets exist without being printed;
- `supabase migration list --linked` has no remote-only version and the local-only set is exactly the four selected versions;
- `supabase db push --linked --dry-run` includes every selected version;
- apply receives an explicit owner-level confirmation.

Operational controls:

- `workflow_dispatch` defaults to preflight; only the repository owner may dispatch it, and apply requires exact confirmation `APPLY-570-FOUR-MIGRATIONS`;
- an owner-authored exact command on GitHub issue #570 may also trigger preflight/apply, allowing the connected GitHub operator to drive the run after merge without exposing secrets;
- non-owner issue comments cannot run the job;
- workflow permissions are `contents: read` only;
- production credentials are scoped only to remote Supabase steps that need them;
- concurrency forbids overlapping production migration runs;
- a second apply after convergence is rejected because the pending set is no longer the exact four versions;
- no `migration repair`, manual history insert, direct SQL patch, remote reset, seed, MCP timestamp synthesis, provider change, user-data backfill or UI work is present;
- the temporary runner must be removed during #570 lifecycle closeout after hosted verification.

## Specification

### S1 — preflight and immutable execution set

Completed read-only evidence:

- merged authority resolves #570;
- hosted migration tail/catalog baseline captured;
- exact migration file identities captured;
- repository/remote evidence shows one contiguous four-version gap;
- affected-object/RLS/lock preconditions match expectations.

Still required on the merged temporary runner before first write:

- exact protected-main authority and blob checks;
- intended production-project fingerprint check;
- `supabase migration list --linked` exact-set validation;
- `supabase db push --linked --dry-run --yes` exact-set validation;
- stop on any history, identity, project, secret, connection or dry-run mismatch.

### S2 — canonical ordered rollout

After S1 passes, apply only the four selected canonical files using one `supabase db push --linked --yes`. Do not hand-edit historical migrations. On migration error or ambiguous result, inspect hosted history/catalog before considering any retry.

### S3 — import commit and measurement verification

After the first two migrations are live, verify:

- atomic authenticated preview→Inbox commit entrypoint exists with intended SECURITY INVOKER/authenticated-only model;
- exact replay does not duplicate candidate or ledger effects;
- changed intent fails closed;
- cross-tenant access remains denied;
- measurement fields/function are live, bounded and RLS-bound;
- replay count cannot exceed attempt count;
- generic telemetry contains no raw statement content, amounts, credentials or account/source IDs.

Never blindly retry an ambiguous commit result.

### S4 — #567 security rollout verification

After the last two migrations are live, verify:

- postgres global future-function defaults no longer automatically grant EXECUTE to PUBLIC/anon/authenticated;
- explicit additive provider-managed grants remain intact;
- reconciliation snapshot helper is SECURITY INVOKER;
- authenticated owner reconciliation summary still works;
- cross-tenant snapshot access remains denied;
- start, clear, complete and reopen reconciliation behavior remains intact;
- completed historical snapshots remain stable;
- no financial table gains direct browser-write privilege.

Re-run Security Advisor/catalog evidence; expected narrow-slice delta is 43 → 42 authenticated-callable SECURITY DEFINER findings, not zero.

### S5 — production truth and lifecycle completion

Completion requires hosted evidence:

- all four canonical versions appear exactly once in hosted migration history;
- expected catalog state is live;
- bounded import/replay/measurement and reconciliation/security verification passes;
- application production health remains normal;
- #567/THU-47 becomes production-verified only after S4 passes;
- THU-44 may claim durable import-maintenance measurement only after S3 passes;
- temporary production runner is removed;
- #570 closes only after production evidence is recorded and lifecycle projection returns authority to `null`.

## Non-goals

- no new schema design beyond the four existing files;
- no migration-history repair without newly selected evidence;
- no destructive reset or seed push;
- no user-data rewrite/backfill;
- no provider Auth/CAPTCHA/WAF/rate-limit work;
- no UI/design work;
- no bank/provider integration expansion;
- no broad SECURITY DEFINER cleanup;
- no analytics vendor or new telemetry taxonomy;
- no permanent general-purpose production deployment automation in this slice.

## Financial and security invariants

- VND remains integer đồng.
- Transfers remain equal/opposite and neutral to income/expense/net.
- Source/provider observations remain evidence, never silent ledger overrides.
- Exact-intent replay remains idempotent; changed intent remains fail-closed.
- Reconciliation locking, zero-difference completion, reopen behavior and historical snapshots remain unchanged.
- Tenant ownership remains database-enforced.
- PUBLIC/anon receive no new privileged function path.
- Sensitive financial tables receive no new direct browser-write grants.
- Production migration history remains an auditable sequence matching canonical repository versions.

## Implementation plan

1. review and validate open enabler PR #573 exact head, including the temporary runner and lifecycle evidence;
2. do not merge automatically; owner explicitly decides whether PR #573 may land;
3. after owner merge, first trigger **preflight only**;
4. require authority, production-project fingerprint, canonical blobs, migration list and dry-run to pass exactly;
5. refresh hosted catalog/lock baseline read-only;
6. only then trigger explicit apply once;
7. if apply is ambiguous, inspect hosted history/catalog before any retry;
8. after convergence, run bounded S3/S4 production verification through the connected Supabase project;
9. verify application production health and Advisor/catalog delta;
10. update #567/THU-47 and THU-44 only when their hosted evidence passes;
11. remove the temporary workflow, append exact evidence, archive this packet and project `current → null` only after verification;
12. hand final lifecycle PR to owner; repository merge remains an explicit owner action.

## Stop conditions and recovery

Stop before first write if authority, canonical blob, intended project fingerprint, required secret, linked migration history, dry-run or fresh hosted catalog differs from the selected model.

Stop during rollout on any migration error, unexpected lock/timeout, object conflict, grant/role delta, affected-flow regression or ambiguous network/result state.

Do not edit historical migration files, manually insert migration-history rows, use MCP-generated replacement versions or reset production. If correction is required, create a forward migration under new reviewed authority.

## Acceptance matrix

The slice is complete only when:

- fresh authority selects #570;
- production project identity is independently pinned;
- CLI migration list and dry-run show exactly four selected pending versions;
- all four canonical files apply in order;
- hosted history contains each selected version exactly once;
- import replay/cross-tenant invariants pass;
- measurement function/grants/counters are live and bounded;
- global function defaults deny automatic PUBLIC/anon/authenticated EXECUTE;
- explicit provider-managed grants remain intact;
- reconciliation snapshot is invoker and reconciliation lifecycle/history behavior remains correct;
- no direct browser financial-table write appears;
- Security Advisor/catalog delta is explained;
- production health remains normal;
- temporary runner is removed after use;
- no sensitive production evidence is exposed in public artifacts.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| 570.1 | fresh repo/production reconnaissance | main + hosted migration/catalog reads | done |
| 570.2 | refresh official Supabase migration guidance | CLI/workflow/docs + MCP version semantics | done |
| 570.3 | define bounded four-migration runbook | this packet | done |
| 570.4 | selector + authority projection | PR #572 / `main@ab02529b...` | done |
| 570.5 | version-preserving executor + exact preflight | PR #573 + merged-run evidence | in_progress — runner under review |
| 570.6 | canonical production migration rollout | hosted migration history | blocked on owner merge + 570.5 preflight |
| 570.7 | import/measurement production verification | catalog + bounded smoke | blocked on 570.6 |
| 570.8 | #567 security production verification | catalog + reconciliation/security smoke | blocked on 570.6 |
| 570.9 | runner removal + lifecycle/tracker closeout | PR #573/follow-up + issue/Plate/project memory | blocked on 570.7/570.8 |

## Evaluation

Evaluator must answer:

1. Is the pending chain exactly the selected four versions?
2. Are canonical merged files pinned and deployed unchanged?
3. Does the runner target only the intended production project and preserve canonical migration versions?
4. Can non-owner or accidental events trigger production apply?
5. Does dry-run fail closed on any additional/missing/remote-only migration?
6. Does atomic import replay remain safe and tenant-isolated after rollout?
7. Is maintenance measurement live without becoming correctness-critical or sensitive telemetry?
8. Does global default ACL hardening preserve intended additive grants?
9. Does reconciliation snapshot invoker execution preserve RLS/lifecycle semantics?
10. Is unrelated provider/UI/security cleanup excluded?

Current evaluation: the temporary executor design now satisfies the version-preserving mechanism requirement in principle, but it remains **unmerged and unexecuted**. Production write is still blocked until exact-head PR validation, explicit owner merge, and a successful preflight-only run.

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-10 | post-#571 verification | planner | divergence confirmed | hosted migration history + catalog | select operational slice | docs-only selector |
| 2026-09-11 | selector #572 | operator | owner-merged authority | `main@ab02529b...` + `PLAN_AUTHORITY` | production preflight | read-only inspection |
| 2026-09-11 | operator | execution handoff | blocked before first write | exact four-file chain + hosted preflight + MCP/CLI capability check | version-preserving executor | no production write |
| 2026-09-11 | operator | PR #573 evaluation | runner prepared, not executable yet | pinned CLI + authority/blob/project/history/dry-run gates | exact-head CI/security review, owner merge | review only; production untouched |

## Current permission boundary

#570 is active authority. PR #573 may be reviewed and corrected as the temporary executor/evidence enabler. It has no production execution force before explicit owner merge.

After owner merge, the first allowed run is preflight only. Production apply is allowed only after that run proves the intended project, current authority, frozen migration identities and exact four-version dry-run. Repository merge actions remain explicit owner decisions.