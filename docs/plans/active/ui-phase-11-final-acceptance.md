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

The owner instructed **“làm đi”** after a truth audit found that Phases 0–10 are implemented on `main`, while Phase 5–10 lifecycle records were stale and the parent program could not truthfully close until Phase 11 acceptance completed. This authorizes bounded Phase 11 branch work and verification. It does not authorize merge, provider writes, production-data access, destructive production mutations, branch/ruleset changes or fabricated physical-device evidence.

## Outcome

Close the UI-system migration only after the post-P10 product has clean exact-head automated evidence, reviewed selective visual baselines, physical Android and physical iOS/Safari evidence, affected production verification and owner acceptance. Final acceptance must investigate raw retry evidence instead of treating a green job shell as proof.

## Repository reconnaissance

### Current behavior and findings

- Phases 0–10 are merged on `main`; P9 merged as `10a11d3492af02cf303ff1ee6981e734676c15fd` and P10 as `a65f6f59167b894f9e538e5840e989e27250fdd4`.
- P10 replay head `9912dc621306c73f14407e175eb1a468b90ea933` passed CI #2025, CodeQL #1132 and secret-history #1132, but its UI artifact contained **one flaky WebKit/iPhone first attempt**.
- **Finding 1 — AppShell first-paint reserve:** mobile navigation could be visible while the shell still had `padding-bottom: 0` because layout-critical variables existed only under `html[data-moneyflow-shell="mounted"]`, whose marker is added in client `useEffect`.
- P11 moves the same AppShell-owned reserve/layer/focus variables onto `.shell`, keeps the document marker for document-level scroll padding and locks the first-paint invariant with source/browser contracts.
- A later documentation head `caf933098121fa7ccf902055cb557e789fe23b30` had a green Browser-smoke job shell but raw logs exposed **another first-attempt failure that passed on retry**.
- **Finding 2 — demo transaction persistence:** `useTransactions` wrote localStorage inside React `setTransactions(current => ...)` updaters and returned `{ ok: true }` immediately. Quick Capture could close/navigate and unmount before the queued updater ran, so the UI reported success while no demo transaction had been persisted.
- P11 now uses `commitDemoTransactions(next)` to write storage synchronously before updating React state and before returning success. Add/delete/restore/split/update/bulk demo mutations derive from the stored ledger and commit before success. A source contract forbids storage side effects inside React state updaters.
- Latest source candidate `59490eaf7d739ec5838eca53d046590a4302ef92` passed CI #2039, CodeQL #1145 and secret-history #1145 with **785 unit/static tests**, **94/94 Browser smoke with 0 flaky**, and **554 cross-device tests: 427 passed / 127 intentional skips / 0 failed / 0 flaky**.
- The eight selected P10↔latest-P11 visual baselines remain byte-identical with zero pixel diff. Review: `docs/research/UI_PHASE_11_VISUAL_BASELINE_REVIEW_2026-08-08.md`.
- P5–P10 lifecycle truth is reconciled in `docs/research/UI_MIGRATION_PHASES_5_10_RECONCILIATION_2026-08-08.md`.
- Current Vercel production remains the P10 build `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf`, `READY` at `main@a65f6f...`; no PR #321 preview deployment was observed.
- Issue #72 remains open. No physical Android or iOS/Safari device boundary is available in the current execution environment.

### Relevant repository areas

| Area | Why it matters | P11 action |
|---|---|---|
| `src/components/layout/app-shell.module.css` | mobile reserve/safe-area first-paint ownership | fixed narrowly |
| `e2e/audit/critical-browser.audit.spec.ts` | first-paint and mounted-document geometry evidence | strengthened |
| `src/lib/app-shell-phase3-contract.test.ts` | source ownership regression | strengthened |
| `src/hooks/use-transactions.ts` | demo ledger mutation/persistence ordering | fixed across demo mutations |
| `src/lib/demo-transaction-persistence-contract.test.ts` | prevents side effects in React updater path | added |
| visual-baseline report | selective P11 visual acceptance | refreshed on latest source candidate |
| physical-device checklist | Android/iOS/deployed-build sequencing | blocked until deployed candidate/device access |
| issue #72 | physical-device acceptance tracker | remains open |

### Existing constraints

- UI changes require policy, lint, typecheck, complete tests, production build, Browser smoke and cross-device audit when selected.
- A retry-pass is a flaky signal, not equivalent to first-attempt success.
- Browser/device-project emulation is not physical-device evidence.
- Parent P11 requires both physical Android and physical iOS/Safari acceptance; no waiver is assumed.
- Because #321 has no Vercel preview, physical acceptance must target a deployed commit containing P11; current P10 production tests the wrong build.

## Research

### Research scope

Repository/source/log inspection came first. Focused official guidance was used only to decide how to treat the observed retry behavior and mutation ordering.

### Sources and decisions

