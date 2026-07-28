# Calm Ledger daily shell and dashboard

**Status:** evaluating  
**Owner:** ChatGPT; human acceptance pending  
**Issue/PR:** #81 / #92  
**Supersedes:** #83  
**Related delivery repair:** #93 / #94 and `public-private-production-sync-reconciliation.md`  
**Last updated:** 2026-07-28

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

### Defects addressed

- The old shell depended on broad legacy global classes.
- Mobile had both a bottom navigation capture action and a floating capture button.
- Fixed navigation could compete with or cover content near the viewport edge.
- Overview hierarchy gave secondary planning blocks too much visual weight.
- PR #83 diverged from `main` after the canonical route and CSS foundation landed.

### Delivery defect discovered after merge

The first production synchronization omitted `src/lib/dashboard-planning-empty.ts`. Vercel rejected production commit `2a19e0b`. PR #94 restored the verified module and aligned `PlanningCardEmpty`; the corrected build succeeded before PR #92 was merged.

## Research

No new external product or API research was required. This reconciliation is grounded in repository history, PRs #90–#94, the public verification repository, the production Vercel status attached to exact commits and the current source tree.

The selected decision is to keep the deployed implementation in place, record the failed first synchronization honestly, and leave this packet in `evaluating` until authenticated production flows and final screenshots are checked.

## Specification

### Acceptance criteria

- [x] App shell presentation is component-scoped and uses Calm Ledger tokens in light and dark mode.
- [x] Desktop has one stable sidebar and one topbar primary action.
- [x] Phone has exactly five navigation destinations and no separate FAB.
- [x] Bottom navigation reserves sufficient page padding for content and focusable controls in the public verification authority.
- [x] Dashboard prioritizes balance, monthly income/expense/net, category distribution and recent transactions.
- [x] Empty planning data is compact and populated planning values retain the existing calculation sources.
- [x] Public cross-device verification reports no horizontal overflow at 320, 360, 390, 768, 1024, 1366 and 1440 px.
- [x] Public verification covers dark mode, keyboard, 200% text and WebKit critical paths.
- [x] Financial semantics, persistence, ownership and RLS remain unchanged by the slice.
- [ ] The final production deployment is manually reviewed on phone and desktop in light and dark mode.
- [ ] The authenticated production expense and export flows are verified by the owner.

### Required states

- Loading: existing server loading behavior remains unchanged.
- Empty ledger: one useful first action; no blank placeholder wall.
- Populated ledger: exact large VND values and long Vietnamese labels remain readable through `MoneyValue`.
- Error: data errors remain visible and unsafe mutations remain disabled.
- Recovery: toast and undo behavior remain available.
- Mobile/tablet/desktop: authored layouts rather than accidental wrapping.
- Accessibility: semantic landmarks/dialogs, visible focus, 44 px targets, reduced motion and financial direction that does not rely on color alone.

### Risks and checks

| Risk | Prevention |
|---|---|
| Legacy globals override the new shell | CSS Module-generated selectors own the shell boundary |
| Route CSS leaks after navigation | Dashboard rules are scoped to `.insights-dashboard` |
| Capture becomes harder to find | Center phone action and desktop topbar action remain visible |
| Fixed navigation covers content | Shell padding is asserted against navigation height |
| Large values overflow | `MoneyValue`, `minmax(0, 1fr)` and intentional wrapping without ellipsis |
| Route migration regresses | Browser tests target `/dashboard`; `/insights` is not verification authority |
| Planning values change | Presentation changes reuse existing domain helpers |
| Public verification misses a production integration dependency | Production Vercel build is required before accepting a synchronization; the omitted-module incident is recorded |

## Implementation plan

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

No schema, migration, auth, RLS, financial calculation or deployment-configuration change belongs in this packet.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Establish `/dashboard` and CSS ownership foundation | PRs #90 and #91 | done |
| T2 | Implement Calm Ledger AppShell and Dashboard hierarchy | PR #92 | done |
| T3 | Synchronize verified MoneyValue, Dashboard and Transactions work | PR #93 | done |
| T4 | Repair omitted Dashboard planning dependency | PR #94 and successful corrected build | done |
| T5 | Repair stale `/insights` and CSS Module unit assertions | PR #98; 563/563 unit tests reported passing | done |
| T6 | Reconcile this packet and the synchronization record | Replacement documentation PR | in progress |
| T7 | Verify authenticated Dashboard, redirect, expense capture and export | Owner production session | todo |
| T8 | Review final light/dark phone and desktop screenshots and close packet | Owner evidence and decision | todo |

## Evaluation

### Automated and deployment evidence

- [x] Public verification authority passed `check:knowledge`, deployment contract, CSS ownership, lint, typecheck, unit/static RLS, production build, fresh Supabase reset + pgTAP, expense-path smoke and the cross-device Chromium/WebKit audit for the synchronized runtime.
- [x] The first production integration failure was identified and repaired through PR #94.
- [x] Exact shell merge commit `c0c9b6fb9aa98f55a37f635dd029a6226467925a` reported Vercel success.
- [x] PR #98 corrected stale tests after the `/insights` to `/dashboard` migration and reported clean typecheck plus 563/563 unit tests.
- [ ] Private GitHub Actions execution remains unavailable while issue #86 is unresolved.
- [ ] Final production screenshot review in light/dark phone and desktop remains open.

### Production checks still required

- [ ] Open `/dashboard` with an authenticated owner account and confirm the final visual hierarchy.
- [ ] Open `/insights` and confirm the compatibility redirect.
- [ ] Add an expense and confirm recent transactions and Transactions totals update.
- [ ] Confirm CSV export remains reachable and functional.

### Findings and decision

- The AppShell and route styling are bounded by component/route owners and do not introduce a new root CSS owner.
- Dashboard money display is centralized through `MoneyValue`; the controller no longer owns the full presentation body.
- The first production synchronization was incomplete. The missing dependency was restored with a focused corrective PR and the corrected exact commit built successfully.
- Stale tests, not production behavior, caused the later 19-test and one-typecheck failure; PR #98 corrected those assertions.
- Direct authenticated production behavior and final screenshots remain unproven by this agent and block packet completion.

Keep the deployed release in place while the owner performs the remaining authenticated production and visual checks. Do not move this packet to `completed` or describe the slice as fully accepted until those checks are recorded.

## Scope boundary

Included:

- shared signed-in shell;
- dashboard visual hierarchy and bounded composition;
- semantic money-value migration used by Dashboard;
- shell/dashboard browser contracts;
- delivery and verification reconciliation.

Deferred to later focused slices of #81:

- quick-capture field redesign;
- accounts page and remaining Transactions visual redesign beyond the MoneyValue slice;
- Inbox/import review experience;
- budgets, recurring commitments, salary, goals and reports route redesigns;
- categories, rules, settings and export presentation;
- final legacy selector deletion after route migrations.

## Delivery record

- Branch: `design/calm-ledger-dashboard-shell`
- Primary PR: #92
- Related synchronization and repair PRs: #93 and #94
- Test-repair PR: #98
- Replacement: #83 is superseded and must not merge
- First synchronized commit: `2a19e0b` — Vercel failed because a direct dependency was missing
- Dependency repair commit: `618a0f3` — Vercel succeeded
- Shell merge commit: `c0c9b6fb9aa98f55a37f635dd029a6226467925a`
- Latest test-repair merge commit: `73caa790d30bf8111bef432d3b6d830d71022721`
- Production flow verified: pending authenticated owner session
- Work packet moved to `docs/plans/completed/`: no; remains evaluating
