# MoneyFlow UI Phase 11 — physical-device acceptance checklist

- **Created:** 2026-08-08
- **Status:** **BLOCKED — no physical Android/iOS device boundary is available in the current execution environment**
- **Candidate PR:** #321
- **Current production before P11 merge:** `main@a65f6f59167b894f9e538e5840e989e27250fdd4`, Vercel `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf` READY
- **Important sequencing:** Vercel currently creates production deployments for `main` and no preview deployment was observed for PR #321. Therefore physical-device testing of current production would test P10, not the P11 fix. Physical acceptance must target an owner-approved deployment containing the final P11 commit.

## Authority

The parent UI migration packet requires separate physical Android and physical iOS/Safari acceptance before affected production routes and the overall program can be closed. Chromium/WebKit device-project emulation is useful browser/device-parameter evidence, but it does not satisfy these physical-device tasks.

No waiver path is assumed here. If the parent acceptance criteria are ever changed, that requires an explicit owner decision and a corresponding parent-plan update; the agent must not silently weaken the gate.

## Preconditions

Do not execute or mark any physical row passed until all of these are true:

- [ ] PR #321 final exact head has green protected CI, CodeQL and secret-history checks.
- [ ] P11 selective visual review is accepted with no unresolved intentional visual diff.
- [ ] The owner authorizes the candidate to reach a deployable environment.
- [ ] Vercel reports `READY` for the exact deployed P11 commit being tested.
- [ ] The tested URL/commit pair is recorded below before the first device action.
- [ ] Test data is demo/synthetic or otherwise explicitly safe; no destructive experimentation on a real financial ledger.

## Exact deployed candidate

| Field | Value |
|---|---|
| Git commit | pending owner merge/deployment |
| Vercel deployment ID | pending |
| Tested URL | pending |
| Deployment state | pending |
| Verification timestamp | pending |

## Physical Android Chrome — P11-T3

### Device record

| Field | Evidence |
|---|---|
| Device model | pending |
| Android version | pending |
| Chrome version | pending |
| Viewport/orientation | pending |
| Test timestamp/timezone | pending |
| Evidence location | pending |

### Checklist

- [ ] Landing loads in Fresh Blue/light public mode with header actions reachable and no horizontal clipping.
- [ ] Login loads; email/password controls, CAPTCHA area and software keyboard do not hide the active field/action.
- [ ] Demo/safe workspace loads Dashboard with topbar and five-item bottom navigation visible.
- [ ] Dashboard content remains clear of the fixed bottom navigation at first paint and after scrolling to the end.
- [ ] Rotating portrait ↔ landscape does not strand navigation, content or active dialogs.
- [ ] Quick Capture opens; amount/category/account/date/note controls remain reachable with the software keyboard open.
- [ ] Transactions route supports add/edit and safe delete/undo evidence without clipped review/actions.
- [ ] Large VND values remain readable without destructive truncation/overlap.
- [ ] Accounts route keeps primary account action plus global capture action reachable.
- [ ] Reports route remains readable and navigable at device width.
- [ ] Settings/data-rights surfaces keep review actions reachable without fixed-nav overlap.
- [ ] Focus/scroll recovery after closing an overlay does not land behind fixed chrome.
- [ ] No unexplained console/runtime error or visible broken state is observed in the tested path.

### Result

**BLOCKED — no physical Android device has been supplied or connected to the current execution environment.**

## Physical iOS Safari — P11-T4

### Device record

| Field | Evidence |
|---|---|
| iPhone/iPad model | pending |
| iOS/iPadOS version | pending |
| Safari version | pending |
| Viewport/orientation | pending |
| Test timestamp/timezone | pending |
| Evidence location | pending |

### Checklist

- [ ] Landing loads in Fresh Blue/light public mode with header actions reachable and no horizontal clipping.
- [ ] Login loads; email/password controls, CAPTCHA area and software keyboard do not hide the active field/action.
- [ ] Demo/safe workspace loads Dashboard with correct top safe-area and five-item bottom navigation.
- [ ] Bottom navigation clears the home indicator/safe area and does not overlay the end of Dashboard content from first paint onward.
- [ ] Rotating portrait ↔ landscape preserves safe-area geometry and reachable navigation.
- [ ] Quick Capture remains usable with the Safari software keyboard open; focused fields and save/cancel actions remain reachable.
- [ ] Transactions add/edit/delete/undo path remains reachable and large VND values remain readable.
- [ ] Accounts, Reports and Settings retain reachable actions without clipping behind browser or application chrome.
- [ ] Native Safari back/forward and scroll restoration do not produce a stale hidden/overlapping AppShell state.
- [ ] Overlay Escape-equivalent close controls and focus recovery remain usable with touch/keyboard accessibility where applicable.
- [ ] No unexplained visible broken state is observed in the tested path.

### Result

**BLOCKED — no physical iOS/Safari device evidence is available in the current execution environment.**

## Post-device production journey — P11-T5

Only execute after both P11-T3 and P11-T4 pass on the exact deployed P11 commit.

- [ ] Landing → login/auth boundary.
- [ ] Onboarding/authenticated workspace path using an explicitly safe account or approved synthetic path.
- [ ] Dashboard stable with no shell overlap.
- [ ] Add transaction.
- [ ] Edit transaction.
- [ ] Delete/undo or equivalent reversible recovery path without destructive real-user experimentation.
- [ ] Accounts workspace.
- [ ] Reports workspace.
- [ ] Settings/data-rights surfaces.
- [ ] Verify production runtime/error telemetry for the inspected routes/time window.
- [ ] Record exact deployed SHA, Vercel deployment ID, route results and limitations.

### Result

**BLOCKED by P11-T3/P11-T4 and by the absence of a deployed P11 candidate.**

## Current evidence that does not satisfy the physical gate

- P11 Browser smoke on hosted CI: valuable automated evidence, not physical hardware evidence.
- P11 Chromium/WebKit cross-device audit: 554 scheduled / 427 pass / 127 intentional skips / 0 failed / 0 flaky, but still emulator/browser-engine evidence.
- Existing P10 production `READY` deployment: does not contain the P11 first-paint fix.
- Read-only HTTP 200/public-auth checks: valid production observations, but not the dependency-ordered physical-device journey required by the parent packet.

## Handoff

When physical devices become available, the next operator must first record the exact deployed P11 commit and deployment ID, then execute the Android checklist and iOS/Safari checklist without substituting emulation results. After both pass, P11-T5 production journey may proceed; only then can P11 and the parent P0–P11 migration be considered for final closure.