# Calm Ledger v2

> **Status:** historical implementation contract. It records prior token, contrast,
> interaction and failure-prevention lessons; it is not the default direction for the
> future Brand/Product Experience rebuild. Current shipped ownership is indexed in
> `docs/design/CURRENT_DESIGN_SYSTEM.md` and future selection follows
> `docs/AI_UIUX_WORKFLOW.md` plus owner approval.

This previously controlled the 2026 system redesign. `docs/product/PRINCIPLES.md`
remains the authority for product truth and financial safety.

## Product posture

MoneyFlow is a calm personal ledger, not an adviser and not accounting
software. The interface helps a user record what happened, verify balances and
review plans they explicitly created.

The signed-in home is **Tổng quan**. **Hộp thư** is a review queue for pasted or
imported candidates. The primary daily action is **Ghi chi tiêu**.

## Visual language

- Neutral surfaces occupy at least 80% of a screen.
- One green accent identifies MoneyFlow and primary actions.
- Brand green is not reused as the only signal for income or success.
- Borders create structure; shadows are reserved for floating layers.
- Cards group one idea. Cards are not nested and are not used as page padding.
- Money is the strongest scan target after the page title.
- Decorative gradients, AI glow, glassmorphism and gamification are excluded.

## Core tokens

The tables below are the complete `--mf-*` set shipped in
`src/app/document-theme.css` — the v1 tables only listed a subset, which let
implementers invent one-off colors for states (pressed, soft text, badge
backgrounds) the shipped system already has a token for. Reuse a listed token
before adding a new one.

### Light

| Token          | Value     | Used for                                   |
| -------------- | --------- | ------------------------------------------- |
| Canvas         | `#F4F7F5` | Page background                             |
| Surface        | `#FFFFFF` | Card, dialog, input background              |
| Muted surface  | `#EDF3EF` | Hover fill, secondary panel                 |
| Strong surface | `#E3ECE7` | Pressed/selected row                        |
| Strong text    | `#102019` | Headings, primary body                      |
| Muted text     | `#5B6B62` | Secondary text, labels                      |
| Soft text      | `#76867D` | Captions, timestamps                        |
| Border         | `#D7E1DB` | Card border, divider                        |
| Strong border  | `#BDCBC3` | Input border, table rule                    |
| Brand/action   | `#0B6B3A` | Primary button, active nav, links           |
| Brand hover    | `#075A30` | Button hover                                |
| Brand pressed  | `#054625` | Button press                                |
| Brand subtle   | `#E6F4EB` | Badge/highlight background                  |
| Brand text     | `#075A30` | Brand-colored text on a neutral background  |
| On brand       | `#FFFFFF` | Text/icon drawn on a brand-filled surface   |
| Income         | `#0F766E` | Income amounts, positive state              |
| Income subtle  | `#E1F5F2` | Income badge background                     |
| Income text    | `#15803D` | Text on an income-subtle background         |
| Expense        | `#B83A35` | Expense amounts, destructive state          |
| Expense subtle | `#FBE9E7` | Expense badge background                    |
| Expense text   | `#B91C1C` | Text on an expense-subtle background        |
| Transfer       | `#3459C7` | Transfer amounts, informational state       |
| Transfer subtle| `#E9EDFF` | Transfer badge background                   |
| Transfer text  | `#1E40AF` | Text on a transfer-subtle background        |
| Warning        | `#9A5B00` | Budget-near, due-soon state                 |
| Warning subtle | `#FFF3D7` | Warning badge background                    |
| Warning text   | `#B45309` | Text on a warning-subtle background         |
| Focus ring     | `#236BC4` | Keyboard focus outline                      |

### Dark

