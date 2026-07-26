# Calm Ledger v2

This is the controlling visual and interaction contract for MoneyFlow's 2026
system redesign. `docs/product/PRINCIPLES.md` remains the authority for product
truth and financial safety. Older design-system sections are migration
reference where they conflict with this file.

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

### Light

| Token          | Value     |
| -------------- | --------- |
| Canvas         | `#F4F7F5` |
| Surface        | `#FFFFFF` |
| Muted surface  | `#EDF3EF` |
| Strong text    | `#102019` |
| Muted text     | `#5B6B62` |
| Border         | `#D7E1DB` |
| Brand/action   | `#0B6B3A` |
| Brand hover    | `#075A30` |
| Brand subtle   | `#E6F4EB` |
| Income/success | `#0F766E` |
| Expense/danger | `#B83A35` |
| Transfer/info  | `#3459C7` |
| Warning        | `#9A5B00` |

### Dark

| Token          | Value     |
| -------------- | --------- |
| Canvas         | `#0D1511` |
| Surface        | `#141F19` |
| Muted surface  | `#1A2820` |
| Strong text    | `#F0F7F3` |
| Muted text     | `#A8B7AE` |
| Border         | `#2B3B32` |
| Brand/action   | `#4AD58A` |
| Brand subtle   | `#123522` |
| Income/success | `#4FD1C5` |
| Expense/danger | `#FF817A` |
| Transfer/info  | `#8EA6FF` |
| Warning        | `#F6BC62` |

## Typography

- UI: Inter with system fallbacks.
- Money: system monospace with `font-variant-numeric: tabular-nums`.
- Body: 14–16px; never below 14px.
- Caption: 12px only for metadata.
- Page title: 32–44px desktop, 28–34px phone.
- Hero title: clamp from 42px to 72px.
- Use at most three visible type sizes in one functional region.
- Full VND values are shown in detail and editing contexts.

## Space and shape

- 4px base rhythm.
- Phone page gutter: 16px.
- Tablet page gutter: 24px.
- Desktop page gutter: 32px.
- Content max width: 1240px.
- Button/input radius: 10px.
- Container radius: 16px.
- Large marketing panel radius: 24px.
- Minimum interactive target: 44×44px.

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

- Interaction: 100–150ms.
- Structural change: 180–240ms.
- No entrance choreography on financial data.
- Respect `prefers-reduced-motion`.
- Keyboard focus uses a solid 2px outline with offset and at least 3:1 contrast.
- A component does not move when it receives focus.

## Migration rule

New or migrated components use CSS modules and the v2 semantic tokens. A route
must not add a new global refresh or guardrail stylesheet. When the last
consumer of a legacy stylesheet migrates, remove the import, its source-contract
test, and then the file in the same slice.
