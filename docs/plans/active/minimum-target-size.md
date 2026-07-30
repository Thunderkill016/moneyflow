# Minimum interactive target size

## Outcome

Every pressable control in MoneyFlow meets the 44×44px minimum that
`docs/design/CALM_LEDGER_V2.md` already requires, and a gate keeps it there.

Status: `implementation-complete; verification-pending`. The shared button fix
has already merged. The remaining controls, touch affordance and permanent audit
gate are implemented on `agent/minimum-target-size-complete`; CI and browser
evidence still decide whether this packet can close.

## Repository reconnaissance

`docs/design/CALM_LEDGER_V2.md` states the contract:

> Minimum interactive target: 44×44px

The existing `e2e/audit/responsive.audit.spec.ts` measured horizontal overflow,
clipped money, sticky-header overlap and background ownership, but did not fail
on controls below 44px. The contract could therefore drift without a blocking
gate.

Height for the two shared button classes was owned by four layers at once:

| Layer | Selector | Height |
|---|---|---|
| `globals.css:513/518` | `.primary-button` / `.secondary-button` | `42px` (base) |
| `ui-refresh.css:195` | `.app-shell .secondary-button` | `44px` — **dead** |
| `dashboard/calm-ledger-overview.css:111` | `.insights-dashboard .secondary-button` | `44px` |
| `ai-uiux-refresh.css:140` | `.insights-dashboard .welcome-actions :is(...)` | `42px !important` |

The `ui-refresh.css` patch is dead because the shell moved to a CSS Module:
`src/components/layout/app-shell.tsx:176` renders `styles.shell`, so the global
`.app-shell` class it targets no longer exists in the DOM. All 14 `.app-shell …`
selectors across `ui-refresh.css`, `ai-uiux-refresh.css`,
`cross-device-stabilization.css` and `globals.css` are dead for the same reason,
as are the `.sidebar` and `.topbar` rules (0 live TSX references each).

That is why the app shipped 42px controls while a rule claiming 44px existed.

## Research

Measured, not inspected. The original sweep covered every pressable control
(`button`, links styled as controls, `[role=button]`, `[role=tab]`, `summary`,
`select`, checkbox/radio) across 32 routes × 3 viewports (desktop 1366, phone
390, phone 320) against a production build. Elements with a zero box were
skipped; a checkbox inside a taller `<label>` was measured as its label, because
the label is what a pointer actually hits.

Result before this packet: **113 distinct undersized control shapes.**

Worst offenders, by how far below 44px and how much traffic the screen carries:

| Control | Size | Routes |
|---|---|---|
| `.edit-button` / `.delete-button` | 34×34 (36×36 mobile) | `/transactions`, `/timeline` — every row |
| `.inbox-row-dismiss` | 53.5×32 | `/inbox` |
| `.accounts-page … actionButton` | 54×32 | `/accounts` |
| categories `Đổi tên` / `Ẩn` | 68×32 / 49×32 | `/categories` |
| onboarding `Tiếp` | 390×32 | `/onboarding` |
| filter pills (`Tất cả`, `Khoản chi`, …) | 59–90×34 | `/transactions`, `/timeline`, `/inbox` |
| `.inbox-row-main` | 492×39 | `/inbox` |
| commitments/income `Sửa`, `Lưu trữ`, `.commitment-pay` | 35–42 | `/commitments`, `/income-templates` |
| `select` (category/account filters) | 154×40 | `/transactions`, `/timeline` |
| `.landing-nav-cta` | 117×40 | `/privacy` |
| stretched checkboxes in flex labels | 41.5–42.4 tall | `/settings/export`, `/settings/notifications`, `/settings/privacy` |

`.edit-button` / `.delete-button` also rendered at `opacity: .25` until row
hover, making them both small and nearly invisible on touch devices where hover
does not exist.

WCAG 2.5.8 exempts inline links in prose from the minimum, so those remain an
explicit audit exemption rather than being restyled as buttons.

## Specification

