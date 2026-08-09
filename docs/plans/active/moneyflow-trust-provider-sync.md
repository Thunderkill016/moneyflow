# MoneyFlow Trust — Provider Sync

**Status:** active
**Execution state:** ready_for_review
**Active role:** evaluator
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #325 reconciliation; #326 free dry-run evidence; #327 ten-file production DB evidence; #328 audit ACL hardening candidate
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent:** `docs/plans/active/public-beta-trust.md`
**Current main audited:** `0ab8d8135215bb7efa07c8735cfcf26621cad7b1`
**Supabase project:** MoneyFlow / `fwpldsdkpzhswpuctbke`

## Outcome

Align production Supabase with accepted MoneyFlow repository contracts before Phase 1 Secure can be accepted and before Phase 2 Recover begins.

The prior ten-file migration-history/schema drift is closed. Provider Sync remains blocked at two live boundaries:

1. `public.financial_mutation_audit_events` gives `service_role` effective non-read table privileges in production while MoneyFlow requires read-only inspection; and
2. production `delete-account` remains Edge Function v5 without the merged recent-auth/current-tenant implementation.

PR #328 is the reviewed repository candidate for the first blocker. It does not itself change production. A separate explicit owner provider-write checkpoint is required after merge before the ACL migration may be applied to production.

## Repository reconnaissance

### Accepted repository contract

The audit domain is append-only structural metadata. Audit writes are trigger-owned through `SECURITY DEFINER` helpers. `20260804160200_financial_audit_service_role_inspection.sql` grants `service_role` SELECT for delete-account cleanup verification.

The existing pgTAP contract `supabase/tests/database/financial_audit_atomicity_and_service_role.test.sql` requires:

- `service_role` can SELECT audit events; and
- `service_role` cannot INSERT, UPDATE or DELETE audit rows directly.

`supabase/config.toml` targets PostgreSQL 17 and leaves `api.auto_expose_new_tables` unset, matching Supabase's safer new local/cloud behavior where new `public` objects are not automatically exposed to Data API roles.

### Live production mismatch

Read-only production inspection on 2026-08-09 showed:

- table owner: `postgres`;
- direct ACL: `service_role=arwdDxtm/postgres`;
- effective `service_role` privileges: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER all true;
- the direct ACL also carries PostgreSQL table-management privilege `MAINTAIN` through the legacy grant set;
- `service_role` does not inherit the audit-table privileges from another role;
- the production project's `postgres` default ACL for `public` tables still contains broad `service_role` grants, consistent with an older Supabase project.

Therefore the observed mismatch is an existing-object ACL problem, not a role-membership problem.

### Why clean reset differed from production

Current Supabase defaults no longer automatically grant Data API roles broad access to newly created `public` objects when automatic exposure is disabled. MoneyFlow local clean reset therefore begins from safer defaults than this older production project. The historical SELECT migration was sufficient locally but did not remove production's pre-existing broad direct grant.

This explains why repository pgTAP could pass while live production effective privileges still violated the intended read-only boundary.

### Current Edge drift

Production `delete-account` remains v5 with `verify_jwt=true`, but without #324's merged AMR recent-auth evaluator/current tenant inventory. Edge deployment remains a separate later checkpoint.

## Research

### Supabase platform behavior

Current official Supabase Data API guidance establishes that older/existing projects may carry automatic table grants to Data API roles, while newer defaults make exposure opt-in. Supabase also distinguishes default privileges for future objects from grants already present on an existing table.

Applicability:

- explains the local/production mismatch;
- supports a table-specific forward correction for the existing audit table;
- does not justify changing project-wide future-object defaults inside this bounded fix.

### PostgreSQL privilege semantics

PostgreSQL `REVOKE` removes granted table privileges, while effective privilege is the union of direct, PUBLIC and inherited-role grant paths. Production inspection found no alternate role-membership path that would restore the audit-table permissions after the direct `service_role` grant is removed.

For PostgreSQL 17, a true read-only table boundary must exclude INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN rather than merely the three common DML verbs.

### Selected correction

PR #328 adds:

```sql
revoke all privileges
on table public.financial_mutation_audit_events
from service_role;

grant select
on table public.financial_mutation_audit_events
to service_role;
```

This is selected because it:

- corrects the existing object that violates MoneyFlow's contract;
- is idempotent on safer local/new projects where broad grants are absent;
- preserves the cleanup verification read path;
- removes all direct non-read table privileges in one explicit boundary;
- leaves unrelated tables and project-wide future-object defaults unchanged.

### Alternatives rejected

| Alternative | Decision |
|---|---|
| revoke only INSERT/UPDATE/DELETE | reject; leaves table-management privileges and is not genuinely read-only |
| alter project-wide default privileges in this slice | defer; affects future objects and unrelated tables |
| rely on RLS | reject; `service_role` bypasses RLS and grants remain a separate authority layer |
| patch production directly without migration | reject; would recreate Git/provider drift |
| change ownership or role membership | reject; unnecessary and materially broader |

### Adoption review

No new dependency, provider, framework or service is adopted. This is a PostgreSQL privilege correction inside the existing Supabase boundary.

## Specification

### Problem

MoneyFlow intends `financial_mutation_audit_events` to be trigger-owned and append-only from application/provider roles, with `service_role` allowed only to inspect rows for cleanup verification. Production instead retains broad direct table privileges from an older project default.

### User/security story

As the MoneyFlow owner, the destructive-account backend may inspect audit rows without holding a direct table-level path to insert, rewrite, delete, truncate or administratively manipulate audit records.

### Acceptance criteria

- [x] ACL-AC1: current main, audit migrations/tests, local config and live production privileges reconciled.
- [x] ACL-AC2: official Supabase/PostgreSQL behavior explains the legacy default-grant mismatch and existing-object REVOKE semantics.
- [x] ACL-AC3: forward migration revokes all audit-table privileges from `service_role`, then grants SELECT only.
- [x] ACL-AC4: pgTAP coverage asserts SELECT and denies INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN.
- [x] ACL-AC5: source candidate fresh reset applied the migration and all pgTAP passed: **26 files / 481 tests** in CI #2111.
- [x] ACL-AC6: source candidate policy/knowledge/classification, CodeQL #1210 and Secret history #1210 passed; browser/cross-device were intentionally not selected because no app/UI path changed.
- [x] ACL-AC7: independent diff review found no regression to authenticated own-row SELECT, trigger-owned writes or delete-account cleanup inspection.
- [ ] ACL-AC8: final evidence-only head passes protected checks and owner merges the reviewed candidate; merge alone does not modify production.
- [ ] ACL-AC9: owner explicitly approves the exact production ACL migration after merge/review.
- [ ] ACL-AC10: production migration history/read-back proves the migration applied once and `service_role` has SELECT=true with every non-read table privilege=false.
- [ ] ACL-AC11: affected API/Postgres logs show no new permission-error cluster after production application.
- [ ] ACL-AC12: Provider Sync may advance to the separate Edge checkpoint only after ACL-AC10/11 evidence.

### Financial/security constraints

- Do not alter financial rows, balances or audit records.
- Do not modify historical migration files.
- Preserve authenticated users' own-row SELECT policy/grant.
- Preserve trigger-owned audit writes and delete-account cleanup verification.
- Do not change project-wide default privileges in this slice.
- Do not deploy Edge or change provider configuration in this slice.
- No production ACL write until a separate explicit owner checkpoint after merge/review.

### Out of scope

- Edge v5 replacement/recent-auth rollout.
- Global Data API default-privilege policy changes.
- Least-privilege cleanup for unrelated tables.
- Archive/restore implementation.
- Product/UI changes.

## Implementation plan

### Files

- `supabase/migrations/20260809010648_financial_audit_service_role_read_only.sql`
  - revoke every existing audit-table privilege from `service_role`;
  - grant SELECT back explicitly.
- `supabase/tests/database/financial_audit_service_role_read_only.test.sql`
  - assert SELECT;
  - deny INSERT/UPDATE/DELETE;
  - deny TRUNCATE/REFERENCES/TRIGGER/MAINTAIN.
- `docs/research/pr-memory/2026/Q3/PR-328.md`
  - bounded source-candidate evidence and production limitation.
- this packet
  - current state, research, acceptance and provider boundary.

### Candidate verification

Risk class: **Class 3 database/security**.

Source candidate `da02ede839bbcec4f9a5512384af1d90231dc52e`:

