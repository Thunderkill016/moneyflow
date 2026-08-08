# MoneyFlow UI-system Phase 11 — final acceptance

**Status:** active
**Execution state:** evaluating
**Active role:** human_owner
**Permission scope:** owner_merge_checkpoint
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `a65f6f59167b894f9e538e5840e989e27250fdd4`
**Branch:** `agent/ui-phase-11-final-acceptance`
**Issue/PR:** issue #72 / PR #321
**Last updated:** 2026-08-08

The owner instructed **“làm đi”** after a truth audit found that Phases 0–10 are implemented on `main`, while Phase 5–10 lifecycle records were stale and the parent program could not truthfully close until Phase 11 acceptance completed. This instruction authorizes bounded Phase 11 branch work and verification. It does not authorize merge, provider writes, production-data access, destructive production mutations, branch/ruleset changes or fabricated physical-device evidence.

## Outcome

Close the UI-system migration only after the post-P10 product has clean exact-head automated browser evidence, reviewed selective visual baselines, physical Android and physical iOS/Safari evidence, affected production verification and owner acceptance. Reconcile stale Phase 5–10 records to their actual merged state without claiming Phase 11 complete before its physical-device gates are satisfied.

## Repository reconnaissance

### Current behavior

- Phases 0–10 are merged on `main`; Phase 9 merged as `10a11d3492af02cf303ff1ee6981e734676c15fd` and Phase 10 as `a65f6f59167b894f9e538e5840e989e27250fdd4`.
- P10 replay head `9912dc621306c73f14407e175eb1a468b90ea933` passed CI #2025, CodeQL #1132 and secret-history #1132 before merge.
- The P10 cross-device job scheduled 554 tests and finished with 426 passed, 127 skipped and **1 flaky WebKit/iPhone test**. The first attempt observed mobile navigation already visible while the shell still had `padding-bottom: 0`; the retry passed.
- `AppShell` defined layout-critical mobile-nav reserve custom properties only under `html[data-moneyflow-shell="mounted"]`, while the attribute is added in a client `useEffect`. This left a real first-paint interval in which fixed mobile navigation could render before the shell reserve variables existed.
- P11 moves the same AppShell-owned layout variables onto `.shell`, keeps the document marker for document-level scroll padding and locks the first-paint geometry with source/browser contracts.
- Intermediate P11 candidate `ea5756ccee62ba5b6ab56f7a9983a0061289a8ed` passed CI #2032, CodeQL #1138 and secret-history #1138. Browser smoke was 94/94 pass; cross-device was 554 total / 427 pass / 127 intentional skips / **0 failed / 0 flaky**.
- Eight selected P10↔P11 baseline screenshots across Dashboard, Landing, Quick Capture and Transactions on Chromium/WebKit desktop/mobile were byte-identical with zero pixel diff. Review is recorded in `docs/research/UI_PHASE_11_VISUAL_BASELINE_REVIEW_2026-08-08.md`.
- Latest Vercel production deployment remains the P10 build `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf`, state `READY`, commit `a65f6f59167b894f9e538e5840e989e27250fdd4`.
- Vercel did not create a PR preview deployment for #321, so current production cannot validate the P11 fix on physical devices.
- Current production reads return HTTP 200 for `/` and `/login`; unauthenticated `/dashboard` reaches the expected login boundary. No runtime-error cluster was found in the inspected one-hour window.
- Issue #72 remains open and explicitly forbids claiming physical-device readiness from emulation.
- Phase 5–10 lifecycle truth is reconciled in `docs/research/UI_MIGRATION_PHASES_5_10_RECONCILIATION_2026-08-08.md`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/layout/app-shell.module.css` | Owns mobile navigation reserve, safe-area geometry and first-paint layout | changed narrowly |
| `src/components/layout/app-shell.tsx` | Adds the document-level shell marker after hydration | preserved marker for document behavior |
| `e2e/audit/critical-browser.audit.spec.ts` | Owns first-paint and mounted-document shell evidence | strengthened |
| `src/lib/app-shell-phase3-contract.test.ts` | Locks server-rendered AppShell geometry ownership | strengthened |
| `docs/research/UI_PHASE_11_VISUAL_BASELINE_REVIEW_2026-08-08.md` | Reviewed selective P11 visual baseline evidence | current branch evidence |
| `docs/research/UI_PHASE_11_PHYSICAL_DEVICE_ACCEPTANCE_2026-08-08.md` | Exact physical Android/iOS checklist and sequencing | blocked until deployed P11 build/device access |
| issue #72 | Physical-device acceptance tracker | keep open until real-device evidence exists |

### Existing tests and constraints

- Exact-head UI changes require policy, lint, typecheck, complete unit/static tests, production build, browser smoke and selected cross-device audit.
- WebKit/iPhone emulation is browser-engine/device-parameter evidence, not physical iPhone evidence.
- Parent P11 requires physical Android acceptance and physical iOS/Safari acceptance. No waiver is assumed by this packet.
- Parent P11 production verification follows those physical-device gates and cannot be marked complete early.
- Because #321 has no Vercel preview, physical acceptance must target a deployed commit containing the P11 fix; testing current P10 production would test the wrong build.

### Open questions

- [x] Is the P10 WebKit retry merely a harmless assertion race? **No.** Repository source showed the safe-area/nav reserve variables were created only after `useEffect`, so first-paint overlap was possible.
- [x] Does the P11 candidate remove that automated signal? **Yes on intermediate head `ea5756...`: 554 scheduled / 427 passed / 127 skipped / 0 flaky / 0 failed.**
- [x] Does the settled UI change visually? **No in the eight reviewed selective baseline pairs: byte-identical and zero pixel diff.**
- [x] Is a physical Android device connected to the current execution environment? **No usable physical-device boundary is available.**
- [x] Is physical iOS Safari evidence available in the current execution environment? **No.**

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
| Add a new browser/device cloud provider | could add device coverage | new cost/secrets/provider boundary; not required to fix current source issue | reject for this packet |

### Research decision

Fix the product ownership first: mobile-nav reserve variables must not depend on a post-hydration effect. Keep the root marker only for document-level behavior that truly requires mounted-shell lifecycle. The browser test asserts shell reserve immediately after the mobile navigation is visible, then separately waits for the mounted document marker before checking document scroll padding. Physical-device acceptance remains a separate parent-plan gate and is never inferred from browser emulation.

### Adoption review

Not applicable. No new dependency, provider, service, framework or architecture is introduced.

## Specification

### Problem

The migration implementation is merged through P10, but the final P10 browser artifact contained one genuine first-attempt WebKit failure and repository lifecycle records lagged merged truth. Calling the program complete would overstate browser cleanliness and physical-device acceptance.

### User stories

- As a mobile MoneyFlow user, fixed bottom navigation never overlays the page because shell reserve geometry exists from first paint.
- As the project owner, I can distinguish implemented/merged phases from the still-open physical-device acceptance boundary.
- As a future agent, I can read repository memory and see P0–P10 merged, P11 candidate evidence, and the exact remaining gates instead of reopening completed work.

### Acceptance criteria

- [x] **P11-AC1:** mobile shell navigation reserve and focus/feedback geometry are owned from first paint at supported mobile widths; candidate source/browser contracts prove no hydration-only dependency is required for shell reserve.
- [x] **P11-AC2:** candidate Chromium/WebKit matrix completes with zero failed and zero flaky tests; intermediate exact head `ea5756...` recorded 427 passed and 127 intentional skips.
- [x] **P11-AC3:** selective critical visual evidence is reviewed with zero knowingly unreviewed visual diffs; eight selected P10↔P11 screenshot pairs are byte-identical with zero pixel diff.
- [ ] **P11-AC4:** physical Android Chrome acceptance is executed on the exact deployed P11 commit and evidence is recorded.
- [ ] **P11-AC5:** physical iOS/Safari acceptance is executed on the exact deployed P11 commit and evidence is recorded.
- [ ] **P11-AC6:** after physical gates, affected production-route evidence covers the parent P11 production boundary without destructive real-user experimentation.
- [x] **P11-AC7:** Phase 5–10 lifecycle reconciliation and candidate current project memory reflect actual merges/deployments while keeping P11/program acceptance open.
- [ ] **P11-AC8:** parent UI migration program is archived/completed only after P11-AC4 through P11-AC6 pass and owner accepts final closure.

The checked candidate criteria above are **branch acceptance evidence**, not merged product truth. This final documentation head still requires protected exact-head reruns before the PR can reach the owner merge checkpoint.

### Required states

- Loading/first paint: fixed mobile nav already has matching content reserve.
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

`AppShell` already owns mobile navigation geometry. The fix stays in that owner: layout-critical custom properties are available where `.shell` consumes them on server-rendered first paint, while the mounted root marker remains for document-level scroll/focus behavior. Browser evidence stays in the existing critical audit rather than adding a parallel harness.

### Implemented changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/layout/app-shell.module.css` | first-paint nav reserve/layer/focus/feedback variables available on `.shell`; document marker rules preserved | eliminate hydration gap |
| `e2e/audit/critical-browser.audit.spec.ts` | assert shell reserve before mounted marker; wait for marker only before document scroll-padding assertion | deterministic evidence without hiding first paint |
| `src/lib/app-shell-phase3-contract.test.ts` | lock server-rendered shell ownership of critical variables | prevent regression |
| `UI_MIGRATION_PHASES_5_10_RECONCILIATION_2026-08-08.md` + current memory | record delivered merge/CI/production truth | remove false active-work interpretation |
| `UI_PHASE_11_VISUAL_BASELINE_REVIEW_2026-08-08.md` | compare/review eight selected P10↔P11 snapshots | satisfy P11 selective visual review |
| `UI_PHASE_11_PHYSICAL_DEVICE_ACCEPTANCE_2026-08-08.md` | define exact deployed-build Android/iOS and post-device production checklists | prevent emulation from being misreported as physical acceptance |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: presentation-only shell geometry/test/docs.
- Rollback: revert P11 branch; no data operation required.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| CSS variable move changes desktop/settled visuals | full matrix plus eight zero-diff selected visual baselines |
| Test waits hide a first-paint product defect | shell reserve is measured before waiting for mounted marker |
| Records say program complete although physical gates are missing | P11 remains active; issue #72 and physical checklist stay open |
| Emulation is mistaken for physical device | explicit P11-AC4/AC5 and physical checklist |
| Physical device test uses wrong P10 build | checklist requires exact P11 deployed SHA/Vercel ID before any device row passes |

