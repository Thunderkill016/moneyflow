# MoneyFlow Trust

**Status:** active
**Execution state:** implementing
**Active role:** planner
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #323 parent program; #324 Secure implementation; #325 Provider Sync reconciliation; #327 DB evidence reconciliation
**Last updated:** 2026-08-08

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
- #324 merged the current recent-auth implementation; its Next.js side is live on Vercel.
- Production Supabase `delete-account` remains **v5** and does not contain the merged recent-auth/current-tenant implementation.
- The exact ten reviewed MoneyFlow migrations that were previously absent from production were applied on 2026-08-08 under their original repository versions.
- All seven legitimate shared Atoryn migration-history rows were preserved.
- Post-write checks found 27/27 target indexes valid/ready, 10/10 checked constraints validated, and the affected baseline data counts preserved.
- Review/reconciliation/rules schema is now present in production.
- Financial audit schema/RLS/triggers are present, but effective production `service_role` still has INSERT/UPDATE/DELETE on `financial_mutation_audit_events` while the merged pgTAP contract requires those DML privileges denied.
- Therefore Provider Sync is **not fully provider-aligned** even though the ten-file migration drift is closed.
- Current transaction/Inbox CSV/JSON export remains scoped user-readable export, **not** a complete restorable archive.
- P2 Recover remains blocked until Provider Sync and P1 Secure provider acceptance complete.

### Active prerequisite

`docs/plans/active/moneyflow-trust-provider-sync.md`

Provider Sync is currently `evaluating`.

Completed evidence:

- live provider migration/catalog/function baseline;
- exact ten-file MoneyFlow migration set;
- complete fresh-reset replay + **478 pgTAP pass** in CI #2070;
- per-migration dependency/lock/data/privilege risk review;
- PR #326 free local union-history CLI dry-run selecting exactly ten MoneyFlow migrations;
- explicit owner “Go” for the exact ten-file production DB checkpoint after the linked-dry-run limitation was known;
- 10/10 source migrations applied and remote history normalized to original repository versions;
- post-write catalog/data/RLS/advisor/log verification.

Accepted limitation:

- an actual linked-production CLI dry-run was not executed; the owner accepted the free local union-history simulation plus fresh live preflight for the consumed ten-file DB checkpoint only.

Current blockers:

1. effective audit-table `service_role` DML contradicts the merged pgTAP least-privilege contract;
2. production `delete-account` remains v5;
3. safe password + supported OAuth/Google recent-auth provider acceptance remains unexecuted.

### Relevant repository/provider areas

| Area | Role |
|---|---|
| `docs/research/CURRENT_PROJECT_MEMORY.md` | current merged/provider truth |
| `docs/plans/active/account-deletion-recent-auth.md` | P1 Secure lifecycle/evidence |
| `docs/plans/active/moneyflow-trust-provider-sync.md` | current provider alignment packet |
| `supabase/tests/database/financial_audit_atomicity_and_service_role.test.sql` | accepted audit least-privilege invariant |
| `supabase/migrations/` | Git-owned MoneyFlow schema history |
| `supabase/functions/delete-account/index.ts` | current merged destructive authority |
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | current recent-auth policy helper |
| production migration history/catalog/effective privileges | actual database provider authority |
| production `delete-account` version/source | actual destructive runtime authority |

### Existing constraints

- Financial/data changes require migration replay, pgTAP/invariants and ownership/RLS evidence.
- Code, migrations and tests outrank prose; a live provider finding that contradicts a merged pgTAP invariant remains a blocker.
- Provider behavior requires provider evidence; repository/browser tests cannot manufacture it.
- Integer money, split exactness, transfer neutrality and tenant ownership remain invariants.
- Provider/production-data writes require explicit owner approval and rollback scope.
- Vercel deployment does not deploy Supabase migrations or Edge Functions.
- Physical-device claims require physical-device evidence; emulation is not equivalent.

### Open questions

- [x] Continue UI migration? No; archived.
- [x] Treat current CSV/JSON export as restore? No.
- [x] Is P1 fully deployed because Vercel is READY? No.
- [x] Does production `delete-account` contain recent-auth? No; v5 is stale.
- [x] Was the exact ten-file MoneyFlow migration set applied? Yes; 10/10 on 2026-08-08.
- [x] Were the seven legitimate Atoryn history rows preserved? Yes.
- [x] Did the complete current migration chain replay cleanly? Yes; 478 pgTAP assertions passed in CI #2070.
- [x] Was an actual linked-production dry-run executed? No; accepted limitation for the consumed ten-file DB checkpoint.
- [ ] Does production effective audit-table privilege match the merged pgTAP contract? No; DML denial currently fails.
- [ ] Does the owner approve a new reviewed forward migration to restore audit least privilege?
- [ ] After database contract alignment, does the owner separately approve deployment of current `delete-account`?
- [ ] Do safe live password + supported OAuth/Google step-up flows pass after the current Edge Function is deployed?

