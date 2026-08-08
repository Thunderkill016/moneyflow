# MoneyFlow UI-system Phase 11 — final acceptance

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `a65f6f59167b894f9e538e5840e989e27250fdd4`
**Branch:** `agent/ui-phase-11-final-acceptance`
**Issue/PR:** issue #72 / PR #321
**Last updated:** 2026-08-08

The owner instructed **“làm đi”** after a truth audit found that Phases 0–10 are implemented on `main`, while Phase 5–10 lifecycle records are stale and the parent program cannot truthfully close until Phase 11 acceptance is complete. This instruction authorizes bounded Phase 11 branch work and verification. It does not authorize merge, provider writes, production-data access, destructive production mutations, branch/ruleset changes or fabricated physical-device evidence.

## Outcome

Close the UI-system migration only after the current post-P10 product has clean exact-head automated browser evidence, no knowingly unreviewed visual regression, post-merge production evidence, and the physical-device evidence required by the parent plan. Reconcile stale Phase 5–10 records to their actual merged state without claiming Phase 11 complete before its physical-device gates are satisfied.

## Repository reconnaissance

### Current behavior

- Phases 0–10 are merged on `main`; Phase 9 merged as `10a11d3492af02cf303ff1ee6981e734676c15fd` and Phase 10 as `a65f6f59167b894f9e538e5840e989e27250fdd4`.
- P10 replay head `9912dc621306c73f14407e175eb1a468b90ea933` passed CI #2025, CodeQL #1132 and secret-history #1132 before merge.
- The P10 cross-device job scheduled 554 tests and finished with 426 passed, 127 skipped and **1 flaky WebKit/iPhone test**. The first attempt observed mobile navigation already visible while the shell still had `padding-bottom: 0`; the retry passed.
- `AppShell` defined mobile-nav reserve custom properties only under `html[data-moneyflow-shell="mounted"]`, while the attribute is added in a client `useEffect`. This left a real first-paint interval in which fixed mobile navigation could render before the shell reserve variables existed.
- Latest Vercel production deployment for P10 is `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf`, state `READY`, target `production`, commit `a65f6f59167b894f9e538e5840e989e27250fdd4`.
- Current production reads return HTTP 200 for `/` and `/login`; unauthenticated `/dashboard` reaches the expected login boundary. No runtime-error cluster was found in the inspected one-hour window.
- Issue #72 remains open and explicitly forbids claiming physical-device readiness from emulation.
- Phase 5–10 packets and the prior `CURRENT_PROJECT_MEMORY.md` snapshot were stale relative to merged truth.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/layout/app-shell.module.css` | Owns mobile navigation reserve, safe-area geometry and first-paint layout | change narrowly |
| `src/components/layout/app-shell.tsx` | Adds the document-level shell marker after hydration | preserve marker for document-level behavior |
| `e2e/audit/critical-browser.audit.spec.ts` | Contains the mobile-shell geometry evidence | strengthen without retry-only masking |
| `docs/research/UI_MIGRATION_PHASES_5_10_RECONCILIATION_2026-08-08.md` | Reconciles stale P5–P10 lifecycle headers with merge/CI/production truth | current branch record |
| `docs/research/CURRENT_PROJECT_MEMORY.md` | Current project-status authority | update to P0–P10 merged, P11 active |
| issue #72 | Physical-device acceptance tracker | keep open until real-device evidence exists |

### Existing tests and constraints

- Exact-head UI changes require policy, lint, typecheck, complete unit/static tests, production build, browser smoke and selected cross-device audit.
- WebKit/iPhone emulation is browser-engine/device-parameter evidence, not physical iPhone evidence.
- Parent P11 requires physical Android smoke; iOS Safari requires a device, owner-provided evidence, or an explicit owner waiver with limitations.
- Parent P11 production journey depends on the physical-device gates and cannot be marked complete early.

### Open questions

- [x] Is the WebKit retry merely a harmless assertion race? **No.** Repository source showed the underlying safe-area/nav reserve variables were created only after `useEffect`, so first-paint overlap was possible.
- [x] Is a physical Android device connected to the current execution environment? **No usable device/ADB boundary is available in the current execution environment.**
- [ ] Is physical iOS Safari evidence available, or will the owner explicitly waive it with documented limits?

## Research

### Research scope and source selection

- Decision question: should the P10 WebKit retry be ignored, handled by test retry, or fixed as first-paint ownership?
- Reference map consulted: focused official Playwright documentation after repository inspection.
- Source budget: three official Playwright sources; no new dependency/provider is needed.
- Expected decision: distinguish real-device evidence from emulation and keep first-paint product ownership separate from asynchronous document-level evidence.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Playwright Assertions | official docs | 2026-08-08 | web-first assertions retry until expected state; plain value assertions do not | cannot determine whether MoneyFlow's transient state is itself a product bug |
| Playwright Retries | official docs | 2026-08-08 | a test that fails first and passes on retry is categorized as flaky | retry success is not proof the first failure is harmless |
| Playwright Android / Emulation | official docs | 2026-08-08 | device-project emulation is simulated evidence; Android device automation requires a device boundary and ADB | does not turn emulation into physical-device acceptance and does not supply physical iOS Safari evidence |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Ignore the retry because CI is green | no code change | hides a real first-paint geometry gap; violates final-acceptance intent | reject |
| Change only the test to retry/poll geometry | removes timing flake | can mask real initial overlap | reject as sole fix |
| Make shell reserve variables available on first paint, then wait only for document-level mounted state | fixes product ownership and keeps evidence deterministic | narrow shell CSS/test change | selected |
| Add a new browser/device cloud provider | could add device coverage | new cost/secrets/provider boundary; not needed for current source fix | reject for P11 branch |

### Research decision

Fix the product ownership first: mobile-nav reserve variables must not depend on a post-hydration effect. Keep the root marker only for document-level behavior that truly requires mounted-shell lifecycle. The browser test must assert shell reserve immediately after the mobile navigation is visible, then separately wait for the mounted document marker before checking document scroll padding. Physical-device acceptance remains a separate gate and is never inferred from browser emulation.

### Adoption review

Not applicable. No new dependency, provider, service, framework or architecture is introduced.

## Specification

### Problem

The migration implementation is merged through P10, but the final browser artifact contains one genuine first-attempt WebKit failure and repository lifecycle records lag merged truth. Calling the program complete now would overstate both browser cleanliness and physical-device acceptance.

### User stories

- As a mobile MoneyFlow user, fixed bottom navigation never overlays the page because shell reserve geometry exists from first paint.
- As the project owner, I can distinguish implemented/merged phases from the still-open physical-device acceptance boundary.
- As a future agent, I can read repository memory and see P0–P10 merged, P11 active, and the exact remaining evidence instead of reopening completed work.

### Acceptance criteria

- [ ] **P11-AC1:** mobile shell navigation reserve and focus/feedback geometry are valid from first paint at supported mobile widths; no hydration-only variable dependency can produce zero shell reserve while mobile navigation is visible.
- [ ] **P11-AC2:** the exact-head Chromium/WebKit matrix completes with zero failed and zero flaky tests; any intentional skips remain explained by the existing matrix.
- [ ] **P11-AC3:** selective critical visual evidence is reviewed with zero knowingly unreviewed visual diffs.
- [ ] **P11-AC4:** physical Android Chrome smoke is executed on a maintained physical Android device and evidence is recorded.
- [ ] **P11-AC5:** physical iOS Safari smoke is recorded when available; otherwise only explicit owner-provided evidence or an explicit owner waiver may satisfy the parent-plan exception, with limitations recorded.
- [ ] **P11-AC6:** after physical gates, production journey evidence covers landing → auth boundary → onboarding/authenticated workspace path → Dashboard → transaction add/edit/delete/recovery → Accounts → Reports → Settings without destructive real-user experimentation.
- [ ] **P11-AC7:** Phase 5–10 lifecycle reconciliation and current project memory reflect actual merges/deployments and do not mark P11/program acceptance before AC1–AC6 are satisfied.
- [ ] **P11-AC8:** parent UI migration program is archived/completed only after all non-waived P11 acceptance criteria pass and owner approves merge/closure.

### Required states

- Loading/first paint: fixed mobile nav must already have matching content reserve.
- Mobile/tablet/desktop: preserve existing supported matrix and safe-area behavior.
- Accessibility: preserve focus clearance, keyboard path, 200% text and target-size evidence.
- Recovery: no retry-only masking; a first-attempt browser failure is investigated.

### Financial and security constraints

- No financial formula, mutation payload, database schema, RLS/Auth/provider setting or production data is changed.
- Production acceptance must avoid destructive experimentation on a real user's ledger; use existing safe/demo/synthetic paths where allowed.

### Out of scope

- New visual direction or redesign.
- New component framework, device-cloud provider or testing service.
- Recent-auth feature work from PR #316.
- CI tooling PRs #314/#315/#317.
- Product-depth work unrelated to the UI migration.

## Implementation plan

### Architecture fit

`AppShell` already owns mobile navigation geometry. The fix stays in that owner: define layout-critical custom properties where `.shell` can consume them on server-rendered first paint, while retaining the mounted root marker for document-level scroll/focus behavior. Browser evidence remains in the existing critical audit rather than adding a parallel harness.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/layout/app-shell.module.css` | make first-paint nav reserve/layer/focus/feedback variables available on `.shell`; preserve document marker rules | eliminate hydration gap |
| `e2e/audit/critical-browser.audit.spec.ts` | assert shell reserve before mounted marker; wait for marker only before document scroll-padding assertion | deterministic evidence without hiding first paint |
| `src/lib/app-shell-phase3-contract.test.ts` | lock server-rendered shell ownership of critical variables | prevent regression |
| P5–P10 reconciliation/current memory | record delivered merge/CI/production truth | remove false active-work interpretation |
| issue #72 | record exact P11 automated and physical-device state | keep physical gate explicit |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: presentation-only shell geometry/test/docs.
- Rollback: revert P11 branch; no data operation required.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| CSS variable move changes desktop | retain existing values and full browser matrix |
| Test waits hide a first-paint product defect | shell reserve is measured before waiting for mounted marker |
| Records say program complete although physical gates are missing | P11 remains implementing/blocked and issue #72 stays open |
| Emulation is mistaken for physical device | explicit AC4/AC5 and owner boundary |

