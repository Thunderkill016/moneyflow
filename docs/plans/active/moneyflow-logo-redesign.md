# MoneyFlow brand identity and logo delivery

**Status:** evaluating — owner approved; CI and browser/PWA evidence pending  
**Owner:** MoneyFlow / OpenAI agent  
**Issue/PR:** #106  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has a documented brand foundation and an owner-approved canonical logo v1.

The approved runtime identity is the M-based mark already implemented on this branch through:

- `src/app/brand-logo.css`;
- `src/app/icon.svg`;
- `src/app/layout.tsx`;
- `src/app/manifest.ts`.

It is used across the public landing page, authentication surfaces, signed-in shell, browser icon and PWA metadata without changing financial behavior.

## Repository reconnaissance

### Current behavior

- Landing, auth and app shell share the same accessible MoneyFlow brand structure.
- The previous open-ring glyph was generic and resembled loading or refresh.
- This branch replaces that glyph with one consistent M mark.
- `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` defines the cross-channel brand foundation.
- `docs/design/MONEYFLOW_LOGO.md` now defines the approved canonical logo contract.
- `docs/design/CALM_LEDGER_V2.md` remains the UI visual and interaction authority.

### Relevant repository areas

| Area | Role |
|---|---|
| `docs/product/PRINCIPLES.md` | Product and financial truth. |
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | Brand strategy, messaging, visual language and governance. |
| `docs/design/MONEYFLOW_LOGO.md` | Approved logo construction, variants and misuse rules. |
| `docs/design/CALM_LEDGER_V2.md` | Current UI visual and interaction authority. |
| `src/app/brand-logo.css` | Shared in-product M geometry. |
| `src/app/icon.svg` | Canonical app/favicon vector. |
| `src/app/manifest.ts` | Installed-app identity metadata. |

## Decision record

### Owner decision

On 2026-07-28, the owner explicitly approved applying the current M-based logo to the project and using it as the MoneyFlow logo.

### Selected concept

A simple M-based combination mark:

- tied directly to the product name;
- constructed as one continuous form;
- placed in a stable rounded container for compact contexts;
- free of arrows, charts, coins, wallets, currency signs and decorative effects.

### Rejected alternatives

| Direction | Reason |
|---|---|
| Generic open ring | Loading/refresh association. |
| M/F combination | Forced letter construction. |
| M plus ledger lines/chart | Literal icon illustration and template effect. |
| Stylized O/flow ring | Generic fintech/circulation symbol. |
| Golden-ratio flow ring | Geometry did not create a stronger brand idea. |
| Ribbon/gradient monogram | Trend-dependent and investment-tech feeling. |

## Specification

### User stories

- As a visitor, I can recognize MoneyFlow consistently on landing and auth surfaces.
- As a signed-in user, I see a compact identity that does not compete with financial information.
- As a bookmark/PWA user, I can identify MoneyFlow from its icon.
- As a maintainer, I have one documented canonical vector and usage contract.

### Acceptance criteria

- [x] Brand foundation, story, positioning, promise and personality are documented.
- [x] Messaging, claim boundaries, voice and Vietnamese UI writing rules are documented.
- [x] Color, typography, composition, iconography, imagery and motion are documented.
- [x] Brand guideline is linked from repository entrypoints.
- [x] Owner approved the M-based logo concept.
- [x] Canonical logo contract is updated from provisional to approved.
- [x] Landing, auth and app shell share the same mark implementation.
- [x] A scalable `src/app/icon.svg` exists.
- [x] PWA metadata aligns with current product truth.
- [ ] Knowledge, lint, typecheck and build checks pass.
- [ ] Browser screenshots are reviewed on phone/desktop and light/dark.
- [ ] 16, 24, 32, 64 and 512px identity inspection passes.
- [ ] Browser favicon and PWA manifest discovery are verified.
- [ ] Existing PNG fallbacks are regenerated if browser/install evidence requires it.

### Financial and product constraints

- No financial calculations, storage, API, database, RLS or transaction semantics change.
- VND and transfer behavior remain unchanged.
- The mark must not imply bank connectivity, investment growth, guaranteed outcomes or financial advice.
- Brand green remains distinct from semantic income/success color.

## Implementation

| File | Change |
|---|---|
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | Added brand strategy, messaging, visual rules, applications and governance. |
| `docs/design/MONEYFLOW_LOGO.md` | Defines canonical logo v1 and its release rules. |
| `README.md` | Links brand guidance. |
| `AGENTS.md` | Adds task-specific brand/logo read order. |
| `src/app/brand-logo.css` | Applies the M mark to repeated brand structures. |
| `src/app/icon.svg` | Supplies the canonical scalable icon. |
| `src/app/layout.tsx` | Loads the shared identity layer. |
| `src/app/manifest.ts` | Aligns installed-app identity and product description. |

## Risks and controls

| Risk | Control |
|---|---|
| M mark feels generic at small size | Inspect actual 16–64px raster results and product screenshots. |
| Global selector affects unrelated elements | Keep selectors scoped to current accessible MoneyFlow brand wrappers. |
| CSS and SVG geometry drift | Treat `src/app/icon.svg`, CSS and logo contract as one reviewed system. |
| Brand green is confused with income | Preserve separate semantic tokens and labels. |
| Identity ships without evidence | Keep PR unmerged until required CI/browser checks complete. |
| Trademark similarity is discovered later | Conduct reasonable pre-launch similarity screening before broad commercial promotion. |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Audit current identity and product constraints | Source docs/current implementation | done |
| T2 | Research logo and app-icon principles | Research table | done |
| T3 | Build MoneyFlow brand guideline | Brand guideline | done |
| T4 | Implement shared M identity | CSS/SVG/layout/manifest | done |
| T5 | Collect owner review | Conversation decision | done |
| T6 | Record explicit owner approval | Approved logo contract and this packet | done |
| T7 | Run static checks | CI | pending |
| T8 | Run browser/responsive identity review | Screenshots/artifacts | pending |
| T9 | Verify favicon/PWA and decide PNG fallbacks | Browser/install evidence | pending |
| T10 | Merge and verify production identity | PR/deployment record | pending |

## Evaluation

### Current result

| Area | Result |
|---|---|
| Brand strategy and story | pass |
| Messaging and voice | pass |
| Visual-system rules | pass |
| Logo concept | owner approved |
| Canonical runtime identity | implemented on branch |
| Static checks | pending |
| Browser/PWA evidence | pending |
| Production verification | pending merge |

### Review findings

- The identity is presentation-only and preserves existing accessible naming.
- The logo does not alter finance-domain behavior or user data.
- The brand guideline and logo contract now distinguish brand color from financial semantics.
- Approval does not replace engineering evidence; CI and actual browser/PWA inspection remain release gates.

## Delivery record

- Branch: `agent/moneyflow-logo-redesign`
- PR: #106
- Owner approval: confirmed 2026-07-28
- Approved logo: canonical M mark v1
- CI: pending after Ready for review transition
- Auto-merge: may be enabled after PR metadata is updated
- Production deployment: pending merge
- Work packet completion: pending CI, merge and production verification
