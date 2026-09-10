# #570 — Production Supabase migration reconciliation

**Status:** active; selector owner-merged
**Execution state:** blocked before first write — version-preserving CLI/project execution surface unavailable in the current session
**Active role:** operator / evaluator
**Permission scope:** exactly four canonical migrations plus read-only pre/post evidence and bounded production smoke; no provider/UI/unrelated schema work
**Owner:** ThunderK
**Issue/PR:** GitHub #570 / Draft operational-evidence PR #573
**Selector:** GitHub PR #572, owner-merged as `ab02529b954c59dfe7335776ee9ec47c8cc18f9c`
**Parent program:** GitHub #432 — MoneyFlow master development program
**Execution base:** `main@ab02529b954c59dfe7335776ee9ec47c8cc18f9c`
**Last updated:** 2026-09-11

## Outcome

Reconcile MoneyFlow's hosted Supabase schema with the exact migration chain already merged on `main`, without inventing migration variants, changing financial truth, or treating repository merge as production deployment evidence.

The selected operation is exactly four contiguous migrations:

1. `20260909090000_import_batch_atomic_commit.sql`;
2. `20260909120000_import_batch_measurement.sql`;
3. `20260910181500_function_default_acl_hardening.sql`;
4. `20260910182000_reconciliation_snapshot_security_invoker.sql`.

This is a Class 3 production database operation. Authority is now active because owner-merged PR #572 selected this packet. Production writes are permitted only through a version-preserving canonical migration mechanism after exact preflight. The currently available execution surface cannot satisfy that requirement, so no production DDL has been performed.

## Repository reconnaissance

Fresh execution baseline is owner-merged `main@ab02529b954c59dfe7335776ee9ec47c8cc18f9c`; `PLAN_AUTHORITY.current` selects this packet via PR #572.

Exact migration-directory inspection confirms the hosted tail `20260825090000_direct_csv_rule_atomic_ingestion.sql` is followed by only the four selected files above. Their exact Git blob SHAs at the execution base are:

- `20260909090000_import_batch_atomic_commit.sql` → `9968c56e70e1eb7427bec8a146de9705d8071985`;
- `20260909120000_import_batch_measurement.sql` → `745588452f68f7ad42c0eac4b11b02acb846b5b2`;
- `20260910181500_function_default_acl_hardening.sql` → `b25bb94bdc73932926f1fac206db753f2716c6bb`;
- `20260910182000_reconciliation_snapshot_security_invoker.sql` → `0b9898e316057e88834a66b74044e7bccd96e4fe`.

Repository evidence establishes:

- the first migration adds replay-safe preview→Inbox batch commit state and `commit_import_batch_candidates(uuid,text,jsonb)` as SECURITY INVOKER;
- the second adds bounded privacy-safe measurement fields and `record_import_batch_measurement(uuid,text)` as SECURITY INVOKER;
- the third changes postgres-owned future function defaults at the global ACL layer;
- the fourth changes only `reconciliation_snapshot_for_user(uuid,uuid,date)` execution identity to SECURITY INVOKER;
- the chain contains no destructive reset, seed, user-data backfill or unrelated schema redesign;
- repo CI has already passed fresh local reset/full pgTAP and archive round trips with these migrations;
- repository workflows do not deploy hosted Supabase migrations.

## Production preflight

Read-only hosted inspection on 2026-09-11 after selector merge confirms:

