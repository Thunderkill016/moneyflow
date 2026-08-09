# MoneyFlow Trust — Provider Sync

**Status:** active
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #325 reconciliation; #326 free dry-run evidence; #327 ten-file production DB evidence; #328 audit ACL hardening; #329 audit ACL production evidence
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent:** `docs/plans/active/public-beta-trust.md`
**Current main audited:** `cfbff67171421d5f2ee70460b5e81edc59e8a6b1`
**Supabase project:** MoneyFlow / `fwpldsdkpzhswpuctbke`

## Outcome

Align the production Supabase database and destructive Edge runtime with the reviewed MoneyFlow repository contract before Phase 1 Secure can be accepted and before Phase 2 Recover begins.

The reviewed database migration/schema/ACL drift is closed. On 2026-08-09 the owner explicitly approved the separate Edge provider-write checkpoint with `Gô`; production `delete-account` was deployed from current `main` and read back as **v6 ACTIVE with `verify_jwt=true`**.

Provider Sync no longer has a known Git/Supabase DB/Edge source drift. The remaining boundary is **provider-backed recent-auth acceptance**: safe password and supported OAuth/Google step-up must still be exercised without deleting a real account.

## Repository reconnaissance

### Accepted repository contract

Current `main@cfbff67171421d5f2ee70460b5e81edc59e8a6b1` contains:

- `supabase/functions/delete-account/index.ts`;
- `supabase/functions/_shared/account-deletion-recent-auth.ts`;
- a ten-minute recent-auth policy accepting only interactive AMR methods `password` and `oauth`;
- `auth.getUser()` plus verified `auth.getClaims()` before destructive authority;
- fail-closed `recent_auth_required` behavior before tenant purge;
- the current tenant cleanup inventory including `financial_mutation_audit_events`, `transaction_import_provenance`, `inbox_rules`, `account_reconciliations` and `account_reconciliation_events`;
- `purge_user_tenant_data` followed by zero-row verification and only then Auth identity deletion.

The reviewed database contract is also live:

- the previously missing ten MoneyFlow migrations are present under repository versions;
- legitimate shared Atoryn migration history is preserved;
- `20260809010648_financial_audit_service_role_read_only` is present exactly once;
- `financial_mutation_audit_events` keeps RLS and authenticated SELECT;
- effective `service_role` access to that table is SELECT-only for the reviewed table privileges.

### Production Edge pre-write state

Immediately before the approved Edge write, production `delete-account` was:

- version **5**;
- status `ACTIVE`;
- `verify_jwt=true`;
- bundle SHA-256 `b17fff6fa6b3f7234c42bf4eedf46b4a4a9befecb83cd5ff26c1434451e09d91`;
- missing the recent-auth helper/import/evaluation;
- missing the current audit/provenance/rules/reconciliation cleanup inventory.

### Production Edge post-write state

The approved deployment uploaded only the two Git-owned function files required by the current source:

- `delete-account/index.ts`;
- `_shared/account-deletion-recent-auth.ts`.

Live read-back after deployment:

- slug: `delete-account`;
- version: **6**;
- status: `ACTIVE`;
- `verify_jwt=true`;
- provider bundle SHA-256: `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`;
- entrypoint: `delete-account/index.ts`;
- both uploaded files are present in provider read-back;
- read-back source contains the ten-minute AMR evaluator and the current tenant cleanup inventory.

The Edge log query returned no runtime events immediately after deployment. That is evidence of **no observed runtime traffic/error in that window**, not evidence that password/Google step-up passed.

No real account deletion, financial-row mutation, provider secret change or provider configuration change was performed as part of the rollout.

## Research

### Supabase Edge deployment semantics

Current official Supabase documentation states that Edge Functions deploy independently from Vercel, individual functions can be deployed to a remote project, function configuration such as JWT verification belongs to the function deployment/config boundary, and signed-in user functions should keep JWT verification enabled.

Applicability:

- supports treating Vercel and Supabase Edge as separate lifecycles;
- supports preserving `verify_jwt=true` for `delete-account`;
- supports deployment/read-back as provider evidence;
- does **not** make an unexecuted authenticated flow a pass.

The 2026 Supabase breaking-change changelog was reviewed before rollout. No hosted Edge Function breaking change found there required changing this deployment contract.

### Adoption review

No new dependency, provider, service, framework or runtime architecture was adopted. The rollout used the existing Supabase Edge Function and its already reviewed pinned `@supabase/supabase-js@2.110.3` dependency.

## Specification

### Problem

Before this rollout, Git/Vercel/database state and the destructive Supabase runtime disagreed: current `main` required recent interactive authentication, while production Edge v5 did not.

The source drift is now closed. The remaining question is behavioral: do production password and supported OAuth/Google step-up flows produce the expected verified AMR and preserve same-account continuity without destructive deletion?

### Acceptance criteria

- [x] EDGE-AC1: fresh current-main Edge source/helper and live v5 source/version reconciled before write.
- [x] EDGE-AC2: current tenant cleanup inventory reconciled with the production-aligned MoneyFlow schema.
- [x] EDGE-AC3: owner separately approved the production Edge deployment after the database/ACL checkpoint was closed.
- [x] EDGE-AC4: deployment preserves `verify_jwt=true`.
- [x] EDGE-AC5: provider read-back proves `delete-account` is v6 ACTIVE and contains the current recent-auth helper/import/evaluator.
- [x] EDGE-AC6: provider read-back proves the current tenant cleanup inventory is present.
- [x] EDGE-AC7: no real account deletion or financial-row mutation was used as deployment verification.
- [ ] EDGE-AC8: production-safe password step-up is exercised and produces the expected recent interactive AMR/continuity behavior.
- [ ] EDGE-AC9: production-safe supported OAuth/Google step-up is exercised and preserves expected-user continuity.
- [ ] EDGE-AC10: stale/missing continuity paths fail closed/recover as designed in a provider-backed authenticated flow.
- [ ] EDGE-AC11: post-acceptance Edge/Auth/API/Postgres logs show no new relevant error cluster.

