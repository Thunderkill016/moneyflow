# Calm Ledger daily shell and dashboard

**Status:** evaluating  
**Owner:** ChatGPT  
**Issue/PR:** #81 / #92  
**Supersedes:** #83  
**Last updated:** 2026-07-27

## Outcome

The signed-in MoneyFlow home uses the Calm Ledger system established for the public surfaces. On phone, tablet and desktop, users can understand current balance and monthly movement, reach the primary expense action without content being covered, and navigate through one coherent information architecture.

The canonical signed-in route is `/dashboard`. `/insights` remains a compatibility redirect only.

## Product decisions

- Tổng quan remains the signed-in home; Inbox stays secondary and only becomes prominent when items require review.
- Phone navigation has exactly five destinations.
- The center phone action performs `Ghi chi tiêu`; there is no duplicate floating action button.
- Desktop exposes one primary action in the topbar.
- The overview prioritizes total balance, month income/expense/net, category distribution and recent transactions.
- Planning summaries remain secondary and compact; values and formulas do not change.
- No `Có thể chi hôm nay`, safe-to-spend value or daily spending recommendation is shown.
- VND remains integer; transfers remain excluded from income/expense.

## Foundation alignment

This slice is rebuilt from current `main` after:

- #90 made `/dashboard` the canonical signed-in route;
- #91 established two root CSS owners, one document/theme authority, frozen legacy compatibility imports and CSS ownership gates.

New styling follows those boundaries:

1. `src/components/layout/app-shell.module.css` owns reusable shell presentation.
2. `src/app/dashboard/calm-ledger-overview.css` owns dashboard presentation.
3. `src/app/dashboard/calm-ledger-overview-actions.css` owns the temporary hidden duplicate action until dashboard JSX cleanup.
4. No new root stylesheet, `html`/`body` selector or override layer is added.

## Repository reconnaissance

### Reused behavior

- `src/components/layout/app-shell.tsx` keeps search shortcuts, capture/more dialogs, account access, sign-out, toast and undo behavior.
- `src/components/moneyflow-dashboard.tsx` keeps finance calculations, mutation behavior and all live/empty/error states.
- `src/lib/nav-ia.ts` remains the navigation source of truth.
- Existing stores, auth, schema, Supabase policies and deployment configuration remain unchanged.

### Current defects addressed

- The old shell depended on broad legacy global classes.
- Mobile had both a bottom navigation capture action and a floating capture button.
- Fixed navigation could compete with or cover content near the viewport edge.
- Overview hierarchy gave secondary planning blocks too much visual weight.
- PR #83 diverged from `main` after the canonical route and CSS foundation landed.

## Implementation

| File | Change | Ownership |
|---|---|---|
| `src/components/layout/app-shell.tsx` | Attach scoped classes, remove duplicate FAB, normalize brand and dialogs, keep one mobile action model | Shared shell behavior |
| `src/components/layout/app-shell.module.css` | Phone/tablet/desktop shell, dialogs, account surfaces and toast | Component owner |
| `src/app/dashboard/page.tsx` | Load dashboard route styles while preserving server data assembly | Canonical route |
| `src/app/dashboard/calm-ledger-overview.css` | Money hierarchy, responsive layout and compact planning presentation | Route owner |
| `src/app/dashboard/calm-ledger-overview-actions.css` | Hide the obsolete in-page expense action | Temporary route interaction owner |
| `e2e/expense-path.spec.ts` | Exercise the canonical `/dashboard` expense flow and shell-owned action | Core browser smoke |
| `e2e/audit/critical-browser.audit.spec.ts` | Audit `/dashboard`, five phone items, no FAB, safe-area padding and overflow | Cross-device contract |

## Acceptance criteria

- [ ] App shell presentation is component-scoped and uses Calm Ledger tokens in light and dark mode.
- [ ] Desktop has one stable sidebar and one topbar primary action.
- [ ] Phone has exactly five navigation destinations and no separate FAB.
- [ ] Bottom navigation reserves sufficient page padding for all content and focusable controls.
- [ ] Dashboard prioritizes balance, monthly income/expense/net, category distribution and recent transactions.
- [ ] Empty planning data is compact and populated planning values remain unchanged.
- [ ] No horizontal overflow at 320, 360, 390, 768, 1024, 1366 and 1440 px.
- [ ] Dark mode, keyboard, 200% text and WebKit critical paths pass.
- [ ] Financial semantics, persistence, ownership and RLS remain unchanged.

## Required states

- Loading: existing server loading behavior remains unchanged.
- Empty ledger: one useful first action; no blank placeholder wall.
- Populated ledger: exact large VND values and long Vietnamese labels remain readable.
- Error: data errors remain visible and unsafe mutations remain disabled.
- Recovery: toast and undo behavior remain available.
- Mobile/tablet/desktop: authored layouts rather than accidental wrapping.
- Accessibility: semantic landmarks/dialogs, visible focus, 44 px targets and reduced motion.

## Risks and checks

| Risk | Prevention |
|---|---|
| Legacy globals override the new shell | CSS Module-generated selectors own the shell boundary |
| Route CSS leaks after navigation | Dashboard rules are scoped to `.insights-dashboard` |
| Capture becomes harder to find | Center phone action and desktop topbar action remain visible |
| Fixed navigation covers content | Shell padding is asserted against navigation height |
| Large values overflow | `minmax(0, 1fr)`, tabular money and intentional wrapping/truncation |
| Route migration regresses | Browser tests target `/dashboard`; `/insights` is not verification authority |
| Planning values change | Presentation-only change; no calculation/store edits |

## Verification plan

Before ready/merge:

- [ ] `npm run check:knowledge`
- [ ] `npm run check:deployment-env`
- [ ] `npm run check:css-ownership`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] static RLS checks
- [ ] production build
- [ ] fresh Supabase reset + pgTAP
- [ ] expense-path browser smoke
- [ ] production cross-device Chromium/WebKit audit
- [ ] screenshot review in light/dark phone and desktop

After merge:

- [ ] verify the exact Vercel production deployment commit;
- [ ] open `/dashboard` directly and through the `/insights` compatibility redirect;
- [ ] confirm expense capture, recent transaction display and export.

## Scope boundary

Included:

- shared signed-in shell;
- dashboard visual hierarchy;
- shell/dashboard browser contracts.

Deferred to later focused slices of #81:

- quick-capture field redesign;
- transactions and accounts pages;
- Inbox/import review experience;
- budgets, recurring commitments, salary, goals and reports;
- categories, rules, settings and export presentation;
- final legacy selector deletion after route migrations.

## Delivery record

- Branch: `design/calm-ledger-dashboard-shell`
- Draft PR: #92
- Base: current `main` after #90 and #91
- Replacement: #83 is superseded and must not merge
- Verification: pending executable CI and artifact review
- Merge commit: pending
- Production deployment: pending
