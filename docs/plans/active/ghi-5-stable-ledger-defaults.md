# Ghi 5.0 — stable ledger-backed defaults and post-save correction

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** human owner; implementation by OpenAI agent
**Issue/PR:** #595 / #596
**Last updated:** 2026-09-14

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Reduce repeated choices in Ghi without guessing financial facts. When recent trustworthy ledger history clearly establishes one account/category pair for the selected transaction kind, Ghi may preselect that pair. Weak or conflicting evidence must not create a ledger default, and the existing browser-local successful preset remains only a fallback. After a successful single save, the exact saved transaction must be immediately correctable through MoneyFlow's existing edit/update path.

## Repository reconnaissance

### Current behavior

- `src/components/add-transaction-dialog.tsx` hydrates `moneyflow-quick-add-prefs-v1` once and uses the newest successful browser-local account/category preset for the selected kind.
- First-time capture deliberately avoids taxonomy fallback: without an established local category, the user must select one explicitly.
- Successful captures update local recent categories/presets.
- Dashboard, Transactions, and Capture Quick all use the shared `AddTransactionDialog` and `useTransactions` mutation owner.
- `useTransactions.updateTransaction` plus `EditTransactionDialog` already own correction for both demo and authenticated runtimes.
- Transfers use a separate mutation path and are neutral to income/expense.
- Canonical ledger ordering in `src/server/finance.ts` is `occurredOn` descending, then creation timestamp (`occurredAt`) descending, then id descending.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/quick-add-prefs.ts` | Current local fallback and recent choices | Reuse; do not turn localStorage into financial truth |
| `src/lib/transactions/contracts.ts` | Neutral transaction contracts | Reuse transaction type |
| `src/components/add-transaction-dialog.tsx` | Shared Ghi form and current default selection | Change narrowly |
| `src/hooks/use-transactions.ts` | Single mutation owner for demo/auth | Reuse only; no second mutation |
| `src/components/edit-transaction-dialog.tsx` | Existing correction UI | Reuse |
| Dashboard / Transactions / Capture Quick | Shared capture entry surfaces | Pass ledger history; expose post-save edit action |

### Existing tests and constraints

- Related unit tests: `src/lib/quick-add-prefs.test.ts`, `src/lib/ghi-chi-dialog-contract.test.ts`, transaction/money invariant tests.
- Database/RLS tests: no database truth changes; risk classifier selected database as not required for this diff.
- Browser tests: existing capture/transaction browser smoke; runtime changes require selected browser evidence before ready-for-review.
- Product/architecture rules: integer VND, transfer neutrality, explicit demo/auth stores, one mutation owner per runtime, no guessed financial data, exact-head verification and owner review for Class 3.

### Similar implementation and recent history

- Existing pattern to reuse: local coherent `QuickAddPreset`, shared `useTransactions`, existing AppShell notice action, existing `EditTransactionDialog`.
- Relevant issue/PR: #595 / #596.

### Open questions

- [x] Stability threshold: deterministic 2-of-3 majority over the three most recent eligible same-kind ledger rows.
- [x] Eligibility: transfers, split expenses, non-reviewed rows, and rows whose account/category is no longer valid for the selected kind are excluded by the pure helper.
- [x] Ordering: use canonical ledger order (`occurredOn` → `occurredAt` → id), so newly-created backdated rows do not outrank newer transaction dates.
- [x] Fallback: stable ledger default first, then valid browser-local preset, then established recent local category/account, otherwise explicit choice.

## Research

### Research scope and source selection

- Decision question: how should repeated history influence defaults without letting one-off behavior silently hijack future entry?
- Reference map consulted: current product/repository rules were sufficient; external research focused on current primary product/documentation sources.
- Source budget: three focused sources.
- Expected decision: select a small deterministic stability rule and preserve immediate correction/reversibility.

### Questions researched

1. How do mature personal-finance products avoid one-off categorization from becoming a bad automatic default?
2. How do rule-based finance tools preserve deterministic, inspectable automation?
3. What UI guidance supports reducing data entry while keeping recovery obvious?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| https://support.ynab.com/en_us/categorizing-transactions-a-guide-HyRl60sks | YNAB official support | 2026-09-14 | YNAB updates an established payee category default when 2 of the 3 most recent transactions support a different category; older backdated edits do not change the default because only the three most recent count. | MoneyFlow has no payee-owned default model in this slice; only the stability concept applies. |
| https://actualbudget.org/docs/budgeting/rules/ | Actual Budget official docs | 2026-09-14 | Actual uses deterministic transaction rules and can learn categorization behavior while keeping rules inspectable/editable. | MoneyFlow must not create a new rule engine here; existing Inbox rules remain separate. |
| https://developer.apple.com/design/human-interface-guidelines/design-principles | Apple HIG | 2026-09-14 | Reduce unnecessary input, give clear feedback, and make recovery from mistakes easy. | Platform-specific interaction details do not directly govern this web app. |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Last successful local preset only | Already shipped, simple | One exceptional capture immediately becomes future default; browser-local only | Keep as fallback only |
| 2-of-3 recent eligible ledger pairs | Small, deterministic, explainable, robust to one outlier | Needs careful eligibility/ordering tests | Selected |
| Merchant/payee fuzzy matching | Could be more specific | Adds normalization/inference semantics and false-positive risk | Rejected for this slice |
| ML/AI suggestion | Flexible | Probabilistic financial default, privacy/evaluation complexity | Rejected |
| New database preference table | Cross-device persistence | Schema/RLS/migration cost before value is proven | Rejected |

### Research decision

Use a pure helper that considers only the three most recent eligible ledger transactions for the requested kind. A ledger preset exists only if the same valid `accountId + categoryId` pair appears at least twice among those three. The helper requires normalized `reviewStatus === "reviewed"`, ignores transfers and split transactions, and follows MoneyFlow's canonical ledger ordering. The shared Ghi form prefers this stable ledger preset; if absent, it preserves the current valid local-preset behavior. This borrows YNAB's stability concept, not its payee model. No new dependency or automation engine is introduced.

### Adoption review

Not applicable. No new dependency, provider, service, framework, model or architecture layer is added.

## Specification

### Problem

MoneyFlow currently remembers the last successful Ghi preset. That speeds entry, but a one-off transaction can silently become the next default. The ledger already contains better evidence about repeated account/category behavior, but Ghi does not use it. After saving, users also need a short path to correct the exact transaction if the prefilled/default values were wrong.

### User stories

- As a repeat MoneyFlow user, I can have Ghi preselect a stable account/category pair when my recent same-kind ledger history clearly supports it, so repeated capture takes fewer taps.
- As a user with mixed or uncertain history, I am not given a guessed financial default.
- As a user who notices a mistake immediately after saving, I can open the existing edit flow for that exact transaction.

### Acceptance criteria

- [x] Three most recent eligible same-kind rows are evaluated in canonical ledger order: `occurredOn`, then `occurredAt`, then id, all newest-first.
- [x] A pair seen in at least 2 of those 3 rows becomes the ledger preset.
- [x] One outlier cannot replace an established 2-of-3 pair.
- [x] Fewer than three eligible rows, 1/1/1 history, transfers, opposite-kind rows, split expenses and non-reviewed rows do not establish a ledger preset.
- [x] Rows with missing/invalid current account/category references are ignored.
- [x] Stable ledger preset wins over local quick-add preset.
- [x] Valid local preset remains fallback when no stable ledger preset exists.
- [x] With neither safe source, category remains explicit rather than falling back to the first taxonomy item.
- [x] Successful single-save capture exposes `Sửa` for the exact saved transaction on the primary Ghi surfaces.
- [x] `Sửa` opens `EditTransactionDialog` and saves through existing `updateTransaction`; no second ledger mutation path is introduced.
- [x] Transfer entry mutation is unchanged.

### Required states

- Loading: no new loading state; defaults derive from already-loaded workspace transactions.
- Empty: no ledger preset; current local/explicit behavior remains.
- Populated: stable pair may preselect.
- Validation/error: existing form/mutation validation remains authoritative.
- Recovery/undo: post-save edit is additive; existing delete undo retains priority in the Transactions toast.
- Long data / large VND: unaffected; no amount-derived defaults.
- Mobile/tablet/desktop: no CSS/layout system change; notice action uses existing AppShell primitive.
- Accessibility: edit action has text label `Sửa`; existing dialog focus/labels are reused.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Learning is same-kind only and the helper requires normalized reviewed status while excluding split/transfer rows.
- Ownership/RLS implications: none; only already-authorized workspace rows are read client-side and the existing update action remains owner-safe.

### Out of scope

- Merchant/payee inference, fuzzy search, AI/ML, new rules, recurring detection, schema changes, provider sync, new persistence, cross-device preference sync, transaction duplication/repeat scheduling.

## Implementation plan

### Architecture fit

The stability calculation is pure capture behavior and belongs in `src/lib` as a testable helper over the neutral transaction contract. `AddTransactionDialog` remains the shared UI owner for choosing defaults. Existing `useTransactions` remains the only mutation orchestration owner; post-save correction only opens the existing edit dialog in each capture host.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/quick-add-defaults.ts` | Pure 2-of-3 stable preset helper with canonical ordering and reviewed-only eligibility | Isolate/test financial-history-derived selection |
| `src/lib/quick-add-defaults.test.ts` | Counterexamples for majority, ordering, backdated rows, eligibility and missing review metadata | Prove stability and exclusions |
| `src/components/add-transaction-dialog.tsx` | Accept transaction history; prefer stable ledger preset before local fallback | Shared behavior across Ghi surfaces |
| `src/components/moneyflow-dashboard.tsx` | Pass transaction history; retain just-saved row; expose `Sửa`; reuse edit dialog/update mutation | Primary dashboard capture correction |
| `src/components/transactions/transactions-workspace.tsx` | Same, reusing existing edit state/dialog and preserving delete undo priority | Ledger surface correction |
| `src/components/inbox/capture-quick-page.tsx` | Same; retain a bounded recovery window before returning to Capture hub | Keep capture behavior consistent |
| `src/lib/ghi-chi-dialog-contract.test.ts` | Extend static contract for ledger-history default, canonical ordering and correction wiring | Guard shared integration |
| Work packet + PR memory | Record Class 3 scope/evidence | Required provenance |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: additive optional transaction-history prop; localStorage format unchanged.
- Rollback: revert the focused PR; browser-local preferences remain compatible and no data migration is needed.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| One unusual transaction hijacks default | 2-of-3 majority |
| Transfer influences expense/income default | Filter exact kind |
| Non-reviewed row trains capture | Require normalized `reviewStatus === "reviewed"` |
| Split expense leaks arbitrary category | Exclude rows with split lines |
| Deleted category/account becomes default | Validate against current option sets |
| Newly-created backdated row incorrectly counts as most recent | Canonical `occurredOn` → `occurredAt` → id ordering + counterexample test |
| Local preset overrides stronger ledger evidence | Explicit precedence contract |
| New edit shortcut bypasses trusted mutation | Reuse `EditTransactionDialog` + `updateTransaction` only |
| Delete undo notice and edit action conflict | Delete undo keeps priority; post-save edit state is cleared by other notices/actions |
| Quick route becomes blank after save recovery window | Timer returns to `/capture` when the user takes no recovery action |

