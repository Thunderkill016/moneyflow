# MoneyFlow Trust — Provider Sync

**Status:** active
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #325 reconciliation; #326 free dry-run evidence; #327 production DB evidence
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent:** `docs/plans/active/public-beta-trust.md`
**Current main audited:** `8d0070b3d039fc80647e888aa1bd89f18b4de0b4`
**Supabase project:** MoneyFlow / `fwpldsdkpzhswpuctbke`

## Outcome

Align production Supabase with accepted MoneyFlow repository contracts before Phase 1 Secure can be accepted and before Phase 2 Recover begins.

The exact ten reviewed MoneyFlow migrations were applied to production on 2026-08-08 and their original repository versions now exist in remote migration history. Review/reconciliation/rules schema is present and structurally verified. Provider Sync is **not fully aligned yet** because:

1. production `financial_mutation_audit_events` currently gives `service_role` effective `INSERT`, `UPDATE` and `DELETE`, while the merged pgTAP contract requires those privileges to be denied; and
2. production `delete-account` remains Edge Function v5 without the merged recent-auth/current-tenant implementation.

No new ACL migration, Edge deployment or destructive real-user deletion is authorized by this evidence PR.

## Repository reconnaissance

### Exact migration execution

The reviewed source set, applied in dependency order from exact `main@8d0070b3d039fc80647e888aa1bd89f18b4de0b4`, was:

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

Seven legitimate Atoryn migration-history rows in the same Supabase project were preserved unchanged.

The connected Supabase migration endpoint generated current-time history versions while applying SQL. After each successful tracked application, only that unique successful row's `version` field was guarded-normalized to the original repository timestamp. No failed or unapplied SQL was marked applied and no Atoryn history row was rewritten.

### Production catalog and data state

Post-write production verification found:

- all ten original MoneyFlow versions present exactly once;
- no temporary provider-generated rollout version remaining;
- **27/27** checked target indexes present and valid/ready;
- **10/10** checked target constraints validated;
- baseline affected data preserved: 47 financial transactions, 47 transaction entries, 6 Inbox candidates, 3 accounts, 33 categories, 0 monthly budgets and 0 import-provenance rows;
- `financial_transactions.review_status`: 0 null rows;
- `transaction_entries.reconciliation_state`: 0 null rows;
- `transaction_review_feed`: 45 active rows;
- `account_reconciliation_entry_feed`: 45 active logical account-leg rows;
- reconciliation/rules/audit tables have RLS enabled;
- reconciliation companion views are `security_invoker=true`;
- final database activity check found 0 other active sessions.

### Audit least-privilege mismatch

The merged database test `supabase/tests/database/financial_audit_atomicity_and_service_role.test.sql` requires:

- `service_role` can `SELECT` `public.financial_mutation_audit_events`; and
- `service_role` **cannot** `INSERT`, `UPDATE` or `DELETE` that table.

Live production ACL inspection instead shows broad direct `service_role` table privileges, including DML. This appears consistent with an older project-wide Supabase default-grant pattern also visible on established tables, but repository tests are the accepted MoneyFlow contract and therefore outrank that platform-history explanation.

Result: the audit table/triggers/history are deployed, but the effective provider least-privilege boundary is **partial**, not aligned. It requires a new reviewed forward migration/spec; it must not be patched ad hoc inside #327.

### Current Edge drift

Production `delete-account` remains v5 with `verify_jwt=true`, but without #324's merged AMR recent-auth evaluator/current tenant inventory. Vercel `READY` proves only the Next.js deployment and does not deploy Supabase Edge Functions.

## Research

### Replay and migration-selection evidence

Exact-head CI #2070 replayed the complete current migration chain and passed **25 pgTAP files / 478 tests**.

PR #326 at exact head `0662ef8690ad204b145d91da0c9d29576e2abfc7` reconstructed the live union-history shape in an ephemeral local Supabase database and ran:

`supabase db push --local --include-all --dry-run`

GitHub Actions run `31259696558` selected exactly the ten MoneyFlow migrations above and no Atoryn migration. Fresh live production history immediately before the write matched the simulated history shape.

**Accepted limitation:** an actual linked-production CLI dry-run was not executed. The owner explicitly said **“Go”** after this limitation and the exact DB write boundary were stated, accepting the free local union-history simulation plus fresh live provider preflight for that one DB checkpoint. This does not retroactively make the linked dry-run criterion pass.

### Provider findings after execution

Post-write advisors/logs were inspected. Newly created/low-traffic indexes appearing as `unused_index` INFO do not by themselves invalidate rollout correctness. Existing/generic provider findings remain separate hardening inputs.