### Verification plan

- Static: policy, knowledge, CSS ownership, architecture, lint, typecheck.
- Unit/domain: complete unit/static-RLS suite; no financial behavior change.
- Database: correctly classified not required on intermediate candidate.
- Browser: browser smoke and complete P11 Chromium/WebKit matrix with zero flaky.
- Responsive/visual: reviewed selective cross-device P10↔P11 snapshot report.
- Physical: Android Chrome + iOS/Safari on exact deployed P11 build.
- Production: affected routes only after physical gates.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P11-T1 | Full static/unit/build/browser/responsive matrix and first-paint remediation | P10 merge | CI #2032 on `ea5756...`, 94 browser pass, 554 matrix / 0 flaky | candidate complete; final-doc head rerun pending |
| P11-T2 | Selective visual baselines and reviewed snapshot report | P11-T1 | `UI_PHASE_11_VISUAL_BASELINE_REVIEW_2026-08-08.md`, eight zero-diff pairs | candidate complete |
| P11-T3 | Execute physical Android Chrome acceptance | deployed P11 build | physical-device checklist | blocked: no deployed P11 build/device boundary |
| P11-T4 | Execute physical iOS/Safari acceptance | deployed P11 build | physical-device checklist | blocked: no deployed P11 build/device boundary |
| P11-T5 | Verify affected production routes after T1–T4 | P11-T3/P11-T4 | production evidence | blocked |
| P11-T6 | Record remaining limitations, lifecycle reconciliation and maintenance ownership | verified merge/deploy truth | reconciliation/current memory/physical checklist | candidate complete; final merge pending |
| P11-T7 | Owner accepts program, archives packet and closes superseded UI plans/issues | P11-T5/P11-T6 | completed packet + current memory + issue disposition | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | researcher/evaluator | discovery | owner instruction + merged P0–P10 truth | P11 evidence incomplete | inspect exact artifacts and production |
| 2026-08-08 | evaluator | implementer | implementing | CI #2025 artifact, source root cause, official Playwright guidance | physical devices unavailable/unproven | fix first-paint ownership |
| 2026-08-08 | implementer | evaluator | evaluating | `ea5756...`: CI #2032 / CodeQL #1138 / secret #1138; 554 matrix 0 flaky; visual report zero diff | final docs head needs exact rerun | consolidate final records |
| 2026-08-08 | evaluator | human_owner | owner_merge_checkpoint | PR #321 candidate implementation + automated/visual evidence | no PR preview; physical gates require deployed P11 build | after final exact-head green, owner decides merge/deployment |

