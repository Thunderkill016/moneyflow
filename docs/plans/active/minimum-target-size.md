# Minimum interactive target size

## Outcome

Every pressable control in MoneyFlow meets the 44×44px minimum that
`docs/design/CALM_LEDGER_V2.md` already requires, and a gate keeps it there.

Status: `in-progress`. The shared button contract is fixed and verified. The
per-control rules are specified below but not yet implemented.

## Repository reconnaissance

`docs/design/CALM_LEDGER_V2.md` states the contract:

> Minimum interactive target: 44×44px

Nothing enforces it. `e2e/audit/responsive.audit.spec.ts` measures horizontal
overflow, clipped money, sticky-header overlap and background ownership — it
never measures control height. So the contract has been drifting unobserved.

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

Measured, not inspected. Sweep of every pressable control (`button`,
`a.primary-button`, `a.secondary-button`, `[role=button]`, `[role=tab]`,
`summary`, `select`, checkbox/radio) across 32 routes × 3 viewports (desktop
1366, phone 390, phone 320) against a production build. Elements with a zero box
are skipped; a checkbox inside a taller `<label>` is measured as its label,
because the label is what a pointer actually hits.

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

`.edit-button` / `.delete-button` deserve separate attention: besides being
34×34, `globals.css:1340` renders them at `opacity: .25` until row hover, so the
edit and delete affordances on every transaction are both small and nearly
invisible — and hover does not exist on touch.

WCAG 2.5.8 exempts inline links in prose from the minimum, so those are not
counted as violations here.

## Specification

1. `.primary-button` and `.secondary-button` are at least 44px tall in every
   scope. No layer may override height below the base.
2. Each control in the Research table is at least 44×44, or carries a recorded
   exemption.
3. `e2e/audit/responsive.audit.spec.ts` fails when a pressable control renders
   below 44×44 at 320, 390 or 1366.
4. No new horizontal overflow at 320px.

## Implementation plan

Done in this change — only the shared base contract, because it is the one fix
provable without per-screen visual review:

- `globals.css:513` `.primary-button` `min-height` 42px → 44px.
- `globals.css:518` `.secondary-button` `min-height` 42px → 44px.
- `ai-uiux-refresh.css:140` dropped `min-height: 42px !important`, which was
  overriding the base back down on the dashboard welcome actions.

Deliberately excluded from this change, because each needs visual review at
320px where a taller control can force reflow, and `AGENTS.md` forbids drive-by
refactors: the per-control rules, the row-action affordance decision, the audit
gate, and the dead-shell CSS removal. These are the Tasks below.

Risks:

- Raising heights on dense list rows can force reflow or wrap at 320px. Each
  screen needs a 320px screenshot, not just a passing overflow check.
- The `.edit-button` opacity question is a design decision, not a CSS fix, and
  should not be resolved silently while changing size.
- Removing dead `.app-shell` rules is safe only after confirming
  `app-shell.module.css` already owns the shell's background and min-height.

## Tasks

1. Add the target-size assertion to `e2e/audit/responsive.audit.spec.ts`
   (specification item 3). Land this first, so every later fix is verified by
   the gate rather than a one-off script.
2. Raise `.edit-button` / `.delete-button` to 44×44 and decide the touch
   affordance for the `opacity: .25` default.
3. Raise the list/row action controls: `.inbox-row-dismiss`,
   `.accounts-page … actionButton`, categories `Đổi tên` / `Ẩn`,
   `.inbox-row-main`.
4. Raise the filter pills on `/transactions`, `/timeline`, `/inbox`.
5. Raise the planning controls on `/commitments`, `/income-templates`.
6. Raise `select` filters, `.landing-nav-cta`, onboarding `Tiếp`, and the
   stretched settings checkboxes.
7. Remove or re-home the dead `.app-shell` / `.sidebar` / `.topbar` rules.
   Track separately from target size; the overlap here is only diagnostic.

## Evaluation

Evidence for the base-contract fix in this change:

- Re-running the sweep reports **no** remaining `.primary-button` or
  `.secondary-button` below 44px at any of the three viewports.
- `check:knowledge`, `check:architecture`, `check:css-ownership`, `lint`,
  `typecheck` pass.
- Unit tests 598/598.
- `Expense path` e2e 4/4 (chromium + mobile-chromium).
- Cross-device audit 116 passed / 4 skipped across 7 projects. One SAFE-09
  failure appeared only when 7 projects shared a single server; the
  `chromium-iphone-390` project passes 33/33 on its own, and SAFE-09 passes in
  isolation. Demo `localStorage` is not reset between specs on a shared server —
  harness artifact, not a regression.
- `check:deployment-env` fails on unset local env vars by design; it is a Vercel
  deployment contract and is unrelated to this diff.

Not yet evidenced: specification items 2–4, which remain open in Tasks.