| Token          | Value     | Used for                                   |
| -------------- | --------- | ------------------------------------------- |
| Canvas         | `#0D1511` | Page background                             |
| Surface        | `#141F19` | Card, dialog, input background              |
| Muted surface  | `#1A2820` | Hover fill, secondary panel                 |
| Strong surface | `#223229` | Pressed/selected row                        |
| Strong text    | `#F0F7F3` | Headings, primary body                      |
| Muted text     | `#A8B7AE` | Secondary text, labels                      |
| Soft text      | `#87988E` | Captions, timestamps                        |
| Border         | `#2B3B32` | Card border, divider                        |
| Strong border  | `#405247` | Input border, table rule                    |
| Brand/action   | `#4AD58A` | Primary button, active nav, links           |
| Brand hover    | `#6DE2A2` | Button hover                                |
| Brand pressed  | `#33BD74` | Button press                                |
| Brand subtle   | `#123522` | Badge/highlight background                  |
| Brand text     | `#75E4AA` | Brand-colored text on a neutral background  |
| On brand       | `#07150E` | Text/icon drawn on a brand-filled surface   |
| Income         | `#4FD1C5` | Income amounts, positive state              |
| Income subtle  | `#123B37` | Income badge background                     |
| Income text    | `#86EFAC` | Text on an income-subtle background         |
| Expense        | `#FF817A` | Expense amounts, destructive state          |
| Expense subtle | `#451F1D` | Expense badge background                    |
| Expense text   | `#FCA5A5` | Text on an expense-subtle background        |
| Transfer       | `#8EA6FF` | Transfer amounts, informational state       |
| Transfer subtle| `#202B55` | Transfer badge background                   |
| Transfer text  | `#93C5FD` | Text on a transfer-subtle background        |
| Warning        | `#F6BC62` | Budget-near, due-soon state                 |
| Warning subtle | `#402F16` | Warning badge background                    |
| Warning text   | `#FCD34D` | Text on a warning-subtle background         |
| Focus ring     | `#78B8FF` | Keyboard focus outline                      |

