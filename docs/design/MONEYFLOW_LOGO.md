# MoneyFlow logo identity

**Status:** candidate v2 — owner review required  
**Requested by:** MoneyFlow owner  
**Requested on:** 2026-07-29  
**Brand authority:** [`../brand/MONEYFLOW_BRAND_GUIDELINES.md`](../brand/MONEYFLOW_BRAND_GUIDELINES.md)  
**Product authority:** [`../product/PRINCIPLES.md`](../product/PRINCIPLES.md)

This file defines the MoneyFlow logo candidate currently under review for the web product, favicon and PWA metadata. It replaces the previous M direction only after owner approval and successful verification.

## Brand idea

MoneyFlow is a personal ledger that helps people understand where money went. The candidate mark uses one Vietnamese rice-stalk image whose side grains are replaced by coin forms.

The intended reading order is:

1. rice stalk — familiar, grounded and culturally relevant;
2. coin grains — personal money rather than agriculture;
3. ordered vertical structure — money recorded and organized;
4. upward growth — long-term clarity, not investment promises.

The mark must remain factual and calm. It must not become a wealth, farming, bank or investment badge.

## Why this construction

The owner requested that the implementation stop relying on generated logo boards and instead use a web icon library already present in the repository.

The candidate therefore uses `lucide-react` as a construction system:

- Lucide `Leaf` provides the top rice grain;
- six Lucide `Circle` components are optically stretched and rotated into coin-shaped side grains;
- native SVG paths provide the central stalk and connecting branches;
- the same silhouette is mirrored in `src/app/icon.svg` for favicon and installed-app use;
- no additional dependency, bitmap asset or generated illustration is introduced.

Lucide is a construction aid, not the final brand idea. The arrangement, proportions and coin-rice silhouette are MoneyFlow-specific.

## Canonical candidate assets

| Asset | Source |
|---|---|
| App/favicon vector | `src/app/icon.svg` |
| Reusable in-product component | `src/components/brand/brand-lockup.tsx` |
| Component presentation | `src/components/brand/brand-lockup.module.css` |
| Temporary signed-in shell bridge | `src/app/ai-uiux-guardrails.css` → `/icon.svg` |
| Installed-app metadata | `src/app/manifest.ts` |

Landing and authentication use the shared component directly. The signed-in shell temporarily loads the same `/icon.svg` through a narrow compatibility selector.

## Construction

### Symbol

- Canvas: `64 × 64` viewBox.
- Container: rounded square from `(4, 4)` to `(60, 60)` with `16` radius.
- Container color: MoneyFlow brand green.
- Central stalk: one vertical rounded stroke.
- Top grain: one pointed rice grain from the Lucide `Leaf` primitive.
- Coin grains: three balanced pairs of thick oval outlines, tilted outward like rice grains.
- Six curved branches connect the side coins to the central stalk.
- No enclosing coin ring, currency sign, chart, arrow, letter M, separate badge or extra emblem.

### Wordmark

Use the text `MoneyFlow` exactly.

- Primary typeface: Inter with system fallbacks.
- Do not place a slogan inside the lockup.
- Use symbol plus wordmark where space permits.
- The symbol may stand alone where the platform already names MoneyFlow.

## Color

| Role | Light/default | Dark appearance |
|---|---|---|
| Brand container | `#0B6B3A` | approved dark-surface treatment |
| Coin-rice mark | `#FFFFFF` | `currentColor` on reversed surfaces |
| Wordmark | `#102019` | `#F0F7F3` |

Brand green is not the semantic income/success color.

## Variants to verify

1. Primary green container with white coin-rice mark.
2. Reversed monochrome mark on a dark or brand surface.
3. Monochrome dark.
4. Monochrome light.

Geometry must remain unchanged across variants. At micro size, the top grain, central stalk and three paired coin groups must remain distinct.

## Clear space and minimum size

- Clear space: at least one quarter of the symbol width.
- `16px`: favicon-only context; verify that the stalk and three coin pairs remain distinct.
- `24px`: compact interface symbol.
- `32–36px`: normal navigation mark.
- `64px+`: marketing and installed-app contexts.

## Accessibility

- Where adjacent text names MoneyFlow, the mark is decorative and must not create a duplicate accessible name.
- Shared component SVGs use `aria-hidden="true"` and `focusable="false"`.
- Forced-colors mode uses system colors.
- Do not encode income, expense or financial status through the logo color.

## Misuse

Do not:

- add realistic gold coins, gradients, metal, glow, glass, shadow or 3D;
- add a circular badge around the whole stalk;
- reintroduce the M, F or O experiments;
- add currency signs, charts, arrows, percentages, wallets or bank cards;
- change the number or placement of the top grain or six side coins per screen;
- redraw the mark with unrelated CSS polygons or bitmap assets;
- describe the mark as a promise of profit, wealth or guaranteed growth.

## Approval gate

This candidate must not be merged as the final identity until the owner reviews actual browser evidence.

Required evidence:

- [ ] inspect at 16, 24, 32, 64 and 512px;
- [ ] check light, dark, reversed and monochrome appearances;
- [ ] verify browser favicon and PWA discovery;
- [ ] review landing, auth and signed-in shell screenshots;
- [ ] confirm keyboard, forced-colors and accessibility behavior;
- [ ] run repository static, unit, build and browser checks;
- [ ] record explicit owner approval.

## Future changes

After approval, this document becomes the canonical contract and the previous M direction is retired. Parallel logo systems are not allowed.
