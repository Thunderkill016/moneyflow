# MoneyFlow UI-system Phase 9 — public and authentication cleanup

**Status:** active
**Execution state:** evaluating
**Active role:** ci_or_production
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `8b97566a9bb70228ea5593d545660900aa626efb`
**Branch:** `agent/ui-phase-9-public-auth`
**Pull request:** #318
**Last updated:** 2026-08-07

The owner instructed **“Thôi làm xong kế hoạch này đi đã”** after confirming the parent program is P0–P11. This authorizes remaining UI-migration implementation on focused branches and pull requests. It does not authorize merge, production deployment, provider writes, production-data access or branch/ruleset changes.

## Repository reconnaissance

Current `main@8b97566a9bb70228ea5593d545660900aa626efb` established:

- `LandingPage` owns composition through `landing-page.module.css` plus `public-brand-theme.module.css`;
- `AuthForm` owns login/register/forgot/update presentation through `auth-form.module.css` plus `public-brand-theme.module.css`;
- `public-brand-theme.module.css` is Fresh Blue and `color-scheme: light` for public entry surfaces;
- root theme bootstrap resolves `/`, `/landing`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/privacy` and `/auth/*` to light;
- `landing-refresh.css`, `landing-dark-mode-guardrails.css` and `auth-refresh.css` were stale public generations with no current root import;
- `auth-form.module.css` still contained obsolete green raw variables and dark-theme selectors even though the semantic public theme overrode them;
- landing header hid Login below 680px and lowered Register to a 42px target;
- auth inputs already used `autocomplete` purposes and did not intentionally block paste.

## Research

### Research scope and source selection

Repository truth was inspected first. External research was limited to three official sources needed to confirm unresolved implementation/evidence questions.

| Source | Authority/type | Applied decision | Limit |
|---|---|---|---|
| W3C WAI — WCAG 2.2 SC 3.3.8 Accessible Authentication | accessibility guidance | preserve password-manager/autofill recognition and copy/paste; do not introduce paste blocking | does not prescribe MoneyFlow visual composition |
| Next.js official CSS guidance | framework documentation | keep component presentation locally scoped and retire unreferenced global generations | does not prove a specific selector is dead |
| Playwright official emulation/Android documentation | test framework documentation | use Chromium/WebKit device projects as automated evidence but keep physical-device acceptance separate | emulation is not a physical-device pass |

### Adoption review

No new dependency, provider, token generator, design tool or hosted visual service is adopted. Existing CSS Modules, semantic theme authority and Playwright harness remain sufficient.

## Specification

### Outcome

Landing and authentication preserve the selected Guided Story/Fresh Blue public direction while source ownership matches rendered truth: public routes are light-only, stale green/dark generations are removed, mobile entry actions remain reachable, authentication keeps password-manager/copy-paste support, and auth/security semantics do not change.

### Preserved product direction

- Guided Story landing structure remains selected; Phase 9 is cleanup, not a new conversion redesign.
- Fresh Blue semantic public theme remains the color authority.
- Public routes remain light-only.
- Current truthful claims, real test-environment imagery, media dimensions and public performance budgets remain intact.
- Authentication actions, Supabase/OAuth/CAPTCHA behavior, redirect semantics, validation rules and recovery behavior remain unchanged.

### Acceptance criteria

- P9-AC1: Landing exposes reachable Login and Register entry paths across 320–980px without horizontal overflow; important header actions meet the 44px MoneyFlow target.
- P9-AC2: obsolete public global generation files are deleted and cannot silently become current authority again.
- P9-AC3: auth presentation contains no public dark-mode branch or retired green brand palette; the current semantic public theme owns colors.
- P9-AC4: login/register/recovery/update retain labels, correct autocomplete purposes, CAPTCHA/OAuth paths and copy/paste/password-manager compatibility.
- P9-AC5: Guided Story content, truthful claims, image dimensions, public light-only contract and reduced-motion behavior remain intact.
- P9-AC6: exact-head policy/static/unit/build/browser/cross-device/security evidence is green before owner review.

## Implementation plan

1. Lock source contracts so retired public generations cannot reappear unnoticed.
2. Reconcile Landing mobile header geometry while preserving one primary action.
3. Align AuthForm presentation with semantic public roles only; do not modify auth actions.
4. Delete stale Landing/Auth global generations and shrink the document-selector allowlist.
5. Add focused browser evidence for public-light behavior and mobile action reachability.
6. Run exact-head Class 2 UI gates plus protected CodeQL/secret-history.
7. Record PR memory and candidate status honestly; merge remains owner-only.

### Implemented slices

- Landing keeps `Đăng nhập` and `Tạo sổ` visible in supported responsive projects;
- both public header actions have a 44px minimum target;
- narrowest header compacts the visible wordmark instead of removing Login;
- Auth CSS now consumes semantic `--auth-*` roles without a public dark branch or green fallback palette;
- stale `landing-refresh.css`, `landing-dark-mode-guardrails.css` and `auth-refresh.css` are deleted;
- CSS ownership fails if those retired generations are restored;
- source tests lock Guided Story, light-only public theme, autocomplete and absence of paste blocking;
- Playwright coverage checks Landing entry geometry and public Auth form semantics.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P9-T1 | Preserve Guided Story as cleanup direction | current design authority + this packet | done |
| P9-T2 | Reconcile Landing Login/Register behavior 320–980 | source + browser/cross-device | implemented; exact-head evidence pending |
| P9-T3 | Remove stale Landing generation files | deletion + ownership contract | done |
| P9-T4 | Remove stale Auth palette/dark ownership | source contract + browser evidence | implemented; exact-head evidence pending |
| P9-T5 | Verify auth modes/CAPTCHA/password-manager/paste/recovery | source + browser evidence | implemented; exact-head evidence pending |
| P9-T6 | Preserve claims/media/performance contracts | existing + focused tests | implemented; exact-head evidence pending |
| P9-T7 | Owner reviews public/auth surfaces | final exact-head evidence | blocked on verification |

## Evaluation

### Current findings

1. The retired public generation files were not imported by the current root layout, so deletion removes conflicting source history rather than switching the runtime owner.
2. Auth semantic public variables already overrode the old raw green/dark fallbacks; deleting those fallback branches makes source match rendered truth.
3. The Landing breakpoint was a real ownership inconsistency: the secondary Login path disappeared while the primary Register target dropped below the 44px product target.
4. Password-manager/autocomplete support already existed; Phase 9 protects it rather than inventing a new auth mechanism.
5. The first full ready-for-review run correctly rejected incomplete work-packet/PR-memory governance markers. The packet now contains all required headings, and PR memory uses the candidate/no-snapshot contract.

### Verification selection

Required before final Phase 9 owner review:

- `npm run check:knowledge`
- `npm run test:ci-policy`
- `npm run check:deployment-env`
- `npm run check:css-ownership`
- `npm run check:architecture`
- lint, typecheck, complete unit/static-RLS suite and production build
- Browser smoke and affected public/auth flows
- selected Chromium/WebKit cross-device UI audit
- protected CodeQL and secret-history workflows

Database reset/pgTAP is not required unless classification discovers a database boundary.

### Evidence boundary

Automated Chromium/WebKit device projects are responsive/cross-browser evidence, not physical Android/iOS acceptance. P11 remains responsible for physical-device and post-merge production acceptance.

### Risks and rollback

- Mobile crowding: verify 320/360/390 and intermediate widths; compact secondary presentation before hiding an entry path.
- Accidental auth behavior change: Phase 9 does not edit auth actions/provider code.
- Wrong dead-CSS deletion: only three proven-unimported public generations are deleted here; broad legacy retirement remains P10.
- Rollback: revert PR #318. No schema/data/provider rollback is required.

## Delivery record

- Branch: `agent/ui-phase-9-public-auth`
- PR: #318
- First full run: policy failed on governance markers before final evidence; not claimed as implementation acceptance
- Exact-head CI: pending refreshed head
- CodeQL: pending refreshed head
- Secret-history: pending refreshed head
- Merge: owner-only
- Production verification: not applicable before merge
