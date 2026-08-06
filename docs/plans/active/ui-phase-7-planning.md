# MoneyFlow UI-system Phase 7 — Planning

**Status:** ready_for_review
**Execution state:** ready_for_review
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `372036fe8d1e583c3a81083ebef11f902e4f8b46`
**Branch:** `feat/ui-phase-7-planning`
**Pull request:** #308
**Last updated:** 2026-08-06

The owner instructed **`làm đi`** after Phase 7 reconnaissance and comparison. This authorizes bounded specification correction, product-code work, tests and a focused pull request on the Phase 7 branch. It does not authorize merge, database/schema/Auth/RLS/provider writes, production-data access, a new budgeting model, goal-backed account movements or later UI phases.

## Outcome

Budgets, recurring expense commitments, recurring income templates and savings goals use one locally owned Planning presentation system. The UI states exactly what the current domain model does: budgets are category limits, commitments are expected obligations rather than locked cash, income templates are expected inflows until recorded, and goal allocation is a planning earmark rather than an account transfer.

## Repository reconnaissance

At authorization:

- Planning already had four working product boundaries under `src/components/planning/` and `src/lib/planning/`.
- Budgets already supported historical month selection, previous-month comparison, category progress and transaction drill-down.
- Commitment payment created a real expense ledger entry and undo removed the linked entry.
- Income receipt created a real income ledger entry and undo removed the linked entry.
- Goals stored `target`, `allocated`, deadline and archive state, but did not transfer or lock account money.
- Shared `PlanningCard` only emitted global class names and did not own its styles.
- Planning pages shared global `dashboard`, `budgets-heading`, `budget-overview`, card-grid, action and feedback classes.
- Multiple Planning mutations still used `window.confirm`.
- Planning breadcrumbs still pointed at `/insights`, while the current route and vocabulary are `/dashboard` and `Tổng quan`.
- Commitment copy claimed MoneyFlow “giữ trước” money and protected “có thể chi”, even though the current domain only totaled unpaid commitments.
- Goal copy claimed money was “khóa”, “mở khóa” or “rút ra”, while the current mutation changed only the goal allocation number.
- `CURRENT_PROJECT_MEMORY.md` still described merged/deployed Phase 6 as candidate-only.

Preserved invariants:

- money remains integer minor units;
- transfer remains excluded from budgets and income/expense;
- split expense amounts count only in their matching category budget;
- recurring pay/receive mutations retain current idempotency and linked-ledger behavior;
- expected income is not treated as received income;
- goal allocation does not change account balance or total assets;
- no new safe-to-spend calculation or guidance is introduced;
- existing Server Actions, RPCs, RLS and schema remain unchanged;
- Fresh Blue/B3.2 and signed-in Light/Dark/System behavior remain unchanged.

## Research and comparison

