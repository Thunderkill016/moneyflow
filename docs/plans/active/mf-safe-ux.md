# MF SAFE-UX — Security Hardening & Cross-Platform Repair

**Status:** active — planning and evidence lock  
**Owner:** MoneyFlow  
**Master issue:** #134  
**Branch/PR:** `agent/mf-safe-ux-plan` / #135  
**Started:** 2026-07-29

## Outcome

MoneyFlow must eliminate security uncertainty, false UI signals and cross-platform inconsistencies without turning the work into an unrestricted redesign.

This plan covers:

- Supabase security findings and privileged RPC classification;
- missing mobile login access;
- phantom/stale Inbox attention count;
- inconsistent UI across mobile, tablet and desktop;
- mobile defects in Monthly Budgets and Savings Goals;
- incorrect or inconsistent background colors on amount surfaces.

## Repository reconnaissance

### Owner-reported findings

| ID | Finding | Initial severity | Evidence |
|---|---|---:|---|
| SAFE-01 | UI differs materially across mobile/tablet/desktop | P1 UX | owner report + screenshots |
| SAFE-02 | Mobile landing has no visible Login action | P1 | owner report + code-confirmed root cause |
| SAFE-03 | Dashboard shows 7 pending-review items but Inbox has nothing actionable | P1 correctness/UX | owner report + code-confirmed source mismatch candidate |
| SAFE-04 | Monthly Budget UI is broken/inconsistent on mobile | P1 UX | owner screenshots |
| SAFE-05 | Savings Goal UI is broken/inconsistent on mobile | P1 UX | owner screenshots |
| SAFE-06 | Amount-card backgrounds use inconsistent/incorrect semantic colors | P2 visual semantics | owner screenshots |
| SAFE-07 | Privileged Supabase RPC warnings require complete classification | P1 security | live Security Advisor |
| SAFE-08 | Leaked-password protection is disabled | P2 security/config | live Security Advisor |

### Confirmed technical findings

1. `src/components/landing-page.module.css` hides `.loginLink` at `max-width: 560px`; this directly causes SAFE-02.
2. `MoneyFlowDashboard` reads pending Inbox count from localStorage for all runtime modes, while `/inbox` loads/migrates authenticated server data. This can produce a stale or phantom count and is the leading root-cause candidate for SAFE-03.
3. Supabase live Security Advisor on 2026-07-29 returned:
   - 23 `authenticated_security_definer_function_executable` warnings;
   - 1 `auth_leaked_password_protection` warning.
4. `/budgets` responsive owners include `budget-overview`, `budget-card-grid`, `budget-category-metrics`, progress and action rows.
5. `/goals` responsive owners include `goal-hero`, `goal-card-grid`, amount/progress sections and `goal-actions`.
6. Amount colors are currently distributed across global/route styles; the fix must use shared MoneyFlow tokens rather than hardcoded route patches.

## Research

### Evidence interpretation

- The historical Supabase screenshot is evidence that the Advisor surface previously reported a larger problem count, but the live Advisor result is the source of truth for implementation.
- The 23 live RPC warnings are generic exposure warnings, not automatic proof that all 23 functions are vulnerable.
- SAFE-02 has a confirmed CSS root cause and does not require speculative redesign.
- SAFE-03 has a confirmed data-source mismatch in code; exact runtime behavior still needs an automated reproduction before implementation.
- The owner screenshots establish visible Budget, Goal and amount-surface defects; Phase 0 must convert each visual complaint into a named route/state/viewport reproduction.

### Related authorities

- #40 remains the authority for the managed leaked-password setting constraint.
- #72 contains a broader route/state UI audit; SAFE-UX is narrower and owner-defect-driven.
- #53 remains a domain roadmap and must not be pulled into this repair plan unless a listed defect requires it.
- `docs/REAL_USE_READINESS_CONTRACT.md` remains the readiness evidence authority; SAFE-UX does not rewrite historical TRUST-7 claims.

## Specification

### Scope boundaries

#### In scope

- evidence-driven security hardening;
- auth/RLS/RPC privilege verification;
- navigation truth and Inbox count correctness;
- responsive layout repair;
- shared amount-surface semantic color contract;
- regression tests and production verification.

#### Out of scope

- logo or brand redesign unrelated to a defect;
- new product features;
- import/reconciliation/rules roadmap unless required to fix a listed finding;
- mass-changing all SECURITY DEFINER functions just to reduce Advisor count;
- publishing real financial data, credentials, tokens or private email addresses.

### Security contract

Every flagged RPC needs an audit row containing:

- function name and call path;
- whether browser execution is intentional;
- `PUBLIC`, `anon`, `authenticated` EXECUTE grants;
- unauthenticated rejection;
- `auth.uid()` use;
- ownership checks for every entity ID;
- locked safe `search_path`;
- cross-tenant/BOLA resistance;
- financial invariant/idempotency behavior;
- pgTAP/runtime evidence;
- final decision: retain definer, convert invoker, move schema or revoke.

