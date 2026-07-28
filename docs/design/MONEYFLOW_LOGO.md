# MoneyFlow logo identity

**Status:** approved — canonical logo v1  
**Approved by:** MoneyFlow owner  
**Approved on:** 2026-07-28  
**Brand authority:** [`../brand/MONEYFLOW_BRAND_GUIDELINES.md`](../brand/MONEYFLOW_BRAND_GUIDELINES.md)  
**Product authority:** [`../product/PRINCIPLES.md`](../product/PRINCIPLES.md)

This file defines the canonical MoneyFlow logo system used by the web product, browser favicon and PWA metadata.

## Brand idea

MoneyFlow is a calm personal ledger. The logo identifies the product; it does not attempt to illustrate every finance feature.

The approved mark uses one recognizable **M**, one continuous construction and a stable rounded container for favicon, installed-app and compact navigation contexts.

The identity supports the brand promise:

> Tiền của bạn được ghi đúng, nhìn rõ và luôn thuộc về bạn.

## Why this direction was selected

The M mark is simpler and more durable than the explored alternatives. It avoids loading-ring ambiguity, forced `M/F/O` combinations and literal finance diagrams.

It deliberately excludes coins, wallets, cards, currency signs, arrows, rising charts, ledger lines inside letters, semantic bars, gradients, glass, glow, 3D and slogans inside the icon.

## Canonical assets

| Asset | Source |
|---|---|
| App/favicon vector | `src/app/icon.svg` |
| Reusable in-product component | `src/components/brand/brand-lockup.tsx` |
| Component presentation | `src/components/brand/brand-lockup.module.css` |
| Temporary signed-in shell bridge | `src/app/ai-uiux-guardrails.css` → `/icon.svg` |
| Installed-app metadata | `src/app/manifest.ts` |

Landing and authentication use the shared component directly. The signed-in shell still has a legacy wrapper and temporarily loads the exact canonical vector through a deliberately narrow compatibility selector. A later shell-component migration must remove that bridge rather than introduce another logo source.

## Canonical construction

### Symbol

- Canvas: `64 × 64` viewBox.
- Container: rounded square from `(4, 4)` to `(60, 60)` with `16` radius.
- Container color: MoneyFlow brand green.
- Mark: a white continuous M path with rounded caps and joins.
- Preserve the same silhouette across landing, auth, app shell, favicon and PWA use.

### Wordmark

Use the text `MoneyFlow` exactly.

- Primary typeface: Inter with system fallbacks.
- Do not place a slogan inside the lockup.
- Use symbol plus wordmark where space permits.
- The symbol may stand alone where the platform or surrounding interface already names MoneyFlow.
- Do not introduce another competing letter gesture.

## Color

| Role | Light/default | Dark appearance |
|---|---|---|
| Brand container | `#0B6B3A` | `#4AD58A` when a dedicated dark asset is produced |
| Mark on brand | `#FFFFFF` | `#FFFFFF` or approved dark-canvas treatment |
| Wordmark | `#102019` | `#F0F7F3` |

Brand green is not the semantic income/success color.

## Approved variants

1. Primary green container with white M.
2. Reversed light/green mark on a dark or brand MoneyFlow surface.
3. Monochrome dark.
4. Monochrome light.

Geometry remains unchanged across variants. Optical raster adjustments may change pixel alignment, not the concept.

## Clear space and minimum size

- Clear space: at least one quarter of the symbol width.
- `16px`: favicon-only context; inspect raster output.
- `24px`: compact interface symbol.
- `32–36px`: normal navigation mark.
- `64px+`: marketing and installed-app contexts.
- Never reduce M weight independently at small sizes.

## Accessibility

- Where adjacent text names MoneyFlow, the mark is decorative and must not create a duplicate accessible name.
- Shared component SVGs use `aria-hidden="true"` and `focusable="false"`.
- Forced-colors mode must retain a visible mark using system colors.
- Do not encode financial status in logo color.

## Misuse

Do not:

- stretch, rotate or redraw the mark per screen;
- change M geometry between surfaces;
- apply glow, bevel, 3D, glass or decorative gradients;
- add arrows, charts, percentages, coins or currency symbols;
- put the full wordmark inside an app icon;
- repeat the logo as decoration in the signed-in product;
- recolor it with semantic income, expense, transfer or warning tokens;
- combine it with rejected M/F/O or flow-ring experiments;
- recreate the M with a second CSS polygon or an unrelated SVG path.

## Release verification

- [ ] Inspect at 16, 24, 32, 64 and 512px.
- [ ] Check light, dark, reversed and monochrome appearances.
- [ ] Verify browser favicon discovery.
- [ ] Verify PWA manifest icon discovery.
- [ ] Review landing, auth and signed-in shell screenshots.
- [ ] Confirm decorative/accessibility behavior.
- [ ] Confirm financial semantic colors remain separate from brand color.
- [ ] Run repository checks appropriate to the change.

## Future changes

A future redesign requires a new researched specification and explicit owner approval. It must replace the canonical implementation and this contract in the same reviewed pull request; parallel logo systems are not allowed.
