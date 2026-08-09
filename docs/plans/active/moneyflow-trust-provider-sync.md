# MoneyFlow Trust — Provider Sync

**Status:** active
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #325 reconciliation; #326 free dry-run evidence; #327 ten-file production DB evidence; #328 audit ACL hardening merged and applied
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent:** `docs/plans/active/public-beta-trust.md`
**Current main audited:** `1618f817c6a96810160f6261029dd038eb8b41ea`
**Supabase project:** MoneyFlow / `fwpldsdkpzhswpuctbke`

## Outcome

Align production Supabase with accepted MoneyFlow repository contracts before Phase 1 Secure can be accepted and before Phase 2 Recover begins.

The database side of Provider Sync is now aligned for the reviewed MoneyFlow migrations and the audit-table least-privilege boundary. The remaining live Provider Sync blocker is the stale production `delete-account` Edge Function v5, which does not contain #324's merged recent-auth/current-tenant implementation.

The production audit ACL migration was explicitly owner-approved with `go` after PR #328 merged. Edge deployment remains a separate provider-write checkpoint and was not authorized or performed by that approval.

## Repository reconnaissance

### Accepted repository contract

`public.financial_mutation_audit_events` is append-only structural metadata. Audit writes are trigger-owned through `SECURITY DEFINER` helpers. The destructive-account backend needs only SELECT on this table to verify tenant cleanup.

The merged migration `20260809010648_financial_audit_service_role_read_only.sql` therefore:

```sql
revoke all privileges
on table public.financial_mutation_audit_events
from service_role;

grant select
on table public.financial_mutation_audit_events
to service_role;
```

The merged pgTAP contract requires `service_role` SELECT and denies INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN.

### Production pre-write state

Immediately before the 2026-08-09 production write:

- exact repository migration version `20260809010648`: absent;
- RLS: enabled;
- direct ACL: `service_role=arwdDxtm/postgres`, `authenticated=r/postgres`;
- effective `service_role`: SELECT plus every checked non-read table privilege;
- `authenticated` SELECT: true;
- other active database sessions: 0.

### Production post-write state

The exact merged SQL was applied through the Supabase migration endpoint. That endpoint generated a provider-time history version, so the single successful row was guarded-normalized to the repository version `20260809010648` only after SQL application succeeded and after proving the target version did not already exist.

Final live read-back:

- exact history row `20260809010648 / financial_audit_service_role_read_only`: **1**;
- stray history rows for the same migration name: **0**;
- direct ACL: `postgres=arwdDxtm/postgres, authenticated=r/postgres, service_role=r/postgres`;
- `service_role` SELECT: **true**;
- `service_role` INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN: **false**;
- RLS remains enabled;
- `authenticated` SELECT remains true;
- other active database sessions after verification: 0.

No real financial row or audit row was created, updated or deleted by this migration. The provider write changed table privileges plus the migration-history identity only.

### Current Edge drift

Production `delete-account` remains **v5** with `verify_jwt=true`, without #324's merged AMR recent-auth evaluator/current tenant inventory. Vercel deployment does not deploy this Supabase Edge Function.

## Research

### Supabase platform behavior

Official Supabase guidance explains the observed legacy/new-project difference: older projects may carry broad Data API grants through default privileges, while newer defaults are more opt-in. Changing default privileges affects future objects; existing objects require explicit grant/revoke correction.

Applicability:

- explains why production had broad direct `service_role` table grants while current local reset did not;
- supports the table-local forward migration used by #328;
- does not justify a project-wide default-privilege change in this slice.

### PostgreSQL privilege semantics

PostgreSQL effective access is the union of direct, PUBLIC and inherited-role grants. Production inspection found the audit-table grant directly on `service_role` and no alternate membership path that would restore the removed non-read privileges.

### Adoption review

No dependency, provider, framework or runtime architecture was added. This is a PostgreSQL privilege correction inside the existing Supabase boundary.

## Specification

### Problem

MoneyFlow requires the destructive-account backend to inspect financial audit rows without having direct table-level authority to mutate or administratively alter them. Legacy production grants violated that invariant.

### Acceptance criteria

- [x] ACL-AC1: repository migrations/tests/config and live production privilege truth reconciled.
- [x] ACL-AC2: official Supabase/PostgreSQL behavior reviewed and applicable.
- [x] ACL-AC3: focused forward migration merged in #328.
- [x] ACL-AC4: pgTAP covers SELECT plus denial of every checked PostgreSQL 17 non-read table privilege.
- [x] ACL-AC5: fresh reset + pgTAP passed: **26 files / 481 tests**.
- [x] ACL-AC6: final exact-head CI #2113, CodeQL #1212 and Secret history #1212 passed.
- [x] ACL-AC7: independent diff review found no regression to authenticated own-row reads, trigger-owned audit writes or cleanup inspection.
- [x] ACL-AC8: owner merged #328; squash merge `1618f817c6a96810160f6261029dd038eb8b41ea`.
- [x] ACL-AC9: owner explicitly approved the scoped production ACL write with `go`.
- [x] ACL-AC10: production history/read-back proves exact migration identity and SELECT-only effective `service_role` access.
- [x] ACL-AC11: immediate Postgres/provider inspection shows the migration committed cleanly and no new ACL-specific permission-error cluster. The API log had no relevant post-write destructive-flow traffic, so this is not evidence that the still-stale Edge flow passed.
- [x] ACL-AC12: the audit ACL slice may return to Provider Sync evaluation; the next boundary is a separately approved Edge deployment.

