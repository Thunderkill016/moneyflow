# MoneyFlow logo identity

This file defines the current MoneyFlow logo concept and practical usage. It is subordinate to product truth in `docs/product/PRINCIPLES.md` and the interface system in `docs/design/CALM_LEDGER_V2.md`.

## Brand idea

MoneyFlow is a calm personal ledger. The logo identifies the product; it does not try to explain every finance feature.

The mark combines:

- a single **M** for MoneyFlow;
- one continuous construction to suggest an understandable flow of records;
- a stable rounded container that works as a favicon, PWA icon and compact navigation mark.

The design deliberately excludes arrows, growth charts, coins, bank cards, wallets, currency signs, gradients, glass effects and 3D rendering. Those devices are common fintech shorthand, but they make the product look like an investment or payment service rather than a trustworthy manual ledger.

## Design principles used

Research accessed 2026-07-28:

| Source | Applied lesson |
|---|---|
| Adobe, *How to design a logo* — https://www.adobe.com/express/learn/blog/how-to-design-a-logo | Start from strategy, explore before polishing, keep one distinctive idea, test at small size and in one color, retain vector source. |
| Adobe, *What is a logo and how to create your own* — https://www.adobe.com/uk/express/discover/how-to/logo | Effective marks are simple, scalable, memorable, consistent and adaptable. A combination mark suits a young brand that still needs its name beside the symbol. |
| Apple HIG, *App icons* — https://developer.apple.com/design/human-interface-guidelines/app-icons/ | Keep the central idea simple, avoid nonessential text and thin details, preserve the same recognizable features across appearances. |
| Apple HIG, *Design principles* — https://developer.apple.com/design/human-interface-guidelines/design-principles | Purpose, simplicity, familiarity, flexibility and craft guide the decision; Apple styling itself is not copied. |

## Canonical construction

### Mark

- Canvas: square.
- Container: rounded square using the current MoneyFlow brand token.
- Symbol: a high-contrast M with rounded joins and enough optical weight to survive favicon sizes.
- Default source: `src/app/icon.svg`.
- In-product identity layer: `src/app/brand-logo.css`.

### Wordmark

Use the existing Inter-based product typography and the text `MoneyFlow` exactly. Do not place a slogan inside the logo. The symbol and name form the normal combination mark; the symbol may stand alone only where the product name is already provided by the platform or surrounding interface.

## Color

| Role | Light/default | Dark appearance |
|---|---|---|
| Brand container | `#0B6B3A` | `#4AD58A` when a dedicated dark asset is produced |
| Mark on brand | `#FFFFFF` | `#FFFFFF` or the dark canvas when required by contrast |
| Wordmark | current strong text token | current strong text token |

The mark must also work in one color. Do not add a second decorative brand color.

## Clear space and minimum size

- Keep clear space around the mark equal to at least one quarter of its width.
- Minimum interface mark: 16×16px only for favicon-like contexts.
- Normal navigation mark: 32–36px.
- Never reduce stroke/shape weight independently at small sizes.

## Approved variants

1. Primary: green rounded container with white mark.
2. Reversed: light/green mark on a dark MoneyFlow surface.
3. Monochrome: one dark or one light color when production constraints require it.

The geometry remains the same in every variant.

## Misuse

Do not:

- add arrows, percentage signs, the đồng symbol or a chart;
- stretch, rotate or redraw the mark per screen;
- apply glow, bevel, 3D, glass or decorative gradients;
- put the full word `MoneyFlow` inside an app icon;
- use the logo as repeated decoration inside the signed-in product;
- replace the brand token with semantic income/success green.

## Verification checklist

Before release:

- inspect at 16, 24, 32, 64 and 512px;
- check light and dark surfaces;
- verify one-color reproduction;
- verify browser favicon and manifest discovery;
- capture landing, auth and signed-in shell screenshots;
- confirm the logo remains decorative to assistive technology where adjacent accessible name text exists.