Generic warnings are not proof of a vulnerability. An RPC is changed only if its actual contract is unsafe or unnecessarily privileged.

### UI contract

- Every supported route must preserve the same hierarchy and design-token meanings across mobile, tablet and desktop.
- A visible count or CTA must lead to the exact action/data it claims.
- Neutral financial amounts use neutral surfaces by default.
- Semantic colors are reserved for real income, expense, warning, transfer or goal states.
- Touch targets are at least 44px and content remains usable at 200% text.
- No implementation may weaken Auth/RLS or expose sensitive data to solve a presentation problem.

## Implementation plan

### Phase 0 — Evidence lock and reproducible baseline

- [ ] Attach sanitized owner screenshots to #134 or linked implementation PRs.
- [ ] Capture `/`, `/login`, `/dashboard`, `/inbox`, `/budgets`, `/goals`.
- [ ] Viewports: 390×844, 430×932, 768×1024, 1440×900.
- [ ] Browsers: Chromium and WebKit.
- [ ] Themes: light and dark.
- [ ] Text scale: 100% and 200%.
- [ ] Record route, state, exact reproduction, expected result and actual result for every finding.
- [ ] Reconcile the historical Advisor screenshot with the current live Advisor result.
- [ ] Map each finding to component/CSS/server/database owner and planned test.

**Gate:** no finding remains a vague visual complaint without a reproducible route/state.

### Phase 1 — Security classification and hardening

- [ ] Build the 23-function RPC audit matrix.
- [ ] Verify `PUBLIC` and `anon` cannot execute privileged mutation RPCs.
- [ ] Verify intentionally callable RPCs are limited to `authenticated`.
- [ ] Verify `auth.uid()`, ownership predicates and unauthenticated rejection.
- [ ] Verify safe `search_path` on every definer function.
- [ ] Add or strengthen cross-tenant, ID-reuse and unauthenticated pgTAP tests.
- [ ] Preserve VND integer, transfer net-zero, split-total and idempotency invariants.
- [ ] Change only functions that fail the contract.
- [ ] Re-run live Security Advisor after any DDL.
- [ ] Record leaked-password protection as enabled if the plan supports it, otherwise plan-blocked with the managed-setting constraint.
- [ ] Check exposed tables/views, client keys, service-role exposure and authorization metadata usage.

**Gate:** 0 unclassified security warnings and 0 unintended `PUBLIC`/`anon` privileged execution paths.

### Phase 2 — Navigation truth and Inbox correctness

#### SAFE-02 — Mobile Login

- [ ] Keep a visible Login action at 320–430px.
- [ ] Login touch target is at least 44px.
- [ ] Login and register/start CTA do not overlap or crowd the brand.
- [ ] Keyboard/focus order remains correct.
- [ ] Add landing mobile regression tests.

#### SAFE-03 — Pending-review count

- [ ] Define one source of truth per runtime mode.
- [ ] Authenticated Dashboard count comes from authenticated Inbox/server state.
- [ ] Demo Dashboard count comes from demo local state only.
- [ ] Stale demo/local candidates cannot appear as authenticated pending count.
- [ ] Clicking the chip opens the same pending records represented by the count.
- [ ] Zero pending items removes the stale badge/chip.
- [ ] Reload and local→server migration do not reintroduce phantom items.
- [ ] Add unit and browser tests for 0, 1, 7 and post-approval states.

**Gate:** every visible count drills down to exactly the represented actionable records.

### Phase 3 — Cross-platform UI repair

#### Shared responsive contract — SAFE-01

- [ ] Use consistent content width, page gutters, heading hierarchy and vertical rhythm.
- [ ] Use shared surface, border, radius and typography tokens.
- [ ] No horizontal overflow at supported viewports.
- [ ] No amount clipping or accidental font shrinking.
- [ ] No overlapping actions.
- [ ] Bottom navigation/FAB never covers the final actionable content.
- [ ] Prefer shared root-cause fixes over route-local override sheets.

#### Monthly Budgets — SAFE-04

- [ ] `budget-overview` stacks or wraps cleanly on mobile.
- [ ] Summary labels and amounts remain readable at 200% text.
- [ ] Category card hierarchy remains clear.
- [ ] `budget-category-metrics` stacks/wraps without compression.
- [ ] Progress bars remain visible and accurately labeled.
- [ ] “Xem giao dịch”, “Sửa”, and “Xóa hạn mức” have ≥44px targets and do not overflow.
- [ ] Near/over-budget state uses a controlled semantic cue rather than an unnecessarily tinted full card.

#### Savings Goals — SAFE-05

