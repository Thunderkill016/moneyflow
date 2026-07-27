# Public-to-private production synchronization reconciliation

**Status:** evaluating  
**Owner:** ChatGPT; human acceptance pending  
**Issue/PR:** public #8; private #93, #94, #92  
**Last updated:** 2026-07-27

> This packet is a retrospective control repair. The production synchronization was implemented before this packet existed. It records the actual sequence, failures, evidence and remaining verification without presenting the process as compliant from the start.

## Outcome

The verified MoneyValue, Dashboard, Transactions and Calm Ledger shell changes from the public MoneyFlow repository are present in the private production repository connected to Vercel. The exact private production commit builds successfully, while unresolved manual production-flow and screenshot evidence remains explicitly open.

## Repository reconnaissance

### Current behavior

- Private `main` contains the shared `MoneyValue` primitive, the split Dashboard composition, Transactions money-value migration and the Calm Ledger AppShell.
- `/dashboard` remains the canonical signed-in route and `/insights` remains a compatibility redirect.
- Vercel reports success for private commit `c0c9b6fb9aa98f55a37f635dd029a6226467925a`.
- Direct authenticated production-flow verification has not been completed by this agent because the available Vercel connector cannot resolve the MoneyFlow project/deployment and the external fetch path cannot establish an authenticated browser session.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/money-value.tsx` | Shared semantic and accessible money display | Reused exact public blob |
| `src/lib/money-display.ts` | Pure display behavior and accessible labels | Reused exact public blob |
| `src/components/moneyflow-dashboard.tsx` | Dashboard controller and financial state | Reused verified public implementation |
| `src/components/dashboard/` | Bounded overview and planning presentation | Reused verified public implementation |
| `src/components/transactions-page.tsx` | Filtered totals, daily totals and ledger rows | Reused verified public implementation |
| `src/components/layout/app-shell.tsx` | Shared signed-in navigation and actions | Merged through private PR #92 |
| `src/app/dashboard/` | Route-owned Calm Ledger presentation | Merged through private PR #92 |
| `src/lib/dashboard-planning-empty.ts` | Required Dashboard planning-empty contract | Missing in first sync; restored by private PR #94 |
| `docs/plans/active/calm-ledger-daily-shell.md` | Controlling shell packet | Must be reconciled with actual delivery evidence |

### Existing tests and constraints

- Related unit/static tests: `money-display.test.ts`, Dashboard composition contract tests, Transactions search/report tests and weekly summary tests.
- Database/RLS tests: the public verification authority ran fresh Supabase reset and pgTAP before public merge; no schema, migration, auth or RLS files were changed by the production synchronization.
- Browser tests: public verification covered expense-path smoke and the production cross-device Chromium/WebKit audit for the synchronized runtime slices.
- Product/architecture rules: integer VND, transfer exclusion, soft-delete recovery, no unproven daily spending recommendation and scoped CSS ownership remain unchanged.

### Similar implementation and recent history

- Public PR #8 completed the Transactions MoneyValue slice after the earlier MoneyValue and Dashboard public slices.
- Private PR #93 synchronized the verified runtime and contract-test files.
- The first Vercel production build failed because `dashboard-planning-empty.ts` was omitted from the private sync.
- Private PR #94 restored that dependency and aligned `PlanningCardEmpty` with it.
- Private PR #92 then merged the verified Calm Ledger AppShell and route-owned Dashboard CSS.

### Open questions

- [ ] Does the exact production domain load `/dashboard` successfully for an authenticated owner account?
- [ ] Does `/insights` redirect to `/dashboard` in production?
- [ ] Can the owner add an expense, see it in recent transactions and confirm the Transactions totals update?
- [ ] Does CSV export remain reachable and functional in production?
- [ ] Do light/dark phone and desktop screenshots match the accepted Calm Ledger direction after the final private merge?

## Research

Not required. This reconciliation concerns internal repository state, existing verified code, CI evidence and deployment status. No external product behavior or current third-party API decision is being introduced.

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Treat the Vercel success status as full completion | Fast and simple | Hides missing manual flow and screenshot evidence | Rejected |
| Roll back all synchronized changes | Restores the previous private state | Discards verified public work despite a successful corrected build | Rejected unless production flow fails |
| Record the actual sequence and keep packets evaluating until manual evidence exists | Honest, auditable and compatible with rollback | Requires owner verification before closure | Selected |

### Research decision

The synchronized production code remains deployed because the corrected exact commit builds successfully. Workflow closure remains blocked on direct production-flow and visual evidence, not on generated claims or inferred success.

## Specification

### Problem

The public-to-private synchronization reached production without the required work packet, independent evaluation and pre-merge integration verification. The first production build exposed an omitted dependency. Repository documentation now understates what shipped while also failing to record the remaining evidence gap.

### User stories

- As the MoneyFlow owner, I can see exactly what was synchronized, what failed and what remains unverified, so that I can decide whether to accept or roll back the release.
- As a future implementing agent, I can distinguish public verification authority from private integration and production evidence.
- As a reviewer, I can trace the deployed runtime to PRs and commits without relying on chat summaries.

### Acceptance criteria

- [x] The synchronized runtime and contract-test scope is documented.
- [x] The omitted dependency and failed first deployment are recorded.
- [x] The corrective PR and successful exact Vercel commit are recorded.
- [x] No private-only history, secrets, schema or RLS changes were introduced by the sync.
- [ ] Direct authenticated production flows are verified.
- [ ] Final phone and desktop light/dark screenshots are reviewed.
- [ ] Human owner accepts the evidence and authorizes packet closure.

### Required states

- Loading: unchanged from the existing routes.
- Empty: Dashboard and planning empty contracts use the shared verified implementation.
- Populated: large integer VND values use `MoneyValue` without ellipsis clipping.
- Validation/error: data errors continue to disable unsafe mutations.
- Recovery/undo: existing soft-delete and toast/undo behavior remains.
- Long data / large VND: covered by the public browser verification authority; private production visual confirmation remains open.
- Mobile/tablet/desktop: AppShell and Dashboard use scoped, authored responsive owners.
- Accessibility: semantic signs and accessible labels do not rely on color alone.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- No schema, migration, ownership, auth or RLS change is included in the synchronization.

### Out of scope

- Redesigning quick-capture fields, Accounts, planning routes, Inbox/import, Reports or Settings.
- Changing financial formulas or transaction semantics.
- Claiming private CI passed when GitHub Actions did not execute useful steps because of account quota/runner limits.

## Implementation plan

### Architecture fit

The synchronization preserves existing owners: pure money display in `src/lib`, reusable money UI in `src/components`, Dashboard composition in bounded Dashboard components, Transactions presentation in its page component/module and shared shell presentation in the AppShell CSS Module. Private deployment remains controlled by merges to private `main` and Vercel.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| This packet | Record actual scope, failure, repair and evidence | Restore auditability |
| `calm-ledger-daily-shell.md` | Reconcile acceptance and delivery state | Keep the controlling packet truthful |
| Merged PR discussions | Add evidence comments if needed | Preserve discoverability from PR history |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: `/insights` remains a redirect; existing stores and APIs are unchanged.
- Rollback: revert private commits `c0c9b6f`, `618a0f3` and `2a19e0b` in reverse order if production flow verification reveals a release-blocking regression.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Vercel build success masks a runtime/auth failure | Verify authenticated production flows directly |
| Public CI does not prove private integration | Record the first private integration failure and exact corrected deployment |
| Documentation falsely claims completion | Keep both packets `evaluating` until open evidence is supplied |
| A rollback removes unrelated private work | Use the three focused merge commits and review the revert diff |

### Verification plan

- Static: public verification authority passed knowledge, deployment, CSS ownership, lint and typecheck for the synchronized implementation; private integration build now succeeds on Vercel.
- Unit/domain: public unit/static RLS suite passed before merge.
- Database: public fresh Supabase reset and pgTAP passed; no database files changed during private sync.
- Browser flow: public expense smoke and responsive audit passed; direct private production flow remains open.
- Responsive/visual: public cross-device evidence passed; final private deployment screenshot review remains open.
- Production/manual: exact commit status is successful; authenticated owner verification is still required.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Inventory synchronized runtime and tests | Merged PRs #93/#94/#92 | PR diffs and commit history | done |
| T2 | Record first deployment failure and dependency repair | T1 | Vercel failure status; PR #94 | done |
| T3 | Confirm exact corrected production commit reports success | T2 | Vercel status on `c0c9b6f` | done |
| T4 | Reconcile Calm Ledger shell packet | T1–T3 | Updated packet diff | in progress |
| T5 | Verify authenticated Dashboard, redirect, capture, recent row and export | Owner session | Manual evidence | todo |
| T6 | Review final light/dark phone and desktop screenshots | T5 | Screenshot evidence | todo |
| T7 | Human acceptance and move packets to completed | T5–T6 | Owner decision | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Runtime scope documented | PR #93 and this packet | pass |
| Integration omission recorded | Failed `2a19e0b` deployment and PR #94 | pass |
| Corrected exact deployment succeeds | Vercel status for `c0c9b6f` | pass |
| Financial/security scope unchanged | Focused diffs and no schema/auth/RLS files | pass |
| Direct production flows | Not yet performed with authenticated owner session | pending |
| Final visual review | Not yet attached for private production | pending |
| Human acceptance | Not yet recorded | pending |

### Review findings

- Correctness: the initial private synchronization was incomplete; the missing planning-empty module was restored and the corrected build succeeded.
- Security/ownership: no schema, auth, RLS or secret-bearing file was changed by the synchronized runtime slice.
- UI/UX/accessibility: public evidence covers the verified implementation; final private production screenshots remain required.
- Maintainability/duplication: Dashboard responsibilities are split and money display is centralized.
- Scope compliance: the sync stayed within MoneyValue, Dashboard, Transactions, AppShell and their direct contracts.

### Remaining limitations

- The agent cannot currently establish an authenticated production browser session through the available connector.
- The Vercel connector account can see the deployment status through GitHub but cannot resolve/list the MoneyFlow Vercel project directly.
- Private GitHub Actions did not provide useful execution evidence because jobs failed before normal steps under the existing account quota/runner limitation.

## Delivery record

- Branch: `agent/reconcile-delivery-workflow`
- PR: pending
- Relevant merged private PRs: #93, #94, #92
- Production commits: `2a19e0b` (first sync, failed deployment), `618a0f3` (dependency repair), `c0c9b6f` (Calm Ledger shell; successful deployment)
- Public verification authority: public PR #8 and preceding verified public slices
- Production deployment: Vercel success reported for `c0c9b6fb9aa98f55a37f635dd029a6226467925a`
- Production flow verified: pending authenticated owner verification
- Work packet moved to `docs/plans/completed/`: no; remains evaluating
