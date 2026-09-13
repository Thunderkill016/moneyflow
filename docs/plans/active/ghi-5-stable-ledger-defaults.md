# Ghi 5.0 — stable ledger-backed defaults and post-save correction

**Status:** planned  
**Execution state:** planned  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** human owner; implementation by OpenAI agent  
**Issue/PR:** #595 / PR pending  
**Last updated:** 2026-09-14

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Reduce repeated choices in Ghi without guessing financial facts. When the recent trustworthy ledger clearly establishes one account/category pair for the selected transaction kind, Ghi may preselect that pair. Weak or conflicting evidence must not create a ledger default, and the existing browser-local successful preset remains only a fallback. After a successful single save, the exact saved transaction must be immediately correctable through MoneyFlow's existing edit/update path.

## Repository reconnaissance

### Current behavior

- `src/components/add-transaction-dialog.tsx` hydrates `moneyflow-quick-add-prefs-v1` once and uses the newest successful browser-local account/category preset for the selected kind.
- First-time capture deliberately avoids taxonomy fallback: without an established local category, the user must select one explicitly.
- Successful captures update local recent categories/presets.
- Dashboard, Transactions, and Capture Quick all use the shared `AddTransactionDialog` and `useTransactions` mutation owner.
- `useTransactions.updateTransaction` plus `EditTransactionDialog` already own correction for both demo and authenticated runtimes.
- Transfers use a separate mutation path and are neutral to income/expense.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/quick-add-prefs.ts` | Current local fallback and recent choices | Reuse; do not turn localStorage into financial truth |
| `src/lib/transactions/contracts.ts` | Neutral transaction contracts | Reuse transaction type |
| `src/components/add-transaction-dialog.tsx` | Shared Ghi form and current default selection | Change narrowly |
| `src/hooks/use-transactions.ts` | Single mutation owner for demo/auth | Reuse only; no second mutation |
| `src/components/edit-transaction-dialog.tsx` | Existing correction UI | Reuse |
| Dashboard / Transactions / Capture Quick | Shared capture entry surfaces | Pass live ledger history; expose post-save edit action |

### Existing tests and constraints

- Related unit tests: `src/lib/quick-add-prefs.test.ts`, `src/lib/ghi-chi-dialog-contract.test.ts`, transaction/money invariant tests.
- Database/RLS tests: no database truth changes; existing ledger/RLS suite remains selected by policy only if classifier requires it.
- Browser tests: existing capture/transaction browser smoke; runtime changes require browser smoke.
- Product/architecture rules: integer VND, transfer neutrality, explicit demo/auth stores, one mutation owner per runtime, no guessed financial data, exact-head verification and owner review for Class 3.

### Similar implementation and recent history

- Existing pattern to reuse: local coherent `QuickAddPreset`, shared `useTransactions`, existing AppShell notice action, existing `EditTransactionDialog`.
- Relevant issue: #595.

### Open questions

- [x] Stability threshold: use a deterministic 2-of-3 majority over the three most recent eligible same-kind ledger rows.
- [x] Eligibility: exclude transfers, split expenses, `needs_review`, and rows whose account/category is no longer valid for the selected kind.
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
| https://support.ynab.com/en_us/categorizing-transactions-a-guide-HyRl60sks | YNAB official support | 2026-09-14 | YNAB now updates an established payee category default when 2 of the 3 most recent categorizations agree; one-off changes no longer immediately hijack the default. | MoneyFlow has no payee-owned default model in this slice; only the stability pattern applies. |
| https://actualbudget.org/docs/tour/rules/ | Actual Budget official docs | 2026-09-14 | Actual uses explicit deterministic transaction rules to reduce repeated manual categorization. | MoneyFlow must not create a new rule engine here; existing Inbox rules remain separate. |
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

Use a pure helper that considers only the three most recent eligible ledger transactions for the requested kind. A ledger preset exists only if the same valid `accountId + categoryId` pair appears at least twice among those three. The helper ignores transfers, split transactions and review-needed rows. The shared Ghi form prefers this stable ledger preset; if absent, it preserves the current valid local-preset behavior. This borrows YNAB's stability concept, not its payee model. No new dependency or automation engine is introduced.

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

- [ ] Three most recent eligible same-kind rows are evaluated newest-first.
- [ ] A pair seen in at least 2 of those 3 rows becomes the ledger preset.
- [ ] One outlier cannot replace an established 2-of-3 pair.
- [ ] Fewer than three eligible rows, 1/1/1 history, transfers, opposite-kind rows, split expenses and `needs_review` rows do not establish a ledger preset.
- [ ] Rows with missing/invalid current account/category references are ignored.
- [ ] Stable ledger preset wins over local quick-add preset.
- [ ] Valid local preset remains fallback when no stable ledger preset exists.
- [ ] With neither safe source, category remains explicit rather than falling back to the first taxonomy item.
- [ ] Successful single-save capture exposes `Sửa` for the exact saved transaction on the primary Ghi surfaces.
- [ ] `Sửa` opens `EditTransactionDialog` and saves through existing `updateTransaction`; no second ledger mutation path is introduced.
- [ ] Transfer entry is unchanged.

### Required states

- Loading: no new loading state; defaults derive from already-loaded workspace transactions.
- Empty: no ledger preset; current local/explicit behavior remains.
- Populated: stable pair may preselect.
- Validation/error: existing form/mutation validation remains authoritative.
- Recovery/undo: post-save edit is additive; existing delete undo remains unchanged.
- Long data / large VND: unaffected; no amount-derived defaults.
- Mobile/tablet/desktop: no new layout system; notice action uses existing AppShell primitive.
- Accessibility: edit action has text label `Sửa`; existing dialog focus/labels are reused.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Learning is same-kind only and excludes uncertain/split/transfer rows.
- Ownership/RLS implications: none; only already-authorized workspace rows are read client-side and existing update action remains owner-safe.

### Out of scope

- Merchant/payee inference, fuzzy search, AI/ML, new rules, recurring detection, schema changes, provider sync, new persistence, cross-device preference sync, transaction duplication/repeat scheduling.

## Implementation plan

### Architecture fit

The stability calculation is pure capture behavior and belongs in `src/lib` as a testable helper over the neutral transaction contract. `AddTransactionDialog` remains the shared UI owner for choosing defaults. Existing `useTransactions` remains the only mutation orchestration owner; post-save correction only opens the existing edit dialog in each capture host.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/quick-add-defaults.ts` | Add pure 2-of-3 stable preset helper | Isolate/test financial-history-derived selection |
| `src/lib/quick-add-defaults.test.ts` | Counterexamples and ordering/eligibility tests | Prove stability and exclusions |
| `src/components/add-transaction-dialog.tsx` | Accept live transactions; prefer stable ledger preset before local fallback | Shared behavior across Ghi surfaces |
| `src/components/moneyflow-dashboard.tsx` | Pass live transactions; retain just-saved row; expose `Sửa`; reuse edit dialog/update mutation | Primary dashboard capture correction |
| `src/components/transactions/transactions-workspace.tsx` | Same, reusing existing edit state/dialog | Ledger surface correction |
| `src/components/inbox/capture-quick-page.tsx` | Same for dedicated quick-capture route | Keep capture behavior consistent |
| `src/lib/ghi-chi-dialog-contract.test.ts` | Extend static contract for ledger-history default and correction wiring | Guard shared integration |
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
| Imported uncertain row trains capture | Exclude `needs_review` |
| Split expense leaks arbitrary category | Exclude rows with split lines |
| Deleted category/account becomes default | Validate against current option sets |
| Old row order changes result | Sort by `occurredAt` newest-first with deterministic tie-break |
| Local preset overrides stronger ledger evidence | Explicit precedence test |
| New edit shortcut bypasses trusted mutation | Reuse `EditTransactionDialog` + `updateTransaction` only |
| Delete undo notice and edit action conflict | Delete undo keeps priority; post-save edit state is cleared by other notices/actions |

