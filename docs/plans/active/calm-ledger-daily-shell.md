# Calm Ledger daily shell and dashboard

**Status:** evaluating  
**Owner:** ChatGPT; human acceptance pending  
**Issue/PR:** #81 / #92  
**Supersedes:** #83  
**Related delivery repair:** #93 / #94 and `public-private-production-sync-reconciliation.md`  
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

This slice was rebuilt from the CSS and route foundation after:

- #90 made `/dashboard` the canonical signed-in route;
- #91 established two root CSS owners, one document/theme authority, frozen legacy compatibility imports and CSS ownership gates.

New styling follows those boundaries:

1. `src/components/layout/app-shell.module.css` owns reusable shell presentation.
2. `src/app/dashboard/calm-ledger-overview.css` owns dashboard presentation.
3. `src/app/dashboard/calm-ledger-overview-actions.css` owns the temporary hidden duplicate in-page action until its JSX is removed.
4. No new root stylesheet, `html`/`body` selector or override layer is added.

## Repository reconnaissance

### Reused behavior

- `src/components/layout/app-shell.tsx` keeps search shortcuts, capture/more dialogs, account access, sign-out, toast and undo behavior.
- `src/components/moneyflow-dashboard.tsx` keeps finance calculations, mutation behavior and all live/empty/error states while delegating presentation to bounded Dashboard components.
- `src/lib/nav-ia.ts` remains the navigation source of truth.
- Existing stores, auth, schema, Supabase policies and deployment configuration remain unchanged.

### Current defects addressed

- The old shell depended on broad legacy global classes.
- Mobile had both a bottom navigation capture action and a floating capture button.
- Fixed navigation could compete with or cover content near the viewport edge.
- Overview hierarchy gave secondary planning blocks too much visual weight.
- PR #83 diverged from `main` after the canonical route and CSS foundation landed.

### Delivery defect discovered after merge

The first public-to-private synchronization omitted `src/lib/dashboard-planning-empty.ts`. Vercel rejected private commit `2a19e0b`. PR #94 restored the exact verified module and aligned `PlanningCardEmpty`; the corrected build succeeded before PR #92 was merged.

## Implementation

| File | Change | Ownership |
|---|---|---|
| `src/components/layout/app-shell.tsx` | Attach scoped classes, remove duplicate FAB, normalize brand and dialogs, keep one mobile action model | Shared shell behavior |
| `src/components/layout/app-shell.module.css` | Phone/tablet/desktop shell, dialogs, account surfaces and toast | Component owner |
| `src/app/dashboard/page.tsx` | Load dashboard route styles while preserving server data assembly | Canonical route |
| `src/app/dashboard/calm-ledger-overview.css` | Money hierarchy, responsive layout and compact planning presentation | Route owner |
| `src/app/dashboard/calm-ledger-overview-actions.css` | Hide the obsolete in-page expense action | Temporary route interaction owner |
| `src/components/dashboard/` | Split overview and planning presentation from the Dashboard controller | Dashboard composition owners |
| `src/components/money-value.tsx` | Render exact semantic money values with accessible direction | Reusable component owner |
| `e2e/expense-path.spec.ts` | Exercise the canonical `/dashboard` expense flow and shell-owned action | Core browser smoke |
| `e2e/audit/critical-browser.audit.spec.ts` | Audit `/dashboard`, five phone items, no FAB, safe-area padding and overflow | Cross-device contract |

## Acceptance criteria

- [x] App shell presentation is component-scoped and uses Calm Ledger tokens in light and dark mode.
- [x] Desktop has one stable sidebar and one topbar primary action.
- [x] Phone has exactly five navigation destinations and no separate FAB.
- [x] Bottom navigation reserves sufficient page padding for all content and focusable controls in the public verification authority.
- [x] Dashboard prioritizes balance, monthly income/expense/net, category distribution and recent transactions.
- [x] Empty planning data is compact and populated planning values retain the existing calculation sources.
- [x] Public cross-device verification reports no horizontal overflow at 320, 360, 390, 768, 1024, 1366 and 1440 px.
- [x] Public verification covers dark mode, keyboard, 200% text and WebKit critical paths.
- [x] Financial semantics, persistence, ownership and RLS remain unchanged by the slice.
- [ ] The final private production deployment is manually reviewed on phone and desktop in light and dark mode.
- [ ] The authenticated production expense and export flows are verified by the owner.