1. `.primary-button` and `.secondary-button` are at least 44px tall in every
   scope. No layer may override height below the base.
2. Each control in the Research table is at least 44×44, or carries a recorded
   exemption.
3. `e2e/audit/minimum-target-size.responsive.audit.spec.ts` fails when a
   pressable control renders below 44×44 at 320, 390 or 1366.
4. No new horizontal overflow at 320px.

## Implementation

The shared base contract merged first:

- `globals.css:513` `.primary-button` `min-height` 42px → 44px.
- `globals.css:518` `.secondary-button` `min-height` 42px → 44px.
- `ai-uiux-refresh.css:140` dropped `min-height: 42px !important`.

The remaining slice uses the existing component-owned contract pattern instead
of adding another stylesheet to `legacy.css`:

- `MinimumTargetSizeContract` mounts once from the root layout.
- Its CSS Module owns only the 44×44 pointer-target floor; route styles continue
  to own layout, colour and shape.
- Known legacy `!important` declarations receive explicit corrections rather
  than another generic refresh layer.
- Checkbox/radio glyphs remain compact while their associated labels receive the
  minimum pointer target.
- Transaction edit/delete actions are always visible on touch/coarse pointers.
  Fine pointers retain the calm 25% progressive reveal, with hover and keyboard
  focus restoring full opacity.
- Dense action groups may wrap on phones, and filter selects remain constrained
  to the viewport, preventing the taller controls from forcing horizontal
  overflow.

The blocking Playwright gate:

- runs only for the contract viewports 320, 390 and 1366;
- visits public, auth, onboarding, ledger, planning, Inbox and settings routes;
- loads populated demo transaction/Inbox state so row controls are measured;
- opens onboarding in its real incomplete state;
- measures the associated label for checkbox/radio controls;
- records the WCAG inline-prose-link exemption;
- attaches exact route, resolved path, selector and rendered dimensions when it
  fails.

## Tasks

1. [x] Add the blocking target-size assertion first.
2. [x] Raise `.edit-button` / `.delete-button` to 44×44 and decide touch
   discoverability.
3. [x] Raise Inbox, Accounts and Categories list/row actions.
4. [x] Raise filter pills on `/transactions`, `/timeline` and `/inbox`.
5. [x] Raise planning controls on `/commitments` and `/income-templates`.
6. [x] Raise select filters, `.landing-nav-cta`, onboarding `Tiếp` and settings
   checkbox labels.
7. [ ] Remove or re-home dead `.app-shell` / `.sidebar` / `.topbar` rules in a
   separate cleanup packet. This is diagnostic debt, not required to satisfy the
   target-size contract.

## Risks and review requirements

- A 44px floor can expose dense layouts that previously fit only because their
  controls were too small. The 320px audit and screenshots are therefore
  required, not optional.
- The product-wide contract uses `!important` only where needed to defeat known
  legacy `!important` height owners. CSS ownership and budget checks must remain
  green.
- The new gate deliberately measures populated states. A passing empty screen is
  not evidence for row actions.
- Dead shell CSS removal stays out of this branch to avoid an unrelated visual
  refactor.

## Evaluation

Evidence already established by the merged shared-button change:

- no `.primary-button` or `.secondary-button` below 44px at the three contract
  viewports;
- `check:knowledge`, `check:architecture`, `check:css-ownership`, `lint` and
  `typecheck` passed;
- unit tests, expense-path E2E and the prior cross-device audit passed;
- `check:deployment-env` failed only on intentionally unset local deployment
  variables.

Evidence required for this completion branch before closure:

- [ ] knowledge, architecture and CSS ownership checks;
- [ ] lint, typecheck, unit tests and production build;
- [ ] the new target-size gate has zero findings at 320, 390 and 1366;
- [ ] existing responsive audit reports no new horizontal overflow;
- [ ] screenshots for the high-risk dense screens at 320 and 390;
- [ ] CI result and owner review recorded in the PR;
- [ ] after merge, move this packet to `docs/plans/completed/` and verify the
  deployed routes.