- PostgreSQL `17.6`;
- `supabase_migrations.schema_migrations` still ends at `20260825090000_direct_csv_rule_atomic_ingestion`;
- all four selected target versions are absent;
- `commit_import_batch_candidates(uuid,text,jsonb)` is absent;
- `record_import_batch_measurement(uuid,text)` is absent;
- target `import_batches` columns `commit_intent_hash`, `commit_candidate_count`, `commit_attempt_count`, `commit_replay_count`, `mapping_evidence` are absent;
- postgres has no global default-function ACL row yet;
- `reconciliation_snapshot_for_user(uuid,uuid,date)` remains STABLE + SECURITY DEFINER, authenticated executable, anon/PUBLIC denied;
- `import_batches` and `inbox_candidates` have RLS enabled and authenticated own-row policies using `auth.uid() = user_id` for the relevant SELECT/INSERT/UPDATE paths;
- `import_batches` had 1 row and about 80 KiB total relation size; `inbox_candidates` had 7 rows at capture time;
- no blocked sessions and no non-idle transaction older than 30 seconds were present at capture time.

Therefore the pending chain and affected catalog state match the selected pre-rollout model. No production object collision or lock blocker has been observed.

## Research

Official Supabase references refreshed on 2026-09-11 continue to define the migration-file workflow as:

1. `supabase migration list` to compare local and remote migration history;
2. `supabase db push --dry-run` to preview what will be applied;
3. `supabase db push` to apply local timestamped migration files and record their versions in `supabase_migrations.schema_migrations`;
4. never use `db reset --linked` or production seed data.

Supabase also warns that direct remote SQL/Table Editor changes bypass migration history and cause synchronization failures.

The connected Supabase MCP `apply_migration` tool exposes only `name + query`, not a caller-supplied canonical version. Upstream Supabase MCP issue #241 documents that this path generates its own server timestamp and can create orphan remote-only migration entries when replaying existing local migrations. Therefore `apply_migration` is not accepted for this selected four-file reconciliation.

Current chat shell inspection also confirms there is no MoneyFlow checkout, no usable Supabase CLI and no outbound DNS; `npx supabase` cannot be acquired. Repository search found no existing Supabase production deployment workflow.

Research consequence: stop before first write until a version-preserving CLI/project execution surface is available. Do not lower the migration-history standard to fit the available tool.

## Specification

### S1 — preflight and immutable execution set

Completed read-only evidence:

- fresh merged authority resolves this #570 packet;
- hosted migration tail/catalog baseline captured;
- exact execution-main migration files and blob identities captured;
- repository and remote evidence confirm one contiguous four-version pending chain;
- affected-object/RLS/lock preconditions match expectations.

Still required immediately before first write in the actual version-preserving execution environment:

- run `supabase migration list` against the intended linked production project;
- run `supabase db push --dry-run`;
- require exactly the four selected versions and no remote-only/local-only surprise;
- stop on filename/version/content mismatch, unexpected object collision or history drift.

No `migration repair`, manual history insertion, direct SQL-editor patch, `db reset --linked`, seed deployment or MCP timestamp synthesis is authorized.

### S2 — canonical ordered rollout

Apply only the four selected canonical files, in timestamp order, through `supabase db push` or another independently proven version-preserving equivalent.

Do not hand-edit historical migrations. If a canonical migration proves unsafe against current production state, stop and create a new forward migration under new reviewed authority rather than mutating history.

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

Re-run Security Advisor/catalog evidence; expected slice delta is 43 → 42 authenticated-callable SECURITY DEFINER findings, not zero.

### S5 — production truth and lifecycle completion

Completion requires hosted evidence:

- all four canonical versions appear exactly once in hosted migration history;
- expected catalog state is live;
- bounded import/replay/measurement and reconciliation/security verification passes;
- application production health remains normal;
- #567/THU-47 becomes production-verified only after S4 passes;
- THU-44 may claim durable import-maintenance measurement only after S3 passes;
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
- no new deploy workflow merely to bypass the current executor blocker without separately reviewed scope.

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