- [ ] `goal-hero` does not force three amount panels into narrow columns on mobile.
- [ ] Long VND values do not clip, overflow or become unreadably small.
- [ ] Goal cards preserve name → deadline → progress → amounts → remaining → actions hierarchy.
- [ ] “Dành thêm”, “Rút ra”, “Sửa”, and “Lưu trữ” wrap/stack with ≥44px targets.
- [ ] Active/archived/achieved states remain distinguishable without breaking color semantics.

#### Amount surfaces — SAFE-06

- [ ] Neutral surface is the default amount-panel background.
- [ ] Income/expense/warning/goal subtle colors are used only when they communicate a real status.
- [ ] Decorative color must not imply that a neutral amount is positive, negative or dangerous.
- [ ] Equivalent amount roles use equivalent background/border/text treatment across Dashboard, Budgets and Goals.
- [ ] Light/dark contrast passes.
- [ ] No new hardcoded color outside the token authority.

**Gate:** screenshot matrix passes on 4 viewports × 2 browsers × 2 themes, including 200% text.

### Phase 4 — Delivery and production verification

- [ ] Use bounded PRs by root cause: security, navigation/Inbox, shared UI token contract, Budgets, Goals.
- [ ] Every PR runs knowledge, deployment config, CSS ownership, architecture, lint, typecheck, unit/static-RLS and build gates.
- [ ] DDL changes run fresh reset + pgTAP + live Advisor before/after.
- [ ] UI changes run Chromium/WebKit route-state screenshots.
- [ ] Production-smoke mobile Login.
- [ ] Production-smoke Inbox count and drill-down.
- [ ] Production-smoke Budgets and Goals on mobile/tablet/desktop.
- [ ] Verify no console, hydration or horizontal-overflow errors.
- [ ] Record commit, CI, deployment, acceptance evidence and residual risk in #134.

## Execution checklist

### Before implementation

- [ ] Finding ID assigned.
- [ ] Severity assigned from user impact.
- [ ] Route/state/reproduction documented.
- [ ] Sanitized evidence attached.
- [ ] Root cause confirmed or testable hypothesis stated.
- [ ] Observable acceptance criteria written.
- [ ] Regression test named.
- [ ] Scope checked against #72, #53 and #40.

### During implementation

- [ ] One coherent root cause per PR.
- [ ] No unrelated redesign.
- [ ] No unnecessary dependency.
- [ ] No hardcoded color outside token authority.
- [ ] No weakened Auth/RLS workaround.
- [ ] No sensitive data in logs or fixtures.
- [ ] Regression test fails before or otherwise proves the old bug.
- [ ] Test passes after the fix.

### Before merge

- [ ] Required CI jobs pass.
- [ ] Diff has no scope creep.
- [ ] UI screenshot matrix passes where relevant.
- [ ] Cross-tenant and unauthenticated tests pass where relevant.
- [ ] Security Advisor before/after recorded for DDL/Auth changes.
- [ ] Owner-facing acceptance criterion manually checked.

### After deployment

- [ ] Deployment is READY for the expected commit.
- [ ] `/login` is reachable from mobile landing.
- [ ] Attention count equals actionable `/inbox` items.
- [ ] `/budgets` passes mobile/tablet/desktop.
- [ ] `/goals` passes mobile/tablet/desktop.
- [ ] Amount surfaces use the approved semantics in light/dark.
- [ ] No console/hydration/overflow regression.
- [ ] #134 updated with evidence and remaining risks.

## PR sequence

1. **PR A — evidence and automated reproduction**
2. **PR B — RPC security audit and required hardening**
3. **PR C — mobile Login and Inbox count truth**
4. **PR D — shared responsive/amount-surface contract**
5. **PR E — Monthly Budgets repair**
6. **PR F — Savings Goals repair**
7. **PR G — production verification and closure record**

A PR may be omitted only if evidence proves no implementation is required; the decision must be recorded in #134.

## Evaluation

| Criterion | Evidence required | Current result |
|---|---|---|
| Security warnings classified | 23-row RPC matrix + leaked-password decision | pending |
| Mobile Login available | browser evidence at 320–430px | pending |
| Inbox count truthful | unit/browser/server-state evidence | pending |
| Cross-platform consistency | route-state screenshot matrix | pending |
| Monthly Budgets repaired | mobile/tablet/desktop evidence | pending |
| Savings Goals repaired | mobile/tablet/desktop evidence | pending |
| Amount-surface semantics consistent | token audit + light/dark screenshots | pending |
| Production verification | deployment and smoke record | pending |

### Exit criteria

MF SAFE-UX closes only when:

- SAFE-01 through SAFE-08 are `pass`, `accepted-risk`, or `plan-blocked` with explicit evidence;
- no false count or dead CTA remains;
- supported route/device matrix passes;
- all live security warnings are classified;
- unsafe findings are fixed with tests;
- production verification and delivery records are complete.