### Financial/security constraints

- Never delete a real user merely to prove the rollout.
- Never alter balances or financial rows for smoke evidence.
- Keep `verify_jwt=true`.
- Recent-auth authority remains server-verifiable JWT AMR, not token issuance time or client state.
- Only `password` and `oauth` AMR are accepted by the current MoneyFlow deletion policy.
- Provider behavior requires provider evidence; source read-back alone does not prove password/Google behavior.

### Out of scope

- Full backup/restore implementation.
- UI redesign/reopening P0–P11.
- Project-wide auth/provider redesign.
- Destructive production-account acceptance testing.

## Implementation plan

### Completed Provider Sync rollout

1. Reconcile Git, Vercel and Supabase database/function truth.
2. Apply and verify the reviewed ten-file historical migration set.
3. Harden and verify the audit-table service-role ACL through the reviewed forward migration.
4. Fresh-read current Edge source/helper and live v5 source/version.
5. Obtain separate explicit owner approval for the Edge provider write.
6. Deploy only current Git-owned `delete-account` source plus its shared recent-auth helper with `verify_jwt=true`.
7. Read back the provider bundle and verify v6/source/inventory.
8. Persist the provider truth without claiming unexecuted authenticated acceptance.

### Next Secure acceptance sequence

1. exercise a production-safe password reauthentication flow on the existing same account without confirming destructive deletion;
2. exercise supported OAuth/Google step-up with expected-user continuity;
3. verify stale/missing-continuity recovery paths remain fail-closed;
4. inspect Edge/Auth/API/Postgres logs around those flows;
5. reconcile `docs/plans/active/account-deletion-recent-auth.md`, this packet, parent MoneyFlow Trust and current memory;
6. only then mark P1 Secure accepted and unlock P2 Recover specification/implementation.

### Rollback / forward-fix

Rolling production back to v5 would reintroduce a known recent-auth security gap and is therefore not the default rollback. If v6 shows a runtime regression, stop destructive use and create a reviewed narrow forward fix or explicitly owner-authorized rollback with the security regression recorded.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| PS-T1 | reconcile provider baseline | #325 + live provider | complete |
| PS-T2 | prove/apply ten-file historical migration set | CI #2070 + #326 + live history | complete |
| PS-T3 | merge/apply audit ACL hardening | #328/#329 + live ACL/history | complete |
| EDGE-T1 | fresh-read current Edge source and live v5 | Git + provider read-back | complete |
| EDGE-T2 | owner approve Edge write | explicit `Gô` | complete |
| EDGE-T3 | deploy current Edge with JWT verification | provider v6 | complete |
| EDGE-T4 | read back exact current bundle/inventory | provider v6 files | complete |
| EDGE-T5 | production-safe password/Google provider acceptance | authenticated provider evidence | todo |
| EDGE-T6 | post-acceptance log inspection | Edge/Auth/API/Postgres logs | blocked by EDGE-T5 |
| P1-T1 | recent-auth implementation + merge | #324 | complete |
| P1-T2 | mark/archive Secure accepted | EDGE-T5/T6 | blocked |
| P2-T1 | accept archive contract | P1 accepted | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | researcher | planner | `specified` | #325 provider drift | DB/Edge mismatch | execute Provider Sync |
| 2026-08-08 | human owner | production/evaluator | `implementing` | ten-file `Go` | DB write | apply/verify migrations |
| 2026-08-09 | human owner | production/evaluator | `evaluating` | #328/#329 + ACL `go` | Edge v5 | prepare Edge checkpoint |
| 2026-08-09 | human owner | production/evaluator | `evaluating` | explicit `Gô`; v6 ACTIVE/read-back | provider-backed auth acceptance | exercise safe password/Google flows |

### Current permission boundary

Allowed now: branch/PR documentation updates and read-only GitHub/Vercel/Supabase inspection.

The Edge deployment authorization has been consumed. It did **not** authorize destructive account deletion, production financial-data mutation, provider config/secrets changes, or Phase 2 implementation.

## Evaluation

### Result

The known Provider Sync source drift is closed: reviewed MoneyFlow database/schema/ACL state is live, and production `delete-account` is now **v6 ACTIVE with `verify_jwt=true`** and the current recent-auth/current-tenant source bundle.

### Remaining boundary

P1 Secure is **not yet accepted**. Live password and supported OAuth/Google step-up/continuity behavior has not yet been exercised through a production-safe authenticated flow, and no destructive real-user test is required or permitted for that proof.

### Remaining limitations

- The earlier ten-file rollout did not capture an actual linked-production CLI dry-run; that consumed checkpoint retains its accepted limitation.
- No provider-backed password/Google recent-auth acceptance has yet been captured for v6.
- The immediate Edge log window had no runtime events and therefore cannot stand in for authenticated-flow evidence.
- Complete backup/restore and physical/seven-day evidence remain future phases.
