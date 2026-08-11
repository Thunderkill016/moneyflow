# MoneyFlow Trust

**Status:** active
**Execution state:** planned
**Active role:** planner
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #323 parent; #324 Secure implementation; #325–#329 Provider Sync; #340 Auth/shared-UI readiness
**Last updated:** 2026-08-11
**Current main audited:** `18836e2ebdc63711113f248826b00cd541a0a530`

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Canonical short name:** MoneyFlow Trust
**Original planning path:** `docs/plans/active/public-beta-trust.md`

MoneyFlow Trust moves the released functional MVP toward a trustworthy bounded public beta by closing provider alignment, security, recoverability/portability and real-use evidence gaps before speculative breadth.

## Outcome

MoneyFlow is ready for a bounded public beta only when repository state, production providers and user-visible behavior agree; destructive operations are protected by current security policy; user-owned state is recoverable; and the daily ledger survives real use without data loss or manual database repair.

Program sequence:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

Provider Sync and P1 Secure are now accepted. The program advances to **P2 Recover**.

## Repository reconnaissance

### Current truth

- Functional MVP is released.
- UI migration P0–P11 is archived; physical Android/iOS remain accepted limitations, not fabricated pass evidence.
- PR #324 merged the recent-auth implementation.
- PR #340 repaired password-entry/shared-dropdown regressions that blocked safe production acceptance and is deployed in production.
- Vercel production deployment `dpl_Ha9j2HWPx4PfrpjLc1jpfcPgFvNi` is `READY` and identifies exact Git SHA `18836e2ebdc63711113f248826b00cd541a0a530`.
- Reviewed MoneyFlow database migration/schema/ACL state is production-aligned while legitimate shared Atoryn history is preserved.
- Production `delete-account` is v6 `ACTIVE`, `verify_jwt=true`, with the current recent-auth helper and tenant cleanup inventory read back from the provider.
- Production-safe password deletion reauthentication passed with same-account provider evidence and no destructive deletion.
- Production-safe Google/OAuth deletion reauthentication passed with same-account callback continuity and no destructive deletion.
- Missing-continuity production behavior failed closed.
- Stale-AMR and real account-mismatch production probes were deliberately not executed; on 2026-08-11 the owner accepted that named limitation and accepted the 35/35 deterministic fail-closed assertions/source evidence instead of destructive/identity-risk production testing.
- Correlated Auth/API/Postgres/Edge/Vercel review found no acceptance-blocking error cluster for the accepted interactive flows; no `delete-account` Edge invocation was observed.
- Current transaction/Inbox CSV/JSON export is scoped user-readable export, **not** a complete versioned restorable archive.

Completed Trust packets:

- `docs/plans/completed/2026-08-11-moneyflow-trust-provider-sync.md`
- `docs/plans/completed/2026-08-11-account-deletion-recent-auth.md`

## Accepted limitations carried forward

### Provider Sync historical DB checkpoint

The earlier ten-file DB checkpoint did not execute an actual linked-production CLI dry-run. The owner accepted the free local union-history simulation plus fresh live preflight for that consumed checkpoint only. This remains a limitation, not a claimed pass.

### P1 Secure provider acceptance

The owner accepted stale-AMR and real account-mismatch provider-level destructive/identity-risk probes as unexecuted limitations because deterministic source/tests prove the fail-closed contract and executing those cases safely in production would cross the accepted safety boundary.

This does not weaken the implementation policy:

- recent-auth authority is verified JWT `amr` method/timestamp;
- only `password` and `oauth` count as current interactive deletion authentication;
- `token_refresh` does not extend deletion authority;
- missing, malformed, unsupported, future-dated and stale AMR fail closed before tenant purge.

## Research decisions retained

Official Supabase Auth semantics distinguish `password`, `oauth`, `token_refresh` and other methods in the JWT `amr` claim. MoneyFlow deliberately keeps its allowlist narrower than the provider vocabulary and computes recency from the interactive AMR timestamp rather than access-token `iat`.

Provider and repository evidence remain claim-specific:

- Git merge is not provider deployment;
- Vercel and Supabase Edge are separate lifecycles;
- provider source read-back is not interactive behavior acceptance;
- browser/provider acceptance does not require destructive deletion;
- log absence is interpreted only for the service and time window actually queried.

## Specification

### Current problem

P1 security no longer blocks the program. The next public-beta trust gap is portability/recovery: current CSV/JSON exports do not form a complete versioned archive that can be validated and restored while preserving ledger invariants and tenant ownership.

### P2 Recover user stories

- As a user, I can export a complete versioned archive of the MoneyFlow state that is necessary to reconstruct my ledger and planning data.
- As a user, I can validate an archive before restore and receive a safe failure for unsupported, corrupt or partial archives.
- As a user, restoring an archive preserves integer money, transfer neutrality, split exactness, ownership and referential relationships instead of guessing missing facts.
- As the owner, restore evidence proves round-trip behavior without exposing credentials, JWTs, provider secrets or infrastructure metadata.

### Acceptance criteria

Provider baseline/alignment:

- [x] PBT-AC1 repository/Vercel/Supabase baseline reconciled.
- [x] PBT-AC2 reviewed database migration/schema/ACL contract production-aligned.
- [x] PBT-AC3 current `delete-account` Edge source owner-approved, deployed and read back as v6 ACTIVE with `verify_jwt=true`.
- [x] PBT-AC4 provider read-back contains current recent-auth helper/evaluator and tenant cleanup inventory.

Secure:

