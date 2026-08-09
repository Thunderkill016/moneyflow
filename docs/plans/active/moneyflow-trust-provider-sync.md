# MoneyFlow Trust — Provider Sync

**Status:** active
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #325 reconciliation; #326 free dry-run evidence; #327 ten-file production DB evidence; audit ACL hardening branch in progress
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

This branch addresses only the audit-table least-privilege mismatch. It does not authorize or perform a production ACL write, Edge deployment, provider configuration change, production-data mutation or destructive real-user deletion.

## Repository reconnaissance

### Accepted repository contract

The audit migration describes `financial_mutation_audit_events` as append-only structural metadata. Audit writes are trigger-owned through `SECURITY DEFINER` helpers. The follow-up migration `20260804160200_financial_audit_service_role_inspection.sql` grants `service_role` SELECT only for delete-account cleanup verification.

The existing pgTAP contract `supabase/tests/database/financial_audit_atomicity_and_service_role.test.sql` requires:

- `service_role` can SELECT audit events; and
- `service_role` cannot INSERT, UPDATE or DELETE audit rows directly.

`supabase/config.toml` uses PostgreSQL 17 and leaves `api.auto_expose_new_tables` unset, matching Supabase's new local/cloud default where future `public` objects are not automatically granted to Data API roles.

### Live production mismatch

Read-only production inspection on 2026-08-09 shows:

- table owner: `postgres`;
- direct ACL: `service_role=arwdDxtm/postgres`;
- effective `service_role` privileges: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER all true;
- `service_role` does not inherit these table privileges from another role;
- the production project's `postgres` default ACL for `public` tables still includes broad `service_role` grants, consistent with an older Supabase project.

Therefore the mismatch is an existing-object ACL problem, not a role-membership problem.

### Why clean reset did not expose this earlier

Supabase changed new-project/local defaults so new `public` tables are not automatically exposed when automatic Data API grants are disabled. MoneyFlow local clean reset therefore starts from safer defaults than this older production project. The historical grant migration then adds SELECT but does not need to remove legacy DML locally, while production retained those older direct grants.

This explains why clean-reset pgTAP could pass while live effective privileges still failed the intended read-only boundary.

### Current Edge drift

Production `delete-account` remains v5 with `verify_jwt=true`, but without #324's merged AMR recent-auth evaluator/current tenant inventory. Edge work remains blocked until the database provider contract is aligned and separately owner-approved.

## Research

### Supabase platform behavior

Current official Supabase Data API guidance states that existing projects may grant SELECT/INSERT/UPDATE/DELETE on new `public` tables to `anon`, `authenticated` and `service_role` through default privileges, while newer project defaults make exposure opt-in. Supabase also states that changing default privileges affects future objects; existing tables must be revoked separately.

Applicability to MoneyFlow:

- explains the production/local default-grant difference;
- supports a table-specific forward correction for the existing audit table;
- does not justify changing all project-wide default privileges inside this bounded fix.

### PostgreSQL privilege semantics

PostgreSQL documents `REVOKE` as the mechanism for removing table privileges and notes that effective privilege is the sum of direct grants, PUBLIC grants and inherited-role grants. Production inspection found no alternate role-membership path restoring audit-table DML to `service_role`.

For PostgreSQL 17, table privileges include SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. A true read-only boundary should therefore remove all table privileges and explicitly grant SELECT back rather than revoking only three DML verbs.

### Selected correction

Forward migration candidate:

```sql
revoke all privileges
on table public.financial_mutation_audit_events
from service_role;

grant select
on table public.financial_mutation_audit_events
to service_role;
```

Why this is selected:

- it corrects the existing object that violates the MoneyFlow contract;
- it is idempotent for safer new/local projects where broad grants are already absent;
- it preserves the cleanup verification read path;
- it removes DML and table-management privileges in one explicit boundary;
- it does not alter project-wide default privileges or unrelated tables.

### Alternatives rejected

| Alternative | Decision |
|---|---|
| revoke only INSERT/UPDATE/DELETE | reject; leaves TRUNCATE/REFERENCES/TRIGGER/MAINTAIN and is not genuinely read-only |
| alter project-wide default privileges in this migration | defer; affects future objects beyond the observed table blocker |
| rely on RLS because `service_role` bypasses RLS | reject; grants and RLS are separate layers and service-role bypass makes least privilege more important |
| patch production directly without a migration | reject; would recreate Git/provider drift |
| change ownership or role membership | reject; unnecessary and materially broader |

### Adoption review

No new dependency, provider, framework or service is adopted. This is a PostgreSQL privilege correction inside the existing Supabase boundary.

## Specification

### Problem

MoneyFlow intends `financial_mutation_audit_events` to be trigger-owned and append-only from application/provider roles, with `service_role` allowed to inspect rows only for cleanup verification. Production instead grants `service_role` broad table privileges inherited from an older project default.

### User/security story

As the MoneyFlow owner, the destructive-account backend may inspect audit rows without possessing a direct path to insert, rewrite, delete, truncate or administratively alter audit-table data through ordinary table privileges.

### Acceptance criteria

Historical Provider Sync criteria remain recorded in #325–#327. This slice adds the following bounded gates:

