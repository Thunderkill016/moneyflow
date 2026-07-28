# MoneyFlow brand identity and logo delivery

**Status:** evaluating — owner approved; CI and browser/PWA evidence pending  
**Owner:** MoneyFlow / OpenAI agent  
**Issue/PR:** #106  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has a documented brand foundation and an owner-approved canonical logo v1.

The approved runtime identity uses:

- `src/app/icon.svg` as the canonical app/favicon vector;
- `src/app/ai-uiux-guardrails.css` as the existing compatibility boundary for repeated in-product brand wrappers;
- `src/app/manifest.ts` for PWA metadata.

It appears across the public landing page, authentication surfaces, signed-in shell, browser icon and PWA metadata without changing financial behavior.

## Repository reconnaissance

### Current identity

- Landing, auth and the signed-in shell share the same accessible MoneyFlow brand structure.
- The earlier open-ring glyph resembled loading or refresh.
- This branch replaces it with one shared M mark.
- `src/app/icon.svg` is the canonical scalable icon source.
- The repository CSS ownership contract allows exactly two root imports and freezes `legacy.css` as a compatibility boundary.
- The M geometry therefore lives in the already-imported `src/app/ai-uiux-guardrails.css` until the repeated wrappers are migrated to a shared component.
- `src/app/manifest.ts` points installed-app metadata at the SVG with PNG fallbacks retained.

### Sources of truth

| Area | Source |
|---|---|
| Product and financial truth | `docs/product/PRINCIPLES.md` |
| Brand foundation | `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` |
| Canonical logo | `docs/design/MONEYFLOW_LOGO.md` |
| UI visual contract | `docs/design/CALM_LEDGER_V2.md` |
| Tokens/components | `docs/design-system.md` |

### Constraints

- No financial calculations, storage, API, database, RLS or transaction semantics change.
- VND and transfer behavior remain unchanged.
- Brand green remains distinct from semantic income/success color.
- The mark must not imply bank connectivity, investment growth, guaranteed outcomes or financial advice.
- Root CSS imports and the frozen legacy import list may not expand without a separate architecture change.

## Research

### Questions

1. What identity can remain clear in landing, auth, navigation, favicon and PWA contexts?
2. Which finance-logo conventions misrepresent MoneyFlow as investment, payments or advice software?
3. Which Apple and general logo principles transfer safely without copying Apple styling?
4. How should a young brand govern symbol, wordmark and app-icon sources?
5. How can the identity be applied without violating CSS ownership guardrails?

### Evidence and decisions

- Adobe guidance supports strategy before decoration, one clear idea, monochrome testing, small-size testing and vector delivery.
- Apple HIG supports purposeful simplicity, recognizable geometry and consistent appearances; Apple visual styling is not copied.
- Owner feedback rejected generic open rings, forced M/F/O combinations, ledger-line illustrations, golden-ratio justification and gradient ribbon marks.
- The owner explicitly approved the current M-based logo on 2026-07-28.
- CI run #439 showed that a new root-global `brand-logo.css` violates repository CSS ownership.
- The implementation was moved into the existing `ai-uiux-guardrails.css` compatibility boundary and the extra root import/file were removed.

### Selected concept

A simple M-based combination mark:

- tied directly to the product name;
- built as one continuous form;
- placed in a stable rounded container for compact contexts;
- free of arrows, charts, coins, wallets, currency signs and decorative effects.

### Rejected alternatives

| Direction | Reason |
|---|---|
| Generic open ring | Loading/refresh association. |
| M/F combination | Forced construction and poor legibility. |
| M plus ledger lines/chart | Literal template-like illustration. |
| Stylized O/flow ring | Generic fintech/circulation association. |
| Golden-ratio flow ring | Geometry did not create a stronger brand idea. |
| Ribbon/gradient monogram | Trend-dependent and investment-tech feeling. |

## Specification

### User stories

- As a visitor, I can recognize MoneyFlow consistently on landing and auth surfaces.
- As a signed-in user, I see a compact identity that does not compete with financial information.
- As a bookmark or installed-app user, I can identify MoneyFlow from its icon.
- As a maintainer, I have one documented canonical vector and usage contract.

### Acceptance criteria

- [x] Brand foundation, story, positioning, promise and personality are documented.
- [x] Messaging, claim boundaries, voice and Vietnamese UI writing rules are documented.
- [x] Visual rules and product applications are documented.
- [x] Brand guideline and logo contract are linked from repository entrypoints.
- [x] Owner approved the M-based logo concept.
- [x] Canonical logo contract is approved.
- [x] Landing, auth and app shell receive the same mark geometry.
- [x] A scalable `src/app/icon.svg` exists.
- [x] PWA metadata aligns with current product truth.
- [x] Project knowledge contract passes after restoring required headings.
- [x] Extra root-global logo stylesheet is removed.
- [ ] Deployment, CSS ownership, lint, typecheck, tests and build pass on the final head.
- [ ] Browser screenshots are reviewed on phone/desktop and light/dark.
- [ ] 16, 24, 32, 64 and 512px identity inspection passes.
- [ ] Browser favicon and PWA manifest discovery are verified.
- [ ] Existing PNG fallbacks are regenerated if browser/install evidence requires it.