- CI #2111 policy/knowledge/classification: pass;
- database fresh reset: pass;
- new migration applied in the complete migration sequence: pass;
- pgTAP: **26 files / 481 tests / PASS**;
- both `financial_audit_atomicity_and_service_role.test.sql` and the new read-only test: pass;
- CodeQL #1210: pass;
- Secret history #1210: pass;
- app static/build/browser/cross-device work: intentionally not selected by the risk classifier because the PR changes no application/UI path.

The evidence-only packet/PR-memory update creates a newer final head. Protected checks must pass again on that exact head before merge.

### Independent review

The exact migration/test diff was reviewed against live ACL evidence and current audit ownership:

- the problematic grant is direct on the existing table;
- no inherited role path restores the removed audit-table privilege;
- authenticated own-row SELECT remains unchanged;
- trigger-owned `SECURITY DEFINER` audit writes do not depend on direct `service_role` table DML;
- delete-account's cleanup verification needs SELECT, which remains granted;
- no unrelated table/default privilege is changed.

No candidate defect was found.

### Production verification — only after later approval

1. re-read migration history and exact live ACL immediately before write;
2. apply only the merged forward migration;
3. verify the exact migration-history row;
4. verify `service_role`: SELECT=true and INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN=false;
5. verify RLS remains enabled and authenticated own-row SELECT remains available;
6. inspect affected API/Postgres error window;
7. update current memory/packet from live evidence;
8. only then request the separate Edge deployment checkpoint.

### Rollback / forward-fix

Before production, rollback is a focused PR revert.

After production application, re-granting broad `service_role` permissions would recreate the security defect and is not the default rollback. If cleanup verification unexpectedly requires more than SELECT, stop and create a reviewed forward fix based on the observed query requirement rather than restoring ALL privileges.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| ACL-T1 | reconcile main/test/local/prod privilege truth | repo + live ACL reads | complete |
| ACL-T2 | focused official research | Supabase + PostgreSQL docs | complete |
| ACL-T3 | implement forward migration | PR #328 migration | complete |
| ACL-T4 | add full read-only pgTAP contract | PR #328 test | complete |
| ACL-T5 | update active packet | this file | complete |
| ACL-T6 | open PR + bounded PR memory | PR #328 | complete |
| ACL-T7 | source-candidate Class 3 verification | CI #2111 / CodeQL #1210 / Secret #1210 | complete |
| ACL-T8 | independent candidate review | exact migration/test diff | complete |
| ACL-T9 | final exact-head protected rerun | final PR head | in progress |
| ACL-T10 | owner merge decision | explicit `merge` | blocked by ACL-T9 |
| ACL-T11 | owner production ACL checkpoint | new explicit approval | blocked by ACL-T10 |
| ACL-T12 | apply/read back production ACL migration | provider evidence | blocked by ACL-T11 |
| ACL-T13 | proceed to Edge checkpoint | Provider Sync evidence | blocked by ACL-T12 |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | CI/production | evaluator | `evaluating` | #327 live ACL finding | audit least privilege + Edge v5 | specify forward ACL correction |
| 2026-08-09 | evaluator | implementer | `implementing` | repo/config/live ACL + official research | provider writes forbidden | implement migration/test |
| 2026-08-09 | implementer | evaluator | `evaluating` | #328 source candidate | exact-head verification | run Class 3 gates + diff review |
| 2026-08-09 | evaluator | human owner | `ready_for_review` | CI #2111 DB 26/481 pass; CodeQL/Secret #1210; independent review clean | final evidence-only head rerun + owner merge | merge only after exact-head checks are green |

### Current permission boundary

Allowed: focused branch/PR writes plus read-only GitHub/Vercel/Supabase inspection.

Forbidden without a later explicit owner checkpoint: production ACL/DDL changes, migration-history mutation, Edge deployment, provider configuration changes, production-data mutation and destructive account deletion.

## Evaluation

### Candidate result

The smallest coherent fix remains table-local and explicit: remove every direct audit-table privilege from `service_role`, then restore SELECT only. Source-candidate full migration replay and 481 pgTAP assertions pass, and independent review found no privilege-path regression.

### Remaining evidence

- final exact-head protected checks after this evidence-only update;
- owner merge decision;
- separate owner production ACL approval;
- live production privilege/log read-back;
- later separate Edge/recent-auth rollout.

Provider Sync remains incomplete until the production ACL contract and later Edge/recent-auth boundaries are evidenced.