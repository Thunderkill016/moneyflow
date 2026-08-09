# MoneyFlow Trust

**Status:** active
**Execution state:** evaluating
**Active role:** planner
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #323 parent; #324 Secure implementation; #325 Provider Sync reconciliation; #327 DB evidence; #328 audit ACL hardening
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
- #324 merged the current recent-auth implementation; the Next.js side has production Vercel evidence.
- The previously missing ten reviewed MoneyFlow migrations are applied in production under repository versions; legitimate shared Atoryn history rows were preserved.
- Review/reconciliation/rules/audit schema is present in production.
- #328 merged `20260809010648_financial_audit_service_role_read_only.sql` and the owner explicitly approved its scoped production application with `go`.
- Production audit ACL now matches the reviewed invariant: RLS remains enabled; `authenticated` retains SELECT; `service_role` has SELECT only and no checked non-read table privilege.
- Production Supabase `delete-account` remains **v5** and does not contain the merged recent-auth/current-tenant implementation.
- Current transaction/Inbox CSV/JSON export remains scoped user-readable export, **not** a complete restorable archive.
- P2 Recover remains blocked until Provider Sync and P1 Secure provider acceptance complete.

### Active prerequisite

`docs/plans/active/moneyflow-trust-provider-sync.md`

Provider Sync is currently `evaluating`.

Completed provider evidence:

- live migration/catalog/function/ACL baseline;
- exact ten-file historical MoneyFlow migration set and complete fresh replay;
- CI #2070: 478 pgTAP pass for the ten-file rollout baseline;
- PR #326 free local union-history dry-run selecting exactly ten MoneyFlow migrations;
- owner-approved 10/10 production migration application with original repository versions preserved;
- #328 exact-head CI #2113, CodeQL #1212, Secret #1212 and **26 files / 481 pgTAP tests PASS**;
- owner-approved production audit ACL application;
- exact history read-back at `20260809010648` with no stray same-name generated row;
- live audit effective privilege read-back: SELECT-only for `service_role`, authenticated SELECT preserved, RLS preserved;
- immediate provider log/advisor inspection with no new ACL-specific permission-error cluster.

Accepted limitation:

- an actual linked-production CLI dry-run was not executed for the earlier ten-file checkpoint; the owner accepted the free local union-history simulation plus fresh live preflight for that consumed DB checkpoint only.

Current blockers:

1. production `delete-account` remains Edge v5;
2. safe password + supported OAuth/Google recent-auth provider acceptance remains unexecuted;
3. complete versioned archive/restore remains absent after Secure acceptance.

### Relevant repository/provider areas

| Area | Role |
|---|---|
| `docs/research/CURRENT_PROJECT_MEMORY.md` | current merged/provider truth |
| `docs/plans/active/account-deletion-recent-auth.md` | P1 Secure lifecycle/evidence |
| `docs/plans/active/moneyflow-trust-provider-sync.md` | provider alignment packet |
| `supabase/migrations/20260809010648_financial_audit_service_role_read_only.sql` | aligned audit ACL contract |
| `supabase/functions/delete-account/index.ts` | current merged destructive authority |
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | current recent-auth policy helper |
| production migration history/catalog/effective privileges | database provider authority |
| production `delete-account` version/source | destructive runtime authority |

### Existing constraints

- Financial/data changes require migration replay, pgTAP/invariants and ownership/RLS evidence.
- Code/migrations/tests outrank prose; live provider evidence outranks assumptions about deployment.
- Provider behavior requires provider evidence; repository/browser tests cannot manufacture it.
- Integer money, split exactness, transfer neutrality and tenant ownership remain invariants.
- Provider writes require explicit owner approval and rollback/forward-fix scope.
- Vercel deployment does not deploy Supabase migrations or Edge Functions.
- Physical-device claims require physical-device evidence; emulation is not equivalent.

### Open questions

- [x] Continue UI migration? No; archived.
- [x] Treat current CSV/JSON export as restore? No.
- [x] Is P1 fully deployed because Vercel is READY? No.
- [x] Was the exact ten-file MoneyFlow migration set applied? Yes.
- [x] Was an actual linked-production dry-run executed? No; accepted limitation for the consumed ten-file checkpoint.
- [x] Does production audit-table effective privilege match the reviewed SELECT-only contract? **Yes; live-verified after #328 production application.**
- [ ] Does the owner separately approve deployment of current `delete-account` Edge source?
- [ ] Do safe live password + supported OAuth/Google step-up flows pass after current Edge deployment?

## Research

### Research scope and source selection

Research is dependency-driven and begins with repository/provider truth.