| Source | Authority | Accessed | Applied decision |
|---|---|---|---|
| Playwright Assertions | official | 2026-08-08 | distinguish retrying web-first evidence from one-shot measurements |
| Playwright Retries | official | 2026-08-08 | first-fail/retry-pass is `flaky`; do not call it clean acceptance |
| Playwright Android / Emulation | official | 2026-08-08 | emulation does not satisfy physical Android/iOS acceptance |
| React `useState` updater guidance | official | 2026-08-08 | updater functions are queued state calculations and must be pure; move localStorage side effects outside updater functions |

### Alternatives considered

| Option | Advantage | Risk | Decision |
|---|---|---|---|
| Ignore retries because workflow is green | no change | hides real product races | reject |
| Increase timeouts/retries | easy | masks source defects | reject |
| Fix AppShell ownership + deterministic evidence | correct first-paint behavior | narrow CSS/test change | selected |
| Patch only Quick Capture test | small diff | leaves same persistence race in other demo mutations | reject |
| Make demo persistence synchronous at mutation owner | correct success semantics across demo ledger | touches shared hook | selected with source contract/full gates |
| Add device-cloud provider | could add physical-like coverage | new provider/cost/secrets and still not current physical-device evidence | reject for this packet |

### Research decision

P11 treats raw retry signals as findings. Layout-critical geometry must exist before hydration, and a demo mutation must durably update the local ledger before reporting success. Physical-device acceptance remains separate and cannot be inferred from hosted CI.

## Specification

### Problem

P0–P10 implementation is merged, but final acceptance exposed two timing bugs that ordinary green workflow conclusions could hide: first-paint AppShell reserve and demo mutation persistence. P11 must repair those defects, prove clean first-attempt automated behavior and keep physical/device/production gates open until they are actually exercised.

### User stories

- As a mobile user, fixed bottom navigation never overlays content because reserve geometry exists from first paint.
- As a demo user, a successful transaction mutation is already persisted before the UI closes or navigates.
- As the owner, I can distinguish automated candidate evidence from physical/deployed acceptance.
- As a future agent, repository memory shows P0–P10 delivered and the exact remaining P11 gate instead of reopening completed phases.

### Acceptance criteria

- [x] **P11-AC1:** mobile shell reserve/focus/feedback geometry is available from first paint; no hydration-only variable dependency is needed for shell reserve.
- [x] **P11-AC2:** demo ledger mutation success is persistence-first; storage side effects are outside React state updaters and Browser smoke confirms Quick Capture first-attempt persistence.
- [x] **P11-AC3:** latest source candidate exact matrix is clean: CI #2039, 785 unit/static tests, Browser 94/94 with 0 flaky, cross-device 554 total / 427 pass / 127 intentional skips / 0 failed / 0 flaky, CodeQL/secret success.
- [x] **P11-AC4:** selective critical visual evidence on latest source candidate has zero knowingly unreviewed stable visual diff; eight selected P10↔P11 hashes remain identical.
- [ ] **P11-AC5:** physical Android Chrome acceptance is executed on the exact deployed P11 commit and recorded.
- [ ] **P11-AC6:** physical iOS/Safari acceptance is executed on the exact deployed P11 commit and recorded.
- [ ] **P11-AC7:** after both physical gates, affected production-route evidence is recorded without destructive real-user experimentation.
- [x] **P11-AC8:** P5–P10 lifecycle reconciliation/current memory accurately keep P11/program acceptance open.
- [ ] **P11-AC9:** parent UI migration program is archived only after physical/production gates pass and owner accepts final closure.

Checked criteria are **branch candidate evidence**, not merged product truth. This evidence-documentation update moves the head again, so protected exact-head checks must run one final time before owner merge review.

### Financial and security constraints

- No financial formula, authenticated mutation payload, database schema/migration, RLS/Auth/provider setting or production data is changed.
- Demo persistence changes only browser-local demo ledger ordering.
- Production acceptance must use safe/demo/synthetic paths and must not destructively experiment on a real user's financial ledger.

### Out of scope

- Redesign/new visual direction.
- New device-cloud provider/framework.
- Recent-auth PR #316.
- CI tooling PRs #314/#315/#317.
- Product-depth work unrelated to final UI migration acceptance.

## Implementation plan

### Implemented changes

| File/area | Change | Reason |
|---|---|---|
| AppShell CSS | shell-local reserve/layer/focus variables exist on SSR first paint | remove hydration geometry race |
| critical browser audit | first-paint shell reserve checked before mounted marker | prevent retry from masking geometry defect |
| AppShell source contract | lock shell-local variable owner | prevent regression |
| `use-transactions.ts` | synchronous `commitDemoTransactions` before success for demo mutations | remove queued-updater persistence race |
| demo persistence contract | prohibit localStorage write inside React state updater | enforce React-pure updater boundary |
| P5–P10 reconciliation/current memory | record real merged/deployed state | remove false active work |
| visual report | compare P10 with latest source candidate artifact | P11-T2 evidence |
| physical checklist | exact deployed-build Android/iOS + production sequence | prevent false physical claims |

### Data and migration impact

