# Calm Ledger daily shell and overview

**Status:** evaluating  
**Owner:** ChatGPT  
**Issue/PR:** #81 / #83  
**Last updated:** 2026-07-27

## Outcome

The signed-in MoneyFlow home uses the same Calm Ledger system as the new public surfaces. On phone, tablet and desktop, users can understand their current balance and monthly ledger, reach the primary expense action without content being covered, and move between Tổng quan, Giao dịch, Tài khoản and secondary tools through one coherent navigation model.

## Repository reconnaissance

### Current behavior

- `/insights` is the authenticated home and is composed by `MoneyFlowDashboard` inside `AppShell`.
- Before this slice, the shell depended on broad legacy global classes for sidebar, topbar, mobile navigation, FAB, sheets and toast.
- The overview stacked many planning cards after the daily ledger; empty states created long blank-looking blocks and reduced the prominence of balance, monthly movement and recent transactions.
- Existing UI-audit evidence showed the mobile bottom navigation and FAB competing with content near the viewport edge.
- Business calculations, stores, auth, RLS and route behavior already work and are reused unchanged.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/layout/app-shell.tsx` | Shared signed-in navigation, actions, sheets and toast | Reuse behavior; move presentation to a scoped Calm Ledger module |
| `src/components/layout/app-shell.module.css` | New component-owned signed-in shell visual system | Own phone/tablet/desktop shell, dialogs and toast |
| `src/components/moneyflow-dashboard.tsx` | Tổng quan hierarchy and all live finance/planning states | Reuse calculations and mutations unchanged |
| `src/app/insights/calm-ledger-overview.css` | Route-owned overview hierarchy | Scope every rule to `.insights-dashboard`; do not leak into other routes |
| `src/lib/nav-ia.ts` | Controlling information architecture | Reuse; keep five phone destinations and secondary groups |
| `src/app/calm-ledger-tokens.css` | Semantic light/dark tokens established in Slice 1 | Reuse as the only new token source |
| `e2e/audit/*` | Cross-device, dark, keyboard and 200% text evidence | Extend with shell-specific coverage |

### Existing tests and constraints

- Related unit/source tests cover navigation IA, overview calculations, empty planning copy and financial formatting.
- Database/RLS behavior is unchanged; the standard fresh reset and pgTAP gate remains mandatory.
- Browser smoke covers landing → register surface → expense capture → Tổng quan → export.
- Product rules: `/insights` stays home; Hộp thư is secondary; one primary action per viewport; VND remains integer; transfers do not affect income/expense; no daily spending recommendation.

### Similar implementation and recent history

- Slice 1 PR #82 established semantic Calm Ledger tokens and component-scoped CSS modules for landing/auth.
- This slice preserves component behavior while replacing shell visual ownership inside `AppShell` and keeping overview rules route-scoped rather than adding another root-level refresh layer.

### Open questions

- [x] Should Inbox replace Tổng quan? No; issue #81 fixes Tổng quan as home.
- [x] Should the FAB and bottom navigation both expose capture? No. The center navigation action is the phone capture entry; the separate floating button is removed.
- [x] Should planning calculations change? No; only hierarchy and presentation change in this slice.

## Research

No new external research is required. Issue #81 already records the approved navigation and WCAG target/focus evidence. This slice applies those decisions to existing behavior.

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Add another root-level override stylesheet | Fast | Repeats the cascade failure that caused the redesign | Rejected |
| Rewrite all signed-in routes together | Maximum visual consistency at once | Oversized diff, weak rollback and difficult review | Rejected |
| Component-scoped shell + route-scoped Tổng quan vertical slice | Reviewable, preserves domain behavior, reusable by following routes | Some old global selectors remain unused until later cleanup | Selected |

### Research decision

Use a CSS module anchored to `AppShell`, a route-owned stylesheet fully scoped to `.insights-dashboard`, and existing semantic tokens. Remove duplicate mobile capture affordances and make the daily ledger the first decision layer. Planning remains reachable in compact secondary areas without inventing recommendations.

## Specification

### Problem

Signed-in users encountered a visually dense shell and an overview whose primary money values competed with navigation, a floating action and many planning blocks. On narrow screens, fixed controls could cover content. The public redesign now sets a clearer standard that the product experience must match.

### User stories

- As a returning user, I can see total balance, this month's income/expense and recent ledger activity immediately.
- As a phone user, I can add an expense and navigate without controls covering content.
- As a user with or without planning data, I can find budgets, commitments, recurring income and goals without blank placeholder cards dominating the home.
- As a keyboard or low-vision user, I can identify focus and use the shell at 200% text.

### Acceptance criteria

- [ ] App shell presentation is component-scoped and uses Calm Ledger tokens in light/dark mode.
- [ ] Desktop has one stable sidebar and one clear topbar primary action.
- [ ] Phone has exactly five navigation destinations and no separate FAB covering content.
- [ ] Bottom navigation reserves enough page padding for all focusable content.
- [ ] Tổng quan prioritizes balance, month income/expense/net, category distribution and recent transactions.
- [ ] Empty planning data is visually compact rather than dominating the home.
- [ ] Populated planning data remains reachable and preserves current values/statuses.
- [ ] No horizontal overflow at 320–1440px; keyboard, dark mode, WebKit and 200% text pass.

### Required states

- Loading: server workspace loading behavior remains unchanged.
- Empty: empty ledger has one useful first action; empty planning is compact.
- Populated: large VND and long Vietnamese labels wrap or truncate intentionally without hiding exact detail values.
- Validation/error: data errors stay visible and disable unsafe mutation actions.
- Recovery/undo: existing toast and undo action remain available.
- Long data / large VND: tabular money typography and integer đồng are preserved.
- Mobile/tablet/desktop: phone bottom bar, tablet compact rail and desktop sidebar are authored layouts.
- Accessibility: 44px targets, semantic landmarks/dialogs, visible focus and reduced motion.

### Financial and security constraints

- No guessed financial data, safe-to-spend value or daily recommendation is surfaced.
- Integer VND, transfer exclusion and deterministic totals remain unchanged.
- No schema, auth, ownership or RLS changes.

### Out of scope

- Redesigning quick-capture fields/dialogs, transactions, accounts, Inbox/import, reports or settings content.
- Changing finance formulas, persistence, Supabase configuration or deployment settings.
- Removing every unused legacy selector; final cleanup follows route migration.

## Implementation plan

### Architecture fit

`AppShell` owns cross-route navigation and fixed UI. `MoneyFlowDashboard` owns overview behavior while `src/lib` owns calculations. Shell presentation moves into a component CSS module. Overview presentation is loaded by the `/insights` route and every selector is constrained to `.insights-dashboard`, leaving domain and data boundaries untouched.

### Implemented changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/layout/app-shell.module.css` | Authored phone/tablet/desktop shell, sheets and toast | Replace legacy shell styling without root cascade growth |
| `src/components/layout/app-shell.tsx` | Attach scoped shell, remove duplicate phone FAB, normalize brand, keep five phone slots | Make one navigation model authoritative |
| `src/app/insights/calm-ledger-overview.css` | Reorder visual hierarchy, emphasize monthly ledger, compact planning states and author responsive layouts | Match Calm Ledger daily decision hierarchy without finance changes |
| `src/app/insights/page.tsx` | Load the route-owned overview stylesheet | Keep overview styling isolated to `/insights` |
| `e2e/expense-path.spec.ts` | Follow the center mobile `Ghi chi tiêu` action | Preserve the core expense flow after removing the FAB |
| `e2e/audit/critical-browser.audit.spec.ts` | Assert five mobile items, no FAB, safe-area padding, no horizontal overflow and desktop shell landmarks | Prevent covered content and navigation drift |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: presentation and navigation wiring only; routes and stores remain compatible.
- Rollback: revert PR #83; Slice 1 public surfaces remain independent.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Old global classes override the shell module | Module-generated shell selectors own the fixed UI boundary |
| Route CSS leaks after client navigation | Every overview selector starts with `.insights-dashboard` |
| Removing FAB makes capture hard to find | Keep centered `Ghi chi tiêu` phone action and desktop topbar action |
| Long values overflow cards | Use `minmax(0,1fr)`, tabular money, wrapping labels and responsive stacks |
| Planning data disappears | Keep all links and populated summaries; only compact presentation |
| Dialog behavior regresses | Preserve native `<dialog>` logic and test opening/closing from mobile navigation |

### Verification plan

- Static: knowledge contract, deployment contract, lint, typecheck.
- Unit/domain: full test suite; no finance behavior changes expected.
- Database: fresh Supabase reset + pgTAP.
- Browser flow: core expense smoke and mobile shell navigation.
- Responsive/visual: 320, 360, 390, 768, 1024, 1366, 1440; light/dark; WebKit.
- Production/manual: exact merge deployment and `/insights` smoke after merge.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add focused work packet and shell acceptance contract | none | plan diff | done |
| T2 | Migrate AppShell presentation to scoped Calm Ledger module | T1 | code diff | done, verification pending |
| T3 | Recompose Tổng quan hierarchy and compact planning | T2 | route-scoped CSS diff | done, verification pending |
| T4 | Add overlap/navigation browser regression checks | T2, T3 | Playwright contract diff | done, execution blocked |
| T5 | Review, merge, deploy and verify exact production | T4 | PR/CI/Vercel evidence | blocked |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Scoped shell styling | PR #83 source diff | implemented, unverified |
| No duplicate mobile FAB | AppShell source + browser contract | implemented, unverified |
| Overview hierarchy and states | `/insights` route stylesheet | implemented, unverified |
| Cross-device/accessibility matrix | GitHub Actions run `30213073671` | blocked before runner steps |

### Review findings

- Correctness: source review complete; executable evidence is still required.
- Security/ownership: no behavior or data-layer changes.
- UI/UX/accessibility: authored responsive, focus, safe-area and reduced-motion rules; screenshot review pending.
- Maintainability/duplication: shell is component-owned and overview rules are route-scoped rather than another root refresh layer.
- Scope compliance: shell and Tổng quan only.

### Current verification blocker

GitHub Actions runs `30212867362` and `30213073671` failed before checkout: both `verify` and `database` jobs returned no steps and no logs, while `e2e` was skipped. Re-running produced the same zero-step result. This is treated as runner/account infrastructure failure, not proof that the source passes or fails. PR #83 remains draft and must not merge until a normal CI attempt executes the required gates.

### Remaining limitations

- Physical Android/iOS verification remains required before claiming full device readiness.
- Other signed-in routes retain legacy presentation until their focused slices.

## Delivery record

- Branch: `design/calm-ledger-daily-shell`
- PR: #83 (draft)
- Squash commit: pending
- CI runs: `30212867362`, `30213073671` — zero-step infrastructure failure
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: no
