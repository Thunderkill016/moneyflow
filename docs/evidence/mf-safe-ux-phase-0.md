# MF SAFE-UX Phase 0 — evidence baseline

**Plan:** `docs/plans/active/mf-safe-ux.md`  
**Master issue:** #134  
**Phase:** SAFE-T0 / evidence lock and reproducible baseline  
**Captured:** 2026-07-29

## Evidence handling

The owner supplied mobile screenshots from production. This record intentionally does not copy the visible display name, balances, transaction amounts, email addresses, tokens, or other financial details.

The screenshots establish the following sanitized observations:

- the signed-in Dashboard differs materially from the intended cross-platform hierarchy;
- the landing page on mobile has no visible **Đăng nhập** action;
- the Dashboard advertises pending Inbox records that are not actionable after navigation;
- the Dashboard planning cards for **Ngân sách tháng** and **Mục tiêu tiết kiệm** have inconsistent hierarchy, spacing, and empty-state presentation on mobile;
- amount/KPI surfaces use backgrounds that do not follow one obvious semantic contract.

## Reproduction matrix

| Finding | Route/state | Reproduction | Expected | Actual baseline | Owner |
|---|---|---|---|---|---|
| SAFE-01 | `/dashboard`, `/inbox`, `/budgets`, `/goals`; mobile/tablet/desktop | open the same signed-in state at 390×844, 430×932, 768×1024, and 1440×900 | shared hierarchy, gutters, surfaces, and actions | visual treatment differs by route and viewport | shared layout/CSS owners |
| SAFE-02 | `/landing`; logged out; ≤560px | open landing and inspect the header | visible Login path with ≥44px target | `.loginLink` is hidden by a mobile media rule | `landing-page.module.css` |
| SAFE-03 | `/dashboard` → `/inbox`; authenticated; stale local candidates present | load Dashboard, observe pending count, open the attention item | count equals actionable server-backed Inbox rows | Dashboard count can come from localStorage while Inbox loads server state | `moneyflow-dashboard.tsx`, client Inbox facade |
| SAFE-04 | `/dashboard` budget card and `/budgets`; mobile | inspect empty and populated budget states | readable hierarchy, no clipping, stable actions | mobile hierarchy and surface treatment require repair | Dashboard planning CSS + Budgets page CSS |
| SAFE-05 | `/dashboard` goal card and `/goals`; mobile | inspect empty and populated goal states | readable hierarchy, no clipping, stable actions | mobile hierarchy and surface treatment require repair | Dashboard planning CSS + Goals page CSS |
| SAFE-06 | Dashboard KPI, budget, goal, weekly amount surfaces; light/dark | compare equivalent amount roles | neutral by default; semantic tint only for real status | surfaces use route/local treatments without a single testable contract | token authority + route CSS |

## Confirmed code findings

### SAFE-02 — mobile Login

`src/components/landing-page.module.css` contains a `max-width: 560px` rule that sets `.loginLink` to `display: none`. This is a confirmed root cause, not a design hypothesis.

### SAFE-03 — pending Inbox count

`MoneyFlowDashboard` reads `countPending(readStoredCandidates())` from browser storage without restricting the read to demo mode. The authenticated Inbox path uses `loadInboxForClient(false)`, which migrates/lists server data. The count and drill-down therefore have different possible authorities.

### SAFE-04 / SAFE-05 — Dashboard planning cards

The Dashboard renders both cards in `DashboardPlanningColumn`. The mobile stylesheet hides `.section-heading p` for every planning panel and reuses the same generic `.budget-number`/`.budget-foot` structure for Budget and Goal amounts. Phase 3 must test the Dashboard cards as well as `/budgets` and `/goals`.

### SAFE-06 — amount surfaces

The first Dashboard KPI receives a brand gradient while other amount surfaces use route-local neutral or semantic styles. This baseline does not declare the gradient itself unsafe; it establishes that equivalent financial roles need an explicit shared contract and light/dark verification.

## Live security baseline

Supabase Security Advisor for the live MoneyFlow project returned:

- 23 warnings of type `authenticated_security_definer_function_executable`;
- 1 warning of type `auth_leaked_password_protection`.

These are classification inputs, not proof that 23 exploitable vulnerabilities exist. SAFE-T1 must produce one audit row per RPC and change only functions that fail the security contract.

The leaked-password setting remains plan-dependent because it is a managed Auth capability. It must be recorded as enabled or plan-blocked; it must not be simulated with weaker application code.

## Automated baseline

The Phase 0 PR adds temporary characterization tests that lock the currently observed code paths:

- the mobile CSS currently hides Login;
- Dashboard currently reads pending Inbox count from local storage for all runtime modes;
- Dashboard Budget/Goal cards currently share the mobile heading and amount structure;
- Chromium/WebKit critical route coverage includes Dashboard, Inbox, Budgets, and Goals;
- mobile artifacts record computed layout and background values for the planning cards.

Characterization assertions are intentionally replaced or inverted by the corresponding repair PR. They must not remain as assertions of defective behavior after SAFE-T2–T6.

## Phase 0 gate

SAFE-T0 is complete only when:

- every SAFE finding has a route/state/reproduction and code owner;
- sanitized evidence is linked from #134;
- browser artifacts cover the critical routes in Chromium and WebKit;
- static characterization tests lock confirmed root causes;
- no production data, credentials, or financial descriptions are committed.