The audit ACL mismatch is different: it directly contradicts a merged pgTAP invariant and therefore remains a Provider Sync blocker.

### Adoption review

No new dependency, provider, service, framework or runtime architecture is adopted by #327. Any ACL correction requires a new reviewed migration rather than a console-only or ad-hoc production change.

## Specification

### Problem

The ten-file migration-history/schema drift is resolved, but production still differs from the merged MoneyFlow contract at two trust boundaries: audit-table `service_role` DML privilege and the stale destructive Edge Function.

### Safety constraints

- No fabricated financial rows, balance repair or destructive real-user test.
- Preserve integer money, transfer neutrality, split exactness, RLS and tenant ownership.
- Preserve legitimate Atoryn migration history.
- Never copy provider credentials or secrets into repository evidence.
- Do not deploy current Edge or change production ACLs without a new explicit owner checkpoint.
- Do not alter the historical ten migration files in place.

### Acceptance criteria

- [x] PS-AC1: remote migration history and Edge source/version captured.
- [x] PS-AC2: current-main/provider drift recorded.
- [x] PS-AC3: exact MoneyFlow migration set proven as ten files.
- [x] PS-AC4: complete current migration chain replays; 478 pgTAP assertions pass.
- [x] PS-AC5: migration dependency/lock/data/privilege risks and production preflight recorded.
- [ ] PS-AC6: actual linked-production union-history CLI dry-run lists exactly the reviewed MoneyFlow write set. **Not executed; accepted limitation for the consumed DB checkpoint.**
- [x] PS-AC7: owner approved the exact ten-migration production DB write with “Go”.
- [x] PS-AC8: ten source migrations applied in order; original remote versions/catalog objects exist and Atoryn history is preserved.
- [ ] PS-AC9: post-migration provider invariants fully match merged RLS/grant/function/index contracts. **Blocked by effective `service_role` DML on `financial_mutation_audit_events`.**
- [ ] PS-AC10: owner approves a reviewed forward audit-ACL hardening migration.
- [ ] PS-AC11: production audit effective privileges satisfy the merged pgTAP contract after hardening.
- [ ] PS-AC12: owner separately approves current `delete-account` Edge deployment after DB contract alignment.
- [ ] PS-AC13: production Edge read-back proves current recent-auth/current tenant inventory and `verify_jwt=true`.
- [ ] PS-AC14: safe stale/fresh password and supported OAuth/Google step-up evidence is recorded without destructive real-user deletion.
- [ ] PS-AC15: no affected provider/runtime error cluster appears during the post-deployment verification window.
- [ ] PS-AC16: P1/current memory advances only after provider evidence exists.

## Implementation plan

### Completed ten-file DB rollout

| Order | Exact version | Result | Key verification |
|---:|---|---|---|
| 1 | `20260802060004` | applied | 14/14 FK-supporting indexes |
| 2 | `20260803090000` | applied | review type/column/view + RPCs |
| 3 | `20260803142000` | applied | reconciliation domain/tables/entry state/RPCs |
| 4 | `20260803144500` | applied | supporting reconciliation indexes |
| 5 | `20260803153000` | applied | security-invoker reconciliation entry view |
| 6 | `20260804110000` | applied | rules table/RLS/evidence/RPCs |
| 7 | `20260804160000` | applied | audit table/RLS/triggers/current tenant purge |
| 8 | `20260804160100` | applied | financial read-plan index |
| 9 | `20260804160200` | applied | explicit audit inspection grant |
| 10 | `20260804160300` | applied | request-id token constraint/helper boundary |

### Next required database action

Create a new bounded specification/migration that makes the **effective production** privileges on `public.financial_mutation_audit_events` satisfy the merged test contract:

- `service_role`: SELECT yes;
- `service_role`: INSERT/UPDATE/DELETE no.

The migration must account for project-level/default privilege behavior rather than assuming one table-level `REVOKE` is sufficient. It requires fresh replay/pgTAP evidence and a separate owner provider-write approval before production execution.

### Edge deployment candidate

Only after the audit privilege contract is aligned and separately approved:

1. recapture current production Edge v5 metadata/source;
2. deploy current `delete-account` bundle including `_shared/account-deletion-recent-auth.ts`;
3. preserve `verify_jwt=true`;
4. read back deployed version/source/hash;
5. prove recent-auth gate and current tenant inventory exist;
6. exercise safe stale/fresh password and supported OAuth/Google paths without confirmed destructive deletion;
7. inspect Auth/Edge/API/Postgres runtime errors;
8. reconcile P1 Secure and parent Trust state from evidence.

