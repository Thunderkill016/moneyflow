# MoneyFlow Trust

**Status:** active
**Execution state:** evaluating
**Active role:** planner
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #323 parent; #324 Secure implementation; #325 Provider Sync reconciliation; #327 DB evidence; #328/#329 audit ACL hardening/evidence
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Canonical short name:** MoneyFlow Trust
**Original planning path:** `docs/plans/active/public-beta-trust.md`

MoneyFlow Trust moves the released functional MVP toward a trustworthy bounded public beta by closing provider alignment, security, recoverability/portability and real-use evidence gaps before speculative breadth.

## Outcome

MoneyFlow is ready for a bounded public beta only when repository state, production providers and user-visible behavior agree; destructive operations are protected by current security policy; user-owned state is recoverable; and the daily ledger survives real use without data loss or manual database repair.

Program sequence:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

## Repository reconnaissance

### Current behavior

- Functional MVP is released.
- UI migration P0–P11 is archived; physical Android/iOS remain accepted limitations, not fabricated pass evidence.
- #324 merged the recent-auth implementation; its Next.js side has production Vercel evidence.
- The reviewed MoneyFlow database migration/schema set is production-aligned and legitimate shared Atoryn migration history is preserved.
- #328/#329 closed the audit-table service-role ACL drift; production now exposes the reviewed SELECT-only boundary.
- On 2026-08-09 the owner separately approved the Edge provider-write checkpoint with `Gô`.
- Production `delete-account` was upgraded from v5 to **v6 ACTIVE** with `verify_jwt=true`.
- Provider read-back contains the current `delete-account/index.ts`, shared recent-auth helper, ten-minute `password|oauth` AMR policy and current tenant cleanup inventory.
- No destructive real-user deletion or financial-row mutation was used to verify the Edge rollout.
- Provider-backed password and supported OAuth/Google step-up/continuity acceptance remains unexecuted.
- Current transaction/Inbox CSV/JSON export remains scoped user-readable export, **not** a complete restorable archive.
- P2 Recover remains blocked until P1 Secure provider acceptance completes.

### Active prerequisite

`docs/plans/active/moneyflow-trust-provider-sync.md`

Provider Sync is currently `evaluating`: known Git/Supabase database/ACL/Edge source drift is closed; the final acceptance boundary is provider-backed recent-auth behavior.

Completed provider evidence:

- exact reviewed MoneyFlow migrations applied under repository versions;
- legitimate shared Atoryn history preserved;
- #326 free local union-history dry-run evidence for the earlier ten-file set;
- #328/#329 audit ACL hardening and live privilege read-back;
- current `main@cfbff67171421d5f2ee70460b5e81edc59e8a6b1` Edge source reconciled against live v5 before write;
- separate owner Edge approval with `Gô`;
- production `delete-account` **v6 ACTIVE**, `verify_jwt=true`;
- provider bundle SHA-256 `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`;
- provider read-back shows both current function files and current tenant cleanup inventory.

Accepted limitation retained from the earlier DB checkpoint:

- an actual linked-production CLI dry-run was not executed; owner accepted the free local union-history simulation plus fresh live preflight for that consumed DB checkpoint only.

Current blockers:

1. safe password recent-auth provider acceptance;
2. safe supported OAuth/Google recent-auth + expected-user continuity acceptance;
3. post-acceptance provider log review;
4. complete versioned archive/restore after Secure acceptance.

### Relevant repository/provider areas

| Area | Role |
|---|---|
| `docs/research/CURRENT_PROJECT_MEMORY.md` | current merged/provider truth |
| `docs/plans/active/account-deletion-recent-auth.md` | P1 Secure lifecycle/evidence |
| `docs/plans/active/moneyflow-trust-provider-sync.md` | provider alignment packet |
| `supabase/functions/delete-account/index.ts` | merged destructive authority |
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | recent-auth policy helper |
| production migration history/catalog/effective privileges | database provider authority |
| production `delete-account` version/source | destructive runtime authority |

### Existing constraints

- Code/migrations/tests outrank prose; live provider evidence outranks deployment assumptions.
- Provider behavior requires provider evidence; source read-back does not prove authenticated flow behavior.
- Integer money, split exactness, transfer neutrality and tenant ownership remain invariants.
- Provider writes require explicit owner approval and rollback/forward-fix scope.
- Vercel deployment does not deploy Supabase migrations or Edge Functions.
- Physical-device claims require physical-device evidence; emulation is not equivalent.

### Open questions

- [x] Continue UI migration? No; archived.
- [x] Treat current CSV/JSON export as restore? No.
- [x] Does production audit-table effective privilege match the reviewed SELECT-only contract? Yes.
- [x] Did the owner separately approve deployment of current `delete-account` Edge source? Yes, with `Gô`.
- [x] Is current Edge source now live/read back? Yes: v6 ACTIVE, `verify_jwt=true`.
- [ ] Do safe live password and supported OAuth/Google step-up flows pass with identity continuity preserved?

