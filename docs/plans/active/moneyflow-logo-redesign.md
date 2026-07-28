# MoneyFlow logo redesign

**Status:** evaluating  
**Owner:** OpenAI agent  
**Issue/PR:** pending PR  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow uses one simple, scalable and product-appropriate identity across the public landing page, authentication shell, signed-in navigation and browser/PWA metadata. The new mark identifies a calm manual ledger without implying investment growth, bank connection, payments or financial advice.

## Repository reconnaissance

### Current behavior

- Landing, auth and app shell repeat the same brand structure: a rounded container with a CSS-drawn open ring and the `MoneyFlow` wordmark.
- The ring has been iterated before but remains a generic loading/refresh-like glyph without a strong connection to the product name.
- `src/app/layout.tsx` controls global identity CSS and metadata discovery.
- `src/app/manifest.ts` controls PWA name, colors and icon list.
- `docs/design/CALM_LEDGER_V2.md` controls current visual language and already requires one green accent, simple surfaces and no decorative AI/fintech effects.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/landing-page.tsx` and module CSS | Public combination mark and representative product preview | Reuse accessible structure; avoid a component rewrite for a decorative glyph. |
| `src/components/auth-form.tsx` and module CSS | Reversed logo on brand surface | Reuse existing accessible name and sizing. |
| `src/components/layout/app-shell.tsx` and module CSS | Daily signed-in identity | Reuse existing accessible name; keep logo compact. |
| `src/app/layout.tsx` | Shared global identity layer | Import the new logo construction once. |
| `src/app/icon.svg` | Browser/app icon | Add scalable canonical source. |
| `src/app/manifest.ts` | Installed-app identity | Align theme color, description and SVG icon discovery. |
| `docs/design/CALM_LEDGER_V2.md` | Visual authority | Reuse green tokens and anti-decoration rules. |

### Existing tests and constraints

- Static: `npm run check:knowledge`, lint, typecheck and build.
- Browser: landing, login/register and signed-in shell screenshots.
- Responsive: phone, tablet and desktop.
- Accessibility: adjacent accessible name remains; decorative mark stays hidden.
- Product: no copy or symbol may imply bank sync, investment growth or safe-to-spend advice.

### Similar implementation and recent history

- Commit `86eb5c1d23296264d5d703c09f9e4cf8bee92767` changed the earlier hollow ring into an open arc across landing, auth and app shell.
- The repeated DOM structure is consistent enough for a focused global identity layer without changing three component APIs.

### Open questions

- [x] Should the logo explain every finance function? No; identity and recognition are primary.
- [x] Should it use a wallet, coin, chart, arrow or đồng sign? No; those are generic and misposition MoneyFlow.
- [x] Should Apple visual styling be copied? No; only simplicity, recognizability, flexibility and craft are applied.
- [x] Should the product keep a combination mark? Yes; MoneyFlow is still building recognition, so the symbol normally appears with its name.

## Research

### Questions researched

1. What makes a logo usable rather than merely attractive?
2. What logo type best fits a young digital product?
3. What icon guidance transfers safely to a responsive web/PWA product?
4. Which finance-logo conventions conflict with MoneyFlow positioning?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Adobe, *How to design a logo* | 2026-07-28 | Strategy before decoration; explore, simplify, distinguish, test small/monochrome and preserve vector source. | General branding guidance; MoneyFlow product truth selects the concept. |
| Adobe, *What is a logo and how to create your own* | 2026-07-28 | Simplicity, scalability, memorability, consistency; combination mark is practical for a new brand. | Adobe Express context, but principles are medium-independent. |
| Apple HIG, *App icons* | 2026-07-28 | One clear idea, strong small-size geometry, minimal text, consistent variants. | Apple platform specifics are not copied; applicable icon principles are translated to web/PWA. |
| Apple HIG, *Design principles* | 2026-07-28 | Purpose, simplicity, familiarity, flexibility and craft as decision tools. | Product-quality criteria, not an Apple visual theme. |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Wallet/coin/đồng icon | Immediately reads as money | Generic, payment-like, literal and crowded at favicon size | Rejected |
| Arrow or rising chart | Communicates movement/growth | Implies investing, performance or advice that MoneyFlow does not provide | Rejected |
| Abstract open ring | Minimal and already present | Resembles loading/refresh and does not build name recognition | Rejected |
| M monogram in a stable container | Tied to the name, simple, scalable, works with wordmark and favicon | Must be optically weighted to avoid feeling generic | Selected |

### Research decision

Use a simple M-based combination mark. One continuous M construction suggests an understandable flow while remaining an identifier rather than a finance diagram. Preserve the existing green rounded container for continuity and small-size utility. Avoid arrows, currency imagery, gradients, 3D and UI screenshots.

## Specification

### Problem

The current open-ring symbol is visually generic and can be mistaken for loading, refresh or a partial status indicator. It does not create a memorable association with MoneyFlow and is not a complete app-icon source.

### User stories

- As a visitor, I can recognize MoneyFlow consistently on landing and auth surfaces.
- As a signed-in user, I see a compact mark that does not compete with financial information.
- As an installer/bookmark user, I can identify MoneyFlow from its browser or PWA icon.
- As a maintainer, I have a documented vector source and usage rules.

### Acceptance criteria

- [x] The mark is based on one clear M concept and contains no generic fintech imagery.
- [x] Landing, auth and app shell receive the same geometry without changing accessible labels.
- [x] A scalable `src/app/icon.svg` exists.
- [x] PWA theme/description/icon metadata align with current product truth.
- [x] Logo research and usage rules are documented.
- [ ] Static checks pass.
- [ ] Landing, auth and signed-in screenshots are reviewed at supported sizes and themes.
- [ ] Existing PNG PWA icons are regenerated from the approved vector before final merge if required by browser evidence.

### Required states

- Loading/empty/content/error: no behavior change.
- Long data: logo remains fixed-size and does not affect financial layouts.
- Mobile/tablet/desktop: navigation sizing remains component-owned.
- Accessibility: text link supplies the accessible name; decorative geometry remains hidden.
- Dark mode: existing surfaces and token contrast remain authoritative.

### Financial and security constraints

- No financial behavior, storage, RLS, calculation or API change.
- The logo must not imply bank connectivity, guaranteed growth or spending advice.

### Out of scope

- Renaming MoneyFlow.
- Changing the Calm Ledger color system.
- Redesigning navigation, landing copy or auth flows.
- Adding animated logo choreography.
- Trademark registration or legal clearance.

## Implementation plan

### Architecture fit

Keep component markup and accessible names stable. Add one global identity CSS layer that replaces only the repeated decorative glyph, add an App Router SVG icon source, align manifest metadata, and document the system.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/app/brand-logo.css` | Define the shared M geometry for existing brand wrappers and landing preview | One implementation across repeated surfaces with minimal component churn. |
| `src/app/layout.tsx` | Import the identity layer | Make the geometry available consistently. |
| `src/app/icon.svg` | Add canonical vector icon | Crisp favicon and reusable app-icon source. |
| `src/app/manifest.ts` | Align color, product description and SVG icon | Installed identity matches product truth. |
| `docs/design/MONEYFLOW_LOGO.md` | Record concept, sources, variants and misuse | Prevent drift and generic fintech redesigns. |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: CSS clip-path and SVG are supported in the current browser target; existing PNG icons remain as fallbacks.
- Rollback: revert the focused branch.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Monogram feels generic | Use one stable geometry, specific proportions and consistent brand container; evaluate screenshots and small-size recognition. |
| Global selector affects unrelated elements | Scope to existing MoneyFlow accessible brand links and the empty logo element inside the landing `role="img"` preview. |
| CSS Modules override the identity layer | Use higher-specificity selectors and verify computed styles in browser. |
| SVG support differs in installed PWA contexts | Keep existing PNG fallbacks; regenerate them if install testing requires it. |
| Forced-colors hides the mark | Provide a forced-colors override and retain text naming. |