- [x] PBT-AC5 destructive deletion requires verified recent interactive authentication in merged/live source.
- [x] PBT-AC6 production-safe password step-up provider evidence accepted.
- [x] PBT-AC7 production-safe Google/OAuth step-up preserves same-account continuity.
- [x] PBT-AC8 fail-closed behavior accepted: missing continuity provider-backed PASS; stale-AMR/account-mismatch provider probes retained as explicit owner-accepted limitations backed by deterministic fail-closed evidence.
- [x] PBT-AC9 relevant Auth/API/Postgres/Edge/Vercel review found no acceptance-blocking cluster for the accepted flows.

Recover/Prove/Release:

- [ ] PBT-AC10 versioned complete archive can be exported, validated and restored with financial invariants intact.
- [ ] PBT-AC11 restore fails safely on unsupported/corrupt/partial archives.
- [ ] PBT-AC12 core ledger behavior is exercised on a physical phone.
- [ ] PBT-AC13 seven consecutive days of sanitized owner self-use complete without data loss/manual DB repair.
- [ ] PBT-AC14 no unresolved P0/P1 defect blocks the daily-ledger loop at final decision.
- [ ] PBT-AC15 current memory/evidence are reconciled and owner records the final public-beta decision/accepted limitations.

## Financial and security constraints

- Never infer or alter balances to make archive/restore succeed.
- Preserve integer money, transfer neutrality, split exactness and tenant ownership.
- A restore cannot silently omit state required for ledger correctness.
- Archive data must exclude credentials, JWTs, refresh tokens, provider secrets and private infrastructure metadata.
- Provider writes continue to require explicit scoped owner approval.
- Do not reopen destructive account-deletion testing merely because Recover begins.

## Out of scope

- UI redesign/reopening P0–P11.
- Bank sync/Open Banking.
- Generative financial advice.
- Household/collaboration, investments/wealth, native rewrite, full envelope budgeting.
- Automatic unreviewed ledger posting.

## Implementation plan

### Current phase map

| Phase/checkpoint | Current state |
|---|---|
| P0 Baseline | repository/Vercel/Supabase truth reconciled |
| Provider Sync | **accepted/completed** |
| P1 Secure | **accepted/completed**, with named stale/mismatch provider-test limitation |
| P2 Recover | **next — unblocked; specification/implementation pending** |
| P3 Prove | blocked by P2 |
| P4 Improve | blocked by P3 evidence |
| P5 Release | blocked by prior phases |

### Next sequence

1. fresh-read the current export/import/schema boundaries and define the complete archive inventory;
2. research current backup/archive contract and validation practices only after repository truth is mapped;
3. open a dedicated P2 Recover work packet before implementation;
4. specify archive versioning, validation, restore ordering, idempotency/failure behavior and rollback;
5. implement the smallest coherent export → validate → restore round-trip slice;
6. verify financial/ownership invariants through repository-selected exact-head database/domain/browser gates;
7. only after P2 acceptance proceed to physical-phone/seven-day P3 Prove.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| PS-T1 | reconcile provider baseline | #325 + live provider | complete |
| PS-T2 | align reviewed DB/schema/ACL | #326–#329 + live provider | complete |
| PS-T3 | deploy/read back current Edge | provider v6 | complete |
| P1-T1 | recent-auth implementation | #324 | complete |
| P1-T2 | password provider acceptance | 2026-08-11 provider evidence | complete |
| P1-T3 | Google/OAuth continuity acceptance | 2026-08-11 provider evidence | complete |
| P1-T4 | fail-closed/log review + owner limitation decision | production probes + 35/35 deterministic + owner decision | complete |
| P2-T1 | create/accept Recover archive contract | P1 accepted | next |
| P2-T2 | implement export/validate/restore | P2-T1 | blocked by P2-T1 |
| P3-T1 | physical-phone core ledger checklist | P2 accepted | blocked |
| P3-T2 | seven-day sanitized self-use | P3-T1 | blocked |
| P4-T1 | select observed trust-depth slice | P3 evidence | blocked |
| P5-T1 | owner public-beta decision | prior phases | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-09 | human owner | provider evaluator | evaluating | Edge v6 ACTIVE/read-back | provider-backed auth acceptance | run safe password/Google flows |
| 2026-08-11 | human owner + evaluator | planner | accepted | password + Google provider evidence; missing-continuity pass; logs; explicit stale/mismatch limitation acceptance | complete archive/restore absent | open P2 Recover packet/specification |

### Current permission boundary

Allowed now: bounded branch/PR planning/documentation, repository implementation under an accepted P2 packet, focused research, and read-only GitHub/Vercel/Supabase inspection.

Not authorized by the Secure acceptance decision: destructive account deletion, production financial-data mutation, provider secret/config writes, production DB/Edge writes, or any other provider mutation. Those still require their own scoped approval if P2 later needs them.

## Evaluation

### Secure closure evidence

| Criterion | Result |
|---|---|
| exact Vercel deployment source identity | PASS — production deployment identifies `18836e2...` |
| Edge v6/current helper/`verify_jwt=true` | PASS |
| password recent-auth | PASS — provider-backed |
| Google/OAuth same-account continuity | PASS — provider-backed |
| missing continuity | PASS — provider-backed fail closed |
| stale/mismatch destructive provider probes | owner-accepted limitation; deterministic fail-closed evidence retained |
| post-flow logs | PASS for accepted flows; no acceptance-blocking cluster; no destructive Edge invocation observed |
| destructive real-user deletion used for proof | correctly not executed |

### Decision

Provider Sync and P1 Secure are complete and archived. P2 Recover is now the active dependency in the MoneyFlow Trust sequence.
