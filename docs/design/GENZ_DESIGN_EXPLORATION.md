# Gen-Z design exploration — creative territories for MoneyFlow

- Status: **exploration draft for owner selection — not an approved direction**
- Date: 2026-10-15
- Authority boundary: `docs/design/DESIGN_DIRECTION_STATUS.md` (Fresh Blue remains
  the shipped truth; the 2026-08-13 owner decision authorises Phase E exploration
  outside Fresh Blue but selects nothing). This document authorises **no**
  runtime, token, CSS or component change.
- Companion mocks: `docs/design/explorations/` (static HTML, open in a browser;
  each file renders landing hero + login + mobile dashboard for one territory).

## What this exploration must satisfy

| Invariant | Source | Consequence for every territory |
|---|---|---|
| Semantic financial roles unchanged | `BRAND_COLOR_SYSTEM.md` §3 | Income `#0C7A55` family, expense `#C83E46`, warning `#9A6100`, transfer `#7054CC` stay as shipped; territories change brand/neutral/type/shape layers only. |
| WCAG 2.2 AA | task + `UI_UX_RESEARCH_LEDGER.md` | Text/action ≥ 4.5:1, focus ≥ 3:1, targets ≥ 44px — every pairing below is **measured** (sRGB relative luminance), not estimated. |
| Calm, factual, non-judgmental, Vietnamese-first, integer VND | `docs/product/PRINCIPLES.md` | "Gen-Z" means fresher brand/type/shape — never louder claims, gamified shame, or hype copy. |
| Colour never the only financial signal | `BRAND_COLOR_SYSTEM.md` | Money keeps signs (+/−), labels and position; saturation budget stays <5% of screen. |
| Public surfaces follow the foundation process | `PUBLIC_EXPERIENCE_FOUNDATION.md` | These territories are step-4 candidates; owner selection (step 5) gates any application. |

## Territory 1 — Vivid Ledger

**Idea.** Keep the white-first ledger surface the product already trusts, then let
the *brand* go vivid: a saturated indigo primary, one indigo→cyan gradient reserved
for illustration and hero moments, rounder cards, and a single playful flat
illustration style. Money rows, tables and numbers stay exactly as calm as today —
the energy lives in the frame around them, not in the data.

### Palette draft (light; dark derived later by the same role map)

| Token role | Value | Measured contrast |
|---|---|---|
| canvas | `#FBFBFF` | ink on canvas 17.50:1 |
| surface | `#FFFFFF` | — |
| surface-muted | `#F3F4FF` | muted on muted 7.68:1 |
| text | `#14132E` | 17.50:1 on canvas |
| text-muted | `#4C4A6B` | 8.40:1 on surface, 8.14:1 on canvas |
| text-soft | `#6B6985` | 5.27:1 on surface |
| border | `#E2E1F0`; strong `#B9B6D8` | decorative/inputs |
| brand | `#5B4FE9` | **5.62:1** vs white CTA text |
| brand-hover / pressed | `#4A3FD1` / `#3B32B0` | 7.18:1 / ≥9:1 |
| brand-subtle / text-on-subtle | `#EEF0FF` / `#3F34C4` | 7.42:1 |
| focus | `#4A3FD1` | 7.18:1 (≥3 required) |
| decorative gradient | `#5B4FE9 → #06B6D4` | illustration/large shapes only, never text or financial meaning |

Type scale: display `Be Vietnam Pro` 800, hero 44/56 → 32/40 mobile; H2 28/36;
body Inter-equivalent 16/24; money keeps tabular figures at current sizes.
Radius: sm 10 / md 16 / lg 22 / xl 28. Elevation: soft indigo-tinted shadows
(`rgb(90 79 233 / 8–14%)`) on cards only. Icons: Lucide, default 2px stroke,
brand-tinted only inside active/selected states. Motion: `--mf-fast` stays 140ms;
cards/hero use ease-out 230ms + gentle 4px rise; **no overshoot** (springiness
reads unstable against money). Empty state: flat indigo/violet illustration —
open notebook + coins, same calm copy, one CTA.

Render: **landing hero** — white hero, huge indigo headline, gradient blob behind
the product mock, "Tạo sổ" pill CTA. **Login** — centred white card on the faintly
tinted canvas, indigo CTA, Google button neutral. **Mobile dashboard** — floating
dock unchanged in structure; active pill is indigo `#5B4FE9`; amounts keep
semantic colours and signs.

