# Calm Ledger daily shell and overview

**Status:** implementing  
**Owner:** ChatGPT  
**Issue/PR:** #81 / pending  
**Last updated:** 2026-07-27

## Outcome

The signed-in MoneyFlow home uses the same Calm Ledger system as the new public surfaces. On phone, tablet and desktop, users can understand their current balance and monthly ledger, reach the primary expense action without content being covered, and move between Tổng quan, Giao dịch, Tài khoản and secondary tools through one coherent navigation model.

## Repository reconnaissance

### Current behavior

- `/insights` is the authenticated home and is composed by `MoneyFlowDashboard` inside `AppShell`.
- The shell still depends on broad legacy global classes for sidebar, topbar, mobile navigation, FAB, sheets and toast.
- The overview stacks many planning cards after the daily ledger; empty states create long blank-looking blocks and reduce the prominence of balance, monthly movement and recent transactions.
- Existing UI-audit evidence shows the mobile bottom navigation and FAB competing with content near the viewport edge.
- Business calculations, stores, auth, RLS and route behavior already work and must be reused.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/layout/app-shell.tsx` | Shared signed-in navigation, actions, sheets and toast | Reuse behavior; move presentation to a scoped Calm Ledger module |
| `src/components/moneyflow-dashboard.tsx` | Tổng quan hierarchy and all live finance/planning states | Reuse calculations and mutations; simplify presentation hierarchy |
| `src/lib/nav-ia.ts` | Controlling information architecture | Reuse; keep 5 phone destinations and secondary groups |
| `src/app/calm-ledger-tokens.css` | Semantic light/dark tokens established in Slice 1 | Reuse as the only new design token source |
| `e2e/audit/*` | Cross-device, dark, keyboard and 200% text evidence | Extend with shell-specific coverage |

### Existing tests and constraints

- Related unit/source tests cover navigation IA, overview calculations, empty planning copy and financial formatting.
- Database/RLS behavior is unchanged; the standard fresh reset and pgTAP gate remains mandatory.
- Browser smoke covers landing → register surface → expense capture → Tổng quan → export.
- Product rules: `/insights` stays home; Hộp thư is secondary; one primary action per viewport; VND remains integer; transfers do not affect income/expense; no daily spending recommendation.

### Similar implementation and recent history

- Slice 1 PR #82 established semantic Calm Ledger tokens and component-scoped CSS modules for landing/auth.
- The same migration pattern is used here: preserve component behavior while replacing visual ownership inside the component boundary rather than adding another global refresh stylesheet.

### Open questions

- [x] Should Inbox replace Tổng quan? No; issue #81 fixes Tổng quan as home.
- [x] Should the FAB and bottom navigation both expose capture? The center navigation action remains the primary phone capture entry; a second floating button must not cover content.
- [x] Should planning calculations change? No; only hierarchy and presentation change in this slice.

## Research

No new external research is required. Issue #81 already records Material navigation and WCAG target/focus evidence. This slice applies those approved decisions to existing behavior.

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Add another global override stylesheet | Fast | Repeats the cascade failure that caused the redesign | Rejected |
| Rewrite all signed-in routes together | Maximum visual consistency at once | Oversized diff, weak rollback and difficult review | Rejected |
| Component-scoped shell + Tổng quan vertical slice | Reviewable, preserves domain behavior, reusable by following routes | Some old global selectors remain unused until later cleanup | Selected |

### Research decision

Use scoped CSS modules anchored to `AppShell` and `MoneyFlowDashboard`, reuse the new semantic tokens, remove duplicate mobile capture affordances, and make the daily ledger the first decision layer. Planning remains available below a compact secondary section without inventing recommendations.

## Specification

### Problem

Signed-in users currently encounter a visually dense shell and an overview whose primary money values compete with navigation, FABs and many planning blocks. On narrow screens, fixed controls can cover content. The public redesign now sets a clearer standard that the product experience does not yet match.

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
- [ ] Empty planning data uses one compact planning entry area rather than multiple large blank cards.
- [ ] Populated planning data remains reachable and preserves current values/statuses.
- [ ] No horizontal overflow at 320–1440px; keyboard, dark mode, WebKit and 200% text pass.

### Required states

- Loading: server workspace loading behavior remains unchanged.
- Empty: empty ledger has one useful first action; empty planning is compact.
- Populated: large VND and long Vietnamese labels wrap or truncate intentionally without hiding exact detail values.
- Validation/error: data errors stay visible and disable unsafe mutation actions.
- Recovery/undo: existing toast and undo action remain available.
- Long data / large VND: tabular money typography and integer đồng are preserved.
- Mobile/tablet/desktop: phone bottom bar, tablet compact shell and desktop sidebar are authored layouts.
- Accessibility: 44px targets, semantic landmarks/dialogs, visible focus and reduced motion.

### Financial and security constraints

- No guessed financial data, safe-to-spend value or daily recommendation.
- Integer VND, transfer exclusion and deterministic totals remain unchanged.
- No schema, auth, ownership or RLS changes.

### Out of scope

- Redesigning quick-capture fields/dialogs, transactions, accounts, Inbox/import, reports or settings content.
- Changing finance formulas, persistence, Supabase configuration or deployment settings.
- Removing every unused legacy selector; final cleanup follows route migration.

## Implementation plan

### Architecture fit

`AppShell` owns cross-route navigation and fixed UI. `MoneyFlowDashboard` owns overview composition while `src/lib` owns calculations. Presentation moves into component-scoped modules, leaving domain and data boundaries untouched.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/layout/app-shell.module.css` | Add authored phone/tablet/desktop shell, sheet and toast system | Replace legacy shell styling without global cascade growth |
| `src/components/layout/app-shell.tsx` | Attach scoped root, remove duplicate phone FAB and normalize brand copy | Make one navigation model authoritative |
| `src/components/moneyflow-dashboard.module.css` | Add overview hierarchy, compact planning and responsive money layout | Match Calm Ledger daily decision hierarchy |
| `src/components/moneyflow-dashboard.tsx` | Attach scoped overview root and compact empty planning composition | Reduce blank/card-heavy home while preserving live data |
| `e2e/audit/critical-browser.audit.spec.ts` | Add shell overlap/navigation contract | Prevent covered content and duplicate capture controls |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: class and CSS presentation only; routes and stores remain compatible.
- Rollback: revert this focused branch/PR; Slice 1 public surfaces remain independent.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Old global classes override the module | Anchor all rules to a hashed module root with higher component-local specificity |
| Removing FAB makes capture hard to find | Keep the centered “Nhập nhanh” bottom-nav action and desktop topbar action |
| Long values overflow cards | Use minmax(0,1fr), tabular money, wrapping labels and responsive stacks |
| Planning data disappears | Keep links and populated summaries; only consolidate empty presentation |
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
| T2 | Migrate AppShell presentation to scoped Calm Ledger module | T1 | responsive shell screenshots | in progress |
| T3 | Recompose Tổng quan hierarchy and compact empty planning | T2 | empty/populated screenshots | todo |
| T4 | Add overlap/navigation browser regression checks | T2, T3 | green Playwright matrix | todo |
| T5 | Review, merge, deploy and verify exact production | T4 | PR/CI/Vercel evidence | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Scoped shell styling | pending | pending |
| No mobile control overlap | pending | pending |
| Overview hierarchy and states | pending | pending |
| Cross-device/accessibility matrix | pending | pending |

### Review findings

- Correctness: pending.
- Security/ownership: no behavior or data-layer changes planned.
- UI/UX/accessibility: pending screenshot and browser evidence.
- Maintainability/duplication: component modules replace, rather than extend, legacy visual ownership.
- Scope compliance: shell and Tổng quan only.

### Remaining limitations

- Physical Android/iOS verification remains required before claiming full device readiness.
- Other signed-in routes retain legacy presentation until their focused slices.

## Delivery record

- Branch: `design/calm-ledger-daily-shell`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: no