## Research

### Research scope and source selection

Research is dependency-driven and begins with repository/provider truth.

- P1 used official Supabase JWT/Auth documentation plus OWASP reauthentication guidance.
- Provider Sync uses live Supabase migration/catalog/function/privilege reads, exact-head CI migration replay and official Supabase/PostgreSQL deployment semantics.
- P2 Recover research starts only after the provider contract is aligned and Secure is accepted.

### Key decisions

1. Recent-auth authority uses verified `amr` method/timestamp, not access-token issuance time.
2. AAL and recent authentication are separate concepts.
3. Vercel deployment, Supabase database migration and Supabase Edge deployment are separate lifecycles.
4. Current CSV/JSON export is not a complete restorable archive.
5. Legitimate Atoryn remote migration history must be preserved.
6. The free local union-history dry-run remains explicitly different from an actual linked-production dry-run.
7. Applying migration SQL does not by itself prove effective production privilege parity; merged pgTAP privilege assertions must be checked against live provider state.
8. Do not patch the audit ACL ad hoc; create a new reviewed forward migration/spec that handles project-level/default privilege behavior.

### Sources

| Source | Authority/type | What it establishes |
|---|---|---|
| live MoneyFlow Supabase history/catalog/ACL/Edge | production truth | actual provider state |
| current MoneyFlow `main` + merged migrations/tests | repository truth | intended accepted contract |
| CI #2070 database job | executable repository evidence | complete migration replay; 478 pgTAP pass |
| PR #326 run `31259696558` | executable simulation evidence | local union history selects exact ten-file MoneyFlow set |
| `financial_audit_atomicity_and_service_role.test.sql` | merged DB test contract | service_role SELECT allowed; DML denied on audit table |
| Supabase JWT/Auth and migration docs | official | AMR and migration mechanics |
| Supabase Edge deploy docs | official | Edge deployment separate from Vercel |
| PostgreSQL privilege/DDL behavior | official | effective privilege/forward-migration planning inputs |
| current MoneyFlow export code/UI | repository truth | scoped export is not full backup |

### Adoption review

No new dependency, provider, service, framework or runtime architecture is adopted. Any audit privilege correction remains an ordinary reviewed Supabase migration inside the existing architecture.

## Specification

### Problem

The historical ten-file migration drift is closed, but MoneyFlow Git/provider state is still split at two security-sensitive boundaries:

- the live audit table does not satisfy the merged `service_role` DML-denial contract;
- the destructive Supabase Edge runtime remains v5 without current recent-auth/current-tenant code.

Recover must not advance while Provider Sync and Secure acceptance remain incomplete.

### User stories

- As a user, financial mutation audit storage cannot be bypassed by normal `service_role` table DML outside trigger-owned paths.
- As a user, production account deletion is protected by the same recent-auth policy current `main` claims.
- As a user, future complete archive/restore operates against one known provider contract.
- As the owner, repository, Vercel, Supabase DB, Supabase Edge, physical-device and self-use evidence remain distinguishable.

### Acceptance criteria

Provider baseline/alignment:

- [x] PBT-AC1: repository/Vercel/Supabase baseline reconciled.
- [x] PBT-AC2: exact ten-file migration drift enumerated and replay-verified with 478 pgTAP assertions.
- [ ] PBT-AC3: actual linked-production dry-run proves the ten-file write set. **Not executed; accepted limitation for consumed DB checkpoint.**
- [x] PBT-AC4: owner-approved ten-file migration set applied; original remote history/catalog objects exist and shared Atoryn history is preserved.
- [ ] PBT-AC5: effective production audit privileges satisfy merged least-privilege pgTAP contract.
- [ ] PBT-AC6: current `delete-account` Edge source is explicitly deployed/read back after database contract alignment.

Secure:

- [x] PBT-AC7: destructive account deletion requires verified recent interactive authentication in merged current-main source.
- [ ] PBT-AC8: the same recent-auth gate exists in the actual production Supabase Edge Function.
- [ ] PBT-AC9: provider-backed password and supported OAuth/Google step-up are exercised on production-safe authenticated flows with identity continuity preserved.