## Research

### Research scope and source selection

Research is dependency-driven and begins with repository/provider truth.

- P1 used official Supabase JWT/Auth documentation plus OWASP reauthentication guidance.
- Provider Sync uses live Supabase migration/catalog/function/privilege reads and official Supabase/PostgreSQL deployment/security semantics.
- Before the v6 rollout, current Supabase changelog and Edge deployment/auth documentation were reviewed; no hosted Edge breaking change required altering MoneyFlow's current deployment contract.
- P2 Recover research/implementation begins only after Secure acceptance unblocks it.

### Key decisions

1. Recent-auth authority uses verified JWT `amr` method/timestamp, not token issuance time.
2. AAL and recent authentication are separate concepts.
3. Vercel deployment, Supabase database migration and Supabase Edge deployment are separate lifecycles.
4. `delete-account` keeps `verify_jwt=true`; recent-auth remains an additional server-side policy inside the function.
5. Current CSV/JSON export is not a complete restorable archive.
6. Provider source alignment is not equivalent to password/Google behavioral acceptance.
7. No destructive real-user deletion is required for provider acceptance.

### Adoption review

No new dependency, provider, service, framework or runtime architecture was adopted by Provider Sync or the v6 rollout.

## Specification

### Problem

The known Git/provider source drift is closed: database/schema/ACL state is aligned and production `delete-account` now runs the current v6 bundle. The remaining security question is whether real provider-backed password and supported OAuth/Google step-up flows produce and preserve the expected recent-auth/identity-continuity behavior without destructive deletion.

Recover must not advance while Secure acceptance remains incomplete.

### User stories

- As a user, production account deletion is protected by the same recent-auth policy current `main` claims.
- As a user, a stale or missing recent-auth state fails closed before tenant deletion authority.
- As a user, Google/OAuth reauthentication cannot silently switch the account being deleted.
- As the owner, source deployment evidence remains distinct from authenticated-flow acceptance evidence.

### Acceptance criteria

Provider baseline/alignment:

- [x] PBT-AC1: repository/Vercel/Supabase baseline reconciled.
- [x] PBT-AC2: reviewed database migration/schema/ACL contract is production-aligned.
- [x] PBT-AC3: current `delete-account` Edge source is explicitly owner-approved, deployed and read back as v6 ACTIVE with `verify_jwt=true`.
- [x] PBT-AC4: provider read-back contains current recent-auth helper/evaluator and current tenant cleanup inventory.

Secure:

- [x] PBT-AC5: destructive account deletion requires verified recent interactive authentication in merged source and live Edge source.
- [ ] PBT-AC6: production-safe password step-up is exercised with expected recent AMR behavior.
- [ ] PBT-AC7: production-safe supported OAuth/Google step-up preserves same-account continuity.
- [ ] PBT-AC8: stale/missing continuity paths fail closed/recover as designed in provider-backed authenticated flows.
- [ ] PBT-AC9: relevant Edge/Auth/API/Postgres logs show no new acceptance-blocking error cluster.

Recover/Prove/Release:

- [ ] PBT-AC10: versioned complete archive can be exported, validated and restored with financial invariants intact.
- [ ] PBT-AC11: restore fails safely on unsupported/corrupt/partial archives.
- [ ] PBT-AC12: core ledger behavior is exercised on a physical phone.
- [ ] PBT-AC13: seven consecutive days of sanitized owner self-use complete without data loss/manual DB repair.
- [ ] PBT-AC14: no unresolved P0/P1 defect blocks the daily-ledger loop at final decision.
- [ ] PBT-AC15: current memory/evidence are reconciled and owner records the final public-beta decision/accepted limitations.

### Financial and security constraints

- Never infer or alter balances to make migration/restore succeed.
- Preserve integer money, transfer neutrality, split exactness and tenant ownership.
- Do not perform destructive real-user deletion for acceptance proof.
- Do not change provider secrets/configuration without a new explicit owner checkpoint.
- Backup archives must exclude credentials, JWTs, secrets and private infrastructure metadata.

### Out of scope

- UI redesign/reopening P0–P11.
- Bank sync/Open Banking.
- Generative financial advice.
- Household/collaboration, investments/wealth, native rewrite, full envelope budgeting.
- Automatic unreviewed ledger posting.

## Implementation plan

### Architecture fit

Keep the modular monolith. Provider Sync aligned the existing Supabase DB/Edge runtime with Git-owned migrations/tests/functions. P2 introduces a versioned public archive contract only after Secure acceptance.

### Current phase map

