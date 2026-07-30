# Money never breaks across lines

## Outcome

A monetary value renders as one unbroken unit — figure and currency symbol on the
same line — at every contract viewport, and the cross-device audit fails when one
breaks.

Status: `specified`. Not implemented.

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

## Implementation plan

Preferred direction, to be confirmed by measurement:

- Give the `MoneyValue` value span `white-space: nowrap` in
  `money-value.module.css`. This is the owning rule — spec item 2.
- `nowrap` moves the pressure elsewhere: the value can then overflow its
  container instead of wrapping. So the container must be allowed to give it
  room. Check `min-width: 0` on the flex/grid ancestors in the
  `/transactions` summary tiles, and reduce the value's `font-size` at 320px if
  and only if measurement shows it still does not fit. **Do not** reach for
  `overflow: hidden` or `text-overflow: ellipsis` — that converts a wrap into a
  truncation, which the design contract forbids outright.
- Close the selector gap by widening the audit to `[data-money-value]`, which the
  component already emits. Do **not** hardcode the hashed CSS Module class
  (`money-value-module__smnRYa__value`) — that string changes between builds and
  the check would silently stop matching. Adding a second `data-money` attribute
  to the component is acceptable but redundant; prefer using the attribute that
  exists.
- Add a wrap condition alongside the clip condition: compare the element's
  rendered height against its computed `line-height` and report a finding when it
  exceeds one line. Severity `P1`, since money legibility is a product contract.

Risks:

- A hashed CSS Module class name is not stable across builds. An audit that
  hardcodes `money-value-module__smnRYa__value` will silently stop matching. Use
  `[data-money-value]`.
- `nowrap` reverses a deliberate choice. `2a19e0b` chose wrapping *over*
  truncation. If measurement shows a value cannot fit on one line at 320px even
  after container and font-size adjustment, stop and report it — the correct
  answer might be a shorter format at that width, and that is a product decision
  for the owner, not something to resolve with `overflow: hidden`.
- `line-height: normal` resolves to a number the audit must handle; fall back to
  `fontSize × 1.2` when `parseFloat` yields `NaN`.
- Raising this check to `P1` may reveal wrapped money on routes not yet measured.
  Run the sweep across all 32 routes before flipping severity, and fix what it
  finds or record an explicit exemption — do not lower the threshold to make CI
  pass.

## Tasks

1. `white-space: nowrap` on the `MoneyValue` value span, plus whatever container
   `min-width: 0` the measurement shows is needed. No `!important`, no route
   override, no truncation.
2. Add `data-money` to `MoneyValue` so the audit's existing selector reaches it.
3. Add the wrap condition to the audit's money check and give it `P1`.
4. Reconcile the two target-size thresholds: `responsive-audit.ts` still says
   `< 24` at `P2` while the new gate enforces 44 as blocking. Decide which owns
   the contract and remove the duplicate, so a future reader is not told two
   different numbers.

## Evaluation

Required evidence:

- [ ] Zero wrapped money values across all 32 routes at 320, 390 and 1366,
      measured by rendered height against `line-height` — not by eye.
- [ ] Zero truncated or clipped money on the same sweep.
- [ ] No new horizontal overflow at 320px.
- [ ] The new audit condition fails when a wrap is deliberately reintroduced —
      demonstrate the gate actually catches it, rather than trusting that it would.
- [ ] `check:knowledge`, `check:architecture`, `check:css-ownership`, `lint`,
      `typecheck`, unit tests, build.
- [ ] `test:e2e` and `test:ui-audit:pr`.
- [ ] 320px screenshot of `/transactions` reviewed.

State which of these ran and which could not. A green build is not evidence for
any of the browser items.