- Database/schema/backfill: none.
- Browser-local demo storage: mutation ordering only; same transaction-store format.
- Rollback: revert P11 branch; no server-data migration required.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| AppShell fix changes settled UI | eight latest-source visual baselines remain identical |
| demo success returns before persistence | synchronous storage write before `setTransactions`/return; Browser raw log clean |
| storage source and React state diverge | demo mutations derive from `readStoredTransactions()` and commit storage + state together |
| docs overstate completion | physical and deployed-build production tasks remain blocked/open |
| physical test targets P10 | checklist requires exact P11 deployed SHA/Vercel ID first |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P11-T1 | Full static/unit/build/browser/responsive matrix + remediation of discovered races | latest source `59490e...`, CI #2039, 785 tests, 94 Browser, 554 UI matrix, CodeQL/secret green | candidate complete; final-doc head rerun pending |
| P11-T2 | Selective visual baselines/review | latest-source artifact `9018358358`; eight selected P10 hashes unchanged | candidate complete |
| P11-T3 | Physical Android Chrome | physical checklist on exact deployed P11 build | blocked |
| P11-T4 | Physical iOS/Safari | physical checklist on exact deployed P11 build | blocked |
| P11-T5 | Affected production routes after T1–T4 | exact deployed P11 build + production evidence | blocked |
| P11-T6 | Limitations/lifecycle/maintenance ownership | reconciliation, memory, visual + physical records | candidate complete; merge pending |
| P11-T7 | Owner accepts/archives/closes superseded UI plan/issues | completed packet + issue disposition | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | evaluator | discovery | P0–P10 merge/production truth | P11 incomplete | inspect raw artifacts |
| 2026-08-08 | evaluator | implementer | implementing | P10 WebKit first-paint flake | physical unavailable | repair AppShell |
| 2026-08-08 | evaluator | implementer | implementing | `caf933...` raw Browser retry exposed demo persistence race | green job shell was insufficient | repair persistence owner |
| 2026-08-08 | implementer | evaluator | evaluating | `59490e...`: CI #2039, 94 Browser/0 flaky, 554 UI/0 flaky, 785 tests, security green, latest visuals zero-diff | evidence docs move head | finalize records and rerun exact-head |
| 2026-08-08 | evaluator | human_owner | owner_merge_checkpoint | PR #321 after final exact-head green | no preview/physical evidence | owner decides merge/deploy checkpoint |

### Current permission boundary

- Granted: P11 branch code/test/docs; read-only CI/Vercel inspection.
- Forbidden: direct `main`, merge, deployment trigger, provider configuration, database/Auth/RLS, production-data writes, branch/ruleset changes.
- Human approval required before: merge/deploying #321 or relaxing parent acceptance criteria.
- Stop condition: any new retry/flaky, financial/auth behavior change, or unexplained visual diff reopens evaluation.

## Evaluation

### Latest source-candidate evidence

Head `59490eaf7d739ec5838eca53d046590a4302ef92`:

- CI #2039 / `31245158440`: success.
- policy/project knowledge/static quality/lint/typecheck/build: success.
- unit/static-RLS: **785 passed / 0 failed**.
- database: correctly classified not required.
- Browser smoke: **94 passed / 0 failed / 0 flaky**, including the previously flaky Quick Capture persistence flow passing first attempt on Chromium desktop/mobile.
- Browser artifact: `9018297784`, `sha256:62bf778b664e596920ba9f0ee96edcc26a3cb177a95791ab70eee941781919ae`.
- Cross-device: **554 total / 427 passed / 127 intentional skips / 0 failed / 0 flaky**.
- UI artifact: `9018358358`, `sha256:de29f06b58593a81dcc4ca733f49bfa5f9c9e2fd2fd2c9cf7559a2167b035978`.
- CodeQL #1145 / `31245158435`: success.
- Secret-history #1145 / `31245158458`: success.
- CSS ownership remains one intentional legacy foundation import, zero `!important`, zero unauthorized document selectors.

This is exact source evidence before the final evidence-record commits. The resulting current head still needs its own protected rerun.

### Visual evidence

`docs/research/UI_PHASE_11_VISUAL_BASELINE_REVIEW_2026-08-08.md` is refreshed against the latest source candidate. The eight selected P10 screenshot SHA-256 values are all present unchanged in artifact `9018358358`; the reviewed stable UI remains zero-diff.

### Remaining limitations

- Browser emulation is not physical-device evidence.
- No usable physical Android or iOS/Safari device boundary exists in the current execution environment.
- PR #321 has no Vercel preview deployment; current production is P10.
- P11 must be owner-approved into an exact `READY` deployed build before physical checks can validate the fixes.
- P0–P11 therefore remains open.

## Delivery record

- Branch: `agent/ui-phase-11-final-acceptance`
- PR: #321
- Latest source candidate: `59490eaf7d739ec5838eca53d046590a4302ef92`
- Source exact evidence: CI #2039 / CodeQL #1145 / secret #1145 success
- Final documentation head: pending after this evidence update
- Current production: pre-P11 `main@a65f6f59167b894f9e538e5840e989e27250fdd4`, Vercel `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf` READY
- P11 preview deployment: none observed
- Physical-device acceptance: blocked
- Post-device production verification: blocked
- Merge/program archival: owner-only, pending