- P1 used official Supabase JWT/Auth documentation plus OWASP reauthentication guidance.
- Provider Sync uses live Supabase migration/catalog/function/privilege reads, exact-head CI migration replay and official Supabase/PostgreSQL privilege/deployment semantics.
- P2 Recover research/implementation begins only after Provider Sync and Secure acceptance unblock it.

### Key decisions

1. Recent-auth authority uses verified `amr` method/timestamp, not token issuance time.
2. AAL and recent authentication are separate concepts.
3. Vercel deployment, Supabase database migration and Supabase Edge deployment are separate lifecycles.
4. Current CSV/JSON export is not a complete restorable archive.
5. Legitimate shared Atoryn migration history must be preserved.
6. The free local union-history dry-run is not an actual linked-production dry-run.
7. Provider ACL parity requires live effective privilege read-back; migration application alone is not enough.
8. Existing-object ACL drift is corrected through reviewed forward migrations, not ad-hoc console patches.

### Adoption review

No new dependency, provider, service, framework or runtime architecture is adopted by Provider Sync.

## Specification

### Problem

Database migration/schema/ACL drift is now closed for the reviewed MoneyFlow Provider Sync set. The remaining provider split is the destructive Supabase Edge runtime: Git contains the recent-auth/current-tenant implementation, while production still runs v5.

Recover must not advance while Provider Sync and Secure acceptance remain incomplete.

### User stories

- As a user, production account deletion is protected by the same recent-auth policy current `main` claims.
- As a user, financial audit storage cannot be directly mutated by the cleanup service role outside trigger-owned paths.
- As a user, future complete archive/restore operates against one known provider contract.
- As the owner, Git/Vercel/Supabase DB/Supabase Edge/device/self-use evidence remain distinguishable.

### Acceptance criteria

Provider baseline/alignment:

- [x] PBT-AC1: repository/Vercel/Supabase baseline reconciled.
- [x] PBT-AC2: exact ten-file historical migration drift replay-verified.
- [ ] PBT-AC3: actual linked-production dry-run proves the earlier ten-file write set. **Not executed; accepted limitation for consumed DB checkpoint.**
- [x] PBT-AC4: owner-approved ten-file migration set applied; original history/catalog objects exist and shared Atoryn history is preserved.
- [x] PBT-AC5: effective production audit privileges satisfy the reviewed SELECT-only least-privilege contract.
- [ ] PBT-AC6: current `delete-account` Edge source is explicitly deployed and read back after separate owner approval.

Secure:

- [x] PBT-AC7: destructive account deletion requires verified recent interactive authentication in merged current-main source.
- [ ] PBT-AC8: the same recent-auth gate exists in actual production Supabase Edge runtime.
- [ ] PBT-AC9: provider-backed password and supported OAuth/Google step-up are exercised on production-safe authenticated flows with identity continuity preserved.

Recover/Prove/Release:

- [ ] PBT-AC10: versioned complete archive can be exported, validated and restored with financial invariants intact.
- [ ] PBT-AC11: restore fails safely on unsupported/corrupt/partial archives.
- [ ] PBT-AC12: core ledger behavior is exercised on a physical phone.
- [ ] PBT-AC13: seven consecutive days of sanitized owner self-use complete without data loss/manual DB repair.
- [ ] PBT-AC14: no unresolved P0/P1 defect blocks the daily-ledger loop at final decision.
- [ ] PBT-AC15: current memory/evidence are reconciled and the owner records the final public-beta decision/accepted limitations.

### Financial and security constraints

- Never infer or alter balances to make migration/restore succeed.
- Preserve integer money, transfer neutrality, split exactness and tenant ownership.
- Do not deploy Edge without explicit owner approval.
- Do not alter historical migration files in place.
- Backup archives must exclude credentials, JWTs, secrets and private infrastructure metadata.
- No destructive real-user deletion is required for provider acceptance.

### Out of scope

- UI redesign/reopening P0–P11.
- Bank sync/Open Banking.
- Generative financial advice.
- Household/collaboration, investments/wealth, native rewrite, full envelope budgeting.
- Automatic unreviewed ledger posting.

## Implementation plan

### Architecture fit

Keep the modular monolith. Provider Sync aligns the existing Supabase DB/Edge runtime with Git-owned migrations/tests/functions. P2 introduces a versioned public archive contract only after provider state and Secure are accepted.

### Current phase map

| Phase/checkpoint | Short name | Current state |
|---|---|---|
| P0 | Baseline | provider drift reconciled |
| P0/P1 prerequisite | **Provider Sync** | **evaluating; DB/schema/ACL aligned, Edge v5 pending** |
| P1 | **Secure** | merged; Next.js side production-evidenced; Supabase Edge/provider acceptance incomplete |
| P2 | **Recover** | blocked by Provider Sync + P1 acceptance |
| P3 | **Prove** | blocked by P2 |
| P4 | **Improve** | blocked by P3 evidence |
| P5 | **Release** | blocked by prior phases |