### Verification plan

- Static: `npm run check:knowledge`, lint, typecheck, build.
- Unit/domain/database: no behavior change; existing gates should remain green.
- Browser flow: `/`, `/login`, `/register`, `/dashboard`.
- Responsive/visual: 320, 390, 768, 1366px; light/dark; 16–64px icon inspection.
- Production/manual: verify favicon refresh and installed manifest identity after merge/deploy.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Audit current repeated logo structure and product constraints | None | Landing/auth/app-shell/design docs | done |
| T2 | Research logo and app-icon principles | T1 | Source table and decisions | done |
| T3 | Define canonical concept and usage contract | T2 | `docs/design/MONEYFLOW_LOGO.md` | done |
| T4 | Implement shared glyph and SVG icon | T3 | CSS + `icon.svg` | done |
| T5 | Align root import and manifest metadata | T4 | layout/manifest diff | done |
| T6 | Run static and browser evidence | T4–T5 | CI/screenshots | todo |
| T7 | Evaluate and decide whether PNG PWA fallbacks must be regenerated | T6 | install/browser evidence | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| One clear M concept | CSS geometry and SVG source | pass |
| No generic fintech imagery | Design contract and implementation | pass |
| Shared landing/auth/app-shell identity | Scoped global selector matches existing accessible links | pending browser verification |
| Scalable app icon | `src/app/icon.svg` | pass |
| Current product metadata | Updated manifest description/color/icon | pass |
| Research and rules recorded | Logo contract and this work packet | pass |

### Review findings

- Correctness: implementation is presentation-only and preserves accessible naming.
- Security/ownership: no effect.
- UI/UX/accessibility: requires computed-style and screenshot review before merge.
- Maintainability: one geometry source avoids three separate CSS redraws, but selectors must be checked against compiled CSS.
- Scope compliance: logo identity only, plus correction of stale manifest description directly adjacent to the identity change.

### Remaining limitations

- No local runnable checkout was available in this environment.
- Generated browser screenshots and static checks remain pending CI/local execution.
- Trademark distinctiveness and legal clearance are outside this engineering/design pass.

## Delivery record

- Branch: `agent/moneyflow-logo-redesign`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: pending merge
