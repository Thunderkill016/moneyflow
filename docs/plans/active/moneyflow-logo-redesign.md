# MoneyFlow brand identity and logo delivery

**Status:** evaluating — owner approved; CI and browser/PWA evidence pending  
**Owner:** MoneyFlow / OpenAI agent  
**Issue/PR:** #106  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has a documented brand foundation and an owner-approved canonical logo v1.

The approved runtime identity is the M-based mark implemented through:

- `src/app/brand-logo.css`;
- `src/app/icon.svg`;
- `src/app/layout.tsx`;
- `src/app/manifest.ts`.

It is used across the public landing page, authentication surfaces, signed-in shell, browser icon and PWA metadata without changing financial behavior.

## Decision record

On 2026-07-28, the owner explicitly approved applying the current M-based logo to the project and using it as the MoneyFlow logo.

The selected identity:

- is tied directly to the product name;
- uses one continuous M construction;
- sits in a stable rounded container for compact contexts;
- avoids arrows, charts, coins, wallets, currency signs and decorative effects.

Rejected directions include the generic open ring, M/F combination, M plus ledger lines, stylized O/flow ring, golden-ratio ring and gradient ribbon monograms.

## Acceptance criteria

- [x] Brand foundation, story, positioning, promise and personality are documented.
- [x] Messaging, claim boundaries, voice and Vietnamese UI writing rules are documented.
- [x] Visual rules and product applications are documented.
- [x] Brand guideline and logo contract are linked from repository entrypoints.
- [x] Owner approved the M-based logo concept.
- [x] Canonical logo contract is approved.
- [x] Landing, auth and app shell share the same mark implementation.
- [x] A scalable `src/app/icon.svg` exists.
- [x] PWA metadata aligns with current product truth.
- [ ] Knowledge, lint, typecheck and build checks pass.
- [ ] Browser screenshots are reviewed on phone/desktop and light/dark.
- [ ] 16, 24, 32, 64 and 512px identity inspection passes.
- [ ] Browser favicon and PWA manifest discovery are verified.
- [ ] Existing PNG fallbacks are regenerated if browser/install evidence requires it.

## Product constraints

- No financial calculations, storage, API, database, RLS or transaction semantics change.
- VND and transfer behavior remain unchanged.
- The mark must not imply bank connectivity, investment growth, guaranteed outcomes or financial advice.
- Brand green remains distinct from semantic income/success color.

## Implementation

| File | Change |
|---|---|
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | Brand strategy, messaging, visual rules, applications and governance. |
| `docs/design/MONEYFLOW_LOGO.md` | Canonical logo v1 construction and release rules. |
| `README.md` | Links brand and canonical logo guidance. |
| `AGENTS.md` | Requires brand/logo read order. |
| `src/app/brand-logo.css` | Applies the M mark to repeated brand structures. |
| `src/app/icon.svg` | Supplies the canonical scalable icon. |
| `src/app/layout.tsx` | Loads the shared identity layer. |
| `src/app/manifest.ts` | Aligns installed-app identity and product description. |

## Risks and controls

| Risk | Control |
|---|---|
| Weak rendering at small size | Inspect actual 16–64px raster results and screenshots. |
| Global selector affects unrelated elements | Keep selectors scoped to MoneyFlow brand wrappers. |
| CSS/SVG geometry drift | Treat SVG, CSS and logo contract as one reviewed system. |
| Brand green confused with income | Preserve separate semantic tokens and labels. |
| Identity ships without evidence | Keep merge gated by required CI/browser checks. |
| Trademark similarity discovered later | Conduct reasonable pre-launch screening before broad promotion. |

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | Audit identity and product constraints | done |
| T2 | Research logo/app-icon principles | done |
| T3 | Build brand guideline | done |
| T4 | Implement shared M identity | done |
| T5 | Collect owner review | done |
| T6 | Record explicit owner approval | done |
| T7 | Run static checks | pending |
| T8 | Run browser/responsive review | pending |
| T9 | Verify favicon/PWA and PNG fallbacks | pending |
| T10 | Merge and verify production identity | pending |

## Delivery record

- Branch: `agent/moneyflow-logo-redesign`
- PR: #106
- Owner approval: confirmed 2026-07-28
- Approved logo: canonical M mark v1
- CI: pending Ready for review transition
- Production deployment: pending merge
- Work packet completion: pending CI, merge and production verification
