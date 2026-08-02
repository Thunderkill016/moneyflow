# MoneyFlow brand color system

**Status:** selected for implementation

**Owner decision date:** 2026-08-02

**Authority:** `src/app/document-theme.css` is the runtime token source. This document defines intent and usage; components consume semantic roles rather than copying hex values.

## 1. Purpose

MoneyFlow uses one project-wide color system across landing, authentication and authenticated product routes. A route must not create its own brand palette.

The system is designed to support:

- financial trust through clarity and consistency;
- a white-first interface with visible grouping and elevation;
- a recognizable brand/action color that does not collide with financial meaning;
- independent income, expense, warning and transfer semantics;
- light and dark modes;
- accessible focus, contrast and non-color cues.

Color reinforces product trust. Correct balances, understandable transactions, recovery, export and honest claims remain the primary sources of trust.

## 2. Architecture

### Neutral foundation

Neutral roles should occupy roughly 75–85% of a normal screen.

| Role | Light | Dark | Use |
|---|---|---|---|
| Canvas | `#F6F8FC` | `#0D111B` | Page background |
| Surface | `#FFFFFF` | `#151A24` | Cards, forms, panels |
| Surface muted | `#F0F3F8` | `#1D2430` | Grouping, hover, secondary regions |
| Surface strong | `#E7ECF3` | `#283140` | Stronger separation and elevation |
| Text | `#111827` | `#F7F8FA` | Primary content |
| Text muted | `#4B5563` | `#B9C1CC` | Supporting content |
| Text soft | `#6B7280` | `#8E98A6` | Captions and low-emphasis metadata |
| Border | `#D7DEE8` | `#303A49` | Dividers and cards |
| Border strong | `#B7C1D0` | `#475365` | Inputs and emphasized boundaries |

White-first does not mean every layer is identical white. Neutral steps must communicate grouping, state and elevation without tinting the product green or another decorative hue.

### Brand/action family

Brand roles should normally occupy roughly 8–15% of a screen.

| Role | Light | Dark |
|---|---|---|
| Primary | `#2F55D4` | `#8EA7FF` |
| Hover | `#2445B7` | `#A7B9FF` |
| Pressed | `#1D378E` | `#7693F3` |
| Subtle | `#EAF0FF` | `#1C2854` |
| Text on subtle | `#2443A8` | `#B8C7FF` |
| Text on primary | `#FFFFFF` | `#0E1638` |
| Focus | `#2F55D4` | `#9FB5FF` |

Use brand blue for primary CTA, active navigation, selected state, focus and branded links. Do not use it to imply income, expense or warning.

### Brand ramp

`50 #EFF4FF` · `100 #DFE8FF` · `200 #C5D3FF` · `300 #9FB5FF` · `400 #7592F5` · `500 #5273E8` · `600 #2F55D4` · `700 #2445B7` · `800 #1D378E` · `900 #192E6E` · `950 #111B3E`

Components normally use semantic roles, not raw ramp values. Ramp values are available for controlled brand illustration and data visualization only.

## 3. Financial semantic roles

Semantic colors should normally occupy less than 5% of a screen and appear only when their meaning exists.

| Meaning | Solid light | Subtle light | Text light | Solid dark | Subtle dark | Text dark |
|---|---|---|---|---|---|---|
| Income / success | `#0C7A55` | `#E6F6EF` | `#086044` | `#4DD4A0` | `#12392D` | `#8AE7C2` |
| Expense / danger | `#C83E46` | `#FDEBEC` | `#9F2D35` | `#FF858B` | `#462126` | `#FFB5B9` |
| Warning / attention | `#9A6100` | `#FFF2D8` | `#764900` | `#F4BE65` | `#433119` | `#F8D391` |
| Transfer / neutral movement | `#7054CC` | `#F0ECFF` | `#523CAD` | `#B29EFF` | `#302858` | `#CEBFFF` |

Rules:

1. Green is not a general brand decoration. It means income, success or a completed positive state.
2. Red is not a general accent. It means expense, danger, error or destructive action.
3. Amber means warning or attention, not decorative warmth.
4. Violet identifies transfer or neutral movement when the transfer meaning is real.
5. Financial meaning must also use labels, signs, icons, position or shape. Red versus green alone is insufficient.
6. Positive cash movement and generic success are related but not identical; labels must state which is meant.

## 4. Charts

Charts use semantic colors only when the series has the corresponding meaning. Category charts require a separate ordered palette tested for adjacent-series distinction and common color-vision deficiencies.

Every financial chart must:

- include direct labels or an understandable legend;
- avoid red/green as the only distinction;
- preserve readability in light and dark modes;
- use tabular money formatting where appropriate;
- avoid decorative saturation that competes with the main decision.

## 5. Public surfaces

Landing and authentication consume the same `--mf-*` roles as the authenticated product.

- Landing proof surfaces remain neutral; product screenshots provide detail.
- Primary CTA uses the brand role.
- Auth forms use white/neutral surfaces and a blue action hierarchy.
- Security, privacy and recovery information must not be styled as decorative success.
- Google identity colors remain Google's official icon colors and are not MoneyFlow brand tokens.

`src/components/public-brand-theme.module.css` bridges existing public CSS role names to the project token authority. It is a compatibility bridge, not a second palette owner.

## 6. Prohibited patterns

- Local hex palettes for individual routes.
- Green-first landing or authentication themes.
- Replacing the green-first theme with an unrelated screen-local blue theme.
- Brand color used for income/expense semantics.
- Color-only validation or financial meaning.
- Pure black dark mode.
- Multiple primary accent families on one screen.
- Fabricated gradients or glow effects presented as proof of financial trust.

## 7. Change process

A future palette change requires:

1. research update in `docs/research/UI_UX_RESEARCH_LEDGER.md`;
2. side-by-side candidate application to real MoneyFlow content;
3. contrast and color-vision testing;
4. owner decision recorded in `docs/design/DESIGN_DIRECTION_STATUS.md`;
5. central token update in `src/app/document-theme.css`;
6. full product, landing and auth regression review.

Do not change one route first and attempt to reconcile the system later.