### Verification plan

- Static: policy, knowledge, CSS ownership, architecture, lint, typecheck.
- Unit/domain: complete unit/static-RLS suite; no financial behavior change.
- Database: should classify not required.
- Browser: browser smoke and complete P11 Chromium/WebKit matrix; require zero flaky.
- Responsive/visual: inspect generated cross-device artifact, especially WebKit iPhone and mobile shell.
- Production/manual: provider read-only evidence now; full P11 production journey only after physical gates.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P11-T1 | Fix first-paint mobile shell reserve and lock deterministic browser invariant | P10 merge | source diff + focused/full browser evidence | implementing |
| P11-T2 | Complete exact-head Chromium/WebKit matrix and review selective visual artifact | P11-T1 | CI artifact, zero flaky/failed | todo |
| P11-T3 | Execute physical Android Chrome smoke | P11-T2 | physical-device evidence + checklist | blocked: no device boundary available |
| P11-T4 | Execute physical iOS Safari smoke or record explicit owner waiver | P11-T2 | device evidence or owner waiver | blocked |
| P11-T5 | Execute dependency-ordered post-physical production journey | P11-T3/P11-T4 | production evidence | blocked |
| P11-T6 | Reconcile P5–P10 lifecycle records and current memory | verified merge/deploy truth | reconciliation + current-memory diff | implemented on branch; exact-head verification pending |
| P11-T7 | Close/archive P11 and parent program | P11-T5/P11-T6 + owner merge/acceptance | completed packet + current memory | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | researcher/evaluator | discovery | owner instruction + merged P0–P10 truth | P11 evidence incomplete | inspect exact artifacts and production |
| 2026-08-08 | evaluator | implementer | implementing | CI #2025 artifact, source root cause, official Playwright guidance | physical devices unavailable/unproven | fix first-paint ownership, then exact-head verify |
| 2026-08-08 | implementer | ci_or_production | evaluating | PR #321 branch changes | physical gates remain blocked | run exact-head policy/static/browser/security gates |

