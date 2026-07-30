# Money never breaks across lines

## Outcome

A monetary value renders as one unbroken unit — figure and currency symbol on the
same line — at every contract viewport, and the cross-device audit fails when one
breaks.

Status: `implemented` in PR #163. Awaiting owner review, merge and deployed-route
verification; keep this packet active until those steps are complete.

## Repository reconnaissance

`docs/design/CALM_LEDGER_V2.md` requires that money is never truncated, and
`AGENTS.md` lists money legibility among the financial invariants. Wrapping is not
truncation, but splitting `₫` onto its own line breaks a figure into two visual
tokens and is the same class of defect: the reader can no longer scan the value
as one number.

Found while reviewing #159 by screenshotting `/transactions` at 320px. Measured
on a production build, leaf nodes matching a money pattern, comparing rendered
height against computed `line-height`:

| Route | Viewport | Value | Rendered | Lines |
|---|---|---|---|---|
| `/transactions` | 320 | `+ 15.000.000 ₫` | 113×37 | **2** |
| `/transactions` | 320 | `+ 14.609.000 ₫` | 112×37 | **2** |

At 390px both render on one line, so this is specific to the narrow end.

The element is the shared `MoneyValue` span —
`money-value-module__…__value`.

`white-space: normal` there is **deliberate, not a default.**
`src/components/money-value.module.css:1-10` sets a coherent group:
`overflow: visible`, `text-overflow: clip`, `white-space: normal`,
`overflow-wrap: normal`, `word-break: normal`, `hyphens: none`, alongside
`min-inline-size: 0` and `max-inline-size: 100%`. Introduced by `2a19e0b`.

Read together, that group says: *never break inside a number and never
ellipsize — if it does not fit, let it wrap at the existing space rather than
clip.* Wrapping was the chosen failure mode, preferred over truncation. So this
task is not "fix an oversight"; it is **replacing one failure mode with a better
one**, and it must not regress into the truncation that group was written to
avoid.

**This is pre-existing, not a regression from #159.** Verified rather than
assumed: `git checkout 6729747 -- src/`, rebuild, re-measure — identical two
values, identical 113/112px widths, identical two lines. #159 did not touch
`money-value.module.css`.

## Research

Why no gate caught it — two independent gaps in `e2e/audit/responsive-audit.ts`:

1. **Selector gap, by one attribute name.** The money check collects
   `document.querySelectorAll(".font-mono, [data-money]")`. `MoneyValue` does emit
   data attributes — `data-money-value="true"` and `data-money-tone` at
   `src/components/money-value.tsx:45-46` — but **not** `data-money`, and CSS
   attribute selectors match exact names, so `[data-money]` never matches
   `[data-money-value]`. The shared money component is therefore invisible to the
   money check across the entire product.
2. **Condition gap.** That check only reports `financial-value-clipped`, and only
   when `scrollWidth > clientWidth` **and** `overflow-x` is `hidden` or `clip`. A
   value that *wraps* has neither: it grows in height instead, and nothing fires.

So the audit is blind to wrapped money on the component that renders almost all of
it. That gap matters more than these two values.

Related and deliberately separate: the same file's `small-interactive-target`
check still reads `< 24` at severity `P2` (line ~214), while #159 added a separate
blocking 44px gate in `e2e/audit/minimum-target-size.responsive.audit.spec.ts`.
Two thresholds for one contract now exist. Reconciling them is task 4 below.

## Specification

1. A money value renders on a single line at 320, 390 and 1366px — figure and
   currency symbol never separated.
2. The fix belongs to the component that owns money presentation, not to a
   route-level override or a global `!important` layer.
3. The audit's money check reaches `MoneyValue`, not only `.font-mono` and
   `[data-money]`.
4. The audit fails on money that **wraps**, not only money that is clipped.
5. No new horizontal overflow at 320px, and no truncation introduced while
   preventing the wrap.

## Implemented direction

- `MoneyValue` now owns `white-space: nowrap` while retaining
  `overflow: visible`, `text-overflow: clip`, `overflow-wrap: normal`,
  `word-break: normal` and `hyphens: none`. No hidden overflow, ellipsis,
  `!important` or route override was introduced.
- `MoneyValue` emits both `data-money` and `data-money-value` so the product-wide
  money audit reaches the shared component through a stable semantic attribute.
- The audit reports `financial-value-wrapped` at `P1`. It counts distinct rendered
  text-line fragments from `Range.getClientRects()` rather than using the element
  box height; this catches a real wrap without misclassifying a flex item that is
  merely stretched taller than its text.
- The daily goal rate is one `MoneyValue` including `/ngày`, so the entire money
  expression is unbroken. Legacy budget amounts were migrated from raw
  `formatMoney`/`.font-mono` markup to `MoneyValue` without changing calculations
  or shortening the display format.
- The broad responsive audit no longer contains the obsolete 24px target-size
  threshold. The dedicated blocking 44px spec is the single owner.

## Risks and decisions

- A hashed CSS Module class name is not stable across builds. The audit uses
  semantic attributes and never hardcodes `money-value-module__…__value`.
- `nowrap` reverses a deliberate choice, but the full values fit at 320px after
  renderer ownership was corrected. No shorter monetary format was needed or
  introduced.
- The first height-based implementation produced a false positive on the daily
  goal rate because a flex item was stretched. The final gate measures text-line
  fragments directly and retains the demonstrated red proof from a real wrap.

## Tasks

1. [x] `white-space: nowrap` on the `MoneyValue` value span. No `!important`, no
   route override and no truncation.
2. [x] Add `data-money` to `MoneyValue` so the audit's existing selector reaches it.
3. [x] Add the wrap condition to the audit's money check and give it `P1`.
4. [x] Remove the duplicate 24px target-size check; the dedicated 44px blocking
   spec owns the contract.

## Evaluation

Required evidence:

- [x] Zero wrapped money values across the production cross-device route sweep,
      including 320, 390 and 1366. Final CI run #623 passed. The final gate counts
      rendered text-line fragments rather than relying on box height.
- [x] Zero truncated or clipped money on the same sweep. The 278 attached audit
      JSON records contain no `financial-value-clipped` finding.
- [x] No new horizontal overflow at 320px. Final audit artifacts report
      `documentWidth: 320` for both normal and rich `/transactions` states.
- [x] The gate was proven red before the fix. CI run #617 failed with
      `financial-value-wrapped` on `/transactions` at 320px for
      `+ 12.345.678.900 ₫` (three rendered lines), `− 987.654.321 ₫` (two lines)
      and `+ 11.358.024.579 ₫` (three lines), while verify and database remained
      green.
- [x] `check:knowledge`, `check:architecture`, `check:css-ownership`, `lint`,
      `typecheck`, unit tests and production build passed in CI run #623.
- [x] Expense-path E2E and the production cross-device UI audit passed in CI run
      #623; Playwright evidence was uploaded.
- [x] The 320px `/transactions` screenshot was reviewed in both empty and rich
      states. `12.345.678.900 ₫`, `987.654.321 ₫` and `4.567.890.123 ₫` remain on
      one line with no visible clipping, ellipsis or document overflow.

PR #163 remains open and unmerged as required. After owner review and merge,
verify the deployed routes before moving this packet to `docs/plans/completed/`.
