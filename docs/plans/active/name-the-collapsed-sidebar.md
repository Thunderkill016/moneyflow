# Name the collapsed sidebar

## Outcome

Every interactive control in the app shell has an accessible name at every width,
and a browser test enforces it across all four authenticated routes.

Status: `implemented`. Not `verified` in production — that is the owner's step.

## Repository reconnaissance

Found while fixing #145, not by looking for it: the modal spec could not locate the
capture chooser's trigger by accessible name at tablet widths, which is a symptom,
not an inconvenience.

`src/components/layout/app-shell.module.css`, inside `@media (max-width: 1100px)`:

```css
.brand > span:last-child,
.navLink > span,
.navButton > span,
.settingsLink > span,
.profileSlot :global(.profile-chip-copy),
.profileSlot :global(.profile-chip > svg:last-child) {
  display: none;
}
```

`display: none` removes a node from the accessible name computation. The icons are
`aria-hidden="true"` (`src/components/icons.tsx:127`). So between 761px and 1100px
the sidebar's controls had **no accessible name at all** — not a poor one, none.

Measured with an accessible-name probe over every focusable element on
`/dashboard`, `/transactions`, `/accounts` and `/settings`:

| Viewport | Unnamed controls per route |
|---|---|
| 320 (phone) | 0 |
| 390 (phone) | 0 |
| 768 (tablet portrait) | **5** |
| 1024 (tablet landscape) | **5** |
| 1366 (desktop) | 0 |
| 1440 (wide) | 0 |

**20 unnamed controls in total**, and the same five everywhere: Tổng quan, Giao
dịch, Nhập nhanh, Tài khoản, Cài đặt. A screen reader announced them as bare
"link", "link", "button", "link", "link".

The zeroes at each end are as informative as the fives in the middle. At 1366 the
labels are visible. At 390 the sidebar is `display: none` entirely, so its controls
are not in the accessibility tree — absent, not nameless. **The defect lived only
in the band between**, which is why no amount of testing at phone and desktop would
have found it.

`Brand` was already correct: it carries `aria-label="MoneyFlow, về Tổng quan"`, so
hiding its span costs nothing. That is the pattern the rest should have followed.

**No gate could have caught this.** The layout is correct, contrast is correct,
target size is correct, nothing overflows, and every existing check passes. The
name is simply absent, and nothing in this repository looks at names.

## Research

WCAG 2.1 **4.1.2 Name, Role, Value** (Level A) requires that for every user
interface component, the name is programmatically determinable. A control with no
accessible name fails it outright — this is not a "could be better" finding.

**2.4.4 Link Purpose (In Context)** (Level A) is also implicated for the four links:
purpose must be determinable from the link text, and there is none.

The accessible name computation (`accname`) walks the subtree for text, skipping
nodes that are `display: none`, `visibility: hidden` or `aria-hidden`. Both
exclusions apply here at once — the label is hidden by CSS and the icon is hidden
by ARIA — which is exactly why the result is empty rather than merely poor.

**2.5.3 Label in Name** (Level A) constrains the fix: where a control has visible
text, the accessible name must contain it. Using `aria-label` with the *same*
string that is rendered satisfies this at every width. Using a different, "more
descriptive" string would not.

No external research beyond the specifications was needed. The behaviour is fully
determined by them.

## Specification

1. Every focusable control in the app shell has a non-empty accessible name at
   every audited width.
2. Where a control also shows visible text, the accessible name is that same text
   (2.5.3), not a paraphrase.
3. The visible rendering does not change at any width. This is a naming fix, not a
   restyle — the sidebar still collapses to icons below 1100px.
4. Regression coverage checks **every** control, not the five known ones.

## Implementation plan

1. Probe every focusable element on all four authenticated routes at six widths and
   record the exact count, rather than assuming the sidebar is the only offender.
2. Name the controls in the component, not the stylesheet.
3. Add a spec that computes names generically.
4. Prove it red before the fix and green after.

Risks:

- **A CSS-side fix would be fragile.** Swapping `display: none` for a
  visually-hidden technique also works, but it leaves the name dependent on a
  stylesheet that another change can undo — the same failure mode as #145. Naming
  in the component makes the name independent of CSS. Rejected the CSS route for
  that reason.
- **A test that lists the five known controls cannot catch the sixth.** The spec
  therefore enumerates every focusable element and asserts the set of unnamed ones
  is empty.
