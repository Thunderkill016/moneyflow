# MF SAFE-UX — Security Hardening & Cross-Platform Repair

**Status:** automated delivery complete — authenticated owner acceptance pending  
**Owner:** MoneyFlow  
**Master issue:** #134  
**Started:** 2026-07-29  
**Production:** `https://mfvn.vercel.app`  
**Current production commit:** `7abe3b0238768682ce47d1419d6919d9fb765c4e`

## Outcome

MF SAFE-UX removes the confirmed security uncertainty, false UI signals and cross-platform defects reported during real use without turning the work into an unrestricted redesign.

Automated implementation and production delivery are complete. The plan remains active only for one final gate: the owner must open the authenticated production app on a real phone and confirm the repaired routes match the acceptance checklist below.

## Repository reconnaissance

### Findings and disposition

| ID | Finding | Result | Evidence |
|---|---|---|---|
| SAFE-01 | UI materially inconsistent across devices | pass in automated matrix | PR #142, CI #538 |
| SAFE-02 | Mobile landing hid Login | pass | PR #141; Login visible and at least 44px in browser tests; production landing contains `/login` CTA |
| SAFE-03 | Dashboard displayed stale/phantom Inbox count | pass | PR #141; authenticated count is server/RLS-derived, demo remains local-only |
| SAFE-04 | Monthly Budget mobile layout broken | pass in automated matrix | PR #142, Chromium/WebKit evidence |
| SAFE-05 | Savings Goal mobile layout broken | pass in automated matrix | PR #142, Chromium/WebKit evidence |
| SAFE-06 | Amount surfaces used misleading/inconsistent backgrounds | pass in automated matrix | PR #142; token-only neutral/semantic contract |
| SAFE-07 | 23 privileged RPC warnings were unclassified | pass — classified and permanently tested | PR #140; 23-row audit + pgTAP |
| SAFE-08 | Leaked-password protection disabled | plan-blocked | managed Supabase setting/plan constraint; not represented as fixed |
| SAFE-09 | Mobile transaction day total covered the first row while scrolling | pass in automated matrix | PR #143, CI #542 |

### Confirmed root causes

1. Mobile landing CSS intentionally hid `.loginLink` at `max-width: 560px`.
2. Authenticated Dashboard used browser-local Inbox candidates while `/inbox` used server data.
3. Legacy route styles fragmented responsive and amount-surface behavior across Dashboard, Budgets and Goals.
4. A legacy Dashboard balance treatment used strong route-local gradient declarations and needed a scoped final authority.
5. `.date-group-header` remained `position: sticky` with `top: 66px` on phones, so it overlaid the first transaction row during document scrolling.
6. The 23 `SECURITY DEFINER` RPCs are intentionally callable by `authenticated`, not by `anon` or `PUBLIC`; all audited functions derive identity from `auth.uid()`, reject unauthenticated execution and lock `search_path`.

## Research

- Generic Supabase Advisor warnings are not automatic proof of a vulnerability; catalog grants, function bodies, ownership checks and tests are authoritative.
- No DDL was changed merely to suppress an Advisor count.
- Authenticated and demo modes require separate Inbox sources of truth.
- Shared MoneyFlow tokens are the visual authority; no new hardcoded colors were introduced for the repair.
- The final `/transactions` screenshot was correctly reclassified as a day-group sticky-header defect rather than a Dashboard weekly-summary defect.

## Specification

### Security contract

- `PUBLIC` and `anon` cannot execute privileged mutation RPCs.
- Intentional browser RPCs are limited to `authenticated`.
- Every privileged mutation derives identity from `auth.uid()`, rejects unauthenticated calls, checks ownership and locks `search_path`.
- Financial invariants and cross-tenant isolation remain covered by fresh reset + pgTAP.
- Leaked-password protection remains explicitly plan-blocked until the managed Supabase setting is available and enabled.

### UI contract

