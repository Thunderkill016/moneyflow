# #570 — Production Supabase migration reconciliation

**Status:** completed in production; lifecycle closeout pending owner merge of the closeout PR
**Execution state:** four canonical migrations deployed once and independently verified; temporary runner is being removed by this closeout
**Active role:** evaluator / lifecycle closeout
**Permission scope:** no further production migration apply is authorized by this packet
**Owner:** ThunderK
**Issue:** GitHub #570
**Selector:** GitHub PR #572 (owner-merged)
**Executor enabler:** GitHub PR #573 (owner-merged)
**Production apply:** GitHub Actions run `34545907924`
**Execution base:** `main@c3be075abc67ec2169c0c6fc4a99d5c10bdc5b9d`
**Last updated:** 2026-09-11

## Outcome

MoneyFlow's hosted Supabase schema is reconciled with the exact four-migration chain selected by #570. The rollout preserved canonical repository migration versions, introduced no replacement timestamps or history repair, and passed independent production verification.

The deployed chain is exactly:

1. `20260909090000_import_batch_atomic_commit.sql`;
2. `20260909120000_import_batch_measurement.sql`;
3. `20260910181500_function_default_acl_hardening.sql`;
4. `20260910182000_reconciliation_snapshot_security_invoker.sql`.

GitHub Actions run `34545907924` applied those files in that order with pinned Supabase CLI `2.117.0`. Post-apply `supabase migration list --linked` converged local and remote history. Independent hosted inspection then confirmed every selected version appears exactly once.

## Production rollout evidence

Immediately before apply, fresh hosted evidence still matched the selected preconditions:

- none of the four target versions was present;
- target import RPCs and measurement columns were absent;
- `reconciliation_snapshot_for_user(uuid,uuid,date)` was still `SECURITY DEFINER`;
- no blocked locks or non-idle transaction older than 30 seconds was present;
- protected `main` remained `c3be075abc67ec2169c0c6fc4a99d5c10bdc5b9d` and `PLAN_AUTHORITY.current` still selected this packet.

The owner supplied the exact production confirmation `APPLY-570-FOUR-MIGRATIONS`. The temporary runner then repeated authority, canonical-blob, project-fingerprint, linked-history and dry-run checks before entering the write step. Its dry-run listed only the four selected files.

Run `34545907924` completed successfully. The apply log records each canonical file once, followed by a successful migration-history convergence check. No second apply was issued.

## Hosted catalog verification

Independent read-only hosted verification after rollout established:

- all four selected migration versions exist exactly once;
- `commit_import_batch_candidates(uuid,text,jsonb)` exists as `SECURITY INVOKER`, with authenticated EXECUTE and no anon/PUBLIC EXECUTE;
- `record_import_batch_measurement(uuid,text)` exists with the same invoker/authenticated-only execution model;
- `import_batches` contains the intended atomic-commit and bounded measurement columns;
- `reconciliation_snapshot_for_user(uuid,uuid,date)` remains `STABLE` but is now `SECURITY INVOKER`, authenticated executable and denied to anon/PUBLIC;
- postgres global default function ACL is narrowed to postgres itself while existing additive provider-managed schema grants remain intact;
- `import_batches` and `inbox_candidates` retain RLS;
- no INSERT/UPDATE/DELETE/TRUNCATE browser-role grant exists on the sensitive financial/reconciliation tables checked by #570;
- blocked locks = 0 and non-idle transactions older than 30 seconds = 0 after verification;
- authenticated-callable `SECURITY DEFINER` findings moved from the expected pre-rollout 43 to **42**.

Supabase Security Advisor independently reported the same 42-count narrow-slice result. Its separate leaked-password-protection warning remains provider/Auth scope under #174 and was not broadened into #570.

## S3 — import commit and maintenance measurement production verification

S3 passed against hosted production with synthetic identities inside one explicit transaction followed by `ROLLBACK`. The smoke reproduced the repository contract without touching real user rows and verified:

- first preview→Inbox commit persists the complete candidate set and marks the batch committed;
- exact replay returns the durable result without reinserting candidates;
- changed intent fails closed with `import_batch_replay_mismatch`;
- a foreign tenant's batch remains invisible to the invoker RPC;
- atomic preview→Inbox commit creates no financial-ledger transaction;
- measurement attempt/replay counters increment as intended and replay cannot exceed attempt count;
- mapping evidence remains within the allowlisted bounded vocabulary;
- cross-tenant measurement mutation is rejected.

After rollback, independent residual checks found **0 synthetic users, 0 synthetic batches and 0 synthetic candidates** from this smoke.

This makes MON-63's atomic commit and bounded maintenance-measurement schema durable production truth. It does not claim that the broader maintenance-effort KPI program is fully complete; THU-44 still owns the wider measurement semantics.

## S4 — #567 production security and reconciliation verification

S4 also passed against hosted production with synthetic identities inside one explicit transaction followed by `ROLLBACK`. It verified:

- authenticated owner reconciliation snapshot works under `SECURITY INVOKER`;
- cross-tenant direct snapshot access is rejected with `reconciliation_snapshot_forbidden`;
- cross-tenant account-leg mutation remains rejected;
- RLS hides another tenant's reconciliation summaries;
- start → clear → complete behavior reaches zero difference;
- a later statement can complete and reopen correctly;
- reopening restores only the latest statement leg to cleared/unbound state;
- an earlier completed statement's stored historical balance and difference remain stable before/after later completion and reopen.