- **`aria-label` overrides content.** Safe only while the string is identical to
  the rendered label; both read from `item.label`, so they cannot drift.
- **`aria-label` is a styling hook in this codebase.** This is not a general truth
  about ARIA and it was nearly assumed away. `src/app/ai-uiux-guardrails.css:63`
  styles `a[aria-label="MoneyFlow, về Tổng quan"] > span:first-child` — it swaps
  the brand mark for `icon.svg` through an attribute selector, with `!important`
  and a `forced-colors` variant. So "ARIA attributes cannot change rendering" is
  false here. The selector uses `=`, not `*=`, and none of the five new labels
  equals that string — but the claim was verified by screenshot rather than by
  reading the selector, because that is the class of assumption this repository has
  already punished.

## Tasks

1. [x] Probe all focusable controls at 320, 390, 768, 1024, 1366 and 1440.
2. [x] Add `aria-label` to `.navLink`, `.navButton` and `.settingsLink`.
3. [x] Add `e2e/audit/nav-accessible-name.responsive.audit.spec.ts`.
4. [x] Prove the spec red without the fix.
5. [x] Confirm the rendering is unchanged.

## Implementation

Three attributes in `src/components/layout/app-shell.tsx`:

```tsx
aria-label={item.label}   // navButton — "Nhập nhanh"
aria-label={item.label}   // navLink   — Tổng quan, Giao dịch, Tài khoản
aria-label="Cài đặt"      // settingsLink
```

Each reads the same string that is rendered in the adjacent `<span>`, so the
visible and accessible names are the same text by construction, and 2.5.3 holds
without a second source of truth to keep in step.

Nothing in the stylesheet changed. The sidebar still collapses to icons below
1100px, which is the intended design.

## Evaluation

The spec was proved red before it was trusted, on the unmodified `main` build:

| Build | 768 | 1024 | 1366 | 390 |
|---|---|---|---|---|
| Before the fix | **4 failed** | **4 failed** | 4 passed | 4 passed |
| After the fix | 4 passed | 4 passed | 4 passed | 4 passed |

Full run after the fix, six projects × four routes: **24 passed, 0 failed.**

The two green columns in the "before" row matter as much as the red ones: they show
the spec is measuring the real condition rather than failing everywhere for some
unrelated reason.

Criteria:

- [x] Non-empty accessible name at every audited width — asserted generically.
- [x] Accessible name equals the visible text — both from `item.label`.
- [x] Rendering unchanged — **6 sidebar screenshots, before and after, every one
      byte-identical**, compared with `cmp`: 768, 1024 and 1366, in light and dark.
      Not asserted from "ARIA has no visual effect", which is false in this
      codebase; see the risk above.
- [x] Coverage checks every control, not a list of known ones.

Gates run: `check:knowledge`, `check:architecture`, `check:css-ownership` (1152
`!important`, unchanged; `unauthorizedDocumentSelectors` 0), `lint`, `typecheck`,
unit tests 595/595, `build`, and the cross-device audit — **368 passed, 0 chromium
failures**, 123 skipped. The 18 `webkit-*` failures are `browserType.launch:
Executable doesn't exist`; WebKit is not installed in this container. `test:db` and
`test:e2e` not run here; CI runs them.

One incidental, disclosed rather than folded in: `npm run lint` reported 184 errors
in 7 files, all of them Playwright trace artifacts under `output/`, left by the run
that proved this spec red. `eslint.config.mjs` now ignores `output/**`. Without it,
the honest workflow — run the audit, watch it fail, then fix — leaves `lint` red on
generated code and reads as a broken branch.

## Out of scope, observed

The profile chip's name text (`.profile-chip-copy`, "Minh Anh") is hidden by the
same rule. It is not an interactive control in the accessibility tree, so it is not
a 4.1.2 failure and this spec does not flag it — but the viewer's name being absent
at tablet widths is a content decision worth a deliberate answer rather than a
side effect of a display rule.

Sighted mouse users still get nothing at collapsed widths: an icon-only sidebar with
no tooltip. `title` would serve them, but `title` is already used on one nav link
for an unrelated hint ("Kế hoạch nằm dưới Tổng quan"), so adding it needs a design
decision about which of the two wins. Recorded, not done — this packet fixes a
Level A failure and stops there.