### Current permission boundary

- Granted scope: P11 branch implementation, tests, documentation reconciliation, read-only CI/production inspection.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; MoneyFlow Vercel project read-only evidence.
- Forbidden writes: `main`, merge, deployment trigger, provider configuration, database/Auth/RLS, production data, branch/ruleset changes.
- Human approval required before: merge; iOS waiver; any relaxation of physical-device requirement.
- Rollback or stop condition: any financial/auth behavior change, unexplained visual diff, or browser regression moves the packet back to specification/evaluation.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| P11-AC1 | first-paint owner fix + source/browser contracts on PR #321; exact-head run pending | pending |
| P11-AC2 | P10 baseline: 426 pass / 127 skip / 1 flaky; P11 rerun pending | fail baseline / pending fix |
| P11-AC3 | P10 artifact reviewed for failure provenance; P11 post-fix visual review pending | pending |
| P11-AC4 | no physical Android evidence in current environment | blocked |
| P11-AC5 | no physical iOS evidence/waiver supplied | blocked |
| P11-AC6 | public production read-only smoke green; dependency-ordered full journey not yet allowed | pending |
| P11-AC7 | reconciliation/current-memory changes implemented on PR #321 | pending exact-head verification/merge |
| P11-AC8 | P11 not accepted | blocked |

### Research and adoption evidence

- Official Playwright assertions/retries/emulation/Android guidance remains applicable to the final test boundary.
- No new tool/dependency/provider was adopted.
- Emulation remains explicitly separated from physical-device acceptance.

### Review findings

- Correctness: root cause is first-paint CSS ownership, not financial/domain logic.
- Security/ownership: no Auth/RLS/provider boundary changed.
- UI/UX/accessibility: preserve existing safe-area/focus/target-size semantics; exact matrix pending.
- Maintainability/duplication: values remain in AppShell ownership rather than a new global compatibility layer.
- Scope compliance: six P11 files only before exact-head follow-up edits.

### Remaining limitations

- Browser emulation does not satisfy the physical-device gate.
- Current execution environment has no usable physical Android device boundary.
- No iOS physical evidence or owner waiver has been supplied.

## Delivery record

- Branch: `agent/ui-phase-11-final-acceptance`
- PR: #321
- Squash commit: pending owner decision
- CI run: new exact-head run required after packet-hygiene correction
- Production deployment: current pre-P11 main `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf` READY
- Production flow verified: public landing/login and unauthenticated dashboard boundary only; full P11 flow pending
- Work packet moved to `docs/plans/completed/`: no