After rollback, residual checks found **0 synthetic users, 0 synthetic transactions and 0 synthetic reconciliations** from this smoke.

Together with the 43 → 42 Advisor/catalog delta and global default-ACL proof, this supplies the hosted production verification required by #567/THU-47.

## Application health

The Vercel production deployment for exact repository commit `c3be075abc67ec2169c0c6fc4a99d5c10bdc5b9d` is `READY`. Post-rollout runtime-error inspection found no runtime error cluster in the checked recent production window.

This is deployment/runtime evidence; no unsupported claim is made about a separate `/api/health` probe in this closeout session.

## Research

Official Supabase guidance refreshed during #570 continues to support migration-file-driven production deployment through CI/CD: reconcile local/remote history with `supabase migration list`, inspect pending files with `supabase db push --dry-run`, then use `supabase db push` for the canonical timestamped files. Production reset/seed and manual history surgery remain inappropriate for this rollout.

For behavioral verification, repository pgTAP contracts use explicit transactions and rollback to isolate database tests. The production smoke followed the same bounded principle with synthetic UUIDs and independent residual checks.

The connected Supabase MCP `apply_migration` was intentionally not used for the four existing versioned files because its interface does not preserve caller-supplied canonical timestamps.

## Specification completion

### S1 — immutable execution set

**PASS.** Protected-main authority, four frozen Git blob identities, intended-project fingerprint, exact local-only four-version divergence and exact dry-run all passed before apply.

### S2 — canonical ordered rollout

**PASS.** One `supabase db push --linked --yes` applied exactly the four selected canonical files. Post-apply history converged; no retry or repair was needed.

### S3 — import/measurement verification

**PASS.** Hosted catalog and rollback-isolated behavioral smoke passed with zero residual synthetic rows.

### S4 — security/reconciliation verification

**PASS.** Hosted catalog, Advisor and rollback-isolated reconciliation/cross-tenant smoke passed with the expected 43 → 42 narrow-slice delta.

### S5 — production truth and lifecycle completion

**PASS pending owner merge of closeout projection.** Production evidence is complete. The closeout PR removes the temporary runner, archives this packet, reconciles current project memory and projects `PLAN_AUTHORITY.current` to `null`. Those repository lifecycle changes become canonical only after owner merge.

## Financial and security invariants

Post-rollout evidence preserves the packet's invariants:

- VND remains integer đồng;
- transfers and financial-ledger semantics are unchanged by this migration slice;
- preview→Inbox commit remains evidence staging and never silently writes ledger transactions;
- exact-intent replay is idempotent and changed intent fails closed;
- tenant ownership remains database-enforced;
- completed reconciliation snapshots remain historical facts;
- no new direct browser write privilege exists on the sensitive financial/reconciliation tables checked;
- PUBLIC/anon receive no new privileged function path;
- migration history matches the canonical repository versions.

## Tasks

| ID | Task | Evidence | Status |
| --- | --- | --- | --- |
| 570.1 | fresh repo/production reconnaissance | main + hosted migration/catalog reads | done |
| 570.2 | refresh official Supabase migration guidance | CLI/workflow/docs | done |
| 570.3 | bounded four-migration runbook | active packet / PR #572 | done |
| 570.4 | selector + authority projection | PR #572 merged | done |
| 570.5 | version-preserving executor + exact preflight | PR #573 + preflight evidence | done |
| 570.6 | canonical production migration rollout | run `34545907924` + hosted history | done |
| 570.7 | import/measurement production verification | S3 rollback smoke + catalog | done |
| 570.8 | #567 security production verification | S4 rollback smoke + Advisor/catalog | done |
| 570.9 | runner removal + lifecycle/tracker closeout | closeout PR | in_progress — owner merge pending |

## Evaluation

Evaluator result: **PASS for production rollout and bounded behavior, subject only to owner merge of repository lifecycle closeout.**

1. Pending chain was exactly the selected four versions before apply: PASS.
2. Canonical files were blob-pinned and deployed unchanged: PASS.
3. Hosted history contains each target exactly once: PASS.
4. Import replay/cross-tenant/ledger invariants: PASS.
5. Measurement bounds and cross-tenant behavior: PASS.
6. Global default function ACL and snapshot invoker change: PASS.
7. Reconciliation owner/cross-tenant/start/complete/reopen/history behavior: PASS.
8. Sensitive financial/reconciliation browser-write check: PASS.
9. Security Advisor expected delta 43 → 42: PASS.
10. Application production health evidence: PASS (`READY`, no recent runtime error cluster).
11. Synthetic production smoke left no residual test data: PASS.
12. Temporary runner removal / authority convergence: projected by closeout PR; merge pending.

## Handoff

No further production apply belongs to #570. The closeout PR is repository lifecycle/evidence only: remove `.github/workflows/production-supabase-migrations.yml`, archive this packet, reconcile `CURRENT_PROJECT_MEMORY.md`, and return `PLAN_AUTHORITY.current` to `null`.

If exact-head CI/knowledge/security checks on that PR are green, the owner decides whether to merge it. Only after that owner merge should GitHub #570 and THU-53 be closed/completed. #174 remains a separate provider-control lane; THU-44 remains broader than this narrow production measurement rollout.