- Mobile landing keeps a visible Login action with a touch target of at least 44px.
- Authenticated Inbox counts come from server state protected by RLS; demo counts remain device-local.
- Budget, Goal and equivalent amount surfaces share responsive hierarchy and token semantics.
- Neutral amounts use neutral surfaces; income, expense, warning, transfer and goal colors are semantic only.
- Phone transaction day totals stay in normal document flow, precede their rows and never overlap the first transaction.
- Supported layouts have no horizontal overflow or content hidden behind navigation/FAB.

## Implementation plan

### Delivered PR sequence

1. **#136 — SAFE-T0:** evidence baseline and automated reproductions.
2. **#140 — SAFE-T1:** 23-RPC security classification and permanent pgTAP contract.
3. **#141 — SAFE-T2/T3:** mobile Login and truthful Inbox count.
4. **#142 — SAFE-T4/T5/T6:** shared responsive, Budget, Goal and amount-surface repair.
5. **#143 — SAFE-09:** mobile transaction day total remains above rows.

### Production delivery

- Latest deployment: `dpl_uA7ye8wFwX5SF8f7xdbGDG3fZm6Y`.
- State: `READY`.
- Alias: `mfvn.vercel.app`.
- Commit: `7abe3b0238768682ce47d1419d6919d9fb765c4e`.
- `/landing`: HTTP 200 and includes a Login link.
- `/login`: HTTP 200.
- unauthenticated `/transactions`: correctly resolves to Login with `next=/transactions`.
- deployment runtime query found no `error` or `fatal` entries after smoke requests.

## Tasks

| Task | Scope | Status |
|---|---|---|
| SAFE-T0 | Evidence and reproducible baseline | complete — #136 |
| SAFE-T1 | RPC security classification | complete — #140 |
| SAFE-T2 | Mobile Login | complete — #141 |
| SAFE-T3 | Inbox source of truth | complete — #141 |
| SAFE-T4 | Shared responsive and amount-surface contract | complete — #142 |
| SAFE-T5 | Monthly Budgets | complete — #142 |
| SAFE-T6 | Savings Goals | complete — #142 |
| SAFE-T7A | Automated CI, deployment and public/redirect smoke | complete |
| SAFE-T7B | Authenticated real-phone owner acceptance | pending |
| SAFE-T8 | Leaked-password managed setting | plan-blocked; tracked by #40 |
| SAFE-T9 | Transaction day-total overlap | complete — #143 |

## Evaluation

| Criterion | Current result |
|---|---|
| Security warnings classified | pass; 23 RPCs classified/tested, leaked-password plan-blocked |
| Mobile Login available | pass automated + production HTML |
| Inbox count truthful | pass automated; authenticated production owner check pending |
| Cross-platform consistency | pass CI Chromium/WebKit matrix |
| Monthly Budgets repaired | pass CI matrix; owner production check pending |
| Savings Goals repaired | pass CI matrix; owner production check pending |
| Amount-surface semantics consistent | pass static/token and browser evidence |
| Transaction day total does not overlap rows | pass CI #542; owner production check pending |
| Deployment/runtime | READY; no error/fatal logs found during automated smoke |

### Final authenticated owner checklist

On the current production build, using the owner account on a phone:

- [ ] Landing shows **Đăng nhập** and it is easy to tap.
- [ ] Dashboard attention count equals the actionable records in `/inbox`; zero records means no phantom badge.
- [ ] Dashboard amount surfaces, Monthly Budget and Savings Goal cards have consistent neutral/semantic backgrounds.
- [ ] `/budgets` and `/goals` do not clip amounts or actions.
- [ ] On `/transactions`, scroll through multiple date groups: `HÔM NAY / HÔM QUA` and `Tổng` remain above their rows and never cover a transaction.
- [ ] No visible horizontal overflow, hydration error or blocked action occurs.

### Exit criteria

MF SAFE-UX may be archived and #134 closed only after the owner confirms the authenticated checklist, or explicitly waives that final manual evidence. SAFE-08 remains a documented plan-blocked residual risk and must not be described as fixed.