## Required states

- Loading: existing server loading behavior remains unchanged.
- Empty ledger: one useful first action; no blank placeholder wall.
- Populated ledger: exact large VND values and long Vietnamese labels remain readable through `MoneyValue`.
- Error: data errors remain visible and unsafe mutations remain disabled.
- Recovery: toast and undo behavior remain available.
- Mobile/tablet/desktop: authored layouts rather than accidental wrapping.
- Accessibility: semantic landmarks/dialogs, visible focus, 44 px targets, reduced motion and financial direction that does not rely on color alone.

## Risks and checks

| Risk | Prevention |
|---|---|
| Legacy globals override the new shell | CSS Module-generated selectors own the shell boundary |
| Route CSS leaks after navigation | Dashboard rules are scoped to `.insights-dashboard` |
| Capture becomes harder to find | Center phone action and desktop topbar action remain visible |
| Fixed navigation covers content | Shell padding is asserted against navigation height |
| Large values overflow | `MoneyValue`, `minmax(0, 1fr)` and intentional wrapping without ellipsis |
| Route migration regresses | Browser tests target `/dashboard`; `/insights` is not verification authority |
| Planning values change | Presentation-only changes reuse existing domain helpers |
| Public verification misses a private integration dependency | Private Vercel build is now required before accepting a sync; the omitted module incident is recorded in the reconciliation packet |

## Verification record

Before public merge / synchronization authority:

- [x] `npm run check:knowledge`
- [x] `npm run check:deployment-env`
- [x] `npm run check:css-ownership`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] static RLS checks
- [x] production build
- [x] fresh Supabase reset + pgTAP
- [x] expense-path browser smoke
- [x] production cross-device Chromium/WebKit audit
- [ ] final private production screenshot review in light/dark phone and desktop

Private integration and deployment:

- [x] The initial private integration failure was identified and repaired through PR #94.
- [x] The exact final private commit `c0c9b6fb9aa98f55a37f635dd029a6226467925a` reports Vercel success.
- [ ] Open `/dashboard` with an authenticated owner account and confirm the final visual hierarchy.
- [ ] Open `/insights` and confirm the compatibility redirect.
- [ ] Add an expense and confirm recent transaction and Transactions totals update.
- [ ] Confirm CSV export remains reachable and functional.

## Independent evaluation

### Findings

- The AppShell and route styling are bounded by component/route owners and do not introduce a new root CSS owner.
- Dashboard money display is centralized through `MoneyValue`; the controller no longer owns the full presentation body.
- The first private sync was not independently integration-tested and omitted a required module. This is a process failure, not an accepted implementation detail.
- The missing dependency was restored with a focused corrective PR and the final exact production commit builds successfully.
- Direct authenticated production behavior and final screenshots remain unproven by this agent and block packet completion.

### Decision

Keep the deployed release in place while the owner performs the remaining authenticated production and visual checks. Do not move this packet to completed or describe the slice as fully accepted until those checks are recorded.

## Scope boundary

Included:

- shared signed-in shell;
- dashboard visual hierarchy and bounded composition;
- semantic money-value migration used by Dashboard;
- shell/dashboard browser contracts.

Deferred to later focused slices of #81:

- quick-capture field redesign;
- accounts page and remaining Transactions visual redesign beyond the MoneyValue slice;
- Inbox/import review experience;
- budgets, recurring commitments, salary, goals and reports route redesigns;
- categories, rules, settings and export presentation;
- final legacy selector deletion after route migrations.

## Delivery record

- Branch: `design/calm-ledger-dashboard-shell`
- PR: #92
- Related synchronization PRs: #93 and #94
- Replacement: #83 is superseded and must not merge
- First synchronized commit: `2a19e0b` — Vercel failed because a direct dependency was missing
- Dependency repair commit: `618a0f3` — Vercel succeeded
- Final shell merge commit: `c0c9b6fb9aa98f55a37f635dd029a6226467925a`
- Production deployment: Vercel status `success` for the final commit
- Production flow verified: pending authenticated owner session
- Work packet moved to `docs/plans/completed/`: no; remains evaluating
