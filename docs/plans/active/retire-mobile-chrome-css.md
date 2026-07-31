# Retire the dead mobile chrome CSS

Follows `docs/plans/active/retire-shell-css.md`. Same cluster, next slice.

## Outcome

The legacy global rules for the mobile bottom nav, the floating action button, the
capture and more sheets, the theme toggle and the desktop search/add controls are
gone. Five unit tests that were guarding those rules now read the CSS Module that
actually owns the behaviour.

Status: `implemented`. Not `verified` in production — that is the owner's step.

## Repository reconnaissance

DOM probe across `/dashboard`, `/transactions`, `/accounts`, `/settings` and
`/goals`, at 390 and 1366 — zero nodes for every class removed here:

| Class | `className` refs | `:global()` refs | DOM nodes |
|---|---|---|---|
| `.mobile-nav` | 0 | 0 | 0 |
| `.mobile-fab` | 0 | 0 | 0 |
| `.mobile-account-button` | 0 | 0 | 0 |
| `.mobile-brand`, `.mobile-avatar` | 0 | 0 | 0 |
| `.capture-sheet`, `.more-sheet` | 0 | 0 | 0 |
| `.theme-toggle` | 0 | 0 | 0 |
| `.desktop-search`, `.desktop-add` | 0 | 0 | 0 |

Everything the removed rules described is now owned by
`src/components/layout/app-shell.module.css`: `styles.mobileNav`,
`styles.mobileCapture`, `styles.mobileAccountButton`, `styles.sheet`,
`styles.mobileBrand`.

## Research

**Five green unit tests were guarding these rules.** Not one, five — and each
passed for as long as the dead rule sat in place, regardless of what the real
chrome did:

| Test | Asserted | Reality |
|---|---|---|
| `mobile-layout` — bottom nav is 5 equal columns + safe-area | `.mobile-nav` in `globals.css` | true of `.mobileNav` in the module; the asserted rule applied to nothing |
| `mobile-layout` — FAB sits above nav, content end clears FAB | `.mobile-fab` in `globals.css` | **the FAB was removed by the Calm Ledger redesign** |
| `app-shell-account-access` — mobile account trigger hidden/shown | `.mobile-account-button` in `ui-refresh.css` | true of `.mobileAccountButton` in the module |
| `ui-refresh` — mobile-first interaction contract | `.mobile-fab`, `.mobile-nav`, `.safe-card`, `env(safe-area-inset-bottom)` in `ui-refresh.css` | all four inside dead rules; that layer now contains no safe-area handling at all |
| `demo-mode-banner` — Q5 FAB z-index above sticky banner | fixed `.mobile-fab` with `var(--z-mobile-fab)` | FAB gone; **and the banner is not sticky either** |

Three of the five could be repointed at the module and became real guards, because
their claims are true there — `.mobileNav` genuinely is
`repeat(5, minmax(0, 1fr))` with `env(safe-area-inset-bottom)` in its padding and
`min-height`. Two could not, and are handled below.

**The demo-banner suite describes a UI that no longer exists.**
`.demo-mode-banner` and `.demo-mode-banner-text` have zero `className` references.
The shell renders `styles.demoBanner`, which is `margin: 18px auto 0` in normal
flow — no `position`, no `z-index`, nothing sticky. So the Q5 premise, *a sticky
banner that a floating button must out-layer*, has no counterpart in the product.
Only the FAB half was removed here; deciding what the demo banner's contract now is
belongs to the owner, not to a cleanup.

**The z-index tokens are orphaned.** `--z-mobile-fab: 34` and `--z-mobile-nav: 35`
are defined in `globals.css` and referenced by nothing. The real nav uses a literal
`z-index: 50` in the module. The surviving assertion checks their ordering, which
still documents intent, but nothing consumes them.

## Specification

1. No rule for the listed dead classes remains in the legacy global layers.
2. Rules sharing a selector list with a live class keep that class and its
   declarations.
3. Every test that asserted a removed rule either moves to the module that owns the
   behaviour, or states in the file why it cannot.
4. No route's rendering changes, at any viewport, in either theme.
5. `!important` and `unauthorizedDocumentSelectors` do not increase.

## Implementation plan