### Verification plan

- Static: diff hygiene, project knowledge/CI policy, deployment-env/architecture where selected, lint, typecheck, build.
- Unit/domain: new helper tests + quick-add prefs + Ghi contract + financial invariant regressions.
- Database: classifier selected not required; no database truth change.
- Browser flow: existing smoke plus capture/edit behavior selected by policy; exact-head evidence required before ready-for-review.
- Responsive/visual: no CSS/layout change intended; policy decides whether UI audit is applicable.
- Production/manual: after owner merge/deploy, verify affected Ghi save/default/edit behavior on exact deployment; not authorized in this branch-write phase.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add pure stable-ledger preset helper + tests | Spec | helper + counterexample tests | done |
| T2 | Integrate stable preset into shared Ghi dialog | T1 | shared dialog diff + contract test | done |
| T3 | Wire post-save `Sửa` through existing edit mutation on capture hosts | T2 | host diffs + contract test | done |
| T4 | Evaluate counterexamples and exact-head CI | T1-T3 | evaluator diff review + CI #3738 | in_progress |
| T5 | Add bounded PR provenance and handoff to owner | T4 | PR memory + ready_for_review | pending |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-14 | researcher/planner | implementer | planned | issue #595, repo reconnaissance, current YNAB/Actual/Apple primary sources, packet | Browser shape and exact CI unverified | Implement T1-T3 on focused branch |
| 2026-09-14 | implementer | evaluator | evaluating | PR #596, helper/unit tests, three host integrations, PR memory | Exact-head CI still running; diff hygiene failed on packet trailing whitespace | Repair hygiene, inspect remaining gates, resolve blockers |