Recover/Prove/Release:

- [ ] PBT-AC10: versioned complete archive can be exported, validated and restored with financial invariants intact.
- [ ] PBT-AC11: restore fails safely on unsupported/corrupt/partial archives.
- [ ] PBT-AC12: core ledger behavior is exercised on a physical phone.
- [ ] PBT-AC13: MoneyFlow completes seven consecutive days of sanitized owner self-use without data loss/manual DB repair.
- [ ] PBT-AC14: no unresolved P0/P1 defect blocks the daily-ledger loop at final decision.
- [ ] PBT-AC15: current memory/evidence are reconciled and the owner records the final public-beta decision/accepted limitations.

### Financial and security constraints

- Never infer or alter balances to make migration/restore succeed.
- Preserve integer money, transfer neutrality, split exactness and tenant ownership.
- Do not change production ACLs or deploy Edge without explicit owner approval.
- Do not alter historical migration files in place.
- Preserve legitimate Atoryn remote migration history.
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

Keep the modular monolith. Provider Sync aligns the existing Supabase DB/Edge runtime with Git-owned migrations/tests/functions. P2 introduces a versioned public archive contract only after provider state is aligned and Secure is accepted.

### Current phase map

| Phase/checkpoint | Short name | Current state |
|---|---|---|
| P0 | Baseline | provider drift discovered and reconciled |
| P0/P1 prerequisite | **Provider Sync** | **evaluating; ten-file migration drift closed, audit least privilege + Edge pending** |
| P1 | **Secure** | merged; Vercel side live; Supabase provider acceptance incomplete |
| P2 | **Recover** | blocked by Provider Sync + P1 acceptance |
| P3 | **Prove** | blocked by P2 |
| P4 | **Improve** | blocked by P3 evidence |
| P5 | **Release** | blocked by prior phases |

### Provider Sync next sequence

1. specify a bounded forward migration that removes effective `service_role` INSERT/UPDATE/DELETE on `financial_mutation_audit_events` while preserving required SELECT and trigger-owned audit behavior;
2. replay full migration chain and pgTAP, including the existing audit least-privilege test;
3. inspect how project/default privileges affect the proposed fix;
4. return to owner for explicit production ACL/DDL write approval;
5. apply and verify effective live privileges;
6. only then return to owner for the separate current Edge deployment approval;
7. deploy/read back current `delete-account` with `verify_jwt=true` and shared recent-auth helper;
8. run production-safe password/Google step-up acceptance without confirmed destructive deletion;
9. reconcile P1 and parent memory; only then unlock Recover implementation.

### Rollback / forward-fix principle

The ten historical migrations are now production history and should not be rolled back. New provider-contract mismatches are corrected through reviewed forward migrations. Edge rollback to v5 after a future rollout would reintroduce a known security gap and therefore requires explicit owner approval if ever needed.

### Verification plan

