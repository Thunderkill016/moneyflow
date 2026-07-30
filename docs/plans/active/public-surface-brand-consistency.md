# Public surface brand consistency

## Outcome

The two public entry points — the landing page and the auth screens — speak one
brand language, and each screen holds the neutral-surface floor that
`docs/design/CALM_LEDGER_V2.md` sets.

Status: `implemented`, pending owner review of the visual change.

## Repository reconnaissance

Reported by the owner: the interface is white on mobile but green on desktop,
and the desktop sign-in screen does not match the landing page either.

Both reports are the same root cause — the auth story panel — and both are
measurable.

`src/components/auth-form.module.css` owned two rules that produced it:

1. `.story` was a solid `--mf-brand-canvas` fill, covering the left column of a
   `minmax(360px, 0.82fr) / minmax(520px, 1.18fr)` desktop grid.
2. `@media (max-width: 760px) { .story { display: none } }` removed that column
   entirely on mobile.

So desktop showed a half-green split screen and mobile showed an unbranded
near-white form. Hiding `.story` also dropped everything inside it: the `h1`, the
value-proposition paragraph and the three trust claims (`Thu, chi và chuyển tiền
tách bạch`, `Xuất CSV bất cứ lúc nào`, `Không cần mật khẩu ngân hàng`). Mobile
users — the majority for a Vietnamese personal-finance app — never saw the reason
to trust the product, and the page had no `h1` at all, leaving the panel's `h2`
as its first heading.

## Research

`docs/design/CALM_LEDGER_V2.md`, "Visual language", is the controlling authority:

> - Neutral surfaces occupy at least 80% of a screen.
> - One green accent identifies MoneyFlow and primary actions.
> - Decorative gradients, AI glow, glassmorphism and gamification are excluded.

Measured brand-fill fraction by sampling rendered pixels of a production build
(saturated dark-green family counted as brand fill):

| Screen | Before | Neutral before | Rule |
|---|---|---|---|
| login desktop 1366 | 39.0% | 61.0% | **FAIL** |
| login mobile 390 | 35.9% | 64.1% | **FAIL** |
| landing desktop 1366 | 10.2% | 89.8% | pass |
| landing mobile 390 | 10.1% | 89.9% | pass |

The landing page complied; the auth screens did not. That settles which surface
moves: the auth panel adopts the landing's language, not the reverse. This was
decided by the documented rule and the measurement, not by taste.

Note on history: the flat `--mf-brand-canvas` fill was introduced earlier in this
branch's history to stop `--mf-brand` lightening to mint in dark mode. That fixed
the dark-mode defect but kept a neutral-surface violation that predated it.

## Specification

1. The auth story panel uses neutral canvas with green as an accent only.
2. Every public screen keeps neutral surfaces at or above 80%.
3. The mobile auth screen keeps the brand mark, the headline and the trust
   claims — the panel may be compacted, not deleted.
4. The mobile auth screen exposes an `h1`.
5. No decorative gradient replaces the brand fill.
6. Light and dark both remain readable, with no bright-mint surface.

## Implementation plan

- `.story`: `background: var(--mf-brand-canvas)` → `var(--mf-canvas)`,
  `color` → `var(--mf-text)`, plus a `--mf-border` right edge for structure.
- Recolour the panel's children off the inverse-on-brand mixes:
  `.brandMark` → `--mf-brand` fill, `.storyIcon` → `--mf-brand-subtle` /
  `--mf-brand-text`, `.storyKicker` → `--mf-brand-text`, body copy and
  `.trustList` → `--mf-text-muted`, tick icons → `--mf-brand-text`.
- `auth-form.tsx`: drop `tone="inverse"` from the story `BrandLockup`, now that
  the surface is light.
- Mobile: replace `display: none` with a compact band — same neutral canvas, a
  bottom border instead of the right border, decorative icon and long paragraph
  hidden so the form stays near the top, headline and trust list kept.
- Headline: adopt the landing hero's two-tone shape,
  `<h1>first. <span>second.</span></h1>` with
  `.story h1 span { color: var(--mf-brand-text) }`.
- `document-theme.css`: remove the now-unused `--mf-brand-canvas` /
  `--mf-on-brand-canvas` pair and record why no large brand-fill token exists.

Risks:

- The mobile band consumes vertical space above the form. Verified the submit
  button stays reachable at 320px.
- Replacing the authored `<br>` with a span is required: hiding a `<br>` via
  `display: none` collapses `khoản.` and `Nhìn` into `khoản.Nhìn`, because the
  break leaves no space behind. This was caught and fixed mid-implementation.

## Tasks

1. Recolour `.story` and its children to neutral + accent. — done
2. Restore the mobile band with headline and trust claims. — done
3. Adopt the landing's two-tone headline. — done
4. Remove the dead brand-canvas tokens. — done
5. Re-measure brand fill on all four screens. — done
6. Owner review of the visual change. — open

## Evaluation

Brand fill after, same measurement method:

| Screen | After | Neutral after | Rule |
|---|---|---|---|
| login desktop 1366 | 3.0% | 97.0% | pass |
| login mobile 390 | 6.5% | 93.5% | pass |
| landing desktop 1366 | 10.2% | 89.8% | pass |
| landing mobile 390 | 10.1% | 89.9% | pass |

All four now satisfy specification item 2, and the auth screens read in the same
language as the landing rather than as a different product.

Per-route checks on `/login`, `/register` and `/forgot-password` at desktop 1366,
mobile 390, mobile 320, plus dark at both widths: one visible brand lockup, zero
horizontal overflow, and the story surface reported as neutral canvas in every
combination.

Gates: `check:knowledge`, `check:architecture`, `check:css-ownership`, `lint`,
`typecheck` pass; unit tests 585/585; e2e 8/8 including the mobile
`landing → register` flow; cross-device audit 117 passed / 4 skipped across 7
projects. Screenshots reviewed at desktop 1366, mobile 390, mobile 320 and mobile
dark.

Local harness note: the first e2e run immediately after starting a shared server
failed two mobile specs on a demo-store timing race; both passed in isolation and
the whole suite passed 8/8 on re-run against the same build. CI starts a fresh
server per run and is the authority.

Not evidenced here: `check:deployment-env` (fails on unset local env vars by
design — a Vercel contract), pgTAP (no database behaviour touched), and Firefox
(CI omits `firefox-desktop`; this sandbox has Chromium only).