- [x] ACL-AC1: current main, audit migrations/tests, local config and live effective production privileges are reconciled.
- [x] ACL-AC2: official Supabase/PostgreSQL behavior explains the legacy default-grant mismatch and confirms existing-object REVOKE semantics.
- [x] ACL-AC3: a forward migration candidate explicitly revokes all audit-table privileges from `service_role` then grants SELECT only.
- [x] ACL-AC4: pgTAP coverage asserts SELECT is present and all non-read PostgreSQL 17 table privileges are absent.
- [ ] ACL-AC5: exact-head database reset + all pgTAP pass on the candidate branch.
- [ ] ACL-AC6: project-knowledge/CI policy/CodeQL/secret-history selected gates pass on exact head.
- [ ] ACL-AC7: independent diff review finds no privilege regression for authenticated audit reads or trigger-owned writes.
- [ ] ACL-AC8: owner merges the reviewed candidate; merge alone does not modify production.
- [ ] ACL-AC9: owner explicitly approves the exact production ACL migration after merge/review.
- [ ] ACL-AC10: production migration history/read-back shows the forward migration applied once and `service_role` effective privileges are SELECT=true with every non-read table privilege=false.
- [ ] ACL-AC11: affected API/Postgres logs show no new permission-error cluster after production application.
- [ ] ACL-AC12: Provider Sync returns to evaluation and may advance to the separate Edge checkpoint only after ACL-AC10/11 evidence.

### Financial/security constraints

- Do not alter financial rows, balances or audit data.
- Do not modify historical migration files.
- Preserve authenticated users' own-row SELECT policy/grant.
- Preserve trigger-owned audit writes and delete-account cleanup verification.
- Do not change project-wide default privileges in this slice.
- Do not deploy Edge or change provider configuration in this slice.
- No production ACL write until a new explicit owner checkpoint after candidate review.

### Out of scope

- Edge v5 replacement/recent-auth rollout.
- Global Data API default-privilege migration.
- Least-privilege cleanup for unrelated tables.
- Archive/restore implementation.
- Product/UI changes.

## Implementation plan

### Files

- `supabase/migrations/20260809010648_financial_audit_service_role_read_only.sql`
  - revoke all existing audit-table privileges from `service_role`;
  - grant SELECT back explicitly.
- `supabase/tests/database/financial_audit_service_role_read_only.test.sql`
  - assert SELECT;
  - deny INSERT/UPDATE/DELETE;
  - deny TRUNCATE/REFERENCES/TRIGGER/MAINTAIN.
- this active packet
  - record research, state, permission boundary and verification evidence.
- PR memory after PR number exists.

### Verification

Risk class: **Class 3 database/security**.

Required candidate evidence:

1. diff hygiene + project-knowledge + CI classification;
2. fresh Supabase reset and full pgTAP suite;
3. CodeQL protected analysis and secret-history scan;
4. review exact migration/test diff against current production ACL evidence;
5. no browser/UI gate unless classifier requires one unexpectedly, because this slice changes no application/UI flow.

Production evidence, only after later explicit provider-write approval:

1. re-read pre-write ACL and migration history;
2. apply only the merged forward migration;
3. verify exact migration-history entry;
4. verify effective `service_role` privileges for SELECT and every non-read table privilege;
5. verify authenticated own-row SELECT remains available and RLS remains enabled;
6. inspect API/Postgres error window;
7. update memory/packet from provider evidence, not from merge alone.

### Rollback / forward-fix

Candidate rollback before production: revert the focused migration/test PR.

After production application, rollback by re-granting broad service-role privileges would recreate the security defect and is not the default. If cleanup verification unexpectedly needs a privilege beyond SELECT, stop and create a reviewed forward fix based on the observed query requirement rather than restoring ALL privileges.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| ACL-T1 | reconcile main/test/local/prod privilege truth | repo + live ACL reads | complete |
| ACL-T2 | focused official research | Supabase + PostgreSQL docs | complete |
| ACL-T3 | implement forward migration | branch migration | complete |
| ACL-T4 | add full read-only pgTAP contract | new test | complete |
| ACL-T5 | update active packet | this file | complete |
| ACL-T6 | open PR + bounded PR memory | PR artifacts | todo |
| ACL-T7 | exact-head Class 3 verification | CI/CodeQL/Secret | blocked by ACL-T6 |
| ACL-T8 | independent candidate review | diff + acceptance matrix | blocked by ACL-T7 |
| ACL-T9 | owner merge decision | explicit owner action | blocked by ACL-T8 |
| ACL-T10 | owner production ACL checkpoint | explicit owner action | blocked by ACL-T9 |
| ACL-T11 | apply/read back production ACL migration | provider evidence | blocked by ACL-T10 |
| ACL-T12 | proceed to Edge checkpoint | Provider Sync evidence | blocked by ACL-T11 |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | CI/production | evaluator | `evaluating` | #327 live ACL finding | audit least privilege + Edge v5 | specify forward ACL correction |
| 2026-08-09 | evaluator | implementer | `implementing` | repo/config/live ACL + official research | candidate unverified; provider writes forbidden | implement migration/test on focused branch |

### Current permission boundary

Allowed: focused branch/PR writes plus read-only GitHub/Vercel/Supabase inspection.

Forbidden without a later explicit owner checkpoint: production ACL/DDL changes, migration-history mutation, Edge deployment, provider configuration changes, production-data mutation and destructive account deletion.

## Evaluation

### Current candidate finding

The smallest coherent fix is table-local and explicit: remove every existing audit-table privilege from `service_role`, then restore SELECT only. This normalizes legacy and new Supabase project defaults without changing unrelated future-object policy.

### Evidence still required

- exact-head fresh reset/pgTAP;
- protected CI/CodeQL/secret-history;
- independent diff review;
- owner merge decision;
- separate post-merge production-write approval and live read-back.

Provider Sync remains incomplete until the production ACL contract and later Edge/recent-auth boundaries are evidenced.