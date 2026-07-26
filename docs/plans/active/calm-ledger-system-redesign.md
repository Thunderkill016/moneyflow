# MoneyFlow Calm Ledger system redesign

**Status:** in progress  
**Owner:** ChatGPT  
**Issue:** #81  
**Branch:** `design/calm-ledger-system`  
**Last updated:** 2026-07-26

## Outcome

Redesign the public landing page, authentication, and every signed-in route as
one maintainable Calm Ledger interface. The redesign must make daily manual
recording fast, keep financial meaning exact, work from 320px upward, and remove
the accumulated refresh/guardrail cascade instead of adding another override
layer.

## Product truth

- MoneyFlow is a Vietnamese, manual-first personal ledger.
- The signed-in home is **Tổng quan** at `/insights`.
- Hộp thư is an import/paste review queue, not the default home.
- The primary daily action is **Ghi chi tiêu** and remains one tap away.
- Money is integer VND. Detail views never abbreviate values.
- Transfers between the user's accounts do not count as income or expense.
- No safe-to-spend, daily allowance, or financial advice is shown without a
  separately researched and approved model.
- Production copy must not advertise a demo route that redirects to sign-in.
- Domain and environment behavior continue to come from the existing config
  contract, never from hard-coded deployment values.

## Evidence

### Current UI

- `globals.css` is 7,725 lines and the imported refresh/guardrail styles contain
  more than 1,000 `!important` declarations in total.
- Semantic variables such as border and text tokens are redefined by multiple
  files.
- Landing is 5,574px tall at 1366px; the product preview is not fully visible in
  the first viewport and supporting copy mixes Vietnamese and English.
- Both public demo CTAs point at `/insights`, which redirects to
  `/login?next=%2Finsights` in production.
- Auth story copy still claims MoneyFlow tells a user how much they can spend
  today.
- The mobile overview capture shows the fixed navigation/FAB overlapping
  content and several blank panels extending the page.
- Tổng quan and Hộp thư currently express competing information architectures.

### Repository areas

| Area                                  | Role                        | Migration                                      |
| ------------------------------------- | --------------------------- | ---------------------------------------------- |
| `src/app/layout.tsx`                  | Global CSS and theme boot   | Keep theme boot; replace legacy public imports |
| `src/app/globals.css`                 | Legacy product styles       | Freeze, then shrink by vertical slice          |
| `src/app/*refresh*.css`               | Historical patches          | Remove as their routes migrate                 |
| `src/components/landing-page.tsx`     | Public conversion page      | Rewrite with CSS module                        |
| `src/components/auth-form.tsx`        | Login/register/recovery     | Rewrite visual shell; keep actions             |
| `src/components/layout/app-shell.tsx` | Shared signed-in navigation | Rebuild in daily-flow slice                    |
| page components                       | Route-specific content      | Migrate in route groups                        |

## Research

### Product patterns

- Actual Budget starts manual use with accounts, balances, then transactions;
  it also treats owned-account transfers separately from spending.
  <https://actualbudget.org/docs/getting-started/starting-fresh/>
- Money Lover presents quick daily transaction entry, categories, budgets and a
  single report view as its visible core.
  <https://moneylover.me/>

### Interaction standards

- Material 3 bottom navigation is for three to five top-level destinations.
  <https://m3.material.io/components/navigation-bar/guidelines>
- WCAG 2.2 target-size minimum is 24×24 CSS px or sufficient spacing; MoneyFlow
  keeps a stronger 44×44px product target.
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- WCAG 2.2 focus appearance calls for a visible indicator with an area at least
  equivalent to a 2px perimeter and 3:1 contrast.
  <https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html>

## Design contract

### Direction

**Calm Ledger**: neutral-first surfaces, one green brand accent, high-contrast
money typography, flat containers, restrained motion, and no AI glow,
glassmorphism, card soup, or gamified financial language.

### Hierarchy

1. The screen's decision and primary money value.
2. The one primary action.
3. Context needed to verify the value.
4. Secondary navigation and planning.

### Tokens

- Brand/action green is distinct from semantic income/success.
- Expense, transfer, warning and uncertainty each have their own semantic token.
- State is never conveyed by color alone.
- Dark mode uses authored dark surfaces; it is not an inversion.
- Inter is the UI font; tabular system mono is used for money.

### Navigation

| Surface | Primary destinations                                                     |
| ------- | ------------------------------------------------------------------------ |
| Phone   | Tổng quan, Giao dịch, Ghi, Tài khoản, Thêm                               |
| Tablet  | Compact rail or phone navigation according to usable width               |
| Desktop | Tổng quan, Giao dịch, Ghi nhanh, Tài khoản; planning and advanced groups |

Hộp thư appears in the advanced group and may show a count. It does not replace
Tổng quan as the signed-in home.

## Delivery slices

### Slice 1 — Foundation + public surfaces

- [ ] Add the v2 token source of truth.
- [ ] Rewrite landing with a complete first-viewport product preview.
- [ ] Replace the fake demo CTA with an in-page “Xem cách hoạt động” action.
- [ ] Rewrite auth presentation and remove stale spending-advice copy.
- [ ] Remove legacy landing/auth CSS imports and replace their source tests.
- [ ] Verify public light/dark, 320–1440px, keyboard and 200% text.

### Slice 2 — Daily flows

- [ ] Rebuild app shell and navigation.
- [ ] Migrate Tổng quan.
- [ ] Migrate quick capture and transaction dialogs.
- [ ] Migrate transactions/timeline and accounts.
- [ ] Migrate Hộp thư/import review.
- [ ] Add populated, large-VND and long-Vietnamese states.

### Slice 3 — Planning and settings

- [ ] Migrate budgets and commitments.
- [ ] Migrate recurring income and goals.
- [ ] Migrate reports and categories.
- [ ] Migrate rules, imports, settings and export.
- [ ] Remove superseded refresh/guardrail files and dead selectors.

## Verification

- Lint, typecheck, unit tests and production build.
- Chromium: 320, 360, 390, 768, 1024, 1366 and 1440.
- WebKit critical paths on phone and tablet.
- Light and dark themes.
- Keyboard-only landing, auth, capture and transactions.
- 200% text for public, auth, capture and transactions.
- Empty/content/loading/error plus long labels and large VND.
- No page-level horizontal overflow.
- No fixed navigation or FAB covers focusable content.
- Manual physical Android/iOS check remains required before claiming complete
  device readiness.

## Rollback

Each slice is a focused PR. Public CSS modules can be reverted independently
from signed-in migrations. Business logic, database schema and RLS are outside
this redesign unless a separately scoped issue proves a required change.
