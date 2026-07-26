# Landing dark contrast regression

**Status:** implementing  
**Owner:** AI agent with human product owner  
**Issue/PR:** user screenshot on 2026-07-26 / PR #79  
**Last updated:** 2026-07-26

## Outcome

Restore a readable, visually coherent dark landing page from navigation through footer and add executable contrast checks so a CI-green deployment cannot ship nearly invisible product copy again.

## Repository reconnaissance

### Current behavior

- The production screenshot at `mfvn.vercel.app` showed the first hero line and lead text blending into the dark background.
- Navigation and trust surfaces remained light while the page background was dark, creating an inconsistent mixed-theme result.
- The first product preview was pushed below the initial viewport by generous desktop hero spacing.
- Existing responsive audit checked overflow, clipping, focus and loading states, but not text/background contrast.
- The first corrected full-page artifact proved the hero fix worked, then exposed the same cascade defect below the fold: section headings, supporting copy, FAQ, final CTA and footer were still too dark or rendered as mismatched light surfaces.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/landing-page.tsx` | Landing structure and selectors | Reuse; no copy or product promise change |
| `src/app/landing-refresh.css` | Existing landing visual system | Preserve; add a final scoped guardrail layer |
| `src/app/layout.tsx` | Global stylesheet order | Import guardrail last |
| `e2e/global-pfm-ux.spec.ts` | Product-level browser assertions | Add computed page-wide contrast checks |
| `e2e/audit/*` | Existing responsive evidence | Reuse unchanged |

### Existing tests and constraints

- Landing remains part of the cross-device route audit.
- UI changes require desktop/mobile/dark screenshot evidence.
- No finance logic, product copy, schema, auth or runtime mode changes.
- The final CSS must be scoped to `.landing-page.lp-root` and dark theme only, except for desktop spacing corrections.

### Similar implementation and recent history

- PR #76 established screenshot review as a required loop and added final guardrail CSS for discovered visual failures.
- The supplied production screenshot is evidence that invariant-only CI does not cover perceived readability.
- CI run `30208626457` passed the initial hero contrast gate and full responsive matrix, while human review of its full-page artifact found the remaining lower-page defects. This confirms code checks and visual review serve different purposes.

### Open questions

- [x] Is the issue a product-copy problem? No; the copy is correct but visually unreadable.
- [x] Should the full landing design be rebuilt? No; apply explicit final-state colors to the existing structure.
- [x] Is a hero-only patch enough? No; full-page artifact review disproved that assumption.

## Research

Not required. This is a screenshot-confirmed regression inside the existing design system. WCAG contrast thresholds are already a stable project accessibility constraint; the change adds browser calculations rather than introducing new product behavior.

## Specification

### Problem

A logged-out visitor using dark theme cannot reliably read important landing content. Mixed light/dark surfaces make the page look broken, and automated audits previously allowed the failure because they did not measure computed contrast.

### User stories

- As a visitor in dark theme, I can read the proposition, section headings, supporting copy, FAQ, final call to action and footer.
- As the project owner, I get a failing browser test when critical landing text falls below minimum contrast.
- As a desktop visitor, I can see enough of the product preview in the first viewport to understand the product.
- As a reviewer, I can inspect one full-page dark screenshot and verify that automated ratios also produce a coherent page rather than isolated compliant elements.

### Acceptance criteria

- [ ] Dark hero title contrast is at least 7:1 against the declared canvas.
- [ ] Dark lead, navigation brand and primary actions have contrast of at least 4.5:1.
- [ ] Section headings have contrast of at least 7:1; supporting copy has at least 4.5:1.
- [ ] Feature-card titles/copy and FAQ summary/copy meet their contrast thresholds against declared card surfaces.
- [ ] Final CTA heading/copy/action meet their thresholds against an explicit dark-green surface.
- [ ] Footer brand, links and copyright copy meet their thresholds against an explicit dark footer surface.
- [ ] Navigation, badges, chips, cards, FAQ and footer use coherent dark surfaces instead of mixed light surfaces.
- [ ] Desktop hero spacing exposes more of the product preview without changing mobile rules.
- [ ] Existing browser smoke and responsive audit remain green.
- [ ] Full-page dark desktop artifact is visually reviewed after all automated gates pass.

### Required states

- Loading: unchanged.
- Empty/populated: landing is static.
- Validation/error: not applicable.
- Recovery/undo: revert the focused CSS/test PR.
- Long data / large VND: preview unchanged.
- Mobile/tablet/desktop: desktop rhythm changes only at `min-width: 901px`; existing mobile layout preserved.
- Accessibility: computed WCAG contrast checks cover representative elements from navigation through footer.

### Financial and security constraints

- No financial calculations or recommendations change.
- No auth, RLS, credentials or deployment configuration changes.

### Out of scope

- Rewriting landing copy.
- Reordering or structurally redesigning landing sections.
- Changing authenticated product pages.
- Adding a screenshot-diff service.

## Implementation plan

### Architecture fit

A final landing-only stylesheet imported after all existing layers is the safest correction because the failure is in the final cascade. A browser test measures resulting computed styles rather than assuming a source declaration wins. Full-page artifact review remains required because valid individual ratios do not guarantee coherent visual hierarchy.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/app/landing-contrast-guardrails.css` | Add explicit dark surfaces, text colors and desktop rhythm from nav through footer | Correct final rendered state without broad refactor |
| `src/app/layout.tsx` | Import guardrail last | Guarantee intended cascade boundary |
| `e2e/global-pfm-ux.spec.ts` | Measure representative computed contrast and surface luminance across the page | Prevent invisible or mixed-surface regressions |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: CSS and browser-test only.
- Rollback: revert the squash commit.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Exact color assertions become brittle | Test contrast ratios and surface luminance, not exact hex values |
| Gradient background makes contrast unknowable | Declare solid fallback background colors used by the calculation |
| Mobile spacing regresses | Limit rhythm changes to desktop and run the existing viewport matrix |
| Later global CSS overrides the fix | Import the scoped guardrail last and test computed styles |
| Hero passes while the lower page remains unreadable | Measure sections/cards/FAQ/CTA/footer and review a full-page artifact |
| Synthetic CI route differs from authenticated/demo routing | Load the production CSS bundle on a stable public route and synchronously mount representative real class structures |

### Verification plan

- Static: knowledge contract, lint, typecheck.
- Unit/domain: existing suite unchanged.
- Database: existing pgTAP unchanged and expected green.
- Browser flow: page-wide contrast test plus existing smoke.
- Responsive/visual: full audit and review dark desktop/mobile screenshots.
- Production/manual: compare the same landing viewport after deployment.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add scoped dark landing guardrails from nav through footer | none | computed styles and artifact | done |
| T2 | Add page-wide contrast-ratio browser test | T1 | Playwright | done |
| T3 | Run full CI and review final full-page screenshot artifact | T2 | CI/artifact | in progress |
| T4 | Merge, verify production and archive packet | T3 | deployment record | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Hero and first viewport are readable | CI run `30208626457` + dark desktop artifact | passed |
| Lower-page hierarchy is readable | expanded contrast gate + next full-page artifact | pending |
| Existing quality gates remain green | next GitHub Actions run | pending |

### Review findings

- Correctness: initial hero implementation passed its computed gate and full CI.
- Security/ownership: no data or authorization change.
- UI/UX/accessibility: first production screenshot found the hero defect; first corrected artifact found the page-wide continuation of the same defect.
- Maintainability/duplication: one final guardrail layer preserves the existing landing implementation instead of rewriting the large stylesheet.
- Scope compliance: landing presentation and browser verification only.

### Remaining limitations

- Automated contrast checks cover representative critical selectors, not every decorative element.
- Physical display calibration and browser extensions can still alter perceived color.
- Gradient text is reviewed visually; the gate measures the solid primary title and surrounding copy.

## Delivery record

- Branch: `fix/landing-dark-contrast`
- PR: #79
- Squash commit: pending
- CI runs: `30208626457` initial hero pass; final page-wide run pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: pending