1. use a fresh exact-main repository checkout with Supabase CLI;
2. verify the intended production project link and current CLI help/version;
3. resolve `PLAN_AUTHORITY` and require #570 current;
4. repeat hosted migration/catalog/lock preflight;
5. run `supabase migration list`;
6. run `supabase db push --dry-run`;
7. require exactly the four selected migrations and no destructive/seed action;
8. run canonical `supabase db push` once;
9. inspect hosted migration history/catalog before any retry if result is ambiguous;
10. run bounded S3/S4 production verification;
11. verify application health and Advisor/catalog delta;
12. update #567/THU-47 and THU-44 only when their hosted evidence passes;
13. append exact production evidence to Draft PR #573, archive this packet and project `current → null` only after verification;
14. hand final lifecycle PR to owner; repository merge remains explicit owner action.

## Stop conditions and recovery

Stop before the first write if authority, project link, local/remote history or dry-run differs from the selected model.

Stop during rollout on any migration error, unexpected lock/timeout, object conflict, grant/role delta, affected-flow regression or ambiguous network/result state.

Do not edit historical migration files, manually insert migration-history rows, use MCP-generated replacement versions or reset production. Diagnose exact state first; if a correction is needed, create a forward migration under new reviewed authority.

## Acceptance matrix

The slice is complete only when:

- fresh authority selects #570;
- preflight is captured;
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
- no sensitive production evidence is exposed in public artifacts.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| 570.1 | fresh repo/production reconnaissance | main + hosted migration/catalog reads | done |
| 570.2 | refresh official Supabase migration guidance | CLI/workflow/docs + MCP version semantics | done |
| 570.3 | define bounded four-migration runbook | this packet | done |
| 570.4 | selector + authority projection | PR #572 / `main@ab02529b...` | done |
| 570.5 | preflight local/remote migration chain | read-only evidence + required CLI list/dry-run | in_progress — CLI executor blocked |
| 570.6 | canonical production migration rollout | hosted migration history | blocked on 570.5 |
| 570.7 | import/measurement production verification | catalog + bounded smoke | blocked on 570.6 |
| 570.8 | #567 security production verification | catalog + reconciliation/security smoke | blocked on 570.6 |
| 570.9 | lifecycle/tracker closeout | PR #573 + issue/Plate/project memory | blocked on 570.7/570.8 |

## Evaluation

Evaluator must answer:

1. Is the pending chain exactly the selected four versions?
2. Are canonical merged files being deployed unchanged?
3. Does the chosen mechanism preserve canonical migration versions and avoid seed/reset/history repair?
4. Does atomic import replay remain safe and tenant-isolated?
5. Is maintenance measurement live without becoming correctness-critical or sensitive telemetry?
6. Does global default ACL hardening remove automatic browser/PUBLIC EXECUTE while preserving explicit additive grants?
7. Does reconciliation snapshot invoker execution preserve RLS/lifecycle semantics?
8. Did any direct browser financial-table write privilege appear?
9. Are #567 and THU-44 updated only after their hosted evidence exists?
10. Is unrelated provider/UI/security cleanup excluded?

Current evaluation: questions 1, 2 and pre-rollout prerequisites are supported by read-only evidence; question 3 is **not yet satisfied** because the current session lacks a version-preserving executor. Therefore first production write remains blocked.

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-10 | post-#571 verification | planner | divergence confirmed | hosted migration history + catalog | select operational slice | docs-only selector |
| 2026-09-11 | selector #572 | operator | owner-merged authority | `main@ab02529b...` + `PLAN_AUTHORITY` | production preflight | read-only inspection |
| 2026-09-11 | operator | execution handoff | blocked before first write | exact four-file chain + hosted preflight + MCP/CLI capability check | acquire version-preserving CLI/project surface; migration list + dry-run | no production write until executor requirement is met |

## Current permission boundary

#570 is active authority. The operation may apply only the four canonical migrations plus read-only evidence and bounded post-deploy smoke. The currently connected MCP migration primitive is explicitly rejected for these existing timestamped files because it cannot preserve caller-supplied versions.

Until a version-preserving CLI/project execution surface is available and exact `migration list` + `db push --dry-run` pass, **no production DDL is allowed**. Repository merge actions remain explicit owner decisions.