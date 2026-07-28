# MoneyFlow logo identity

**Status:** approved — canonical logo v1  
**Approved by:** MoneyFlow owner  
**Approved on:** 2026-07-28  
**Brand authority:** [`../brand/MONEYFLOW_BRAND_GUIDELINES.md`](../brand/MONEYFLOW_BRAND_GUIDELINES.md)  
**Product authority:** [`../product/PRINCIPLES.md`](../product/PRINCIPLES.md)

This file defines the canonical MoneyFlow logo system used by the web product, browser favicon and PWA metadata.

## Brand idea

MoneyFlow is a calm personal ledger. The logo identifies the product; it does not attempt to illustrate every finance feature.

The approved mark uses:

- one recognizable **M** tied directly to the product name;
- one continuous construction that suggests an understandable flow of records;
- a stable rounded container for favicon, installed-app and compact navigation contexts;
- enough optical weight to remain visible at small sizes.

The identity supports the brand promise:

> Tiền của bạn được ghi đúng, nhìn rõ và luôn thuộc về bạn.

## Why this direction was selected

The M mark is simpler and more durable than the explored alternatives. It avoids loading-ring ambiguity, forced `M/F/O` combinations and literal finance diagrams.

It deliberately excludes:

- coins, wallets, bank cards and currency signs;
- arrows and rising charts;
- ledger lines placed inside letters;
- three bars representing income, expense and transfer;
- ribbon-like gradients, glass, glow and 3D effects;
- slogans or the full wordmark inside an app icon.

## Design principles used

Research accessed 2026-07-28:

| Source | Applied lesson |
|---|---|
| Adobe, *How to design a logo* — https://www.adobe.com/express/learn/blog/how-to-design-a-logo | Start from strategy, keep one distinctive idea, test at small size and in one color, retain vector source. |
| Adobe, *What is a logo and how to create your own* — https://www.adobe.com/uk/express/discover/how-to/logo | Effective marks are simple, scalable, memorable, consistent and adaptable. |
| Apple HIG, *App icons* — https://developer.apple.com/design/human-interface-guidelines/app-icons/ | Keep the central idea simple, avoid nonessential text and thin details, preserve recognizable features across appearances. |
| Apple HIG, *Design principles* — https://developer.apple.com/design/human-interface-guidelines/design-principles | Purpose, simplicity, familiarity, flexibility and craft guide the decision; Apple styling itself is not copied. |

## Canonical assets

| Asset | Source |
|---|---|
| App/favicon vector | `src/app/icon.svg` |
| Shared in-product mark geometry | `src/app/brand-logo.css` |
| Global identity import | `src/app/layout.tsx` |
| Installed-app metadata | `src/app/manifest.ts` |

Do not create a second logo source unless a reviewed change replaces these files in the same pull request.

## Canonical construction

### Symbol

- Canvas: `64 × 64` viewBox.
- Container: rounded square from `(4, 4)` to `(60, 60)` with `16` radius.
- Container color: MoneyFlow brand green.
- Mark: a white continuous M path with rounded caps and joins.
- The mark must preserve the same silhouette across landing, auth, app shell, favicon and PWA use.

### Wordmark

Use the text `MoneyFlow` exactly.

- Primary product typeface: Inter with system fallbacks.
- Do not place a slogan inside the lockup.
- The normal young-brand configuration is symbol plus wordmark.
- The symbol may stand alone where the platform or surrounding interface already names MoneyFlow.
- Do not modify one letter independently or introduce another competing logo gesture.

## Color

The logo must remain valid in one color.

| Role | Light/default | Dark appearance |
|---|---|---|
| Brand container | `#0B6B3A` | `#4AD58A` when a dedicated dark asset is produced |
| Mark on brand | `#FFFFFF` | `#FFFFFF` or the approved dark-canvas treatment |
| Wordmark | `#102019` | `#F0F7F3` |

Brand green is not the semantic income/success color. Do not swap those roles.

## Approved variants

1. **Primary:** green rounded container with white M, paired with the MoneyFlow wordmark where space permits.
2. **Reversed:** light or green mark on a dark MoneyFlow surface.
3. **Monochrome dark:** one dark mark when production constraints require it.
4. **Monochrome light:** one light mark on an approved dark surface.

The geometry remains unchanged across variants. Optical adjustments for raster favicon sizes may alter pixel alignment, not the underlying concept.

## Clear space and minimum size

- Minimum clear space around the symbol: one quarter of the symbol width.
- `16px`: favicon-only context; inspect the rasterized result.
- `24px`: compact interface symbol.
- `32–36px`: normal navigation mark.
- `64px+`: marketing and installed-app contexts.
- Never reduce the M weight independently at small sizes.

## Accessibility

- Where adjacent text already names MoneyFlow, the mark is decorative and must not create a duplicate accessible name.
- Browser/app icon metadata may name the product once.
- Forced-colors mode must retain a visible mark using system colors.
- Do not encode financial status in the logo color.

## Misuse

Do not:

- stretch, rotate or redraw the mark per screen;
- change the M geometry between surfaces;
- apply glow, bevel, 3D, glass or decorative gradients;
- add arrows, charts, percentages, coins or currency symbols;
- put the full word `MoneyFlow` inside an app icon;
- use the logo as repeated decoration inside the signed-in product;
- recolor it with semantic income, expense, transfer or warning tokens;
- combine this canonical mark with rejected M/F/O or flow-ring experiments.

## Release verification

Before each identity-affecting release:

- [ ] Inspect at 16, 24, 32, 64 and 512px.
- [ ] Check light, dark and monochrome appearances.
- [ ] Verify browser favicon discovery.
- [ ] Verify PWA manifest icon discovery.
- [ ] Review landing, auth and signed-in shell screenshots.
- [ ] Confirm decorative/accessibility behavior.
- [ ] Confirm financial semantic colors remain separate from brand color.
- [ ] Run the repository checks appropriate to the change.

## Future changes

A future redesign requires a new researched specification and explicit owner approval. It must replace the canonical implementation and this contract in the same reviewed pull request; parallel logo systems are not allowed.
