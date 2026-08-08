# MoneyFlow Trust

**Status:** active
**Execution state:** implementing
**Active role:** planner
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #323 parent program; #324 Secure implementation
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Canonical short name:** MoneyFlow Trust  
**Original planning label/path:** Public Beta Trust / `docs/plans/active/public-beta-trust.md`

The owner approved this program after the UI-system migration P0–P11 was archived. The stable path is retained to avoid backlink churn; the program name is now **MoneyFlow Trust**.

MoneyFlow Trust does not reopen UI migration. It moves MoneyFlow from a released functional MVP toward a trustworthy public-beta boundary by closing security, recoverability/portability and real-use evidence gaps before speculative breadth.

## Outcome

MoneyFlow is ready for a bounded public beta when a user can trust the daily ledger, recover from mistakes, prove recent identity before destructive account deletion, export and restore a versioned complete archive, and complete a real seven-day self-use cycle without data loss or manual database repair.

Program memory phrase:

> **Secure → Recover → Prove → Improve → Release**

## Repository reconnaissance

### Current behavior

- Functional MVP is released.
- UI-system migration P0–P11 is archived; P11 implementation and production evidence are complete with physical Android/iOS recorded as accepted limitations rather than pass evidence.
- P0 Baseline for MoneyFlow Trust is reconciled through current `main@fd984a18201f1663d3d8c622d51c41dfd650c816`.
- P1 Secure implementation is merged through #324 and exact Vercel production deployment `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is `READY`.
- P1 ordinary unauthenticated delete-account/login routing is production-evidenced.
- P1 still lacks live authenticated provider-backed password + Google step-up acceptance; repository/browser/deployment evidence does not substitute for that provider boundary.
- PR #316 is closed as superseded historical evidence; #324 is current product truth.
- Current transaction/Inbox CSV/JSON export remains a scoped user-readable export, **not** a complete restorable archive.
- Current product principles prioritize data correctness, core-flow completion, mobile usability, recovery and trust depth before visual polish or speculative breadth.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/research/CURRENT_PROJECT_MEMORY.md` | current merged/production truth | authoritative status input |
| `docs/plans/active/account-deletion-recent-auth.md` | P1 Secure lifecycle/evidence | keep active until provider acceptance |
| `docs/product/PRINCIPLES.md` | prioritization and daily-use readiness | preserve trust-before-breadth order |
| `docs/product/MONEYFLOW_PRODUCT_VISION.md` | long-term wave sequence | reuse Ledger Trust first |
| `docs/architecture/TARGET_ARCHITECTURE_ROADMAP.md` | dependency and domain boundaries | preserve ledger/planning separation |
| `src/components/export-settings-page.tsx` + export/domain owners | current scoped export | do not relabel current export as backup |
| Supabase domain schema/RPCs | source of restore dependency/ownership truth | inspect before Phase 2 specification |

### Existing tests and constraints

- UI/shared-component changes require policy, lint, typecheck, tests, build and browser evidence when selected.
- Financial/data changes require migration replay, pgTAP/invariants, ownership/RLS and browser evidence where applicable.
- Provider behavior must be verified separately from repository tests.
- Integer money, split exactness, transfer neutrality, ownership isolation and soft-delete/recovery remain invariants.
- Physical-device claims require physical-device evidence; emulation is not equivalent.
- Provider or production-data writes require explicit owner approval and rollback scope.

### Similar implementation and recent history

- #321 closed UI migration implementation/production evidence.
- #322 archived UI migration with physical-device limitations explicitly recorded.
- #323 created this trust program.
- #324 refreshed #316 recent-auth design onto current main, fixed additional OAuth continuity/recovery findings, passed protected evidence, merged and deployed.
- Existing export UI explicitly states that transaction/Inbox CSV/JSON is not a complete account backup.

### Open questions

- [x] Continue UI migration? No; archived.
- [x] Merge #316 unchanged? No; superseded and closed.
- [x] Treat current CSV/JSON export as restore? No.
- [x] Build speculative breadth before trust gates? No.
- [x] P1 implementation merged/deployed? Yes, #324 / `fd984a...` / `dpl_8Eak...`.
- [ ] P1 live password step-up provider evidence.
- [ ] P1 live Google step-up/identity-continuity provider evidence.
- [ ] Which exact user-owned domains and dependency order belong in archive/restore v1? Resolve through Phase 2 repository/schema research before implementation.
- [ ] Which physical phone/browser owns seven-day acceptance evidence? Resolve before P3 execution.

## Research

### Research scope and source selection

Research is dependency-driven and starts from current repository/provider truth.

- P1 used official Supabase JWT/Auth documentation plus OWASP reauthentication guidance.
- P2 research must inspect current MoneyFlow schema/export behavior first, then use maintained official references for transaction-safe restore/versioned formats.
- External product references may inform the distinction between interchange export and true restore, but MoneyFlow does not copy another product's schema wholesale.

### Questions researched so far

1. What server-verifiable Supabase evidence distinguishes interactive authentication from token refresh?
2. What should protect a highly sensitive operation?
3. Is authentication assurance (`aal`) the same as recent authentication? No.
4. Is MoneyFlow's current export a complete restorable archive? No.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Supabase JWT/Auth documentation | official | 2026-08-08 | verified AMR method/timestamp and distinction among AMR/AAL/token issuance | MoneyFlow chooses accepted methods/freshness policy |
| OWASP Authentication Cheat Sheet | authoritative security guidance | 2026-08-08 | sensitive operations should require reauthentication | exact provider UX/window is product-specific |
| MoneyFlow merged export UI/domain code | repository truth | 2026-08-08 | current export covers transactions/Inbox and explicitly is not complete restore | Phase 2 must inspect all user-owned domains |
| Actual Budget backup/restore documentation | maintained finance-product reference | 2026-08-08 | complete restorable archive is a distinct capability from CSV interchange | MoneyFlow needs its own versioned contract/invariants |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| start another UI program | visible progress | polish before trust | reject |
| merge #316 unchanged | fast | stale baseline/security findings | rejected; #324 replaced it |
| treat CSV/JSON as backup | no work | cannot reconstruct complete state | reject |
| begin P2 implementation before P1 provider evidence | parallelism | violates explicit dependency and hides auth boundary | reject |
| prepare P2 schema/research/spec while implementation remains blocked | preserves dependency while reducing idle time | requires clear blocked labeling | selected |

### Research decision

Keep one dependency-ordered trust program. P1 may advance from `deployed` to `accepted` only with live provider evidence or explicit owner acceptance of that gap as a limitation. P2 specification/research may be prepared in parallel, but P2 implementation remains blocked until P1 acceptance.

### Adoption review

No new dependency, provider, service, framework or runtime architecture has been adopted by the parent program. Each implementation phase performs its own adoption review if needed.

## Specification

### Problem

MoneyFlow is functional-MVP complete and UI-migration complete, but public-beta trust is not yet proven. Recent-auth code is now merged/deployed but the live authenticated provider step-up boundary remains unverified. User-owned data still lacks a complete versioned restore path, and real daily-use evidence has not proven the core ledger over seven consecutive days.

### User stories

- As a user, an old authenticated session alone cannot permanently delete my account.
- As a user, supported provider/password step-up preserves my identity before destructive deletion.
- As a user, I can export a complete versioned archive and restore it without corrupting money semantics.
- As a user, the daily ledger works reliably on a physical phone.
- As the owner, repository, provider, physical-device and self-use evidence remain distinguishable before declaring public beta.

### Acceptance criteria

- [x] PBT-AC1: current public-beta baseline is reconciled and stale #316 candidate status is removed.
- [x] PBT-AC2: destructive account deletion requires verified recent interactive authentication on merged current `main`, and exact merged deployment is `READY`.
- [ ] PBT-AC3: provider-backed password and supported OAuth step-up are exercised on production-safe authenticated flows with identity continuity preserved.
- [ ] PBT-AC4: a versioned complete archive can be exported, validated and restored into a clean boundary with financial invariants intact.
- [ ] PBT-AC5: restore never silently accepts unsupported/corrupt archives or partial financial state.
- [ ] PBT-AC6: core transaction/edit/delete/restore/transfer/split behavior is exercised on a physical phone.
- [ ] PBT-AC7: MoneyFlow completes a seven-consecutive-day owner self-use run without data loss or manual DB repair.
- [ ] PBT-AC8: no unresolved P0/P1 defect blocks the daily ledger loop at final decision.
- [ ] PBT-AC9: current memory, work packets and production evidence are reconciled before archive.
- [ ] PBT-AC10: owner records final public-beta decision and accepted limitations.

### Required states

- Baseline: current main/production/open candidate truth is reconciled.
- Secure: fresh/stale/expired/failed/mismatched reauthentication paths are explicit and provider acceptance is separate from repository evidence.
- Recover: valid, corrupt, unsupported-version and partial archives fail or restore deterministically.
- Prove: core flow, error/recovery and physical-mobile paths are recorded without sensitive financial details.
- Release: public-beta or not-yet, with limitations named explicitly.

### Financial and security constraints

- Never infer or alter balances to make restore succeed.
- Preserve integer VND/minor-unit money, transfer neutrality and split exactness.
- Preserve tenant isolation/RLS and viewer-derived mutation authority.
- Recent-auth evidence must be server-verifiable; client state cannot authorize deletion.
- Backup archives must exclude passwords, JWTs, provider credentials, secrets and private infrastructure metadata.
- Imported owner/user identifiers must never become authorization authority for the current viewer.
- No destructive real-user deletion test is required for provider acceptance.

### Out of scope

- UI redesign or reopening P0–P11.
- Bank sync/Open Banking.
- Probabilistic/generative AI financial advice.
- Household/collaboration.
- Investments/wealth accounting.
- Native rewrite.
- Full envelope budgeting.
- Microservices/event-sourcing rewrite.
- Automatic unreviewed ledger posting.

## Implementation plan

### Architecture fit

Keep the current modular monolith. P1 stays inside existing Supabase Auth/login/callback/Edge deletion authority. P2 will introduce a versioned public archive contract around existing user-owned domain data without exposing internal tables as a public file format. P3 is evidence/acceptance work. P4 touches Ledger Core only when observed trust evidence justifies a bounded slice.

### Planned changes

| Phase | Short name | Change | Current state |
|---|---|---|---|
| P0 | Baseline | reconcile main/production/candidates/evidence vocabulary | complete |
| P1 | **Secure** | recent-auth implementation + exact deployment + provider acceptance | deployed; provider acceptance pending |
| P2 | **Recover** | versioned complete archive, validation, isolated/atomic restore and rollback | research/spec may proceed; implementation blocked by P1 |
| P3 | **Prove** | physical-phone + seven-day daily-use acceptance | blocked by P2 |
| P4 | **Improve** | one observed Ledger Trust depth slice if justified | blocked by P3 evidence |
| P5 | **Release** | reconcile evidence and record owner beta decision | blocked by prior phases |

### Data and migration impact

- P1: no schema migration; auth/Edge/runtime only.
- P2: schema/RPC/archive additions may be required; must be specified with replay/rollback and current schema evidence before implementation.
- P3: no intentional schema change; sanitized acceptance evidence only.
- Compatibility: existing transaction/Inbox export remains available; archive format is new and versioned.
- Rollback: each implementation phase uses focused branch/PR and its own rollback plan.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| repository tests mistaken for live provider acceptance | keep P1 `deployed`, not `accepted`, until provider evidence |
| archive mirrors internal DB schema and becomes brittle | define public versioned manifest/domain contract |
| archive is readable but not restorable | clean-boundary restore acceptance |
| corrupt archive partially mutates data | validate before mutation; transaction/staging/rollback design |
| archive trusts foreign owner IDs | rebind ownership to current authenticated viewer through server authority |
| archive leaks secrets | explicit allowlist + negative tests |
| restore invents balances/fixes invalid money | fail closed; preserve exact ledger invariants |
| emulation reported as physical evidence | device/browser/version required for P3 claims |
| seven-day evidence leaks finances | record outcomes/defects only, no values/notes |
| program grows into feature breadth | P4 requires observed friction/trust gap |

### Verification plan

- Static: project knowledge, CI policy, lint/typecheck/architecture as selected.
- Unit/domain: recent-auth policy, future archive schema/validation, financial invariants.
- Database: migration replay, pgTAP, tenant isolation and restore counterexamples where P2 changes DB boundaries.
- Browser: password/OAuth step-up, future export/restore review, core daily ledger journey.
- Responsive/visual: only affected flows; physical phone for claimed P3 evidence.
- Production/manual: bounded provider-backed reauth smoke, future clean restore boundary and seven-day sanitized self-use log.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0-T1 | reconcile current main, production and trust candidates | parent | current memory + #316/#324 disposition | complete |
| P0-T2 | classify stale #316 | P0-T1 | closed superseded comment/state | complete |
| P1-T1 | refresh recent-auth onto current main | P0 | #324 | complete |
| P1-T2 | exact-head auth/security/database/browser verification | P1-T1 | CI #2070, CodeQL/Secret #1173, clean Browser rerun/cross-device | complete |
| P1-T3a | owner merge + exact READY deployment + ordinary-login smoke | P1-T2 | `fd984a...`, `dpl_8Eak...` | complete |
| P1-T3b | provider-backed authenticated password + Google step-up | P1-T3a | provider evidence | blocked: requires explicit production/provider boundary |
| P1-T4 | archive P1 packet and mark accepted | P1-T3b or explicit owner limitation decision | lifecycle record | blocked |
| P2-T0 | repository/schema/export reconnaissance and focused external research | may prepare while P1 deployed | Phase 2 research record | in_progress |
| P2-T1 | accept archive manifest/domain/version/restore specification | P1 accepted + P2-T0 | accepted P2 packet | blocked |
| P2-T2 | implement export/validate/restore with invariant tests | P2-T1 | exact-head DB/browser evidence | blocked |
| P3-T1 | physical-phone core ledger checklist | P2-T2 accepted | device/browser evidence | blocked |
| P3-T2 | seven-consecutive-day sanitized self-use run | P3-T1 | daily outcome log | blocked |
| P4-T1 | select one observed Ledger Trust depth slice if justified | P3-T2 | observed problem + accepted spec | blocked |
| P5-T1 | reconcile evidence and owner public-beta decision | prior selected phases | final decision record | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks/unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | planned | #323 + owner approval | #316 stale | execute dependency sequence |
| 2026-08-08 | evaluator | human_owner | ready_for_review | #324 exact-head evidence | owner merge | owner decides |
| 2026-08-08 | human_owner | CI/production | merged | #324 → `fd984a...` | exact deployment | verify |
| 2026-08-08 | CI/production | human_owner | deployed | `dpl_8Eak...` READY; ordinary-login smoke; no runtime errors in explicit 1h window | authenticated provider step-up not evidenced | provider acceptance requires explicit boundary; P2 research/spec prep may continue without implementation |

### Current permission boundary

- Granted repository scope: bounded branch/PR work for MoneyFlow Trust and read-only provider/schema research.
- Exact repository: `Thunderkill016/moneyflow`.
- Current provider scope: `provider_read` only.
- Forbidden without later explicit owner approval: production provider config writes, creating/mutating a production account for acceptance, production financial-data mutation, destructive account deletion, branch/ruleset changes.
- Human approval required before feature merges, provider writes, production-data writes, acceptance-criteria relaxation and final public-beta launch decision.
- P2 implementation is explicitly blocked until P1 is accepted; P2 reconnaissance/research/spec preparation is allowed.
- Stop condition: any phase discovers a requirement changing financial semantics, ownership, provider policy or program scope; update specification and return to owner checkpoint.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| parent packet represents current #324 merge/deployment truth | GitHub + Vercel reconciliation | pass on this branch, pending PR checks |
| stale #316 is removed from current direction | #316 closed superseded | pass |
| P1 repository/security exact-head gates | CI #2070 / CodeQL #1173 / Secret #1173 + raw Browser/cross-device | pass |
| exact P1 merge deployment READY | `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` → `fd984a...` | pass |
| ordinary unauthenticated deletion/login production boundary | route smoke | pass |
| live authenticated password + Google step-up | provider evidence | pending |
| current export distinguished from full archive | merged export UI/current memory | pass |

### Research and adoption evidence

- Supabase documentation supports verified AMR method/timestamp and distinguishes AAL from recent login.
- OWASP supports reauthentication for sensitive operations but does not prescribe MoneyFlow's exact interval.
- Current MoneyFlow export explicitly does not contain all account domains required for restore.
- Maintained finance-product references distinguish restorable archive from interchange export.
- No external architecture/file format has been adopted wholesale.

### Review findings

- Correctness: dependency order remains trust-before-breadth.
- Security: merged recent-auth remains server-authoritative; provider acceptance is not inferred.
- Portability: P2 must start from actual current schema and a public archive contract, not raw table dumping.
- UI/UX/accessibility: no redesign scope; future restore UI must reuse current owners/primitives.
- Maintainability: #316 closed historical; #324 is sole current recent-auth truth.
- Scope compliance: P2 implementation remains blocked while P1 provider acceptance is open.

### Remaining limitations

- Authenticated production password step-up not yet evidenced.
- Authenticated production Google step-up/identity continuity not yet evidenced.
- Complete backup/restore not implemented.
- Physical/seven-day daily-use evidence not collected.

## Delivery record

- Parent planning PR: #323 — merged as `538768401bd5c0aa66523aba2a52e3601f3fadd4`.
- Secure implementation PR: #324 — merged as `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- Secure production: `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` READY.
- Current program: active.
- Current phase boundary: P1 deployed/provider acceptance pending; P2 reconnaissance/research preparation in progress; P2 implementation blocked.
- Work packet moved to `docs/plans/completed/`: no; active until final MoneyFlow Trust acceptance/decision.