- Audit hardening: exact-head migration replay + pgTAP + live effective privilege read-back.
- Post-Edge: version/source/hash read-back and `verify_jwt=true`.
- Secure acceptance: ordinary/stale/fresh password/OAuth paths, no destructive real-user deletion.
- Recover later: archive validation/restore/invariant tests.
- Prove later: physical phone + seven-day sanitized owner run.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0-T1 | reconcile repository/Vercel/provider baseline | parent | #324 + live provider | complete |
| PS-T1 | record Provider Sync packet | P0 | active packet | complete |
| PS-T2 | prove exact ten-file migration set | provider baseline | CI + remote checks | complete |
| PS-T3 | review migrations/dependencies/production risks | PS-T2 | source + preflight | complete |
| PS-T4 | prove complete fresh replay | PS-T2 | CI #2070 / 478 pgTAP | complete |
| PS-T5 | actual linked-production dry-run | PS-T2–T4 | not executed; accepted limitation | accepted limitation |
| PS-T6 | owner approve ten-file DB write | known limitation + preflight | explicit “Go” | complete |
| PS-T7 | apply/verify ten-file migration execution | PS-T6 | live history/catalog | complete |
| PS-T8 | specify/review audit least-privilege forward migration | live ACL mismatch | new packet/migration | todo |
| PS-T9 | owner approve audit ACL production write | PS-T8 | explicit approval | blocked |
| PS-T10 | apply/verify audit ACL hardening | PS-T9 | pgTAP + live privilege read-back | blocked |
| PS-T11 | owner approve current Edge deployment | PS-T10 | explicit approval | blocked |
| PS-T12 | deploy/read back current `delete-account` | PS-T11 | version/source/hash | blocked |
| P1-T1 | recent-auth implementation | P0 | #324 | complete |
| P1-T2 | exact-head security/database/browser verification | P1-T1 | CI #2070 / CodeQL/Secret | complete |
| P1-T3 | owner merge + Vercel deployment | P1-T2 | merged #324 + READY Vercel | complete |
| P1-T4 | live password + Google provider acceptance | PS-T12 | provider evidence | blocked |
| P1-T5 | mark/archive Secure accepted | P1-T4 | lifecycle record | blocked |
| P2-T1 | accept archive contract | P1 accepted | Recover packet | blocked |
| P2-T2 | implement export/validate/restore | P2-T1 | DB/browser/invariant evidence | blocked |
| P3-T1 | physical-phone core ledger checklist | P2 accepted | device evidence | blocked |
| P3-T2 | seven-day sanitized self-use | P3-T1 | daily outcome log | blocked |
| P4-T1 | select one observed trust-depth slice | P3-T2 | observed problem | blocked |
| P5-T1 | owner public-beta decision | prior phases | final decision | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | `planned` | #323 owner-approved program | Secure/provider drift | execute trust sequence |
| 2026-08-08 | evaluator | human owner | `ready_for_review` | #324 exact-head evidence | owner merge | owner decision |
| 2026-08-08 | human owner | CI/production | `merged` | #324 merge | provider deployment truth | inspect providers separately |
| 2026-08-08 | researcher | planner | `specified` | live Supabase drift + CI replay | migration/Edge mismatch | plan Provider Sync |
| 2026-08-08 | evaluator | human owner | `evaluating` | #326 simulation + fresh preflight | linked dry-run absent | owner DB decision |
| 2026-08-08 | human owner | CI/production | `implementing` | explicit “Go” | exact ten-file write | apply/verify migrations |
| 2026-08-08 | CI/production | evaluator | `evaluating` | ten-file execution + live ACL/advisor reads | audit least-privilege mismatch + Edge v5 | specify forward ACL hardening; no provider write |

### Current permission boundary

- Allowed: bounded branch/PR work; GitHub/Vercel/Supabase read-only inspection; focused research.
- Exact repository: `Thunderkill016/moneyflow`.
- Current provider scope: `provider_read` only.
- The previous ten-file DB write authorization has been consumed/completed.
- Forbidden without new explicit owner approval: audit ACL/DDL changes, Edge deployment, provider config writes, production financial-data mutation and destructive deletion.
- P2 implementation remains blocked until Provider Sync + P1 acceptance.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| canonical MoneyFlow Trust direction retained | parent/current memory | pass |
| #324 repository/security gates | CI #2070 / CodeQL/Secret | pass |
| exact Next.js deployment READY | Vercel production | pass |
| exact ten-file production execution | live migration history/catalog | pass |
| shared Atoryn history preserved | live migration history | pass |
| audit effective service_role DML denied | live privilege check vs merged pgTAP | **fail / blocker** |
| production Supabase recent-auth Edge current | live source/version | **fail: v5 stale** |
| complete current migration replay | CI #2070, 478 pgTAP | pass |
| actual linked-production dry-run | not executed | **accepted limitation for consumed DB checkpoint** |
| current export distinguished from full archive | code/UI/current memory | pass |

### Review findings

- The ten-file migration-history/schema drift is closed.
- Provider Sync remains incomplete because live audit effective privilege contradicts a merged pgTAP invariant.
- Production `delete-account` v5 remains a separate destructive-runtime blocker after the database privilege contract is fixed.
- Recover implementation must remain blocked until Provider Sync and Secure acceptance complete.

### Remaining limitations

- Actual linked-production dry-run was not captured.
- Audit effective least privilege is not aligned.
- Production `delete-account` remains v5 without recent-auth.
- Live password/Google step-up is not yet acceptance evidence.
- Complete backup/restore and physical/seven-day evidence remain future phases.

## Delivery record

- Parent PR #323 merged as `538768401bd5c0aa66523aba2a52e3601f3fadd4`.
- Secure PR #324 merged as `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- Vercel Next.js production `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is READY for the #324 implementation.
- Discovery/reconciliation PR #325 established the Provider Sync packet.
- Free dry-run probe #326 closed unmerged after evidence capture.
- PR #327 records the ten-file production DB execution and the audit ACL mismatch.
- Current next action after #327 evidence merge: **specify/review the audit least-privilege forward migration; no provider write without a new explicit owner checkpoint**.