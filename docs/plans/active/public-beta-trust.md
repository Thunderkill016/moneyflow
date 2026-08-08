# MoneyFlow Public Beta Trust

**Status:** planned
**Execution state:** planned
**Active role:** planner
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #323
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. The owner explicitly approved this program after the UI-system migration P0–P11 was archived. This program does not reopen UI migration. It moves MoneyFlow from a released functional MVP toward a trustworthy public-beta boundary by closing security, portability and daily-use evidence gaps before adding speculative breadth.

## Outcome

MoneyFlow is ready for a bounded public beta when a user can trust the daily ledger, recover from mistakes, prove recent identity before destructive account deletion, export and restore a versioned complete archive, and complete a real seven-day self-use cycle without data loss or manual database repair.

## Repository reconnaissance

### Current behavior

- Functional MVP is released.
- UI-system migration P0–P11 is archived; P11 is merged and production evidenced.
- Current production P11 deployment is `READY`.
- Physical Android/iOS UI acceptance was explicitly closed as a limitation of the UI program and is not represented as pass evidence.
- Current true public-beta gaps include provider-backed recent authentication for destructive account deletion and complete versioned archive/restore.
- PR #316 contains a verified-unmerged recent-auth candidate, but it diverges from current `main`: 26 commits ahead and 4 commits behind, with merge base `8b97566...`; it must be refreshed rather than merged unchanged.
- Current product principles prioritize data correctness, core-flow completion, mobile usability, recovery and trust depth before visual polish or speculative breadth.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/research/CURRENT_PROJECT_MEMORY.md` | current capability/security truth | authoritative status input |
| `docs/product/PRINCIPLES.md` | prioritization and daily-use readiness | preserve trust-before-breadth order |
| `docs/product/MONEYFLOW_PRODUCT_VISION.md` | long-term wave sequence | reuse Ledger Trust first |
| `docs/architecture/TARGET_ARCHITECTURE_ROADMAP.md` | dependency and domain boundaries | preserve ledger/planning separation |
| PR #316 | recent-auth implementation evidence | refresh onto current `main`; do not merge stale branch |
| export/import/account deletion paths | public-beta trust surface | bounded future phases |

### Existing tests and constraints

- UI/shared-component changes require policy, lint, typecheck, tests, build and browser evidence when selected.
- Financial/data changes require migration replay, pgTAP/invariants, ownership/RLS and browser evidence where applicable.
- Provider behavior must be verified separately from repository tests.
- Integer money, split exactness, transfer neutrality, ownership isolation and soft-delete/recovery remain invariants.
- Physical-device claims require physical-device evidence; emulation is not equivalent.

### Similar implementation and recent history

- PR #321 closed the UI migration implementation and production evidence.
- PR #322 archived that program with physical-device limitations recorded explicitly.
- PR #316 already proved a strong recent-auth design on an older baseline and should be reused as evidence rather than discarded or merged unchanged.
- Existing CSV/JSON export is user-readable portability, but current memory explicitly says it is not a complete versioned backup/restore archive.

### Open questions

- [x] Continue UI migration? No; it is archived.
- [x] Merge PR #316 unchanged? No; it diverges from current `main` and touches Auth/UI ownership changed after its merge base.
- [x] Treat CSV/JSON export as restore? No; backup/restore is a separate trust capability.
- [x] Build speculative breadth before trust gates? No.
- [ ] Which exact domains belong in backup/restore v1? Resolve in Phase 2 specification before implementation.
- [ ] Which physical phone/browser will own seven-day acceptance evidence? Resolve before Phase 3 execution.

## Research

### Research scope and source selection

- Decision question: what is the smallest dependency-ordered program that moves MoneyFlow from functional MVP to trustworthy public beta without reopening UI work or adding speculative breadth?
- Reference maps: repository product/architecture/current-memory documents first; focused external sources only for auth and portability decisions.
- Source budget: four focused sources.
- Expected decision: recent-auth authority, export-versus-restore distinction and acceptance sequence.

### Questions researched

1. What server-verifiable Supabase claim can distinguish interactive authentication from token refresh?
2. What do established security guidelines require for highly sensitive operations?
3. Should `aal` and recent authentication be treated as the same concept?
4. What does a maintained finance product expose when it supports true backup/restore rather than readable export only?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Supabase JWT Claims Reference | official | 2026-08-08 | `amr` may contain authentication method and timestamp in signed Supabase JWT claims | MoneyFlow still chooses accepted methods and freshness window |
| Supabase MFA/Auth docs | official | 2026-08-08 | `aal` expresses authentication assurance; it is not by itself a recent-login timestamp | does not mandate MFA for MoneyFlow deletion |
| OWASP Authentication Cheat Sheet | authoritative security guidance | 2026-08-08 | sensitive operations should require reauthentication at a trusted boundary | exact provider UX/freshness interval is product-specific |
| Actual Budget backup/restore + API docs | maintained product reference | 2026-08-08 | complete exports can be imported/restored as a separate capability from CSV-style interchange | MoneyFlow must design its own versioned archive and invariants |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| start another UI program | visible progress | optimizes polish before trust gaps | reject |
| merge PR #316 unchanged | fast | stale Auth/UI baseline and conflict risk | reject |
| treat CSV/JSON as backup | no new work | cannot prove complete reconstruction | reject |
| build one trust program in dependency order | bounded, evidence-driven | slower feature breadth | selected |

### Research decision

Use a five-phase trust program: reconcile baseline; refresh recent-auth; build versioned backup/restore; run physical/seven-day daily-use acceptance; add only evidence-selected ledger trust depth; then make an explicit owner public-beta decision. Recent-auth uses verified server claims, not browser timers. Backup/restore is a complete reconstruction contract, not a relabeling of CSV/JSON export.

### Adoption review

Not applicable at parent-plan level. No dependency, provider, service, framework or runtime architecture is adopted by this planning PR. Each implementation phase performs its own adoption review if it introduces one.

## Specification

### Problem

MoneyFlow is functional-MVP complete and UI-migration complete, but public-beta trust is not yet proven. Permanent deletion still lacks merged provider-evidenced recent authentication, user-owned data does not yet have a complete versioned restore path, and real daily-use evidence has not proven the core ledger can survive seven consecutive days without data loss or manual repair.

### User stories

- As a user, an old authenticated session alone cannot permanently delete my account.
- As a user, I can export a complete versioned archive and restore it without corrupting money semantics.
- As a user, the daily ledger works reliably on a physical phone.
- As the owner, I can distinguish repository, provider, physical-device and self-use evidence before declaring public beta.

### Acceptance criteria

- [ ] PBT-AC1: current public-beta baseline is reconciled and stale candidate claims are removed.
- [ ] PBT-AC2: destructive account deletion requires verified recent interactive authentication on merged current `main` and deployed production.
- [ ] PBT-AC3: provider-backed password and supported OAuth step-up are exercised on production-safe flows with identity continuity preserved.
- [ ] PBT-AC4: a versioned complete archive can be exported, validated and restored into a clean boundary with financial invariants intact.
- [ ] PBT-AC5: restore never silently accepts unsupported/corrupt archives or partial financial state.
- [ ] PBT-AC6: core transaction/edit/delete/restore/transfer/split behavior is exercised on a physical phone.
- [ ] PBT-AC7: MoneyFlow completes a seven-consecutive-day owner self-use run without data loss or manual DB repair.
- [ ] PBT-AC8: no unresolved P0/P1 defect blocks the daily ledger loop at final decision.
- [ ] PBT-AC9: current memory, work packets and production evidence are reconciled before archive.
- [ ] PBT-AC10: owner records the final public-beta decision and accepted limitations.

### Required states

- Baseline: current main/production/open PR truth is reconciled.
- Security: fresh/stale/failed/mismatched reauthentication paths are explicit.
- Portability: valid, corrupt, unsupported-version and partial archives fail or restore deterministically.
- Daily-use: core flow, error/recovery and physical-mobile paths are recorded without sensitive financial details.
- Final decision: public-beta or not-yet, with limitations named explicitly.

### Financial and security constraints

- Never infer or alter balances to make restore succeed.
- Preserve integer VND/minor-unit money, transfer neutrality and split exactness.
- Preserve tenant isolation/RLS and viewer-derived mutation authority.
- Recent-auth evidence must be server-verifiable; client state cannot authorize deletion.
- Backup archives must exclude passwords, JWTs, provider credentials, secrets and private infrastructure metadata.
- No destructive real-user deletion test is required for provider acceptance.

### Out of scope

- UI redesign or reopening P0–P11.
- Bank sync/Open Banking.
- Probabilistic/generative AI.
- Household/collaboration.
- Investments/wealth accounting.
- Native rewrite.
- Full envelope budgeting.
- Microservices/event-sourcing rewrite.
- Automatic unreviewed ledger posting.

## Implementation plan

### Architecture fit

Keep the current modular monolith. Phase 1 stays inside the existing Supabase Auth/login/callback/Edge deletion authority. Phase 2 introduces a versioned public archive contract around existing user-owned domain data without exposing internal tables directly. Phase 3 is evidence/acceptance work. Phase 4 touches Ledger Core only when an observed trust problem justifies a bounded slice.

### Planned changes

| Phase | Change | Reason |
|---|---|---|
| P0 | reconcile main/production/candidates and evidence vocabulary | prevent stale roadmap work |
| P1 | refresh PR #316 onto current main; exact-head + provider evidence | close destructive-action auth gap |
| P2 | versioned complete archive, validation, isolated restore and rollback | close data ownership/portability gap |
| P3 | physical-phone + seven-day daily-use acceptance | prove real product trust |
| P4 | split correction/mutation audit or other observed trust slice only | deepen Ledger Core from evidence |
| P5 | reconcile evidence and record owner beta decision | explicit release boundary |

### Data and migration impact

- Parent-plan PR: none.
- Phase 1: expected no schema migration; auth/Edge/runtime code only unless refreshed design proves otherwise.
- Phase 2: schema/RPC/archive additions may be required; must be specified with replay/backfill/rollback before implementation.
- Phase 3: no intentional schema change; sanitized acceptance evidence only.
- Compatibility: current export remains available; archive format is new and versioned.
- Rollback: each implementation phase uses a focused PR and its own rollback plan.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| stale #316 overwrites newer Auth/UI | port selectively onto current main, then exact-head browser/security checks |
| refresh token mistaken for reauth | verify accepted interactive `amr` timestamps |
| OAuth step-up switches account | expected-user continuity guard and mismatch rejection |
| archive is readable but not restorable | clean-user restore acceptance |
| corrupt archive partially mutates data | validate before commit; atomic/recoverable restore design |
| archive leaks secrets | explicit data allowlist and negative tests |
| emulation is reported as physical evidence | device/browser/version required for physical claims |
| seven-day evidence leaks finances | record outcomes/defects only, no values/notes |
| program grows into feature breadth | Phase 4 requires observed friction or trust gap |

### Verification plan

- Static: project knowledge, CI policy, lint/typecheck/architecture as selected.
- Unit/domain: recent-auth policy, archive schema/validation, financial invariants.
- Database: migration replay, pgTAP, tenant isolation and restore counterexamples where Phase 2 changes DB boundaries.
- Browser flow: password/OAuth step-up, export/restore review, core daily ledger journey.
- Responsive/visual: only affected flows; physical phone for claimed Phase 3 evidence.
- Production/manual: bounded provider-backed reauth smoke, clean restore boundary and seven-day sanitized self-use log.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0-T1 | reconcile current main, production and open trust candidates | parent plan | current-truth table | todo |
| P0-T2 | classify #316 and other relevant PRs keep/refresh/supersede | P0-T1 | disposition record | todo |
| P1-T1 | refresh recent-auth design/code onto current main | P0-T2 | focused branch diff | blocked |
| P1-T2 | exact-head auth/security/database/browser verification | P1-T1 | CI/CodeQL/secret/browser evidence | blocked |
| P1-T3 | after owner merge, provider-backed production-safe step-up verification | P1-T2 + owner merge | provider/deployment evidence | blocked |
| P2-T1 | specify archive manifest/domain/version/restore contract | P1-T3 | accepted Phase 2 packet | blocked |
| P2-T2 | implement export/validate/restore with invariant tests | P2-T1 | exact-head DB/browser evidence | blocked |
| P3-T1 | execute physical-phone core ledger checklist | P2-T2 | device/browser evidence | blocked |
| P3-T2 | execute seven-consecutive-day sanitized self-use run | P3-T1 | daily outcome log | blocked |
| P4-T1 | select one observed Ledger Trust depth slice if justified | P3-T2 | observed problem + accepted spec | blocked |
| P5-T1 | reconcile all evidence and owner public-beta decision | prior selected phases | final decision record | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | planned | owner approval in conversation; current memory/product/architecture review; focused external research | parent plan not merged | exact-head plan verification |
| 2026-08-08 | planner | evaluator | evaluating | PR #323 | CI/project-knowledge checks pending | repair only plan-contract findings |

### Current permission boundary

- Granted scope: create this parent program and bounded branch/PR work toward its dependency sequence.
- Exact repository: `Thunderkill016/moneyflow`.
- Provider access in this packet: research/read-only only.
- Forbidden writes without a later explicit boundary: production provider config, production data, destructive account deletion, branch/ruleset changes.
- Human approval required before: feature merges, provider writes, destructive production operations, acceptance-criteria relaxation and final public-beta launch decision.
- Stop condition: any phase discovers a requirement that changes financial semantics, ownership, provider policy or program scope; update specification and return to owner checkpoint.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| parent packet follows repository work-packet contract | project knowledge CI | pending |
| research is focused and source limitations are recorded | packet review | pass |
| no runtime/product/provider change | PR changed-file list | pass |
| PR #316 is not represented as merge-ready current truth | current-main compare + packet | pass |

### Research and adoption evidence

- Supabase docs support `amr` method/timestamp and distinguish `aal` assurance from simple session existence.
- OWASP supports reauthentication for sensitive operations but does not prescribe MoneyFlow's exact freshness window.
- Actual Budget demonstrates a maintained product distinction between complete restorable archive and ordinary interchange/export.
- No external architecture or file format is adopted wholesale.

### Review findings

- Correctness: dependency order matches current gaps and product principles.
- Security/ownership: destructive recent-auth remains server-authoritative; restore cannot bypass ownership rules.
- UI/UX/accessibility: no redesign scope; affected auth/restore flows must reuse current UI ownership.
- Maintainability/duplication: existing #316 evidence is reused selectively instead of rebuilt from zero.
- Scope compliance: public-beta trust only; speculative breadth excluded.

### Remaining limitations

- Parent plan is candidate until PR #323 passes exact-head checks and is merged by owner authorization.
- Provider-backed recent-auth is not current product truth yet.
- Complete backup/restore is not implemented yet.
- Physical/seven-day daily-use evidence is not yet collected.

## Delivery record

- Branch: `agent/public-beta-trust-plan`
- PR: #323
- Squash commit: pending
- CI run: pending exact head after contract repair
- Production deployment: not applicable for planning-only PR
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: no; active until program acceptance