### Current permission boundary

- Granted scope: focused branch/PR implementation for issue #595.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` branch `feat/595-ghi-stable-defaults` only.
- Forbidden writes: `main`, provider settings, production data, branch protection, required checks, unrelated branches.
- Human approval required before: merge, deployment/provider write, production acceptance.
- Rollback or stop condition: revert focused PR; stop and return to specification if implementation requires schema/provider/new financial semantics beyond this packet.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| 2-of-3 exact pair and weak-evidence rejection | `quick-add-defaults.test.ts` | implemented; CI pending |
| Canonical date ordering including backdated counterexample | `quick-add-defaults.test.ts` + `src/server/finance.ts` ordering comparison | implemented; CI pending |
| Reviewed-only helper eligibility | helper + explicit missing-review counterexample | implemented; CI pending |
| Stable ledger before local fallback | `ghi-chi-dialog-contract.test.ts` | implemented; CI pending |
| Immediate correction reuses existing mutation | Dashboard/Transactions/Capture Quick + contract test | implemented; CI pending |
| Delete undo priority | Transactions notice action ordering + contract | implemented; CI pending |
| No schema/provider/runtime dependency expansion | PR diff; database classifier not required | pass |

### Research and adoption evidence

- YNAB primary support was rechecked on 2026-09-14 and explicitly describes updating the default when 2 of the 3 most recent transactions support a different category; older transaction edits do not change the default.
- Actual Budget primary docs still support deterministic, inspectable learned categorization rules; MoneyFlow did not adopt its rule engine.
- Source limitations remain respected: no payee model, fuzzy matching, AI inference or new automation architecture was added.
- New tool/dependency/pattern adoption: not applicable.

