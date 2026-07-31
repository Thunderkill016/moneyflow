# Dialogs sit where they belong

Closes issue #145 — "P1: Desktop dialogs render as narrow panels pinned to the
top-left".

## Outcome

Every modal in the product is placed deliberately: centred on desktop and tablet,
a bottom sheet on phones. The placement is asserted by a browser test at both ends
of the range, so the next global dialog rule cannot undo it quietly.

Status: `implemented`. Not `verified` in production — that is the owner's step.

## Repository reconnaissance

Measured at 1366x900 before the fix, in the browser rather than by reading CSS:

| Dialog | Rect | Computed margin | `:modal` |
|---|---|---|---|
| `.account-dialog` | `[0, 0, 510, 574]` | `0px` on all sides | yes |
| `.transaction-dialog` | `[0, 0, 580, 820]` | `0px` on all sides | yes |

So the markup was correct: both were opened through `showModal()`, both matched
`:modal`, both had the right width. Only the margin was wrong.

The browser centres a modal with its own UA rule, `dialog:modal { margin: auto }`.
Any author rule beats a UA rule, and Tailwind Preflight ships one that matches
every element including `<dialog>`:

```css
*, ::before, ::after, ::backdrop {
  box-sizing: border-box;
  border: 0 solid;
  margin: 0;
  padding: 0;
}
```

That zeroed the centring product-wide, which is why #145 saw the same symptom in
three unrelated flows.

Eleven modals were mapped. Ten carry `.transaction-dialog` or `.account-dialog`
from `globals.css`. The eleventh — the "Ghi giao dịch" capture chooser — is styled
by `src/components/layout/app-shell.module.css` as `.sheet`.

**Nothing existing caught this.** The cross-device audit's only dialog check is
`dialog-clipped-without-scroll`, which fires when a dialog is vertically clipped
without a scroll container. A dialog sitting in the corner is not clipped, so the
audit was green while every modal in the product was visibly broken.

## Research

No external research. The behaviour is specified, and the specifications settle it:

- The HTML Standard's rendering section gives modal dialogs the UA rule
  `dialog:modal { margin: auto }` — which is why removing an author override is a
  fix rather than a new layout decision.
- CSS Cascade and Inheritance defines `:where()` as contributing zero specificity to
  its argument. That is the whole mechanism relied on here.
- Author origin beats user-agent origin, so a Preflight reset of `margin` silently
  outranks the UA centring without any warning.

The product question — centred modal or deliberate side sheet — is answered by the
issue itself, which accepts either and rejects only the corner. Centred is what the
dialogs were already sized for (`width: min(510px, calc(100vw - 32px))`), so it is
the smaller change and the one chosen.

## Specification

From the issue's acceptance criteria:

1. Ghi chi tiêu, Ghi giao dịch and Thêm tài khoản are each positioned and sized
   correctly on desktop.
2. Desktop dialogs keep consistent viewport margins and max-width behaviour.
3. Overlay, focus trap, close button and keyboard dismissal keep working.
4. Mobile sheet behaviour stays correct.
5. Regression coverage spans at least one desktop and one mobile viewport for the
   shared dialog primitive.

Plus one constraint the issue does not state, which turned out to be the whole
difficulty: **the fix must not outrank any bottom-sheet rule.**

## Implementation plan

1. Reproduce in the browser and record the rects, rather than inferring from CSS.
2. Map every modal and note which stylesheet owns each one's layout.
3. Restore the centring with the lowest specificity that still beats Preflight.
4. Add browser coverage that branches on viewport, asserting centring above the
   phone breakpoint and sheet geometry below it.
5. Prove the new coverage fails without the fix, and fails again for the naive fix.

Risks:

- **The obvious fix breaks phones.** Handled by `:where()`; see the table below.
- **A test that cannot find its trigger skips silently.** Handled by asserting the
  trigger's presence before clicking.
- **Measuring during the open animation.** Handled by waiting on `getAnimations()`.

## Tasks

1. [x] Reproduce and measure the corner placement at 1366x900.
2. [x] Map all eleven modals and their owning stylesheets.
3. [x] Add `:where(dialog:modal) { margin: auto; }` and revert the intermediate
   `dialog.` prefixing of the phone rules.
4. [x] Add `e2e/audit/modal-dialog.responsive.audit.spec.ts`, covering all three
   flows named in #145 plus focus trap and Escape.
5. [x] Add the specificity invariant to `src/lib/mobile-layout.test.ts`, so a bare
   `dialog:modal` fails without a browser.