### Provider Sync next sequence

1. fresh-read current `main` Edge source/helper and live production Edge v5 source/version;
2. verify current tenant cleanup inventory still matches live DB schema and SELECT-only audit verification path;
3. prepare exact Edge rollout and rollback/read-back plan;
4. return to owner for a **separate explicit Edge provider-write approval**;
5. deploy/read back current `delete-account` with `verify_jwt=true` and recent-auth helper;
6. run production-safe password + supported OAuth/Google step-up acceptance without destructive real-user deletion;
7. inspect Edge/Auth/API/Postgres logs;
8. reconcile P1/current memory and only then unlock Recover implementation.

### Rollback / forward-fix principle

Historical migrations are production history and are not edited in place. Audit ACL broad re-grant would recreate a closed security defect and is not the default rollback. Edge rollback after a future rollout would reintroduce a known recent-auth gap and therefore requires explicit owner approval if ever needed.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| PS-T1 | reconcile provider baseline | #325 + live provider | complete |
| PS-T2 | prove/apply ten-file historical migration set | CI #2070 + #326 + live history | complete |
| PS-T3 | review/merge audit ACL hardening | #328 + 481 pgTAP | complete |
| PS-T4 | owner approve/apply audit ACL production write | explicit `go` + live ACL/history | complete |
| PS-T5 | persist audit ACL production evidence | follow-up docs PR | in progress |
| PS-T6 | prepare current Edge rollout/read-back plan | exact current source + live v5 | blocked by PS-T5 handoff |
| PS-T7 | owner approve Edge deployment | explicit approval | blocked by PS-T6 |
| PS-T8 | deploy/read back current `delete-account` | provider evidence | blocked by PS-T7 |
| P1-T1 | recent-auth implementation + merge | #324 | complete |
| P1-T2 | live password + Google/OAuth provider acceptance | PS-T8 | blocked |
| P1-T3 | mark/archive Secure accepted | P1-T2 | blocked |
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
| 2026-08-08 | human owner | CI/production | `implementing` | explicit ten-file `Go` | DB write | apply/verify migrations |
| 2026-08-08 | CI/production | evaluator | `evaluating` | #327 | audit ACL + Edge v5 | harden ACL |
| 2026-08-09 | evaluator | human owner | `ready_for_review` | #328 exact-head gates | merge | owner decision |
| 2026-08-09 | human owner | production/evaluator | `evaluating` | #328 merged + explicit ACL `go`; exact live ACL/history | Edge v5 | persist evidence, prepare separate Edge checkpoint |

### Current permission boundary

- Allowed: bounded branch/PR work; GitHub/Vercel/Supabase read-only inspection; focused research.
- Exact repository: `Thunderkill016/moneyflow`.
- Current provider scope after consumed ACL approval: `provider_read` only.
- Forbidden without a new explicit owner approval: Edge deployment, provider config writes, production financial-data mutation and destructive deletion.
- P2 implementation remains blocked until Provider Sync + P1 acceptance.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| canonical MoneyFlow Trust direction | parent/current memory | pass |
| exact ten-file production execution | live migration history/catalog | pass |
| shared Atoryn history preserved | live migration history | pass |
| actual linked-production dry-run for earlier ten-file rollout | not executed | **accepted limitation** |
| audit service-role SELECT-only boundary | #328 + exact live effective privilege read-back | **pass** |
| production Supabase recent-auth Edge current | live source/version | **fail: v5 stale** |
| current export distinguished from full archive | code/UI/current memory | pass |

### Review findings

- Database migration/schema/ACL Provider Sync is aligned for the reviewed MoneyFlow set.
- Production `delete-account` v5 is now the remaining provider-runtime blocker before P1 acceptance.
- Recover implementation remains blocked until Edge rollout and safe provider-backed recent-auth acceptance complete.

### Remaining limitations

- Actual linked-production dry-run was not captured for the earlier ten-file rollout.
- Production `delete-account` remains v5 without current recent-auth.
- Live password/Google step-up is not yet acceptance evidence.
- Complete backup/restore and physical/seven-day evidence remain future phases.

## Delivery record

- Parent PR #323 merged as `538768401bd5c0aa66523aba2a52e3601f3fadd4`.
- Secure PR #324 merged as `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- PR #325 established Provider Sync; #326 captured free dry-run simulation evidence; #327 recorded ten-file production execution.
- PR #328 merged as `1618f817c6a96810160f6261029dd038eb8b41ea` and its audit ACL migration `20260809010648` is now live/provider-aligned.
- Current next action after evidence reconciliation: **prepare the separate current Edge deployment checkpoint; no Edge write without new explicit owner approval**.