1. Probe the DOM for each candidate before touching anything.
2. Remove whole rules; edit shared ones.
3. Re-run the suite and treat every failure as a finding, not an obstacle.
4. Repoint what can be repointed; document what cannot.
5. Verify by full-page screenshot comparison.

Risks:

- **Over-matching a hyphenated neighbour**, which bit in the previous slice
  (`\.desktop-search\b` also matched `.desktop-search-link`). Handled with
  `(?![\w-])` and an automated audit of every class name appearing in a removed
  line.
- **Repointing a test so it passes rather than so it guards.** Handled by checking
  each claim against the module first; the two that were false there were not
  repointed.
- **Nothing catches a wrong deletion** — hence screenshots.

## Tasks

1. [x] DOM-probe every candidate class.
2. [x] Remove 57 rules, edit 6 shared ones.
3. [x] Repoint three tests at `app-shell.module.css`.
4. [x] Remove two assertions that cannot be repointed, with reasons in the files.
5. [x] Byte-compare full-page screenshots.

## Implementation

| Layer | Removed | Edited |
|---|---|---|
| `src/app/globals.css` | 40 | 2 |
| `src/app/ui-refresh.css` | 17 | 4 |

The six edited rules kept live co-selectors, among them
`.primary-button:disabled` and `.filter-empty button:disabled` (which had shared a
rule with `.mobile-fab:disabled`), `.profile-chip`, `.transaction-row`,
`.insights-kpi article` and `.dashboard`.

Test changes:

- `mobile-layout.test.ts` — the nav test now reads the module's phone block and
  asserts `repeat(5, minmax(0, 1fr))`, `env(safe-area-inset-bottom)`,
  `position: fixed` and `bottom: 0` **inside the `.mobileNav` rule**. The old
  file-wide safe-area match would have passed even if the nav lost its inset
  padding, because the module uses `env()` in five places. The FAB test became a
  capture-item test, plus an assertion that `.shell` owns the bottom clearance.
- `app-shell-account-access.test.ts` — repointed at `.mobileAccountButton`.
- `ui-refresh.test.ts` — dead assertions removed, reasons recorded inline.
- `demo-mode-banner.test.ts` — FAB assertions removed, token ordering kept.

## Evaluation

- [x] **72 full-page screenshots, before and after, every one byte-identical.**
      Six viewports × two themes × six routes, compared with `cmp`.
- [x] Unit tests **595/595**.

| Check | Before this slice | After |
|---|---|---|
| `!important` declarations | 1103 | **1059** |
| `check:dead-css` classes | 912 | 894 |
| `check:dead-css` unreferenced | 181 | 170 |
| `unauthorizedDocumentSelectors` | 0 | 0 |

Across both slices together: `!important` **1152 → 1059**, classes **926 → 894**.

- [x] `check:knowledge`, `check:architecture`, `lint`, `typecheck`, `build`,
      cross-device audit.

## Out of scope, observed

**126px of empty space sits below the last content on every mobile page, and part
of it is reserved for the removed FAB.** Measured on iPhone 390, `/dashboard`:

| Thing | Value |
|---|---|
| `.dashboard` `padding-bottom` | **124px** |
| `.shell` `padding-bottom` | **76px** |
| real bottom-nav height | **74px** |
| gap between last card and document end | **200px**, of which 74px is the nav |

Two clearances stack. The module's `.shell` reserves 76px for a 74px nav, which is
right. On top of that, `ui-refresh.css` gives `.dashboard`
`padding-bottom: var(--mobile-content-end)`, which resolves to
`calc(56px + 68px) = 124px` — a nav height of 56px that no longer matches the real
74px, plus 68px of clearance for a floating action button that no longer exists.

This is **live**, not dead: `.dashboard` has 34 `className` references and the rule
carries `!important`. Removing it would change layout, so it is reported rather than
touched. It needs a deliberate answer about how much bottom clearance a phone page
should have.

**`body { padding-bottom: var(--mobile-content-end) }` is inert.**
`document-theme.css:165` sets `body { padding: 0 !important }`, which wins
regardless of order. Measured `bodyPaddingBottom` is `0px` on every route. Left in
place because removing it belongs with the decision above, not before it.

**`.desktop-search-placeholder` and `.safe-card` are dead** and were not removed —
neither belongs to the sidebar/topbar/mobile-chrome families this packet covers.