### Review findings

- Correctness: evaluator found and repaired two pre-CI semantic issues: canonical ledger ordering must prefer transaction date over creation time, and the pure helper must require reviewed status rather than merely excluding `needs_review`.
- Security/ownership: no new data source, provider, schema, RLS path or mutation owner.
- UI/UX/accessibility: immediate edit uses existing labeled action/dialog; Quick retains a bounded success/recovery state and returns to Capture if untouched.
- Maintainability/duplication: one pure default helper; correction reuses existing edit/update path.
- Scope compliance: no merchant inference, AI/ML, provider work, schema/migration or new dependency.
- CI finding: run #3738 policy-contract job failed only because the initial packet header used Markdown trailing spaces; this packet revision removes them. New exact-head run required.

### Remaining limitations

- The selected stability rule is global per transaction kind, not merchant/payee-specific. That is intentional for this slice and must not be presented as semantic merchant learning.
- Browser-local fallback remains device-local; cross-device preference sync remains out of scope.
- Exact-head CI/browser evidence is still required before ready-for-review.

## Delivery record

- Branch: `feat/595-ghi-stable-defaults`
- PR: #596 (draft while evaluating)
- Squash commit: pending owner merge
- CI run: #3738 identified packet whitespace blocker; replacement exact-head run pending
- Production deployment: not authorized
- Production flow verified: pending after owner merge/deploy
- Work packet moved to `docs/plans/completed/`: no
