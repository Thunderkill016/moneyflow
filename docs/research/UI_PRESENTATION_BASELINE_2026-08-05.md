# MoneyFlow UI presentation baseline — 2026-08-05

**Status:** Phase 0 evidence, owner-accepted
**Program:** `docs/plans/active/ui-system-migration.md`
**Baseline main ref:** `9f31aa02a64bcff30705c187fceb09cf5fa61ded`
**Evidence merge candidate:** PR #291 merge candidate `45a6689e2a913f74d8b41475c649f8fdb93663c4`, exact head `7ccaae55b910a5f0ec5132dee51ef3e3c9a91784`

This document records the measurable starting point for the UI-system migration. It does not claim that all presentation debt is already enumerated. Values are included only when current source or exact-head CI proves them.

## Quantitative baseline

| Metric | Current value | Source | Interpretation |
|---|---:|---|---|
| Root CSS owners | 2 | `scripts/check-css-ownership.mjs` output in CI #1565 | `legacy.css` and `document-theme.css` |
| Root CSS imports | `./legacy.css`, `./document-theme.css` | root layout and CI output | Exact frozen order |
| Legacy stylesheets imported by `legacy.css` | 7 | `src/app/legacy.css` and CI output | Global compatibility chain |
| Document-selector allowlist files | 9 | CSS ownership CI output | Seven imported legacy files plus old landing/auth global generations |
| `!important` declarations | 1,112 | CI #1565, Verify static quality | 92.7% of current budget |
| `!important` budget | 1,200 | `scripts/check-css-ownership.mjs` | Only 88 declarations of headroom remain |
| Unauthorized document selectors | 0 | CI #1565 | Existing document-selector debt is contained in allowlist, not eliminated |
| Invisible presentation contract components mounted at root | 2 | `src/app/layout.tsx` | `MobileShellContract`, `MinimumTargetSizeContract` |
| Root compatibility layers | 7 | `src/app/legacy.css` | No additional root layer is allowed |
| Unit/static tests | 700 passed, 0 failed | CI #1565 | Test strength does not prove visual ownership |
| Lint findings | 0 errors, 2 warnings | CI #1565 | Both warnings are in `transactions-page.tsx` hook dependencies; not Phase 0 scope |
| UI audit artifact size | 32,050,506 bytes | workflow artifact #8905362804 | Downloadable representative cross-device evidence |
| UI audit artifact digest | `sha256:c5143b6bdaa541f0d5a056f5159200c3ee768b0fb4cd4a74c25e6127be50899a` | GitHub Actions artifact metadata | Integrity reference |
| Browser smoke artifact | #8905168099 | CI #1565 | Expense/auth smoke evidence |

## Root style topology

```text
src/app/layout.tsx
├── src/app/legacy.css
│   ├── globals.css
│   ├── ui-refresh.css
│   ├── benchmark-ux.css
│   ├── safe-to-spend-withdrawal.css
│   ├── cross-device-stabilization.css
│   ├── ai-uiux-refresh.css
│   └── ai-uiux-guardrails.css
└── src/app/document-theme.css
```

The root layout also mounts `MobileShellContract` and `MinimumTargetSizeContract`, which apply presentation repairs beyond normal component ownership.

## Verified ownership and debt findings

### Document/theme

- `src/app/document-theme.css` is the executable semantic token and theme authority.
- Public routes resolve to Light; signed-in routes restore Light/Dark/System behavior.
- The CSS ownership check permits document selectors in nine legacy files, so `unauthorizedDocumentSelectors: 0` means containment, not a clean final architecture.

### App Shell

- The App Shell CSS Module is the intended owner of sidebar, topbar, mobile navigation, sheets and safe-area behavior.
- Global shell/mobile classes and retired FAB variables still exist in compatibility layers.
- Mobile bottom space can stack because a route using global `.dashboard` receives historical content clearance in addition to the App Shell reserve.

### Primitive contracts

