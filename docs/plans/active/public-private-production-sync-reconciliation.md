# Public verification to production synchronization reconciliation

**Status:** evaluating  
**Owner:** ChatGPT; human acceptance pending  
**Issue/PR:** public verification PR #8; production PRs #93, #94 and #92  
**Last updated:** 2026-07-28

> This packet is a retrospective control repair. The production synchronization was implemented before this packet existed. It records the actual sequence, failure, repair, evidence and remaining verification without pretending the process was compliant from the start.

## Outcome

The verified MoneyValue, Dashboard, Transactions and Calm Ledger shell changes from `moneyflow-public` are present in the production `moneyflow` repository connected to Vercel. A missing direct dependency caused the first synchronized production build to fail; PR #94 restored it and the corrected sequence later produced a successful exact deployment.

Manual authenticated production-flow and final screenshot evidence remain open, so this packet stays in `evaluating`.

## Repository reconnaissance

### Current behavior

- Production `main` contains the shared `MoneyValue` primitive, split Dashboard composition, Transactions money-value migration and Calm Ledger AppShell.
- `/dashboard` is the canonical signed-in route; `/insights` is a compatibility redirect.
- Exact shell merge commit `c0c9b6fb9aa98f55a37f635dd029a6226467925a` reported Vercel success.
- PR #98 later repaired stale tests after the route and CSS Module migration; it did not change production behavior.
- The Vercel connector available in this session cannot list the MoneyFlow project directly, although GitHub commit statuses expose Vercel deployment states.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/money-value.tsx` | Shared semantic and accessible money display | Reused verified public blob |
| `src/lib/money-display.ts` | Pure display behavior and accessible labels | Reused verified public blob |
| `src/components/moneyflow-dashboard.tsx` | Dashboard controller and financial state | Reused verified implementation |
| `src/components/dashboard/` | Bounded overview and planning presentation | Reused verified implementation |
| `src/components/transactions-page.tsx` | Filtered totals, daily totals and ledger rows | Reused verified implementation |
| `src/components/layout/app-shell.tsx` | Shared signed-in navigation and actions | Merged through PR #92 |
| `src/app/dashboard/` | Route-owned Calm Ledger presentation | Merged through PR #92 |
| `src/lib/dashboard-planning-empty.ts` | Required Dashboard planning-empty contract | Missing in first sync; restored by PR #94 |
| `docs/plans/active/calm-ledger-daily-shell.md` | Controlling shell packet | Reconciled by the replacement documentation PR |

### Existing tests and constraints

- Related unit/static tests cover money display, Dashboard composition, Transactions search/report behavior and weekly summaries.
- Public verification ran fresh Supabase reset and pgTAP; the synchronized production slice changed no schema, migration, auth or RLS file.
- Public browser evidence covered expense-path smoke and the production cross-device Chromium/WebKit audit.
- Product invariants remain integer VND, transfer exclusion, soft-delete recovery, no unproven daily spending recommendation and scoped CSS ownership.

### Actual delivery sequence

1. Public verification PR #8 completed the final Transactions MoneyValue slice after earlier public MoneyValue and Dashboard work.
2. Production PR #93 synchronized the verified runtime and contract-test files.
3. Vercel rejected commit `2a19e0b` because `dashboard-planning-empty.ts` was omitted.
4. Production PR #94 restored that dependency at commit `618a0f3`.
5. Production PR #92 merged the verified Calm Ledger AppShell and Dashboard route styling at `c0c9b6f`.
6. PR #98 later repaired 19 stale unit assertions and one typecheck error caused by the `/insights` to `/dashboard` and global-class to CSS-Module migrations.

### Open questions

- [ ] Does the production domain load `/dashboard` successfully for an authenticated owner account?
- [ ] Does `/insights` redirect to `/dashboard` in production?
- [ ] Can the owner add an expense, see it in recent transactions and confirm Transactions totals update?
- [ ] Does CSV export remain reachable and functional?
- [ ] Do light/dark phone and desktop screenshots match the accepted Calm Ledger direction?

## Research

No external product or API research was needed. This reconciliation concerns repository history, verified code, CI evidence and deployment status already attached to exact commits.

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Treat Vercel success as full completion | Fast and simple | Hides missing manual flow and screenshot evidence | Rejected |
| Roll back all synchronized changes | Restores the prior production state | Discards verified work after the dependency repair | Rejected unless production verification fails |
| Record the actual sequence and keep packets evaluating | Honest and auditable | Requires owner verification before closure | Selected |

## Specification

### Problem

The public-to-production synchronization reached production without the required work packet, independent evaluation and pre-merge integration verification. The first production build exposed an omitted dependency. Documentation then understated what shipped while failing to record the remaining evidence gap.

### Acceptance criteria

- [x] The synchronized runtime and contract-test scope is documented.
- [x] The omitted dependency and failed first deployment are recorded.
- [x] The corrective PR and successful exact deployment are recorded.
- [x] The stale post-migration test failure and PR #98 repair are recorded.
- [x] No schema, migration, auth, RLS or financial-calculation change is attributed to the sync.
- [ ] Direct authenticated production flows are verified.
- [ ] Final phone and desktop light/dark screenshots are reviewed.
- [ ] The human owner accepts the evidence and authorizes packet closure.

### Required states

- Loading and error behavior remain unchanged from the existing routes.
- Dashboard and planning empty contracts use the shared verified implementation.
- Large integer VND values use `MoneyValue` without ellipsis clipping.
- Existing soft-delete, toast and undo behavior remains available.
- AppShell and Dashboard use scoped authored responsive owners.
- Accessible financial direction does not rely on color alone.

### Out of scope

- Redesigning quick capture, Accounts, remaining planning routes, Inbox/import, Reports or Settings.
- Changing financial formulas or transaction semantics.
- Claiming production GitHub Actions passed while issue #86 prevents jobs from executing normal steps.

## Implementation plan

### Architecture fit

The synchronization preserves existing owners: pure money display in `src/lib`, reusable money UI in `src/components`, Dashboard composition in bounded Dashboard components, Transactions presentation in its page component/module and shared shell presentation in the AppShell CSS Module.

### Documentation changes

| File/area | Change | Reason |
|---|---|---|
| This packet | Record actual scope, failure, repair and remaining evidence | Restore auditability |
| `calm-ledger-daily-shell.md` | Reconcile acceptance, tasks, evaluation and delivery record | Keep the controlling packet truthful and satisfy the knowledge contract |
| PR #95 | Close as superseded after replacement PR exists | Remove duplicate stale source of truth |

### Data and rollback impact

- Schema/migration/backfill: none.
- Compatibility: `/insights` remains a redirect; stores and APIs are unchanged.
- Runtime rollback, if production verification finds a release-blocking defect, must be planned from the focused production commits and reviewed before execution; this documentation PR performs no rollback.

### Verification plan

- Confirm both active packets contain all headings required by `scripts/check-project-knowledge.mjs`.
- Review the replacement PR diff for documentation-only scope.
- Use exact GitHub PR and commit records as evidence.
- Keep authenticated production and screenshot tasks open rather than inferring completion.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Inventory synchronized runtime and tests | PRs #93, #94 and #92 | done |
| T2 | Record first deployment failure and dependency repair | Vercel status and PR #94 | done |
| T3 | Record exact successful shell deployment | Status on `c0c9b6f` | done |
| T4 | Record post-migration test repair | PR #98 and merge commit `73caa790` | done |
| T5 | Reconcile active packets and knowledge headings | Replacement documentation PR | in progress |
| T6 | Verify authenticated Dashboard, redirect, capture and export | Owner session | todo |
| T7 | Review final light/dark phone and desktop screenshots | Screenshot evidence | todo |
| T8 | Human acceptance and move packets to completed | Owner decision | todo |

## Evaluation

### Evidence review

| Criterion | Evidence | Result |
|---|---|---|
| Runtime scope documented | PR #93 and repository files | pass |
| Integration omission recorded | Failed `2a19e0b` deployment and PR #94 | pass |
| Corrected exact deployment recorded | Vercel success on `c0c9b6f` | pass |
| Stale tests repaired | PR #98; clean typecheck and 563/563 unit tests reported | pass |
| Financial/security scope unchanged | Focused diffs; no schema/auth/RLS changes | pass |
| Direct production flows | No authenticated owner-session evidence yet | pending |
| Final visual review | No final production screenshot set attached yet | pending |
| Human acceptance | Not yet recorded | pending |

### Findings

- The first production synchronization was incomplete, but the missing dependency was restored through a focused repair.
- Public CI is valid evidence for the synchronized code blobs but does not replace production integration and authenticated-flow verification.
- The later test failures were stale assertions rather than a newly identified production runtime defect.
- Documentation must remain `evaluating` until the owner performs the final production checks.

### Limitations

- The current Vercel connector account cannot resolve/list the MoneyFlow project directly.
- Production GitHub Actions remain blocked before normal job execution under issue #86.
- This agent cannot establish the owner's authenticated production browser session.

## Delivery record

- Replacement branch: `agent/reconcile-project-state`
- Replacement PR: to be created from this branch
- Superseded documentation PR: #95
- Relevant merged production PRs: #93, #94, #92 and #98
- Production sequence: `2a19e0b` failed, `618a0f3` repaired the dependency, `c0c9b6f` deployed successfully
- Latest test-repair merge: `73caa790d30bf8111bef432d3b6d830d71022721`
- Production flow verified: pending authenticated owner verification
- Work packets moved to `docs/plans/completed/`: no; both remain evaluating