### Rollback / forward-fix

The historical ten migrations are now production history and are not rollback targets. Any newly discovered provider-contract mismatch should be corrected through a new reviewed forward migration. Edge rollback to v5 after a future Edge rollout would restore a known recent-auth gap and therefore requires explicit owner approval if ever needed.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| PS-T1 | capture production migration/function baseline | live provider reads | complete |
| PS-T2 | prove exact ten-file MoneyFlow set | CI sequence + remote checks | complete |
| PS-T3 | review migration dependencies/production risks | source + provider preflight | complete |
| PS-T4 | prove full migration replay | CI #2070: 25 pgTAP files / 478 pass | complete |
| PS-T5 | actual linked-production dry-run | not executed; #326 local union-history simulation used for consumed DB checkpoint | accepted limitation |
| PS-T6 | owner approve exact ten-file DB write | explicit “Go” | complete |
| PS-T7 | apply exact ten migrations and verify schema/history | live production evidence | complete |
| PS-T8 | reconcile effective audit-table least privilege | merged pgTAP contract vs live ACL | todo |
| PS-T9 | owner approve reviewed ACL hardening write | explicit owner checkpoint | blocked by PS-T8 plan/review |
| PS-T10 | apply/verify ACL hardening migration | pgTAP + live privilege evidence | blocked by PS-T9 |
| PS-T11 | owner approve current Edge deployment | separate explicit checkpoint | blocked by PS-T10 |
| PS-T12 | deploy/read back current `delete-account` | version/source/hash | blocked by PS-T11 |
| PS-T13 | production-safe recent-auth acceptance | stale/fresh password/Google evidence | blocked by PS-T12 |
| PS-T14 | reconcile P1/parent/current memory | accepted provider evidence | in progress |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | researcher | planner | `specified` | provider migration/catalog/Edge reads | exact rollout evidence incomplete | plan provider sync |
| 2026-08-08 | planner | evaluator | `planned` | exact ten-file set; CI #2070; risk review | linked dry-run unavailable | run non-writing simulation |
| 2026-08-08 | evaluator | human owner | `evaluating` | #326 simulation + fresh live preflight | linked-production dry-run absent | owner DB decision |
| 2026-08-08 | human owner | CI/production | `implementing` | explicit “Go” | exact ten-file write only | apply and verify ten migrations |
| 2026-08-08 | CI/production | evaluator | `evaluating` | ten exact versions; catalog/invariants/advisors; live ACL check | audit least-privilege mismatch + Edge v5 | document finding; no new provider write |

### Current permission boundary

The owner-approved ten-migration DB authorization has been consumed and completed. Current provider scope is read-only. Allowed now: branch/PR evidence work and read-only GitHub/Vercel/Supabase verification.

Forbidden without a new explicit owner checkpoint: ACL/DDL changes, Edge deployment, provider configuration change, production-data mutation and destructive account deletion.

## Evaluation

### Acceptance evidence

- exact ten-file current migration chain + 478 pgTAP assertions: **pass in clean replay**;
- free local union-history CLI dry-run selected exactly ten MoneyFlow migrations: **pass as simulation**;
- actual linked-production CLI dry-run: **not executed / accepted limitation for the consumed DB checkpoint**;
- ten migrations applied under original repository versions: **pass**;
- seven legitimate Atoryn history rows preserved: **pass**;
- target indexes/constraints/RLS/views and data-shape invariants: **verified**;
- effective production audit `service_role` DML denial: **fail / open blocker**;
- production Edge current recent-auth/current-tenant alignment: **pending**;
- post-Edge safe recent-auth acceptance: **pending**;
- destructive real-user deletion: **not performed and not required as evidence**.

### Current review finding

**Provider Sync remains evaluating.** The ten-file migration drift is closed, but MoneyFlow must not call the database provider-aligned until the audit-table effective least-privilege invariant is restored. After that, the remaining destructive-runtime blocker is production `delete-account` v5 plus safe recent-auth provider acceptance.

## Delivery record

- Discovery/reconciliation PR: #325.
- Free dry-run probe: #326, closed unmerged.
- Evidence/reconciliation PR: #327.
- Database source baseline: exact `main@8d0070b3d039fc80647e888aa1bd89f18b4de0b4`.
- Production ten-file migration execution: complete on 2026-08-08.
- Atoryn shared history: preserved.
- Audit effective least-privilege: **not aligned**.
- Edge writes after DB execution: none.
- Destructive production-data tests: none.
- Current state: `evaluating`; next provider write requires a new explicit owner checkpoint.