- Generic UI primitives do not all encode the MoneyFlow 44px important-action standard directly.
- `MinimumTargetSizeContract` globally repairs targets through CSS and `!important`.
- Final migration must move the contract into Button, LinkButton, IconButton and affected route controls before removing the global repair.

### Product behavior enforced through CSS

The following are known cases where CSS carries more than visual presentation:

1. withdrawn safe-to-spend UI hidden by `safe-to-spend-withdrawal.css`;
2. duplicate Dashboard primary action retained in JSX and hidden by route CSS;
3. signed-in canonical logo appearance repaired by a later guardrail instead of direct canonical component rendering;
4. mobile route clearance and dialog behavior applied by invisible contract components.

These cases are migration targets. Safety decisions must be preserved while ownership moves into render logic or explicit component APIs.

## Route-family ownership baseline

| Route family | Current presentation shape | Migration risk |
|---|---|---|
| Landing | Current CSS Module plus bounded repair; old global landing generation remains allowlisted | Medium: preserve selected narrative while removing stale source |
| Auth | Shared AuthForm module plus historical global auth generation/overrides | Medium: many states and public light-only contract |
| App Shell | CSS Module owner plus global compatibility and invisible contracts | High: affects every signed-in route |
| Dashboard | Seven root layers plus multiple route/shared stylesheets | Highest presentation-layer overlap |
| Transactions/Capture | CSS Module bridges into global manager/panel/dialog vocabulary | High: highest-frequency flow and many states |
| Accounts/Transfer | Module plus global workspace/card vocabulary | High: balanced transfer and destructive/archive states |
| Planning | Shared components but mixed global route CSS and route-specific files | High: four routes and semantic statuses |
| Reports/Categories | Legacy/global-heavy presentation with route-specific repair | Medium-high |
| Inbox/Rules/Imports/Timeline | Advanced-flow components and global styles | Medium-high: review/validation states remain open |
| Settings/Privacy/Export | Safety and destructive states | High despite lower frequency |

## Current evidence matrix

The current Playwright audit configuration includes representative projects for:

- Chromium phone widths 320, 360 and 390;
- tablet portrait 768 and landscape 1024;
- desktop 1366 and wide 1440;
- phone and desktop dark mode;
- WebKit phone and tablet;
- 200% text at 320;
- keyboard-only desktop;
- Firefox desktop in a separately selected project;
- reports custom-range and budget month-history submatrices.

The baseline audit artifact from CI #1565 passed and is retained as evidence, but it does not prove final visual quality, physical-device readiness or correct ownership. Known evidence limitations include stale `/insights` naming in broad audit discovery and route-specific painted screenshot helpers.

## Known quantitative gaps

The current repository has no merged command that emits all of the following on current main:

- total CSS file count by ownership category;
- total selector count and specificity distribution;
- complete CSS Module `:global(...)` inventory;
- inline-style inventory;
- token definitions versus references and unknown aliases;
- live DOM consumer count for every legacy class family;
- computed-style owner for representative elements.

Phase 0 does not invent these values. The next implementation stages may add reproducible read-only inventory tooling before setting numeric deletion targets.

## Owner acceptance record

1. `main@9f31aa0` is accepted as the captured migration baseline, not as a claim that current `main` never advances.
2. B3.2/Fresh Blue and current public/workspace theme behavior remain fixed during architecture migration unless explicitly superseded.
3. The working execution order is accepted: guardrails → primitives → App Shell → Dashboard → daily ledger → remaining routes.
4. Guided Story is preserved during architecture cleanup; any redesign requires a separate approved packet.
5. Physical Android and iOS/Safari acceptance remains a later required gate.
6. The owner accepted this baseline on 2026-08-05 through the explicit instruction to complete Phase 0.

## Evidence references

- CI #1565 / run `30940788160`
- UI audit artifact `8905362804`
- Browser smoke artifact `8905168099`
- PR #291 and final main commit `9f31aa02a64bcff30705c187fceb09cf5fa61ded`
- `src/app/layout.tsx`
- `src/app/legacy.css`
- `scripts/check-css-ownership.mjs`