### Current permission boundary

- Granted scope: P11 branch implementation, tests, documentation reconciliation, read-only CI/production inspection.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; MoneyFlow Vercel project read-only evidence.
- Forbidden writes: `main`, merge, deployment trigger, provider configuration, database/Auth/RLS, production data, branch/ruleset changes.
- Human approval required before: merge/deploying the P11 candidate; any parent-plan acceptance relaxation.
- Rollback or stop condition: any financial/auth behavior change, unexplained visual diff, or browser regression moves the packet back to specification/evaluation.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| P11-AC1 | AppShell first-paint ownership + source/browser contracts; intermediate exact head `ea5756...` green | candidate pass |
| P11-AC2 | CI #2032: browser 94/94; UI audit 554 total / 427 pass / 127 skip / 0 flaky / 0 failed | candidate pass |
| P11-AC3 | eight selected stable P10↔P11 screenshots byte-identical / zero pixel diff; reviewed snapshot report | candidate pass |
| P11-AC4 | no physical Android evidence and no deployed P11 build | blocked |
| P11-AC5 | no physical iOS/Safari evidence and no deployed P11 build | blocked |
| P11-AC6 | P10 public production smoke exists; exact P11 production verification must follow physical gates | blocked |
| P11-AC7 | P5–P10 reconciliation/current-memory/physical-checklist records implemented on #321 | candidate pass |
| P11-AC8 | physical + production acceptance and owner closure remain incomplete | blocked |