| Source | Authority/type | Applied decision |
|---|---|---|
| [YNAB getting started guide](https://www.ynab.com/guide/the-ultimate-get-started-guide) | official product guidance | envelope assignment applies money already available; MoneyFlow must not imply this behavior without a separate financial model |
| [Actual Budget budgeting](https://actualbudget.org/docs/budgeting/) | official open-source PFM documentation | Actual distinguishes envelope budgeting from tracking budgeting; current MoneyFlow category limits align more closely with tracking budgeting |
| [Actual Budget schedules](https://actualbudget.org/docs/schedules/) | official product documentation | schedules are expectations until matched or entered; recurring UI must distinguish planned occurrence from real ledger entry |
| [Monarch budgets](https://help.monarchmoney.com/hc/en-us/articles/360048883631-Budgets) | official product documentation | monthly category/flex planning, forecasts and rollover are separate product-depth decisions, not presentation migration work |
| [WAI-ARIA APG Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | W3C WAI | shared Dialog owns focus containment/return and review dialogs initially focus the least destructive action |
| [WCAG 2.2 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI | ledger-affecting recurring actions require clear review and reversible behavior |

Decision:

- preserve MoneyFlow's current tracking-budget model;
- correct language that overstates cash reservation or locking;
- treat a true envelope model, budget rollover, account-backed goals, forecast automation and flexible schedule matching as separate Class 3 product work;
- move presentation ownership without rewriting current financial mutations.

## Specification

```text
Planning routes
  -> PlanningPage shell
       -> header + breadcrumb + optional period navigation
       -> summary grid
       -> locally owned PlanningCard
       -> shared Alert, Button, LinkButton, Dialog, EmptyState and MoneyValue
       -> route-specific budget / recurring / goal states
```

Truthful language contracts:

- **Budget:** monthly category spending limit and actual expense comparison.
- **Commitment:** expected expense; unpaid total is “dự kiến phải trả”, not locked or reserved cash.
- **Income template:** expected income; it changes the ledger only after explicit receipt confirmation.
- **Goal allocation:** amount marked for a goal inside MoneyFlow planning; it does not move or lock account money.

Planning review contracts:

- deleting a budget names its category and states transactions remain;
- paying a commitment names the obligation, account, amount and that a real expense is created;
- undoing payment names the linked expense consequence;
- recording income names source template, account, amount and that a real income entry is created;
- undoing income names the linked ledger consequence;
- archive/restore reviews name the selected item and preserve existing linked transactions;
- goal archive remains blocked while allocation is non-zero, but the copy uses earmark terminology.

Stable evidence slots:

- `planning-workspace`, `planning-header`, `planning-period-nav`, `planning-summary`;
- `planning-card`, `planning-card-status`, `planning-card-actions`;
- `budget-list`, `commitment-list`, `income-template-list`, `goal-list`;
- `planning-review`, shared `dialog`, `alert`, `empty-state` and money markers.

## Implementation plan

1. Record Phase 7 authorization and reconcile Phase 6 merged/deployed truth.
2. Establish shared Planning page, summary, card and review presentation owners.
3. Migrate Budgets while preserving month history, comparisons and drill-down.
4. Migrate Commitments and remove unproven safe-to-spend/reservation copy.
5. Migrate recurring income templates and preserve explicit record/undo behavior.
6. Migrate Goals and replace cash-locking language with planning-earmark language.
7. Replace Planning `window.confirm` flows with shared review dialogs.
8. Add source/domain/browser contracts for truthful language, route ownership and financial invariants.
9. Remove active Planning consumers of retired global selectors after route replacement.
10. Run exact-head policy, static, unit, build, browser, cross-device and security gates.
11. Stop for explicit owner merge decision.

## Tasks

| ID | Task | Status |
|---|---|---|
| P7-T1 packet and P6 truth reconciliation | done |
| P7-T2 shared Planning page/card/review owners | done |
| P7-T3 Budgets migration | done |
| P7-T4 Commitments migration and truthful copy | done |
| P7-T5 Income templates migration | done |
| P7-T6 Goals migration and earmark truth | done |
| P7-T7 stable source/domain/browser evidence | done |
| P7-T8 active global Planning selector retirement | done for active consumers; broad compatibility definitions require later zero-consumer proof |
| P7-T9 full verification matrix | done on implementation head; cumulative documentation head pending final confirmation |
| P7-T10 owner approval and merge | blocked pending explicit owner decision |

## Evaluation

Findings were fixed in their owning boundary rather than hidden or allowlisted:

1. The first local tone modules referenced nonexistent `--mf-*-default` names. They now consume canonical `--mf-warning`, `--mf-expense` and `--mf-income` tokens from `document-theme.css`.
2. A source contract initially registered the literal retired dashboard route while trying to forbid it. The test now builds the comparison string without adding a new legacy route reference.
3. Draft PR runs correctly selected full verification but skipped expensive jobs by workflow policy. PR #308 was marked ready for review only to activate complete exact-head evaluation; this is not merge authorization.
4. The first ready-for-review run proved static quality, typecheck, unit/static RLS and production build, while policy correctly rejected missing PR memory and Evaluation artifacts. Both were added before subsequent runs.
5. Review dialogs focus the least destructive **Hủy** action first and lock dismissal while pending.
6. Active Planning routes no longer depend on the old global workspace/card/action vocabulary. Remaining global definitions are compatibility debt and are not deleted without repository-wide zero-consumer evidence.
7. Browser smoke exposed a stale `.budget-category-card` selector. It was repointed to `budget-list → planning-card`; no legacy class was restored.
8. Cross-device audit exposed stale recurring-income action copy and retired `.budget-overview`, `.goal-hero`, `.budget-category-actions` and `.goal-actions` selectors. The audit now uses accessible names and Phase 7 semantic slots while preserving its one-column summary, ≥44px action and no-overflow requirements.
9. The repaired implementation head passed the complete selected Chromium/WebKit matrix. No geometry, clipping or financial mutation regression remained.

## Verification

Implementation head: `467515a18551ed536a7ca330773d577c2bf6c351`.

CI #1867, run `31086979621`: success.

| Gate | Job/result |
|---|---|
| classify | `92568830722` — success |
| policy | `92568873248` — success |
| static quality | `92568873246` — success |
| database classification | `92568873244` — success; database checks not required |
| unit/static RLS | `92568873579` — success |
| production build | `92568873575` — success |
| verify aggregation | `92568949217` — success |
| browser smoke | `92568998087` — success; 68 Playwright cases passed across Chromium and mobile Chromium |
| cross-device UI audit | `92568998096` — success; 184 passed/4 skipped in the selected audit matrix plus 2 WebKit financial-detail cases passed |
| e2e aggregation | `92570689922` — success |

Artifacts:

- browser smoke evidence: ID `8964494328`, digest `sha256:8aa3e36b10980a7832404b5f2ca4231cb1c0a8337bb93e7619677d03761ccb1d`;
- UI audit evidence: ID `8964576449`, digest `sha256:6fba9e99636731f6981e026003853c14478a0fab1bf23d6081554b1a441287cd`.

Security:

- CodeQL #983, run `31086979561`: success;
- secret-history scan #983, run `31086979754`: success.

The documentation-only cumulative head created by this evidence update must pass its own exact-head CI and security workflows before final handoff. Implementation-head evidence is not substituted for that final confirmation.

## Explicitly out of scope

- envelope budgeting, assigned/available category balances or “give every đồng a job”;
- budget rollover, flexible budget buckets, automatic allocation or multi-month forecasting;
- automatic schedule matching, flexible recurrence or automatic ledger posting;
- goal contribution ledger, account-backed funds or transfers into a goal account;
- new safe-to-spend calculation or guidance;
- schema, migration, RPC, RLS, Auth, provider or production-data changes;
- merge, deployment approval or Phase 8 work.

## Merge and deployment boundary

Merge remains an owner decision. A merge to `main` is expected to trigger the repository's connected Vercel production deployment automatically; the agent must not describe that as “no deployment”. Green checks and ready-for-review state are not merge authorization.
