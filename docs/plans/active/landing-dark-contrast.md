# Landing dark contrast regression

**Status:** implementing  
**Owner:** AI agent with human product owner  
**Issue/PR:** user screenshot on 2026-07-26  
**Last updated:** 2026-07-26

## Outcome

Restore a readable, visually coherent dark landing hero on desktop and add an executable contrast check so a CI-green deployment cannot ship nearly invisible primary copy again.

## Repository reconnaissance

### Current behavior

- The production screenshot at `mfvn.vercel.app` shows the first hero line and lead text blending into the dark background.
- Navigation and trust surfaces remain light while the page background is dark, creating an inconsistent mixed-theme result.
- The first product preview is pushed below the initial viewport by generous desktop hero spacing.
- Existing responsive audit checks overflow, clipping, focus and loading states, but not text/background contrast.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/landing-page.tsx` | Landing structure and selectors | Reuse; no copy or product promise change |
| `src/app/landing-refresh.css` | Existing landing visual system | Preserve; add a final scoped guardrail layer |
| `src/app/layout.tsx` | Global stylesheet order | Import guardrail last |
| `e2e/global-pfm-ux.spec.ts` | Product-level browser assertions | Add dark landing contrast check |
| `e2e/audit/*` | Existing responsive evidence | Reuse unchanged |

### Existing tests and constraints

- Landing remains part of the cross-device route audit.
- UI changes require desktop/mobile/dark screenshot evidence.
- No finance logic, product copy, schema, auth or runtime mode changes.
- The final CSS must be scoped to `.landing-page.lp-root` and dark theme only, except for desktop spacing corrections.

### Similar implementation and recent history

- PR #76 established screenshot review as a required loop and added final guardrail CSS for discovered visual failures.
- The supplied screenshot is production evidence that invariant-only CI does not cover perceived readability.

### Open questions

- [x] Is the issue a product-copy problem? No; the copy is correct but visually unreadable.
- [x] Should the full landing design be rebuilt? No; apply the smallest coherent correction.

## Research

Not required. This is a screenshot-confirmed regression inside the existing design system. WCAG contrast thresholds are already a stable project accessibility constraint; the change adds a browser calculation rather than introducing new product behavior.

## Specification

### Problem

A logged-out visitor using dark theme cannot reliably read the primary landing message, while mixed light/dark surfaces make the page look broken. Automated audits currently allow this failure.

### User stories

- As a visitor in dark theme, I can read the headline, explanation and primary actions immediately.
- As the project owner, I get a failing browser test when core landing text falls below minimum contrast.
- As a desktop visitor, I can see enough of the product preview in the first viewport to understand the product.

### Acceptance criteria

- [ ] Dark hero title contrast is at least 7:1 against the declared hero background.
- [ ] Dark lead, navigation brand and primary CTA contrast are at least 4.5:1.
- [ ] Dark navigation, badge, trust chips and secondary CTA use coherent dark surfaces.
- [ ] Primary CTA text is explicitly readable in dark theme.
- [ ] Desktop hero vertical spacing exposes more of the product preview without changing mobile rules.
- [ ] Existing browser smoke and responsive audit remain green.

### Required states

- Loading: unchanged.
- Empty/populated: landing is static.
- Validation/error: not applicable.
- Recovery/undo: revert the focused CSS/test PR.
- Long data / large VND: preview unchanged.
- Mobile/tablet/desktop: desktop rhythm changes only at `min-width: 901px`; existing mobile layout preserved.
- Accessibility: computed WCAG contrast check for core dark-theme elements.

### Financial and security constraints

- No financial calculations or recommendations change.
- No auth, RLS, credentials or deployment configuration changes.

### Out of scope

- Rewriting landing copy.
- Redesigning later landing sections.
- Changing authenticated product pages.
- Adding a screenshot-diff service.

## Implementation plan

### Architecture fit

A final landing-only stylesheet imported after all existing layers is the safest correction because the screenshot suggests a late cascade conflict. A browser test measures the resulting computed styles rather than assuming a source file wins the cascade.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/app/landing-contrast-guardrails.css` | Add explicit dark surfaces, text colors and desktop rhythm | Correct final rendered state without broad refactor |
| `src/app/layout.tsx` | Import guardrail last | Guarantee intended cascade boundary |
| `e2e/global-pfm-ux.spec.ts` | Add computed contrast assertions | Prevent invisible hero regression |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: CSS and browser-test only.
- Rollback: revert the squash commit.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Exact color assertions become brittle | Test contrast ratios and surface luminance, not exact hex values |
| Gradient background makes contrast unknowable | Declare a solid fallback background color used by the calculation |
| Mobile spacing regresses | Limit rhythm changes to desktop and run the existing viewport matrix |
| Later global CSS overrides the fix | Import the scoped guardrail last and test computed styles |

### Verification plan

- Static: knowledge contract, lint, typecheck.
- Unit/domain: existing suite unchanged.
- Database: existing pgTAP unchanged and expected green.
- Browser flow: new contrast test plus existing smoke.
- Responsive/visual: full audit and review dark desktop screenshot.
- Production/manual: compare the same landing viewport after deployment.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add scoped dark landing guardrails | none | computed styles | in progress |
| T2 | Add contrast-ratio browser test | T1 | Playwright | todo |
| T3 | Run full CI and review screenshot artifact | T2 | CI/artifact | todo |
| T4 | Merge, verify production and archive packet | T3 | deployment record | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Dark core copy is readable | pending Playwright contrast output | pending |
| Desktop first viewport hierarchy improves | pending screenshot review | pending |
| Existing gates remain green | pending CI | pending |

### Review findings

- Correctness: pending.
- Security/ownership: no data change.
- UI/UX/accessibility: screenshot-confirmed regression; focused dark-theme fix planned.
- Maintainability/duplication: one final guardrail layer, no rewrite of the 1,000-line landing stylesheet.
- Scope compliance: landing presentation and test only.

### Remaining limitations

- Automated contrast checks cover selected critical selectors, not every decorative element.
- Physical display calibration and browser extensions can still alter perceived color.

## Delivery record

- Branch: `fix/landing-dark-contrast`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: pending