### Financial/security constraints

- No real financial-row mutation for ACL verification.
- Preserve authenticated own-row SELECT and RLS.
- Preserve trigger-owned audit writes.
- Do not alter project-wide default privileges in this slice.
- Do not deploy Edge under the ACL production approval.
- Do not perform destructive real-user deletion for smoke verification.

### Out of scope

- Edge v5 replacement/recent-auth rollout.
- Global Data API default-privilege cleanup.
- Least-privilege review for unrelated shared Atoryn tables.
- Archive/restore implementation.
- Product/UI changes.

## Implementation plan

### Completed ACL rollout

1. Merge the focused forward migration and pgTAP contract.
2. Re-read production migration history, live ACL, RLS and session activity.
3. Apply only the merged ACL SQL after explicit owner approval.
4. Normalize the migration history to the exact repository timestamp only after guarded verification of the single successful provider-generated row.
5. Re-read exact migration identity and every required effective table privilege.
6. Inspect security advisor and Postgres/API logs.
7. Persist provider truth in repository memory.

### Next Edge checkpoint

A later explicit owner provider-write approval is required before deploying `supabase/functions/delete-account`.

Before that write:

1. fresh-read current `main` Edge source and production function source/version;
2. verify DB cleanup inventory still matches current schema;
3. confirm `verify_jwt=true` and recent-auth evaluator contract;
4. define non-destructive provider smoke for stale/fresh password and supported OAuth/Google paths;
5. identify rollback to the previous Edge version/source.

After deployment:

1. read back exact production function source/version;
2. verify recent-auth and tenant-cleanup inventory are present;
3. perform safe provider-backed step-up checks without deleting a real account;
4. inspect Edge/Auth/API/Postgres logs;
5. only then advance P1 Secure provider status.

### Rollback / forward-fix

The ACL migration intentionally removes an unsafe direct mutation path. Re-granting broad `service_role` privileges would recreate the defect and is not the default rollback. If the current Edge implementation later proves it requires more than SELECT, stop and create a reviewed narrow forward fix from the observed requirement.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| ACL-T1 | reconcile repo/local/production ACL truth | repo + live ACL | complete |
| ACL-T2 | focused official research | Supabase + PostgreSQL | complete |
| ACL-T3 | merge focused migration/test | PR #328 | complete |
| ACL-T4 | exact-head Class 3 verification | CI #2113 / CodeQL #1212 / Secret #1212 / 481 pgTAP | complete |
| ACL-T5 | owner production approval | explicit `go` | complete |
| ACL-T6 | apply exact ACL migration | Supabase migration endpoint | complete |
| ACL-T7 | normalize exact migration identity | guarded single-row history update | complete |
| ACL-T8 | production ACL/RLS read-back | exact history + effective privileges | complete |
| ACL-T9 | initial provider logs/advisor inspection | provider evidence | complete |
| ACL-T10 | persist production evidence | follow-up docs PR | in progress |
| EDGE-T1 | prepare exact current Edge deployment checkpoint | repo + provider read | blocked by ACL-T10 repository handoff |
| EDGE-T2 | owner Edge write decision | explicit owner approval | blocked by EDGE-T1 |
| EDGE-T3 | deploy/read back current Edge + safe provider smoke | provider evidence | blocked by EDGE-T2 |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | CI/production | evaluator | `evaluating` | #327 live ACL finding | audit ACL + Edge v5 | specify ACL fix |
| 2026-08-09 | evaluator | implementer | `implementing` | official research + live ACL | production writes forbidden | implement #328 |
| 2026-08-09 | implementer | evaluator | `evaluating` | #328 + 481 pgTAP | exact-head review | prepare owner merge checkpoint |
| 2026-08-09 | evaluator | human owner | `ready_for_review` | CI #2113 / CodeQL #1212 / Secret #1212 | merge decision | owner merge |
| 2026-08-09 | human owner | production/evaluator | `evaluating` | #328 merged + explicit `go`; live ACL/history read-back | Edge v5 | persist evidence, then prepare separate Edge checkpoint |

### Current permission boundary

Allowed now: branch/PR documentation updates plus read-only GitHub/Vercel/Supabase inspection.

Not authorized by the consumed ACL `go`: Edge deployment, provider configuration changes, real financial-data mutation, destructive account deletion or Phase 2 implementation.

## Evaluation

### Result

The audit-table least-privilege mismatch is closed in production. `service_role` now has exactly the table permission MoneyFlow intended for cleanup verification: SELECT only. Repository migration identity and live provider history are aligned at `20260809010648`.

### Remaining Provider Sync boundary

The database migration/schema/ACL side is aligned for this program. Production `delete-account` Edge v5 remains stale. Provider Sync therefore stays active in `evaluating` until a separately approved Edge rollout and safe provider-backed recent-auth verification are complete.