| | Assessment |
|---|---|
| Adopt | Rounder radius scale, deeper indigo brand, single decorative gradient, bigger display type. |
| Adapt | Gradient must be fenced to illustration/hero (prohibited-pattern guard: no gradient "as proof of trust"); pill radius on nav is decorative, allowed. |
| Reject | Any gradient text, gradient buttons, or purple-tinted money semantics — collides with transfer violet. |
| Accessibility/trust risk | Low. Indigo is far from income green/expense red; risk is *perceived* gradient-hype — mitigated by keeping data surfaces flat. |
| Migration cost | Low–medium: swap brand ramp + radius + shadow tokens; zero structural work. |

## Territory 2 — Soft Pop

**Idea.** A warmer, friendlier register: lilac-tinted canvas, chunky rounded
headline type, sticker-style duotone illustration, pill radii, micro-confetti
*only* on onboarding completion (never on money events). The product becomes a
friend's notebook — while ledger rows, amounts and states stay muted and factual.

### Palette draft

| Token role | Value | Measured contrast |
|---|---|---|
| canvas | `#F8F5FF` | ink on canvas 15.47:1 |
| surface | `#FFFFFF` | — |
| surface-muted | `#F1ECFF` | — |
| text | `#211A33` | 15.47:1 on canvas |
| text-muted | `#524A6B` | 8.23:1 surface, 7.64:1 canvas |
| text-soft | `#6F6787` | 5.30:1 on surface |
| border | `#E6E0F5`; strong `#C3B9E0` | decorative/inputs |
| brand | `#6F4EF5` | **5.14:1** vs white CTA text |
| brand-hover / pressed | `#6A48EE` / `#5537D6` | 5.56:1 / ≈7:1 |
| brand-subtle / text-on-subtle | `#EFEAFF` / `#5838E8` | 5.68:1 |
| focus | `#6A48EE` | 5.17:1 on canvas |
| sticker accents | `#FF9FB8`, `#7FE5C4`, `#8FA8FF` | **decorative illustration only** — never fills behind text, never near money semantics |

Type scale: display `Be Vietnam Pro` 800 with -0.02em tracking, hero 40/48;
H2 26/34; body 16/26 (looser leading for warmth). Radius: sm 14 / md 20 /
lg 26 / pill for chips and nav. Elevation: almost none — 1px border +
2% tint shadow. Icons: duotone (Lucide outline + 8% brand fill behind), 24px.
Motion: 300ms `easeOutBack` on stickers/chips only; money rows still snap 140ms.
Empty state: sticker sheet — wallet, receipt, coin jar with thick 2.5px outline.

Render: **landing hero** — lilac canvas, sticker collage right, chunky headline
left. **Login** — white rounded-24 card floating on lilac, soft pop Google button
with subtle border. **Mobile dashboard** — lilac canvas, white cards radius-20,
bottom dock pill-shaped; account chips tinted.

| | Assessment |
|---|---|
| Adopt | Tinted canvas, pill radii, duotone sticker illustration set, warmer leading. |
| Adapt | Confetti restricted to onboarding completion; sticker palette fenced to canvas/empty states. |
| Reject | Pink/mint accents anywhere near actions or money (would read as semantic); bubbly motion on financial rows. |
| Accessibility/trust risk | Medium-low. Tinted canvas is fine for WCAG, but "cute" can undercut seriousness at moments like delete-confirm and reconciliation — those screens must drop to neutral styling. |
| Migration cost | Medium: neutral palette + radius + illustration assets; some density tuning on data screens. |

## Territory 3 — Neo-clean

**Idea.** The opposite pole: brutally clean flat design that is *young through
typography, not decoration*. Pure white, hairline rules, no shadows, one electric
blue accent, oversized tabular figures, ledger-grid layouts and mono-flavoured
money. Reads like a sharp modern statement — the Gen-Z appeal is editorial
confidence, and it is the most conservative for financial trust.

### Palette draft