On brand is not a simple light/dark inversion: it exists because a single
white-text value cannot serve both themes. White on the light-mode brand
green passes at 6.6:1; the same white on the brighter dark-mode brand green
falls to 1.9:1 and fails WCAG AA, so dark mode uses a near-black on-brand
value (9.9:1) instead. Verified against WCAG 2.1's contrast formula
(<https://www.w3.org/TR/WCAG21/#contrast-minimum>): every pair above clears
4.5:1 except light-mode income text on income-subtle (4.43:1) and warning
text on warning-subtle (4.56:1) — both are safe for the ≥14px bold badge
text they're drawn for today, but do not reuse them for small regular-weight
body text without re-checking contrast.

## Typography

- UI: `var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Money: `ui-monospace, "SFMono-Regular", "SF Mono", "Cascadia Code", "Roboto Mono", monospace`
  with `font-variant-numeric: tabular-nums`.
- Body: 14–16px; never below 14px.
- Caption: 12px only for metadata.
- Page title: 32–44px desktop, 28–34px phone.
- Hero title: clamp from 42px to 72px.
- Use at most three visible type sizes in one functional region.
- Full VND values are shown in detail and editing contexts.
- Tracking scales with size, it is never one flat value: tighten letter-spacing
  on large display/hero numerals (the shipped hero and balance styles already
  sit around −0.04 to −0.055em) and leave body text at or near 0. Loosen
  slightly for all-caps labels instead. This follows the same size-specific
  tracking rule as Apple's WWDC20 "Details of UI Typography" talk, summarized
  for implementation in this repo's `apple-design` skill (§15).

## Space and shape

- 4px base rhythm.
- Phone page gutter: 16px.
- Tablet page gutter: 24px.
- Desktop page gutter: 32px.
- Content max width: 1240px.
- Chip/badge radius: 8px (`--mf-radius-sm`).
- Button/input radius: 10px (`--mf-radius-md`).
- Container radius: 16px (`--mf-radius-lg`).
- Large marketing panel radius: 24px (`--mf-radius-xl`).
- Minimum interactive target: 44×44px — stricter than WCAG 2.2's 24×24px
  target-size minimum (<https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>)
  by deliberate product choice, not an oversight; do not relax it to the
  WCAG floor.
- Shadows are reserved for floating layers, never for flat cards on the
  page canvas: `--mf-shadow-sm` (dropdowns/hover), `--mf-shadow-md` (popovers,
  toasts), `--mf-shadow-lg` (modals, sheets). Dark mode uses the same
  three-step scale over pure black instead of the tinted light-mode shadows —
  it does not skip shadows in favor of borders alone.

## Navigation

Phone navigation has five destinations maximum:

1. Tổng quan
2. Giao dịch
3. Ghi
4. Tài khoản
5. Thêm

Desktop uses the same first four destinations in a left rail. Planning and
advanced destinations are grouped and labelled; they do not compete with the
daily loop.

Fixed navigation must reserve layout space and never cover content, a toast, a
form submit action or keyboard focus.

## Financial presentation

- Income uses `+`, an upward direction where useful, a text label, and the
  semantic income token.
- Expense uses `−`, a downward direction where useful, a text label, and the
  semantic expense token.
- Transfer uses `↔`, names both accounts, and is excluded from income/expense.
- Never use color as the only difference.
- Never truncate money in a table row, detail, dialog or form.
- Summary cards may compact values only when an adjacent exact value is
  available on interaction.
- Planning values describe the user's entered plan; they do not become a
  universal spending recommendation.

## Public landing

The first desktop viewport contains:

- concise product truth;
- one primary registration action;
- one secondary in-page explanation action;
- a representative ledger preview that is fully visible;
- trust proof: no bank password, exportable data, transfers handled correctly.

The page uses Vietnamese-first copy. “CSV” and product names are the only
technical terms allowed without explanation.

## Auth

- Keep Google and email/password actions unchanged.
- Present security and ownership facts, not invented financial outcomes.
- Do not state or imply that MoneyFlow knows what the user can spend today.
- Error text appears next to its field and is announced.
- Recovery and registration share the same visual shell.

## States

Every route supports the states it can actually reach:

- loading;
- empty;
- content;
- error/recovery;
- offline or stale when relevant;
- success feedback after mutation;
- uncertain/review-required for imported candidates.

Skeletons match real content dimensions. They are never emitted as permanent
blank cards.

## Motion and focus

- Interaction (hover, press, toggle): `--mf-fast` (140ms).
- Structural change (reveal, expand/collapse, tab switch): `--mf-normal` (220ms).
- Single easing token for both: `--mf-ease` (`cubic-bezier(0.2, 0.75, 0.2, 1)`),
  a punchy ease-out. Do not introduce a second easing curve without updating
  this token.
- No entrance choreography on financial data — balances, KPI values and
  ledger/transaction rows render immediately, in every theme and viewport.
  Marketing chrome around them (section headings, feature cards, FAQ, CTA
  banners) may use a restrained scroll-reveal at the structural-change
  duration; never stagger more than two such elements at once in the same
  viewport.
- Feedback fires on pointerdown, not release — hover states are not a
  substitute for a visible `:active` state on every button and interactive
  card. This and the deeper spring/gesture physics behind it are the
  `apple-design` skill's "Response" and "Behavior Over Animation" sections;
  that skill is execution detail and does not override any rule in this file.
- Respect `prefers-reduced-motion`: this repo's global rule in
  `document-theme.css` collapses all transitions/animations to ~0 duration,
  so reduced-motion users still see the end state, just without the motion.
- Keyboard focus uses a solid 2px outline with 3px offset and at least 3:1
  contrast (`--mf-focus`), matching WCAG 2.2's focus-appearance criterion
  (<https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html>).
- A component does not move when it receives focus.

## Data visualization

v1 (`design-system.md` §11) already bans pie/donut/gauge charts and caps
multi-series charts at 5–6 colors; those rules stand under v2 and are
restated here because v2 previously said nothing about charts at all.

- Line, horizontal bar, area and sparkline only; no pie, donut, gauge or 3D.
- Chart colors are separate from semantic income/expense/transfer/warning
  tokens — a chart series color is not a financial-state color.
- Every chart has a text/table alternative for screen readers; a sparkline
  has none of its own (shape only) but the value it summarizes is always
  available as text nearby.
- Library: Tremor for new/migrated chart work. It is Tailwind-native, ships
  dark mode without hand-written overrides, and is built on Recharts, so it
  does not compete with the plotting engine already in the dependency tree —
  it replaces v1's undecided "Recharts hoặc Tremor" line. Reference:
  <https://www.tremor.so/> (Tailwind CSS + Recharts, dark mode built in).

## Migration rule

New or migrated components use CSS modules and the v2 semantic tokens. A route
must not add a new global refresh or guardrail stylesheet. When the last
consumer of a legacy stylesheet migrates, remove the import, its source-contract
test, and then the file in the same slice.

Interactive primitives already wired through Radix (dropdown-menu, slot) stay
as-is — do not migrate a working component for its own sake. For a new
component that needs a pattern Radix does not offer natively (combobox,
multi-select — both named in the category-picker search requirement),
prefer Base UI over adding another Radix package: Radix's own maintainers
now build Base UI, Radix has slowed on exactly those components since its
acquisition by WorkOS, and shadcn/ui switched to Base UI as its default
primitive layer in July 2026. Reference:
<https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default>.

## Research basis

Added in the 2026-07-29 revision, alongside the code audit above:

- WCAG 2.1 contrast minimum — <https://www.w3.org/TR/WCAG21/#contrast-minimum>
- WCAG 2.2 target size minimum — <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- WCAG 2.2 focus appearance — <https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html>
- Tremor (Tailwind + Recharts, Vercel-owned, dark mode built in) — <https://www.tremor.so/>
- shadcn/ui's July 2026 switch to Base UI as the default primitive — <https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default>
- Apple "Designing Fluid Interfaces" / "Details of UI Typography" — summarized for this repo in `.claude/skills/apple-design/SKILL.md`
