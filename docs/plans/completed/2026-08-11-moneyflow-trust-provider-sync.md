# MoneyFlow Trust — Provider Sync

**Status:** completed
**Execution state:** accepted
**Active role:** none
**Permission scope:** historical record
**Owner:** Thunderkill016
**Acceptance evidence date:** 2026-08-11
**Accepted against main:** `18836e2ebdc63711113f248826b00cd541a0a530`

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent:** `docs/plans/active/public-beta-trust.md`
**Supabase project:** MoneyFlow / `fwpldsdkpzhswpuctbke`
**Production Edge:** `delete-account` v6 `ACTIVE`, `verify_jwt=true`
**Provider bundle SHA-256:** `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`

## Outcome

Provider Sync is complete.

The reviewed MoneyFlow production database/schema/ACL state and destructive Edge runtime are aligned with the repository contract, and the remaining provider-backed recent-auth behavior has now been accepted through the completed P1 Secure packet.

The known Git/Supabase drift that originally blocked Secure is closed:

- reviewed MoneyFlow migrations are present under repository versions while legitimate shared Atoryn history is preserved;
- audit-table service-role privileges are aligned to the reviewed SELECT-only boundary;
- production `delete-account` is v6 `ACTIVE` with `verify_jwt=true`;
- live read-back contains the current entrypoint, recent-auth helper and current tenant cleanup inventory;
- production-safe password and Google/OAuth deletion reauthentication were exercised and accepted without destructive deletion;
- correlated Auth/API/Postgres/Edge/runtime evidence found no acceptance-blocking cluster for those flows.

## Final acceptance evidence

### Database/schema/ACL

- the reviewed historical MoneyFlow migration set is live under repository versions;
- legitimate shared Atoryn migration history remains preserved;
- `20260809010648_financial_audit_service_role_read_only` is present exactly once;
- `financial_mutation_audit_events` retains RLS and authenticated SELECT;
- effective `service_role` privileges remain SELECT-only for the reviewed table boundary.

Accepted historical limitation retained: the earlier ten-file DB checkpoint did not execute an actual linked-production CLI dry-run. The owner had already accepted the free local union-history simulation plus fresh live preflight for that consumed checkpoint. This limitation is not reinterpreted as a pass.

### Edge source/runtime

Pre-rollout production `delete-account` v5 had stale source. The owner separately approved the Edge write, and current production read-back shows:

- version 6;
- status `ACTIVE`;
- `verify_jwt=true`;
- bundle SHA-256 `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`;
- `delete-account/index.ts` plus `_shared/account-deletion-recent-auth.ts`;
- ten-minute `password|oauth` recent-auth evaluation before tenant purge;
- current audit/provenance/rules/reconciliation cleanup inventory.

### Provider behavior

The completed Secure packet records the accepted provider behavior:

- password step-up: provider-backed PASS;
- Google/OAuth same-account continuity: provider-backed PASS;
- missing continuity: provider-backed fail-closed PASS;
- stale-AMR and real account-mismatch production probes: owner-accepted limitation backed by deterministic fail-closed source/tests rather than destructive/identity-risk testing;
- post-flow Auth/API/Postgres/Edge/Vercel review: no acceptance-blocking cluster for accepted flows;
- no destructive `delete-account` Edge invocation was observed during acceptance.

## Acceptance criteria

- [x] EDGE-AC1 fresh repository/live Edge reconciliation completed before write.
- [x] EDGE-AC2 tenant cleanup inventory reconciled with production schema.
- [x] EDGE-AC3 owner separately approved the production Edge deployment.
- [x] EDGE-AC4 `verify_jwt=true` preserved.
- [x] EDGE-AC5 provider read-back proves v6 ACTIVE with current recent-auth helper/evaluator.
- [x] EDGE-AC6 provider read-back proves current tenant cleanup inventory.
- [x] EDGE-AC7 no real account deletion or financial-row mutation used for verification.
- [x] EDGE-AC8 production-safe password step-up provider evidence accepted.
- [x] EDGE-AC9 production-safe Google/OAuth same-account continuity accepted.
- [x] EDGE-AC10 fail-closed continuity accepted with the explicit stale/mismatch production-test limitation recorded in the Secure packet.
- [x] EDGE-AC11 correlated post-flow provider/runtime review found no acceptance-blocking error cluster for accepted flows.

## Safety record

No acceptance step changed provider configuration, secrets, Edge deployment, production database/schema/RLS, financial data or Auth admin identities. No destructive real-user deletion was used as evidence.

## Delivery decision

Provider Sync and P1 Secure are accepted. This packet is archived as completed. The MoneyFlow Trust program may advance to P2 Recover; any future provider drift is a new task and must not silently reopen this historical packet.