| Token role | Value | Measured contrast |
|---|---|---|
| canvas | `#FFFFFF` | — |
| surface | `#FFFFFF` | — |
| surface-muted | `#F5F6F7` | muted on muted 9.05:1 |
| text | `#0A0C10` | 19.57:1 on white |
| text-muted | `#3D4451` | 9.79:1 surface, 9.05:1 muted |
| text-soft | `#5C6470` | 5.98:1 on white |
| border | `#E5E7EB`; strong `#0A0C10` (intentional) | hairlines / editorial rules |
| brand | `#2345FF` | **6.24:1** vs white CTA text |
| brand-hover / pressed | `#1F3AE0` / `#162BC0` | 6.81:1 / ≈8.5:1 |
| brand-subtle / text-on-subtle | `#EEF1FF` / `#1F3AE0` | 6.81:1 |
| focus | `#2345FF` | 6.24:1 |

Type scale: display `Be Vietnam Pro` 800 tight-tracked (-0.03em), hero up to
64/64 with all-caps 12px eyebrows (`Birch`-style label rows via letter-spacing);
numbers may use a tabular/mono face (e.g. `Spline Sans Mono`/`Be Vietnam Pro`
tabular nums) at 20–28px — the money figure *is* the illustration. Radius:
sm 4 / md 8 / lg 12; nav pill keeps its capsule as the single curved element.
Elevation: none — hairline `#E5E7EB` borders only; overlap via layout, not shadow.
Icons: Lucide 2px on 24px grid, monochrome until selected. Motion: hard 120–160ms
cuts, translate-only; no bounce, no fade-stagger. Empty state: typographic — huge
"0 ₫" + one-line guidance + CTA; no illustration needed.

Render: **landing hero** — full-bleed white, giant headline, single electric CTA,
ledger-grid footer strip. **Login** — hairline-bordered card, brutalist spacing,
mono placeholders. **Mobile dashboard** — white surface, hairline section rules,
big black totals, blue links, flat dock (border only).

| | Assessment |
|---|---|
| Adopt | Flat surfaces + hairlines, typography-led hero, mono/tabular money, reduced motion baseline. |
| Adapt | Keep `surface-muted` for grouping so screens don't read as one flat sheet; radius 12px floor for touch comfort. |
| Reject | All-black body text for money (tabular weight is better), harsh gridlines inside dense tables, drop-caps/gothic flourishes. |
| Accessibility/trust risk | Low — highest contrast of the three; risk is coldness (clinical ≠ calm) — copy warmth must carry the friendliness. |
| Migration cost | Low: tokens + borders + radius only; components largely unchanged. |

## Side-by-side

| Axis | Vivid Ledger | Soft Pop | Neo-clean |
|---|---|---|---|
| Gen-Z signal | Colour energy | Warmth/play | Editorial confidence |
| Trust posture | High (data stays calm) | Medium (guard serious flows) | Highest |
| AA risk | None measured | None measured | None measured |
| Migration cost | Low–med | Medium | Low |
| Distinctiveness vs Fresh Blue | Medium (blue→indigo) | High (lilac+tinted) | High (flat+type) |
| Illustration need | One flat set | Sticker set (largest) | None (type-driven) |

## Recommendation for owner review

- **Vivid Ledger** is the smallest honest step away from Fresh Blue with the
  clearest Gen-Z read — recommended if the goal is "fresh but familiar".
- **Soft Pop** is the most differentiated and friendliest, but needs a stated
  rule that serious/destructive flows revert to neutral.
- **Neo-clean** is the safest and cheapest; pick it if the product voice should
  feel sharper rather than warmer.

No pick is binding until an owner decision is recorded in
`DESIGN_DIRECTION_STATUS.md`; all contrast figures above were computed from sRGB
relative luminance (script output recorded in commit) and would be re-verified
inside the selected candidate's full token sheet, including dark-mode derivation.

## Next steps after owner selection

1. Record the selection + rejected alternatives in `DESIGN_DIRECTION_STATUS.md`.
2. Extend the chosen palette to a complete token sheet (incl. dark-mode ramp and
   every semantic pairing) with a re-run of measured contrast.
3. Apply to real MoneyFlow content side-by-side (landing, auth, dashboard,
   transactions) per `BRAND_COLOR_SYSTEM.md` §7 change process.
4. Browser + physical-device review, then a central `document-theme.css` update —
   never per-route palettes.