| Phase/checkpoint | Short name | Current state |
|---|---|---|
| P0 | Baseline | provider drift reconciled |
| P0/P1 prerequisite | **Provider Sync** | source/schema/ACL/Edge drift closed; authenticated acceptance remains |
| P1 | **Secure** | implementation + Edge v6 live; password/Google acceptance open |
| P2 | **Recover** | blocked by P1 acceptance |
| P3 | **Prove** | blocked by P2 |
| P4 | **Improve** | blocked by P3 evidence |
| P5 | **Release** | blocked by prior phases |

### Secure acceptance next sequence

1. exercise a production-safe password reauthentication flow without submitting a destructive account deletion;
2. exercise supported OAuth/Google step-up with expected-user continuity;
3. verify stale/missing-continuity recovery remains fail-closed;
4. inspect Edge/Auth/API/Postgres logs around those exact flows;
5. reconcile `docs/plans/active/account-deletion-recent-auth.md`, Provider Sync, parent memory and `CURRENT_PROJECT_MEMORY.md`;
6. mark/archive Secure accepted only if the evidence supports it;
7. unlock P2 Recover specification/implementation.

### Rollback / forward-fix principle

Rolling Edge back to v5 would reintroduce a known recent-auth security gap and is not the default rollback. If v6 reveals a runtime regression, prefer a reviewed narrow forward fix; any rollback requires explicit owner approval with the security regression recorded.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| PS-T1 | reconcile provider baseline | #325 + live provider | complete |
| PS-T2 | align reviewed DB/schema/ACL | #326–#329 + live provider | complete |
| PS-T3 | fresh-read and deploy current Edge | current main + live v5/v6 | complete |
| PS-T4 | persist Edge v6 provider evidence | docs PR | in progress |
| P1-T1 | recent-auth implementation + merge | #324 | complete |
| P1-T2 | password provider acceptance | safe authenticated flow | todo |
| P1-T3 | Google/OAuth continuity acceptance | safe authenticated flow | todo |
| P1-T4 | post-flow provider logs + Secure decision | provider evidence | blocked by P1-T2/T3 |
| P2-T1 | accept archive contract | P1 accepted | blocked |
| P2-T2 | implement export/validate/restore | P2-T1 | blocked |
| P3-T1 | physical-phone core ledger checklist | P2 accepted | blocked |
| P3-T2 | seven-day sanitized self-use | P3-T1 | blocked |
| P4-T1 | select observed trust-depth slice | P3 evidence | blocked |
| P5-T1 | owner public-beta decision | prior phases | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | `planned` | #323 | provider/Secure gaps | execute trust sequence |
| 2026-08-09 | human owner | production/evaluator | `evaluating` | #328/#329 + ACL approval | Edge v5 | prepare Edge checkpoint |
| 2026-08-09 | human owner | production/evaluator | `evaluating` | explicit `Gô`; v6 ACTIVE/read-back | password/Google provider acceptance | run safe authenticated flows |

### Current permission boundary

- Allowed: bounded branch/PR work; read-only GitHub/Vercel/Supabase inspection; focused research.
- The Edge deployment authorization has been consumed.
- Destructive account deletion, production financial-data mutation, provider secret/config changes and P2 implementation remain outside the consumed approval.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| reviewed DB/schema/ACL provider alignment | live migration/catalog/ACL | pass |
| production current Edge source/version | provider v6 read-back | pass |
| `verify_jwt=true` retained | provider read-back | pass |
| current recent-auth helper/evaluator present | provider read-back | pass |
| current tenant cleanup inventory present | provider read-back | pass |
| destructive real-user deletion used for proof | none | correctly not executed |
| password provider acceptance | not yet executed | open |
| Google/OAuth continuity acceptance | not yet executed | open |
| current export distinguished from full archive | code/UI/current memory | pass |

### Review findings

- Known Git/provider database/ACL/Edge source drift is closed.
- P1 Secure remains incomplete only because provider-backed authenticated behavior has not yet been exercised and observed.
- Recover remains blocked until that acceptance closes.

### Remaining limitations

- Earlier ten-file rollout lacks actual linked-production CLI dry-run evidence; accepted limitation retained.
- Provider-backed password/Google recent-auth acceptance is not yet captured.
- Complete backup/restore and physical/seven-day evidence remain future phases.

## Delivery record

- Parent PR #323 merged as `538768401bd5c0aa66523aba2a52e3601f3fadd4`.
- Secure PR #324 merged as `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- #325–#329 reconciled and aligned the reviewed database/schema/ACL provider boundary.
- `main@cfbff67171421d5f2ee70460b5e81edc59e8a6b1` was the fresh source authority for the v6 Edge rollout.
- Production `delete-account` is now v6 ACTIVE with provider bundle SHA-256 `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80` and `verify_jwt=true`.
- Current next action: production-safe password + supported OAuth/Google recent-auth acceptance; do not delete a real account for proof.