### Verification plan

- Static: `check:knowledge`, CI policy, deployment-env/architecture where selected, lint, typecheck, build.
- Unit/domain: new helper tests + quick-add prefs + Ghi contract + financial invariant regressions.
- Database: no database truth change; classifier may mark not applicable.
- Browser flow: existing smoke plus capture save/correction path selected by CI; add focused browser coverage if existing suite lacks it.
- Responsive/visual: no CSS/layout change intended; policy decides whether UI audit is applicable.
- Production/manual: after owner merge/deploy, verify affected Ghi save/default/edit behavior on exact deployment; not authorized in this branch-write phase.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add pure stable-ledger preset helper + tests | Spec | Unit tests | todo |
| T2 | Integrate stable preset into shared Ghi dialog | T1 | Contract/type checks | todo |
| T3 | Wire post-save `Sửa` through existing edit mutation on capture hosts | T2 | Browser/contract evidence | todo |
| T4 | Evaluate counterexamples and exact-head CI | T1-T3 | CI + review matrix | todo |
| T5 | Add bounded PR provenance and handoff to owner | T4 | PR memory + ready_for_review | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-14 | researcher/planner | implementer | planned | issue #595, current repo reconnaissance, 3 focused external sources, this packet | Browser shape and exact CI still unverified | Implement T1-T3 on focused branch |

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
| Pending implementation | — | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending evaluation.
- Important source limitations remain respected: pending evaluation.
- New tool/dependency/pattern passed the adoption review, or not applicable: no new dependency planned.

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- UI/UX/accessibility: pending.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- The selected stability rule is global per transaction kind, not merchant/payee-specific. That is intentional for this slice and must not be presented as semantic merchant learning.

## Delivery record

- Branch: `feat/595-ghi-stable-defaults`
- PR: pending
- Squash commit: pending owner merge
- CI run: pending
- Production deployment: not authorized
- Production flow verified: pending after owner merge/deploy
- Work packet moved to `docs/plans/completed/`: no
