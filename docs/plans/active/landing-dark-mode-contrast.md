# Fix landing dark-mode contrast

**Status:** planned  
**Owner:** ChatGPT  
**Issue/PR:** pending  
**Last updated:** 2026-07-26

## Outcome

The public MoneyFlow landing page remains readable and visually coherent when the resolved theme is dark. The navigation, hero copy, trust chips, product preview, proof cards and downstream sections use dark-mode surfaces and text with sufficient contrast instead of combining a dark canvas with light-theme foreground colors.

## Repository reconnaissance

### Current behavior

- `src/app/layout.tsx` resolves the stored/system theme before paint by setting `data-theme` on `<html>`.
- `src/app/landing-refresh.css` contains a dark landing canvas plus later dark overrides for text and surfaces.
- Production evidence supplied by the owner shows the dark canvas taking effect while light-theme foreground styles remain visible in important landing content.
- Existing landing source tests only assert that refresh CSS is loaded and that responsive/motion selectors exist; they do not lock the dark-mode contract.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/app/landing-refresh.css` | Owns the public landing visual system | Change dark overrides only; avoid authenticated product styles |
| `src/lib/landing-refresh.test.ts` | Existing source-contract test for landing CSS | Extend with explicit dark-mode invariants |
| `src/app/layout.tsx` | Resolves `data-theme` before paint | Reuse; no behavior change |
| `src/components/landing-page.tsx` | Provides the landing class names and content hierarchy | Reuse; no copy or structural change |

### Existing tests and constraints

- Related unit tests: `src/lib/landing-refresh.test.ts`.
- Database/RLS tests: not affected.
- Browser tests: repository UI audit supports dark mode, but the public landing route is not explicitly guarded by the current source contract.
- Product/architecture rules: mobile-first, semantic tokens, dark mode as a designed system, WCAG AA contrast, no change to financial claims.

### Similar implementation and recent history

- Existing pattern to reuse: root `data-theme="dark"` selectors and global semantic color tokens.
- Relevant PRs: #59 repaired authenticated shell contrast; #71 added cross-device dark-mode auditing; neither specifically fixed the public landing regression.

### Open questions

- [x] Does this require product or financial behavior changes? No.
- [x] Does the theme resolver need replacement? No; the failure is isolated to the landing visual cascade.

## Research

Not required. This is an internal CSS regression with established repository tokens, theme behavior and acceptance rules.

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Force the landing page to light mode | Very small change | Breaks user preference and contradicts responsive light/dark scope | Rejected |
| Add isolated semantic dark overrides at the end of landing CSS | Predictable cascade, easy rollback, no component change | Must cover all affected public surfaces | Selected |
| Rewrite the landing CSS around tokens | Cleaner long term | Large unrelated visual diff and regression risk | Rejected |

### Research decision

Add a final, landing-scoped dark-mode contract that uses existing semantic tokens and explicit readable foregrounds. Lock it with source tests so later CSS layers cannot silently restore light foreground values.

## Specification

### Problem

Users whose system or saved theme resolves to dark can receive a landing page with a dark background but low-contrast or light-theme navigation, hero and card content. This makes the public entry point look broken and can block registration or demo exploration.

### User stories

- As a visitor using dark mode, I can read the landing navigation and hero immediately.
- As a visitor, I can distinguish cards, buttons and financial preview values without relying on a light background.
- As a maintainer, I have a regression contract that fails when the landing dark-mode selectors disappear.

### Acceptance criteria

- [ ] The dark landing root, navigation and content surfaces use dark semantic backgrounds and borders.
- [ ] Primary headings and body copy use readable dark-theme foreground tokens.
- [ ] Trust chips, proof cards, benefits, steps, audience cards and FAQ items remain distinguishable.
- [ ] The preview statistics, rows and footer do not retain light-only backgrounds or low-contrast text.
- [ ] Primary and secondary CTA hierarchy remains unchanged.
- [ ] Mobile and reduced-motion behavior remains unchanged.
- [ ] Source tests lock the final dark-mode contract.

### Required states

- Loading: static public page; unchanged.
- Empty/populated: static landing content; unchanged.
- Validation/error/recovery: not applicable.
- Long data / large VND: preview values remain tabular and visible; unchanged.
- Mobile/tablet/desktop: selectors remain landing-scoped and breakpoint-independent.
- Accessibility: text/background combinations use established dark semantic tokens and visible focus behavior remains global.

### Financial and security constraints

- No financial calculations, amounts or product claims change.
- Integer VND and transfer invariants remain intact.
- No ownership/RLS impact.

### Out of scope

- Redesigning the landing page.
- Changing theme persistence or user settings.
- Changing authenticated dashboard visuals.
- Adding new marketing copy or features.

## Implementation plan

### Architecture fit

The regression belongs to the public landing CSS layer because the root theme resolver already works and the component structure is correct. A final scoped contract in `landing-refresh.css` provides deterministic cascade ownership without leaking into authenticated routes.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/app/landing-refresh.css` | Add final dark-mode surface/text/CTA overrides for all landing regions | Ensure a complete, deterministic dark visual system |
| `src/lib/landing-refresh.test.ts` | Assert required final dark selectors/tokens and ordering marker | Prevent silent regression |
| `docs/plans/active/landing-dark-mode-contrast.md` | Record scope, evidence and delivery status | Required project workflow |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: CSS-only; current browsers already use the same tokens/selectors.
- Rollback: revert the final dark-mode contract and test assertions.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| A later CSS import overrides the fix | Keep the contract at the end of the final landing stylesheet and assert its marker/order |
| Dark rules accidentally affect the app shell | Prefix every selector with `[data-theme="dark"] .landing-page.lp-root` or descendants |
| CTA contrast becomes ambiguous | Preserve white primary CTA and bordered transparent secondary CTA inside the dark final band |
| Mobile layout regresses | Do not change dimensions, display or breakpoint declarations |

### Verification plan

- Static: `npm run check:knowledge`, lint, typecheck.
- Unit/domain: `npm run test` including the landing source contract.
- Database: no schema impact; CI remains authoritative.
- Browser flow: public landing in dark mode, registration and demo links visible.
- Responsive/visual: phone, tablet and desktop dark screenshots via existing UI audit/preview.
- Production/manual: verify `/` with dark preference after the exact merged deployment.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add landing-scoped final dark-mode contract | none | CSS diff | todo |
| T2 | Add dark-mode source regression assertions | T1 | passing unit test | todo |
| T3 | Open PR and run CI/browser evidence | T1, T2 | PR checks and artifacts | todo |
| T4 | Merge, deploy and verify production `/` | T3 | exact deployment verification | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Dark landing contract exists and is scoped | pending | pending |
| Source test prevents selector removal | pending | pending |
| Browser evidence across viewports | pending | pending |

### Review findings

- Correctness: pending.
- Security/ownership: no impact expected.
- UI/UX/accessibility: pending visual evidence.
- Maintainability/duplication: final contract intentionally centralizes dark landing overrides.
- Scope compliance: no structural or financial behavior changes planned.

### Remaining limitations

- Physical-device verification remains required before claiming device readiness.

## Delivery record

- Branch: `fix/landing-dark-mode-contrast`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: no
