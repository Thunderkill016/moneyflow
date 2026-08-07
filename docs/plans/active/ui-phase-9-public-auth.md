# MoneyFlow UI-system Phase 9 — public and authentication cleanup

**Status:** active
**Execution state:** implementing
**Active role:** implementation
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `8b97566a9bb70228ea5593d545660900aa626efb`
**Branch:** `agent/ui-phase-9-public-auth`
**Pull request:** pending
**Last updated:** 2026-08-07

The owner instructed **“Thôi làm xong kế hoạch này đi đã”** after confirming the parent program is P0–P11. This authorizes the remaining UI-migration implementation on focused branches and pull requests. It does not authorize merge, production deployment, provider writes, production-data access or branch/ruleset changes.

## Outcome

Landing and authentication preserve the selected Guided Story/Fresh Blue public direction while source ownership matches rendered truth: public routes are light-only, stale green/dark generations are removed, mobile entry actions remain reachable at supported widths, authentication keeps password-manager/copy-paste support, and no auth/security semantics change.

## Repository reconnaissance

Current `main@8b97566a9bb70228ea5593d545660900aa626efb` establishes:

- `LandingPage` already owns its composition through `landing-page.module.css` plus `public-brand-theme.module.css`;
- `AuthForm` already owns login/register/forgot/update presentation through `auth-form.module.css` plus `public-brand-theme.module.css`;
- `public-brand-theme.module.css` is Fresh Blue and `color-scheme: light` for public entry surfaces;
- root theme bootstrap resolves `/`, `/landing`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/privacy` and `/auth/*` to light;
- `landing-refresh.css`, `landing-dark-mode-guardrails.css` and `auth-refresh.css` are stale public generations with no current root import;
- `auth-form.module.css` still contains obsolete green raw variables and dark-theme selectors even though the public semantic theme overrides them;
- landing header hides the Login action below 680px and lowers the register target to 42px;
- auth inputs already use `autocomplete` purposes and do not intentionally block paste.

## Focused research

| Source | Authority | Applied decision |
|---|---|---|
| W3C WAI, WCAG 2.2 SC 3.3.8 Accessible Authentication (Minimum) | accessibility standard guidance | keep password-manager/autofill recognition and copy/paste available; do not add paste blocking to password authentication |
| Next.js official CSS guidance | framework documentation | keep public presentation in locally scoped CSS Modules; remove unreferenced global generations rather than adding another override layer |
| Playwright official emulation/Android documentation | test framework documentation | automated phone/tablet projects remain emulation evidence; they do not satisfy P11 physical-device acceptance |

No new library, provider or hosted visual service is adopted.

## Specification

### Preserved product direction

- Guided Story landing structure remains selected; Phase 9 is cleanup, not a new conversion redesign.
- Fresh Blue semantic public theme remains the color authority.
- Public routes remain light-only.
- Current truthful claims, real test-environment imagery, media dimensions and public performance budgets remain intact.
- Authentication actions, Supabase/OAuth/CAPTCHA behavior, redirect semantics, validation rules and recovery behavior are unchanged.

### Acceptance criteria

- P9-AC1: landing exposes a reachable Login path and Register primary action across 320–980px without horizontal overflow; important header actions meet the 44px product target.
- P9-AC2: obsolete public global generation files are deleted and cannot silently become current authority again.
- P9-AC3: auth presentation contains no public dark-mode branch or retired green brand palette; current semantic theme owns colors.
- P9-AC4: login/register/recovery/update forms retain labels, correct autocomplete purposes, CAPTCHA/OAuth paths and copy/paste/password-manager compatibility.
- P9-AC5: Guided Story content, truthful claims, image dimensions, public light-only contract and reduced-motion behavior remain intact.
- P9-AC6: exact-head policy/static/unit/build/browser/cross-device/security evidence is green before owner review.

## Implementation plan

1. Add source contracts before/with cleanup so retired public generations cannot reappear unnoticed.
2. Reconcile landing mobile header action geometry while preserving one primary action.
3. Rebuild AuthForm presentation ownership on semantic public roles only; do not modify auth actions.
4. Delete stale landing/auth global generations and shrink the document-selector allowlist.
5. Add focused browser evidence for public-light behavior and mobile action reachability.
6. Run exact-head Class 2 UI gates plus protected CodeQL/secret-history.
7. Record PR memory and candidate status honestly; merge remains owner-only.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P9-T1 | Preserve Guided Story as cleanup direction | current design authority + this packet | done |
| P9-T2 | Reconcile landing Login/register behavior 320–980 | source contract + browser/cross-device | implementing |
| P9-T3 | Remove stale landing generation files | zero-import/source contract + diff | implementing |
| P9-T4 | Remove stale auth palette/dark ownership | source contract + computed/browser evidence | implementing |
| P9-T5 | Verify auth modes/CAPTCHA/password-manager/paste/recovery | source + browser evidence | implementing |
| P9-T6 | Preserve claims/media/performance contracts | existing + focused tests | implementing |
| P9-T7 | Owner review of public/auth surfaces | exact-head evidence | blocked on verification |

## Risks and rollback

- **Mobile header crowding:** verify 320, 360, 390 and intermediate widths; compact secondary action before hiding it.
- **Accidental auth behavior change:** Phase 9 does not edit auth actions/provider code; source contract locks autocomplete/OAuth/CAPTCHA behavior.
- **Stale global selector was secretly live:** root import/source contracts plus browser/cross-device evidence are required before deletion is accepted.
- **Visual drift from removing raw auth colors:** semantic `public-brand-theme.module.css` already owns the rendered values; browser evidence must prove the result.
- **Rollback:** revert this focused Phase 9 PR. No schema/data/provider rollback is required.

## Verification plan

- `npm run check:knowledge`
- `npm run test:ci-policy`
- `npm run check:deployment-env`
- `npm run check:css-ownership`
- `npm run check:architecture`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Browser smoke and affected public/auth flows
- `npm run test:ui-audit:pr`
- protected CodeQL and secret-history workflows

Database reset/pgTAP is not required unless the actual diff crosses a database boundary.

## Evidence boundary

Automated Chromium/WebKit device projects are responsive/cross-browser evidence, not physical Android/iOS acceptance. P11 remains responsible for physical-device and post-merge production acceptance.

## Delivery record

- Branch: `agent/ui-phase-9-public-auth`
- PR: pending
- Exact-head CI: pending
- CodeQL: pending
- Secret-history: pending
- Merge: not authorized to agent
- Production verification: not applicable before merge