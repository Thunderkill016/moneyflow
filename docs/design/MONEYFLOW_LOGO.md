# MoneyFlow logo identity

**Status:** provisional — concept not approved  
**Brand authority:** [`../brand/MONEYFLOW_BRAND_GUIDELINES.md`](../brand/MONEYFLOW_BRAND_GUIDELINES.md)  
**Product authority:** [`../product/PRINCIPLES.md`](../product/PRINCIPLES.md)

This file records the current logo exploration contract and implementation candidate. It does **not** declare the M-based mark final or canonical.

## Current decision

MoneyFlow needs a simple, scalable and distinctive identifier for landing, authentication, signed-in navigation, favicon and PWA contexts.

The owner has not approved the current M-based candidate. Until approval:

- `src/app/icon.svg` and `src/app/brand-logo.css` are implementation experiments;
- they must not be treated as final brand assets;
- the PR should remain unmerged;
- no marketing or public brand guideline may describe the mark as canonical.

## Brand idea

MoneyFlow is a calm personal ledger. The identity should support the product promise:

> Tiền của bạn được ghi đúng, nhìn rõ và luôn thuộc về bạn.

The logo identifies the product; it does not need to explain every finance feature.

## Design principles used

Research accessed 2026-07-28:

| Source | Applied lesson |
|---|---|
| Adobe, *How to design a logo* — https://www.adobe.com/express/learn/blog/how-to-design-a-logo | Start from strategy, explore before polishing, keep one distinctive idea, test at small size and in one color, retain vector source. |
| Adobe, *What is a logo and how to create your own* — https://www.adobe.com/uk/express/discover/how-to/logo | Effective marks are simple, scalable, memorable, consistent and adaptable. A combination mark suits a young brand that still needs its name beside the symbol. |
| Apple HIG, *App icons* — https://developer.apple.com/design/human-interface-guidelines/app-icons/ | Keep the central idea simple, avoid nonessential text and thin details, preserve recognizable features across appearances. |
| Apple HIG, *Design principles* — https://developer.apple.com/design/human-interface-guidelines/design-principles | Purpose, simplicity, familiarity, flexibility and craft guide the decision; Apple styling itself is not copied. |

## Concept requirements

Any candidate must:

- express one visual idea;
- have a distinctive silhouette;
- work in one color before color exploration;
- remain recognizable at 16, 24, 32, 64 and 512px;
- work without gradient, glow, shadow, glass or 3D;
- avoid looking like loading, refresh, investment growth or payment processing;
- avoid a forced combination of `M`, `F`, `O`, coins, charts, wallets or currency signs;
- avoid becoming a diagram of the product interface;
- work as a symbol, wordmark and combination mark system.

## Rejected shorthand

The following are not automatically forbidden forever, but past exploration showed they are high-risk and need unusually strong execution:

- arrows and rising charts;
- coins, bank cards, wallets and currency signs;
- generic open rings;
- letters with ledger lines placed inside them;
- three bars standing for income, expense and transfer;
- ribbon-like gradient monograms;
- a stylized letter that requires a long story to explain;
- golden-ratio diagrams used as justification rather than optical evidence.

## Candidate exploration process

1. Start with product truth and brand story.
2. Define three genuinely different territories, not minor variations.
3. Create black-and-white silhouettes first.
4. Compare large, 32px and 16px versions.
5. Remove candidates that depend on explanation, color or mockups.
6. Score remaining candidates using the brand guideline rubric.
7. Owner selects one concept.
8. Refine geometry and wordmark.
9. Produce light, dark and monochrome variants.
10. Verify in browser/PWA contexts before approval.

## Logo architecture after approval

The final system must include:

1. Symbol.
2. Wordmark.
3. Horizontal combination mark.
4. Stacked lockup when needed.
5. Monochrome dark and light variants.
6. Optical-adjusted app icon/favicon assets.

Do not put a slogan or the full word `MoneyFlow` inside the app icon.

## Color

The logo must work in one color.

After geometry approval, approved brand roles are:

| Role | Light/default | Dark appearance |
|---|---|---|
| Brand | `#0B6B3A` | `#4AD58A` |
| Strong text | `#102019` | `#F0F7F3` |
| Reversed mark | `#FFFFFF` | `#FFFFFF` or approved dark-canvas treatment |

Do not use semantic income/success color as an arbitrary replacement for brand color.

## Wordmark

Use the text `MoneyFlow` exactly.

A future custom wordmark may adjust spacing or one letter gesture, but it must:

- read immediately as `MoneyFlow`;
- remain clear in small headers;
- support Vietnamese brand communications;
- not look like a broken font;
- not imitate Apple typography;
- not introduce a second competing concept.

## Clear space and minimum size

Final dimensions will be established after concept approval.

Target contexts:

- 16px: favicon with optical adjustment if needed;
- 24px: compact UI symbol;
- 32–36px: navigation mark;
- larger marketing lockups determined by legibility and composition.

Clear space must be based on a stable feature of the approved mark, not an arbitrary ratio.

## Misuse

Do not:

- describe an unapproved candidate as final;
- stretch, rotate or redraw the mark per screen;
- apply glow, bevel, 3D, glass or decorative gradients;
- add arrows, charts, percentage signs or currency symbols;
- put the full wordmark inside an app icon;
- use the logo as repeated decoration in the signed-in product;
- use multiple logo concepts at the same time;
- substitute mockup attractiveness for small-size evidence.

## Approval checklist

Before the logo becomes canonical:

- [ ] Owner selects the concept.
- [ ] Black-and-white silhouette is approved.
- [ ] 16, 24, 32, 64 and 512px versions are reviewed.
- [ ] Light, dark and monochrome variants are reviewed.
- [ ] Wordmark relationship and spacing are approved.
- [ ] Browser favicon and manifest discovery are verified.
- [ ] Landing, auth and signed-in shell screenshots are reviewed.
- [ ] Similarity/trademark screening is completed to a reasonable pre-launch level.
- [ ] Canonical SVG sources and generated assets are stored in one documented location.
- [ ] Brand guideline and implementation are updated in the same PR.