6. [x] Prove the spec red in both directions before trusting it.

## Implementation

One declaration, beside the dialog base rules in `globals.css`:

```css
:where(dialog:modal) { margin: auto; }
```

`:where()` is load-bearing, not decoration. The first attempt was the obvious
`dialog:modal { margin: auto }` — and that is a regression, because specificity
decides:

| Rule | Specificity |
|---|---|
| `dialog:modal` | (0,1,1) |
| `.transaction-dialog`, `.account-dialog` phone override | (0,1,0) |
| `.sheet` in `app-shell.module.css` | (0,1,0) |
| `:where(dialog:modal)` | (0,0,0) |

At (0,1,1) the centring rule beats both sheet rules regardless of source order, so
fixing the desktop corner would have flattened every phone bottom sheet into a
floating card. At (0,0,0) it loses to both and still beats Preflight, which is also
(0,0,0) but appears earlier via `@import "tailwindcss"` — source order decides
between equals.

An intermediate version instead raised the phone rules to `dialog.transaction-dialog`
to match. That works for `globals.css` and does nothing for the CSS Module, whose
class name is hashed and cannot be paired this way. It was reverted.

## Evaluation

Both directions were proved, by editing the stylesheet, rebuilding and re-running —
not by reasoning about specificity:

| Stylesheet | desktop-1366 | phone-320 |
|---|---|---|
| No centring rule (the #145 state) | **2 failed** | 2 passed |
| `dialog:modal { margin: auto }` | 2 passed | **2 failed** |
| `:where(dialog:modal) { margin: auto }` | 2 passed | 2 passed |

The middle row is the point. That version fixes the reported bug, passes desktop,
and breaks phones — and it is what a reasonable fix looks like.

Criteria, against evidence:

- [x] Ghi chi tiêu — `dialog.transaction-dialog[open]`, centred within 2px.
- [x] Thêm tài khoản — `dialog.account-dialog[open]`, centred within 2px.
- [x] Ghi giao dịch — the chooser, driven through its sidebar trigger and identified
      by its heading, centred at 768 and 1366. Skipped below 760px with the width
      recorded, because it has no phone entry point: the sidebar is `display: none`
      and the centre mobile nav button runs Ghi chi tiêu directly.
- [x] Consistent margins and max-width — unchanged; only `margin` moved, each
      dialog keeps its own `width: min(...)`.
- [x] Overlay, focus trap, close and keyboard dismissal — asserted: focus lands
      inside the open modal, Escape closes it.
- [x] Mobile sheet behaviour — asserted positively at 320 and 390: flush left, full
      viewport width, resting on the bottom edge.
- [x] Coverage at a desktop and a mobile viewport — the spec takes its viewport from
      the audit project, so it runs at 320, 390, 768, 1366 and 1440 and branches on
      `PHONE_MAX_WIDTH`.

Gates run here: `check:knowledge`, `check:css-ownership` (1152 `!important`,
unchanged), `lint`, `typecheck`, unit tests **595/595**, `build`, and the
cross-device audit — **340 passed across all 11 chromium projects, 0 chromium
failures**, 123 skipped. The 18 `webkit-*` failures in that run are `browserType.launch:
Executable doesn't exist`; WebKit is not installed in this container, so they are
environment, not product. CI runs them. `test:db` and `test:e2e` were not run.

Two things worth carrying forward:

**A test whose trigger cannot be found is worse than no test.** The chooser case
first skipped on every project, because it was looking for a button named "Ghi giao
dịch" — that string is the dialog's heading, not its trigger, which is labelled
"Nhập nhanh". A silent skip on the one dialog a global rule is most likely to break
is false assurance, so the test now asserts its trigger exists before clicking, and
`test.skip` states the width when it declines to run.

**Animations lie to the first measurement.** The `dialog-in` scale transform makes a
320px sheet read as `left: 1.69px`. The spec waits for `getAnimations()` to finish
rather than loosening the assertion to tolerate it.

## Out of scope, observed

Below 1100px the sidebar collapses to icons and hides its labels with
`display: none`, which also removes them from the accessible name — so the capture
trigger and every sidebar link have no accessible name at tablet widths. Recorded,
not fixed; it belongs to an accessibility packet, not to #145.

`.gitignore` listed `/output/playwright/`, but `playwright.audit.config.ts` writes
to `/output/playwright-audit/`, so audit traces sat untracked and lintable. Added,
since this change adds a spec that writes there.