### Out of scope

- Financial-domain changes.
- Navigation or feature redesign.
- Bank sync, investment, advice or AI claims.
- Formal trademark registration or legal opinion.
- Animated logo choreography.
- Refactoring the three existing brand wrappers into a new shared component in this identity slice.

## Implementation plan

### Implemented files

| File | Change |
|---|---|
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | Brand strategy, messaging, visual rules, applications and governance. |
| `docs/design/MONEYFLOW_LOGO.md` | Canonical logo v1 construction and release rules. |
| `README.md` | Links brand and canonical logo guidance. |
| `AGENTS.md` | Requires brand/logo read order. |
| `src/app/ai-uiux-guardrails.css` | Applies the M mark inside the existing frozen compatibility boundary. |
| `src/app/icon.svg` | Supplies the canonical scalable icon. |
| `src/app/manifest.ts` | Aligns installed-app identity and product description. |

### CSS ownership decision

The initial branch added `src/app/brand-logo.css` as a third root stylesheet. CI correctly rejected that architecture because `src/app/layout.tsx` must import exactly `legacy.css` and `document-theme.css`.

The final implementation:

1. removes the third root import;
2. deletes `src/app/brand-logo.css`;
3. places the shared compatibility selectors in the existing `ai-uiux-guardrails.css`, already reached through frozen `legacy.css`;
4. documents a future shared-component migration instead of silently expanding global ownership.

### Verification plan

1. Run `npm run check:knowledge`.
2. Run deployment and CSS ownership contracts.
3. Run lint, typecheck, unit/static-RLS checks and production build.
4. Run database tests as required by repository CI.
5. Capture landing, auth and signed-in identity evidence on supported phone/desktop and light/dark targets.
6. Inspect the symbol at 16, 24, 32, 64 and 512px.
7. Verify browser favicon and PWA manifest discovery.
8. Regenerate PNG fallbacks only if install/browser evidence shows they are required.

### Risks and controls

| Risk | Control |
|---|---|
| Weak rendering at small size | Inspect actual raster results and screenshots. |
| Compatibility selector affects unrelated elements | Scope selectors to accessible MoneyFlow brand wrappers and the landing preview. |
| CSS/SVG geometry drift | Treat SVG, compatibility CSS and logo contract as one reviewed system. |
| Compatibility debt becomes permanent | Record the shared-component migration as future cleanup; do not add another root owner. |
| Brand green is confused with income | Preserve separate semantic tokens and labels. |
| Identity ships without evidence | Keep merge gated by required CI/browser checks. |
| Trademark similarity appears later | Conduct reasonable pre-launch screening before broad promotion. |

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | Audit identity and product constraints | done |
| T2 | Research logo/app-icon principles | done |
| T3 | Build brand guideline | done |
| T4 | Implement shared M identity | done |
| T5 | Collect owner review | done |
| T6 | Record explicit owner approval | done |
| T7 | Restore required work-packet headings | done |
| T8 | Fix CSS ownership violation | done |
| T9 | Run final static and database checks | pending |
| T10 | Run browser/responsive identity review | pending |
| T11 | Verify favicon/PWA and PNG fallbacks | pending |
| T12 | Merge and verify production identity | pending |

## Evaluation

### Current result

| Area | Result |
|---|---|
| Brand strategy and story | pass |
| Messaging and voice | pass |
| Visual-system rules | pass |
| Logo concept | owner approved |
| Canonical vector identity | implemented |
| Project knowledge contract | pass on run #439 |
| CSS ownership | initial fail; corrective commit applied, rerun pending |
| Remaining static/database checks | pending final CI |
| Browser/PWA evidence | pending |
| Production verification | pending merge |

### Review findings

- The identity is presentation-only and preserves existing accessible naming.
- The logo does not alter finance-domain behavior or user data.
- Brand guidelines distinguish brand color from financial semantic colors.
- The repository guardrail correctly prevented a new global CSS owner.
- Owner approval does not replace engineering evidence; CI and browser/PWA inspection remain release gates.

### Delivery record

- Branch: `agent/moneyflow-logo-redesign`
- PR: #106
- Owner approval: confirmed 2026-07-28
- Approved logo: canonical M mark v1
- CI: final rerun pending after CSS ownership fix
- Auto-merge: repository setting unavailable
- Production deployment: pending merge
- Completion: pending CI, merge and production verification
