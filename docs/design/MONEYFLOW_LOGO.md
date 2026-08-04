# MoneyFlow logo identity

**Status:** approved — canonical logo v2  
**Approved by:** MoneyFlow owner  
**Approved on:** 2026-08-04  
**Brand authority:** [`../brand/MONEYFLOW_BRAND_GUIDELINES.md`](../brand/MONEYFLOW_BRAND_GUIDELINES.md)  
**Product authority:** [`../product/PRINCIPLES.md`](../product/PRINCIPLES.md)

This file defines the canonical MoneyFlow logo system used by the web product, browser favicon, social preview and PWA metadata.

## Brand idea

MoneyFlow turns separate money movements into one clear system the user can understand and control. The symbol expresses flow passing through a stable control gate without using coins, wallets, currency signs, charts, arrows or letter monograms.

## Canonical assets

| Asset | Source |
|---|---|
| App/favicon vector | `src/app/icon.svg` |
| Reusable in-product component | `src/components/brand/brand-lockup.tsx` |
| Component presentation | `src/components/brand/brand-lockup.module.css` |
| Signed-in shell compatibility asset | `src/app/ai-uiux-guardrails.css` → `/icon.svg` |
| Social preview | `src/app/opengraph-image.tsx` |
| Installed-app metadata | `src/app/manifest.ts` |
| Installed-app raster icons | `public/icon-192.png`, `public/icon-512.png` |

Landing and authentication use the shared component. The signed-in shell loads the same canonical `/icon.svg` asset through its narrow compatibility bridge, so no second symbol geometry is permitted.

## Canonical construction — B3.2 Neutral

### Symbol

- Canvas: `160 × 160` viewBox.
- Stroke width: `16.18`.
- Upper flow arm: `M22.80 64.20C22.80 40.40 42.10 28.00 66.40 28.00H128.20`.
- Lower flow arm: `M137.20 95.80C137.20 119.60 117.90 132.00 93.60 132.00H31.80`.
- Gate bounds: `x=64`, `y=54.11`, `width=32`, `height=51.78`, radius `16`.
- Gate slot bounds: `x=75.06`, `y=67.06`, `width=9.89`, `height=25.89`, radius `4.94`.
- Caps and joins are rounded.
- The slot is true negative space.

### Wordmark

Use `MoneyFlow` exactly. Product UI may render the wordmark with Inter SemiBold while exported brand artwork may use the approved A Final outlined wordmark. Do not place a slogan inside the lockup.

## Color

| Role | Light/default | Dark appearance |
|---|---|---|
| Flow arms | `#0EA5E9` | `#38BDF8` |
| Gate and wordmark | `#101828` | `#FFFFFF` |
| Inverse mark | `#FFFFFF` | `#FFFFFF` |
| App-icon background | `#0EA5E9` | same asset |
| App-icon symbol | `#FFFFFF` | same asset |

The primary brand color is fresh blue `#0EA5E9`. Interaction blue uses the darker ramp beginning at `#0284C7`. Functional info remains a separate true blue family (`#3B82F6` / `#2563EB`) and must not replace the identity color. Green, red, yellow and indigo remain reserved for income/success, expense/danger, warning and transfer meaning.

## Approved variants

1. Primary: fresh-blue flow, dark gate and dark wordmark.
2. Dark mode: lighter fresh-blue flow, white gate and white wordmark.
3. Inverse: all white on a brand or dark surface.
4. App icon: fresh-blue rounded container with all-white symbol.

Geometry remains unchanged across variants.

## Clear space and minimum size

- Clear space: at least one quarter of the symbol width.
- `16px`: favicon-only context; inspect raster output.
- `22–24px`: compact interface symbol.
- `32–44px`: normal navigation mark.
- `64px+`: marketing and installed-app contexts.
- Never reduce stroke weight independently at small sizes.

## Accessibility

- Where adjacent text names MoneyFlow, the mark is decorative and must not create a duplicate accessible name.
- Shared component SVGs use `aria-hidden="true"` and `focusable="false"`.
- Forced-colors mode uses system colors.
- Do not encode financial status in logo color.

## Misuse

Do not:

- stretch, rotate or redraw the mark per screen;
- change the B3.2 geometry between surfaces;
- add glow, bevel, 3D, glass or decorative gradients;
- add arrows, charts, percentages, coins, wallets or currency symbols;
- put the full wordmark inside an app icon;
- recolor it with semantic income, expense, transfer or warning tokens;
- revive the retired green M, rice/coin or M/F/O directions;
- recreate the symbol with a CSS polygon or unrelated SVG path.

## Release verification

- [ ] Inspect at 16, 22, 24, 32, 44, 64, 192 and 512px.
- [ ] Check light, dark and inverse appearances.
- [ ] Verify browser favicon discovery.
- [ ] Verify PWA manifest icon discovery.
- [ ] Review landing, auth and signed-in shell screenshots.
- [ ] Confirm decorative/accessibility behavior.
- [ ] Confirm functional semantic colors remain separate from brand color.
- [ ] Run repository checks appropriate to the UI change.

A future redesign requires a new researched specification and explicit owner approval. It must replace the canonical implementation and this contract in the same reviewed pull request; parallel logo systems are not allowed.
