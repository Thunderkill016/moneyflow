# MoneyFlow Trust

**Status:** active
**Execution state:** P3 Prove and Repository Resets 1–2 accepted; Brand/Product Experience A0 is next/not started; public-beta decision remains open
**Active role:** parent-program planner; no active child packet until A0 is separately started
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #323 parent; #324 Secure implementation; #325–#329 Provider Sync; #340 Auth/shared-UI readiness; #353 P2 Recover closure; #356 P3 Prove packet; #358 PP-12 remediation; #360 Reset 1 closure; #362 Reset 2 closure
**Last updated:** 2026-08-13
**Current main baseline:** `13650f47c9d2a3ca9eb67326886fdf6a2db4fe00` (#362 merged)

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Canonical short name:** MoneyFlow Trust
**Original planning path:** `docs/plans/active/public-beta-trust.md`

MoneyFlow Trust moves the released functional MVP toward a trustworthy bounded public beta by closing provider alignment, security, recoverability/portability and real-use evidence gaps before speculative breadth.

## Outcome

MoneyFlow is ready for a bounded public beta only when repository state, production providers and user-visible behavior agree; destructive operations are protected by current security policy; user-owned state is recoverable; and the daily ledger survives real use without data loss or manual database repair.

Current program sequence:

> **Brand/Product Experience rebuild A0→J → final
> physical/device visual QA → owner public-beta decision**

Provider Sync, P1 Secure, P2 Recover and **P3 Prove** are accepted historical
checkpoints. Generic P4 Improve is not an active or implied next implementation.

## Repository reconnaissance

### Current truth

- Functional MVP is released.
- UI migration P0–P11 is archived; physical Android/iOS remain accepted limitations, not fabricated pass evidence.
- PR #324 merged the recent-auth implementation.
- PR #340 repaired password-entry/shared-dropdown regressions that blocked safe production acceptance and is deployed in production.
- Vercel production deployment `dpl_Ha9j2HWPx4PfrpjLc1jpfcPgFvNi` is `READY` and identifies exact Git SHA `18836e2ebdc63711113f248826b00cd541a0a530`.
- Reviewed MoneyFlow database migration/schema/ACL state is production-aligned. The Supabase project is now MoneyFlow-only: the Atoryn subsystem and its Edge Functions were removed on 2026-08-12 and migration history is fully aligned.
- Production `delete-account` is v6 `ACTIVE`, `verify_jwt=true`, with the current recent-auth helper and tenant cleanup inventory read back from the provider.
- Production-safe password deletion reauthentication passed with same-account provider evidence and no destructive deletion.
- Production-safe Google/OAuth deletion reauthentication passed with same-account callback continuity and no destructive deletion.
- Missing-continuity production behavior failed closed.
- Stale-AMR and real account-mismatch production probes were deliberately not executed; on 2026-08-11 the owner accepted that named limitation and accepted the 35/35 deterministic fail-closed assertions/source evidence instead of destructive/identity-risk production testing.
- Correlated Auth/API/Postgres/Edge/Vercel review found no acceptance-blocking error cluster for the accepted interactive flows; no `delete-account` Edge invocation was observed.
- Current transaction/Inbox CSV/JSON export is scoped user-readable export, **not** a complete versioned restorable archive. The complete archive is a separate shipped capability at `/settings/backup`; the report export deliberately still says it is not a full backup.

Accepted P3 packet: `docs/plans/completed/2026-08-12-moneyflow-trust-prove.md` —
records owner-observed physical-phone acceptance without inventing a signed evidence file.

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

P1 Secure and P2 Recover no longer block the program. A complete versioned archive can be exported, validated and restored with invariants intact, and the Recover schema is live in production — with the venues kept distinct: **export** is accepted against a real hosted production artifact, while **restore** is proven deterministically by pgTAP against a real PostgreSQL and has never been executed against a live hosted account. That gap is the named P2 limitation, not a claimed pass.

P3 Prove is accepted from the owner's physical-phone run and bounded retest.
Repository Reset 1 is accepted by #360's merged lifecycle record. Repository Reset 2
is accepted by merged #362 (`main@13650f4`): only 13 proven-unowned leaves were
retired, while legacy/live and protected boundaries were retained. **Brand/Product
Experience A0** is now the immediate next work, but is not started and has no active
packet; the public-beta decision remains open.

On 2026-08-12 the owner **removed the seven-day self-use requirement** from the active program after running the physical checklist. P3 Prove is now physical-phone core-ledger acceptance only. No replacement duration gate is introduced. The historical seven-day records in `docs/REAL_USE_READINESS_CONTRACT.md` (R7, 2026-07-29) stay as historical truth and are not re-opened.

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

- [x] PBT-AC10 versioned complete archive can be exported, validated and restored with financial invariants intact — deterministic full round trip proven by pgTAP on every CI run that touches the database boundary and on every push to `main` (`classify-ci-changes.mjs` selects the pgTAP job by changed path, and non-pull-request events force the full gate set — so a docs-only PR such as this closure does not re-run it); hosted export accepted on a real production artifact; hosted restore is an owner-accepted named limitation (id-preservation refuses a restore while the source account is live).
- [x] PBT-AC11 restore fails safely on unsupported/corrupt/partial archives — each rejection writes zero rows, proven in pgTAP.
- [x] PBT-AC12 core ledger behavior was exercised on the owner's physical phone.
- [~] PBT-AC13 **withdrawn as a duration gate** by owner decision on 2026-08-12. Real daily use continues to inform defect discovery, but no consecutive-day count is required for public beta and none replaces it.
- [x] PBT-AC14 no unresolved P0/P1 defect blocks the daily-ledger loop: PP-03 and PP-16 pass; PP-07 passes functionally with its presentation finding parked; PP-12 passes after #358; PP-01 remains a parked performance finding; PP-05 passes after the second-account precondition was satisfied.
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
| P2 Recover | **accepted/completed** — specified, implemented, deployed; hosted restore is a named limitation |
| P3 Prove | **accepted/completed** — owner-observed physical-phone core ledger and bounded retest; no signed/filed evidence run was fabricated |
| Repository Reset 1 | **accepted/completed** — authority/configuration cleanup in merged #360 |
| Repository Reset 2 | **accepted/completed** — merged #362; only 13 proven-unowned source/assets retired |
| Brand/Product Experience A0 | immediate next/not started — no active packet or UI implementation yet |
| P4 Improve | not an active generic workstream |
| P5 Release | owner public-beta decision remains open (PBT-AC15) |

### Next sequence

P3 and Repository Resets 1–2 are accepted. The mandatory execution order is:

1. separately start Brand/Product Experience rebuild A0→J;
2. final physical/device visual QA;
3. owner public-beta decision (PBT-AC15).

This record does not start Brand/Product Experience A0, rebuild UI, or make the final
public-beta decision.

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
| P2-T1 | create/accept Recover archive contract | P1 accepted | complete — `docs/plans/completed/2026-08-12-moneyflow-trust-recover.md` |
| P2-T2 | implement export/validate/restore | P2-T1 | complete — deployed to production; hosted export accepted, hosted restore an accepted limitation |
| P3-T1 | physical-phone core ledger checklist | P2 accepted | complete/accepted — owner-observed run and bounded retest; archived at `docs/plans/completed/2026-08-12-moneyflow-trust-prove.md` |
| P3-T2 | ~~seven-day sanitized self-use~~ | — | **withdrawn 2026-08-12 by owner decision**; never started, and not replaced |
| RR-T1 | bounded Repository Reset 1 | P3 accepted | accepted/completed — #360 post-merge lifecycle record |
| RR-T2 | bounded Repository Reset 2 | RR-T1 accepted | accepted/completed — merged #362 |
| P4-T1 | begin Brand/Product Experience A0 | Repository Reset 2 complete | immediate next; not started and no packet exists |
| P5-T1 | owner public-beta decision | prior phases | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-09 | human owner | provider evaluator | evaluating | Edge v6 ACTIVE/read-back | provider-backed auth acceptance | run safe password/Google flows |
| 2026-08-11 | human owner + evaluator | planner | accepted | password + Google provider evidence; missing-continuity pass; logs; explicit stale/mismatch limitation acceptance | complete archive/restore absent | open P2 Recover packet/specification |
| 2026-08-12 | human owner | planner | accepted | deterministic pgTAP round trip; hosted export accepted on a real production artifact; explicit hosted-restore limitation acceptance | hosted restore unproven; P3 evidence absent | define the P3 physical-phone checklist |
| 2026-08-12 | planner | human_owner | specified | P3 packet, evidence template and `check:prove-evidence` on `277d459`; **no device evidence exists** | physical-phone loop unproven; seven-day run not started | owner runs the 17 REQUIRED scenarios and returns the sanitized evidence file |
| 2026-08-12 | human_owner | implementer | remediating | owner-reported physical run on a real phone: PP-12 and PP-16 failed, PP-03 and PP-07 passed with defects, PP-01 slow; seven-day requirement withdrawn | four defects fixed in #357 but unverified on hardware | owner retests PP-03, PP-07, PP-12, PP-16 |
| 2026-08-12 | human_owner | planner | accepted | owner-observed PP-12 PASS on the same Android phone after #358; PP-03/PP-16 PASS; PP-07 functional PASS with presentation finding parked; PP-05 precondition satisfied; no unresolved P0/P1 in the daily loop | PBT-AC15 remains owner decision | archive P3; begin bounded Repository Reset only in its own task |
| 2026-08-12 | human_owner | implementer | discovery | merged #360 at `main@8fcf8e2`; Reset 2 active packet | source/assets have not yet been classified; A0 must not start | complete the evidence-led Reset 2 audit only |
| 2026-08-13 | evaluator | human_owner | accepted | merged #362 at `main@13650f4`: 13 unowned source/assets retired; fresh evaluator and exact-head CI green | A0 remains not started | separately open A0 only when authorized |

### Current permission boundary

Allowed now: bounded branch/PR planning/documentation, repository implementation under an accepted packet, focused research, and read-only GitHub/Vercel/Supabase inspection.

Not authorized standing: destructive account deletion, production financial-data mutation, provider secret/config writes, production DB/Edge writes, or any other provider mutation. Each needs its own scoped owner approval.

Consumed during P2, each under a separate explicit owner approval and not a standing grant:

- 2026-08-12 — deletion of five named Atoryn Edge Functions (forward-fix only; not revertible).
- 2026-08-12 — one `supabase migration repair` to realign migration history.
- 2026-08-12 — Approval A: production application of exactly `20260812000000_export_user_archive.sql` then `20260812010000_restore_user_archive.sql`.

Approval B — one hosted restore into a disposable test account — was granted and **not consumed**; no restore was executed. It does not carry forward.

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

Provider Sync, P1 Secure, P2 Recover and P3 Prove are complete; P3 is archived after
owner-observed physical-phone acceptance. PBT-AC13 remains withdrawn, PBT-AC15 remains
open, and the program is not yet public-beta ready. Repository Reset 2 is
accepted/completed in merged #362; Brand/Product Experience A0 is immediate next but
has not started.