### Automated evidence on intermediate candidate

Head `ea5756ccee62ba5b6ab56f7a9983a0061289a8ed`:

- CI #2032 / run `31244036703`: success.
- Browser smoke artifact `9017964741`, digest `sha256:4811fcd625132b32d259de9682c1234ed0dfc58a49845aee946dee789bb25806`: 94 passed, 0 failed/flaky.
- Cross-device artifact `9018027242`, digest `sha256:4263d05ed8022be90616623cb5853db14a5fe96fbc032be46305c82e40987fd7`: 554 scheduled, 427 passed, 127 intentional skips, 0 failed, 0 flaky.
- CodeQL #1138 / `31244036704`: success.
- Secret-history #1138 / `31244036708`: success.
- Database checks: not required for this presentation/test/docs change.

These results predate the final evidence-only documentation commits. The final current head must rerun the protected gates before owner review.

### Research and adoption evidence

- Official Playwright assertions/retries/emulation/Android guidance remains applicable to the test/evidence boundary.
- No new tool/dependency/provider was adopted.
- Emulation remains explicitly separated from physical-device acceptance.

### Review findings

- Correctness: root cause was first-paint CSS ownership, not financial/domain logic.
- Security/ownership: no Auth/RLS/provider boundary changed.
- UI/UX/accessibility: selected stable screenshots are unchanged; matrix covers supported device/browser/text/keyboard projects.
- Maintainability/duplication: values remain in AppShell ownership rather than a new global compatibility layer.
- Scope compliance: P11 changes remain limited to AppShell geometry, contracts and evidence/lifecycle records.

### Remaining limitations

- Browser emulation does not satisfy the physical-device gate.
- Current execution environment has no usable physical Android or iOS/Safari device boundary.
- PR #321 has no Vercel preview deployment; physical checks cannot validate the fix until an owner-approved deployed P11 commit exists.
- The P0–P11 program therefore remains open.

## Delivery record

- Branch: `agent/ui-phase-11-final-acceptance`
- PR: #321
- Squash/merge commit: pending owner decision
- Intermediate exact evidence: `ea5756ccee62ba5b6ab56f7a9983a0061289a8ed` — CI #2032 / CodeQL #1138 / secret #1138 success
- Final documentation head protected rerun: pending
- Current production deployment: pre-P11 `main@a65f6f59167b894f9e538e5840e989e27250fdd4`, `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf` READY
- P11 preview deployment: none observed
- Physical-device acceptance: blocked
- Post-device P11 production verification: blocked
- Work packet moved to `docs/plans/completed/`: no