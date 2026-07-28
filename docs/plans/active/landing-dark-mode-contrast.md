# Fix landing dark-mode contrast

**Status:** evaluating  
**Owner:** ChatGPT  
**Issue/PR:** #80 (merged); an earlier attempt, #79, was closed unmerged and superseded by #80  
**Last updated:** 2026-07-28 — reconciled: this packet described the fix as `planned`/`todo` for every task after it had already shipped and merged as PR #80

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

- [x] The dark landing root, navigation and content surfaces use dark semantic backgrounds and borders — shipped as `landing-dark-mode-guardrails.css` (verified: 33 `[data-theme="dark"]` selectors scoped to `.landing-page.lp-root` in `src/app/landing-refresh.css`/the guardrail layer).
- [x] Primary headings and body copy use readable dark-theme foreground tokens — PR #80 evidence: "final desktop dark screenshot confirms readable hero, navigation, content cards, FAQ and final CTA."
- [x] Trust chips, proof cards, benefits, steps, audience cards and FAQ items remain distinguishable — same PR #80 screenshot evidence.
- [x] The preview statistics, rows and footer do not retain light-only backgrounds or low-contrast text — PR #80 fixed an uncovered final-CTA surface regression found during its own screenshot review before merge.
- [x] Primary and secondary CTA hierarchy remains unchanged — PR #80 scope boundary: "no component structure or marketing copy change."
- [x] Mobile and reduced-motion behavior remains unchanged — PR #80 scope boundary; unrelated selectors untouched.
- [x] Source tests lock the final dark-mode contract — `src/lib/landing-refresh.test.ts` asserts `documentTheme` matches `html[data-theme="dark"]` and asserts the guardrail import is present/ordered.

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
| T1 | Add landing-scoped final dark-mode contract | none | PR #80 CSS diff (`landing-dark-mode-guardrails.css`, +487/−1 across 5 files) | done |
| T2 | Add dark-mode source regression assertions | T1 | PR #80: 17 contrast-pair + dark-surface luminance Playwright assertions; `landing-refresh.test.ts` theme/import assertions | done |
| T3 | Open PR and run CI/browser evidence | T1, T2 | PR #80 final CI run `30209154930` — full matrix pass including dark computed-style contract | done |
| T4 | Merge, deploy and verify production `/` | T3 | Merged as `1ba77d05d9894ccd820f300d5bc743cd93d7d8b3`; Vercel reported success for that commit; a human re-opening `/` in dark mode on the exact production deployment is not yet recorded | merge/deploy done — manual production check still open |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Dark landing contract exists and is scoped | PR #80 diff, `[data-theme="dark"] .landing-page.lp-root` scoping (verified in current `src/app/landing-refresh.css`) | pass |
| Source test prevents selector removal | `src/lib/landing-refresh.test.ts` | pass |
| Browser evidence across viewports | PR #80 final CI run `30209154930` cross-device UI audit + reviewed dark screenshots | pass (CI/emulated); physical device still open |

### Review findings

- Correctness: PR #80 shipped and merged; scoped strictly to `.landing-page.lp-root`, no reported regression to authenticated screens.
- Security/ownership: no impact — confirmed by PR #80 scope boundaries (no auth/schema/RLS change).
- UI/UX/accessibility: CI-reviewed screenshots and computed-contrast assertions pass; a physical-device pass has not been recorded.
- Maintainability/duplication: final contract intentionally centralizes dark landing overrides in one guardrail layer.
- Scope compliance: PR #80 stayed within the planned CSS-only scope; no structural or financial behavior changed.

### Remaining limitations

- Physical-device verification remains required before claiming device readiness.
- A human has not yet re-opened the exact production deployment's `/` route in dark mode to close the loop on "production flow verified" (AGENTS.md §8) — Vercel's build-success status is not the same claim.
- 2026-07-28: a fresh local demo-build re-run of `critical-browser.audit.spec.ts`'s "landing dark mode keeps semantic text and surfaces readable" check passes on both `chromium-desktop-dark` and `chromium-phone-dark`. This is automated/emulated local evidence, not the production/physical-device check above — it does not close either open item, only reconfirms the fix hasn't regressed since PR #80 merged.

## Delivery record

- Branch: `fix/landing-dark-mode-contrast`
- PR: #80 (an earlier attempt, #79, was closed unmerged and superseded by #80)
- Squash commit: `1ba77d05d9894ccd820f300d5bc743cd93d7d8b3`
- CI run: `30209154930` — full matrix pass
- Production deployment: Vercel reported a successful deployment status for the squash commit (per PR #80 body)
- Production flow verified: not yet — pending a human visiting the exact production deployment's `/` in dark mode
- Work packet moved to `docs/plans/completed/`: no — implementation, tests and CI are done, but production/physical verification is still open
