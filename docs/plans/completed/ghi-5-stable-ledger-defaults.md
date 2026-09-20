# Ghi 5.0 — stable ledger-backed defaults and post-save correction

**Status:** completed
**Execution state:** completed
**Active role:** human_owner
**Permission scope:** branch_write
**Owner:** human owner; implementation and evaluation by OpenAI agent
**Issue/PR:** #595 / #596
**Last updated:** 2026-09-14

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Reduce repeated choices in Ghi without guessing financial facts. When recent trustworthy ledger history clearly establishes one account/category pair for the selected transaction kind, Ghi may preselect that pair. Weak or conflicting evidence does not create a ledger default, and the existing browser-local successful preset remains fallback. After a successful single save, the exact saved transaction is immediately correctable through MoneyFlow's existing edit/update path.

## Repository reconnaissance

### Current behavior

- Before this PR, `src/components/add-transaction-dialog.tsx` used the newest successful browser-local account/category preset for the selected kind.
- First-time capture deliberately avoids taxonomy fallback: without an established category, the user must select one explicitly.
- Dashboard, Transactions, and Capture Quick share `AddTransactionDialog` and `useTransactions` mutation ownership.
- `useTransactions.updateTransaction` plus `EditTransactionDialog` already own correction for demo and authenticated runtimes.
- Transfers use a separate mutation path and remain neutral to income/expense.
- Canonical ledger ordering in `src/server/finance.ts` is `occurredOn` descending, then creation timestamp (`occurredAt`) descending, then id descending.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/quick-add-prefs.ts` | Existing local fallback and recent choices | Reuse; do not turn localStorage into financial truth |
| `src/lib/transactions/contracts.ts` | Neutral transaction contract | Reuse |
| `src/components/add-transaction-dialog.tsx` | Shared Ghi default selection | Narrow change |
| `src/hooks/use-transactions.ts` | Single mutation owner | Reuse; no second mutation |
| `src/components/edit-transaction-dialog.tsx` | Existing correction UI | Reuse |
| Dashboard / Transactions / Capture Quick | Primary capture entry surfaces | Pass transaction history and expose post-save edit |

### Existing tests and constraints

- Related unit/domain tests: `src/lib/quick-add-prefs.test.ts`, `src/lib/quick-add-defaults.test.ts`, `src/lib/ghi-chi-dialog-contract.test.ts`, existing transaction/money invariant tests.
- Database/RLS: no database truth change; CI classified database reset/pgTAP as not required.
- Browser: Class 3 CI selected Browser smoke, authenticated ownership smoke and Cross-device UI audit.
- Product/architecture: integer VND, transfer neutrality, explicit demo/auth stores, one mutation owner, no guessed financial data, exact-head verification and owner merge decision.

### Similar implementation and recent history

- Reused pattern: coherent `QuickAddPreset`, shared `useTransactions`, AppShell notice action, existing `EditTransactionDialog`.
- Relevant issue/PR: #595 / #596.

### Open questions

- [x] Stability threshold: deterministic 2-of-3 majority over the three most recent eligible same-kind ledger rows.
- [x] Eligibility: exact kind, no split, normalized reviewed status, valid current account/category.
- [x] Ordering: canonical ledger order (`occurredOn` → `occurredAt` → id), all newest-first.
- [x] Fallback: stable ledger default, then valid browser-local preset, then established local choice, otherwise explicit category choice.

## Research

### Research scope and source selection

- Decision question: how should repeated history influence defaults without letting one-off behavior silently hijack future entry?
- Reference map consulted: current repository/product contracts first; external research limited to primary product/design sources.
- Source budget: three focused sources.
- Expected decision: small deterministic stability rule plus obvious immediate correction.

### Questions researched

1. How do mature personal-finance products keep one-off categorization from becoming a bad default?
2. How do rule-based finance tools preserve deterministic, inspectable automation?
3. What interaction guidance supports reduced input while preserving recovery?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| https://support.ynab.com/en_us/categorizing-transactions-a-guide-HyRl60sks | YNAB official support | 2026-09-14 | An established category default changes when 2 of the 3 most recent transactions support the different category; one-off/older changes do not immediately hijack it. | MoneyFlow has no payee-owned default model here; only the stability pattern applies. |
| https://actualbudget.org/docs/budgeting/rules/ | Actual Budget official docs | 2026-09-14 | Deterministic, inspectable rules can reduce repeated categorization work. | MoneyFlow does not add a new rule engine in this slice. |
| https://developer.apple.com/design/human-interface-guidelines/design-principles | Apple HIG | 2026-09-14 | Reduce unnecessary input, provide feedback and support recovery. | Platform-specific implementation details do not govern this web app. |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Last successful local preset only | Already shipped, simple | One exceptional capture becomes next default; browser-local only | Keep as fallback |
| 2-of-3 recent eligible ledger pairs | Deterministic, explainable, robust to one outlier | Requires eligibility and ordering proof | Selected |
| Merchant/payee fuzzy matching | More specific | New normalization/inference semantics and false positives | Rejected |
| ML/AI suggestion | Flexible | Probabilistic financial default and privacy/evaluation cost | Rejected |
| New DB preference table | Cross-device persistence | Schema/RLS/migration cost before value is proven | Rejected |

### Research decision

Use a pure helper over the three most recent eligible ledger transactions for the requested kind. A preset exists only when the same valid `accountId + categoryId` pair appears at least twice. The helper requires normalized `reviewStatus === "reviewed"`, excludes transfers and split transactions, validates current references, and follows MoneyFlow's canonical ledger ordering. The shared Ghi form prefers this stable preset; otherwise it preserves current local-preset behavior. This adapts YNAB's stability concept, not its payee model. No dependency or automation engine is introduced.

### Adoption review

Not applicable. No new dependency, provider, service, framework, model or architecture layer was added.

## Specification

### Problem

The previous last-successful local preset speeds entry but a one-off transaction can silently become the next default. The ledger provides stronger repeated-behavior evidence. Users also need a short path to correct the exact transaction immediately after a save.

### User stories

- As a repeat user, I can have Ghi preselect a stable account/category pair when recent same-kind history clearly supports it.
- As a user with weak or conflicting history, I am not given a guessed financial default.
- As a user who notices an immediate mistake, I can edit the exact saved transaction through the existing correction path.

### Acceptance criteria

- [x] Evaluate the three most recent eligible same-kind rows in canonical ledger order.
- [x] A pair seen in at least 2 of those 3 rows becomes the ledger preset.
- [x] One outlier cannot replace an established 2-of-3 pair.
- [x] Fewer than three eligible rows, 1/1/1 history, transfers, opposite-kind rows, split expenses and non-reviewed rows do not establish a preset in the pure helper.
- [x] Missing/invalid current account/category references are ignored.
- [x] Stable ledger preset wins over local quick-add preset.
- [x] Valid local preset remains fallback when no stable ledger preset exists.
- [x] With neither safe source, category remains explicit rather than using the first taxonomy item.
- [x] Successful single-save capture exposes `Sửa` for the exact saved transaction on primary Ghi surfaces.
- [x] `Sửa` reuses `EditTransactionDialog` and `updateTransaction`; no second ledger mutation path exists.
- [x] Transfer mutation semantics are unchanged.

### Required states

- Loading: no new loading state; default calculation uses already-loaded history.
- Empty: no ledger preset; local/explicit behavior remains.
- Populated: stable pair may preselect.
- Validation/error: existing form/mutation validation remains authoritative.
- Recovery/undo: post-save edit is additive; delete undo retains priority in Transactions.
- Long data / large VND: unchanged; defaults never derive from amount.
- Mobile/tablet/desktop: no new layout system; exact-head cross-device audit passed.
- Accessibility: `Sửa` is text-labeled and existing dialog focus/labels are reused.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Same-kind only; pure helper requires normalized reviewed status and excludes split/transfer rows.
- Ownership/RLS: no new read/write authority; existing authorized workspace data and update action are reused.

### Out of scope

Merchant/payee inference, fuzzy matching, AI/ML, new rules, recurring detection, schema changes, provider sync, new persistence, cross-device preference sync, duplication/repeat scheduling.

## Implementation plan

### Architecture fit

The stability calculation lives as a pure `src/lib` helper over the neutral transaction contract. `AddTransactionDialog` remains the shared default-selection owner. `useTransactions` remains the mutation owner; post-save correction only opens the existing edit flow in each capture host.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/quick-add-defaults.ts` | 2-of-3 helper with canonical ordering and reviewed-only eligibility | Testable deterministic selection |
| `src/lib/quick-add-defaults.test.ts` | Majority, weak-evidence, backdated, tie-break and eligibility counterexamples | Prove safety |
| `src/components/add-transaction-dialog.tsx` | Prefer stable history before local fallback | Shared Ghi behavior |
| `src/components/moneyflow-dashboard.tsx` | History input + exact post-save `Sửa` via existing edit/update | Dashboard correction |
| `src/components/transactions/transactions-workspace.tsx` | Same, preserving delete undo priority | Ledger correction |
| `src/components/inbox/capture-quick-page.tsx` | Same, with bounded recovery window then Capture hub fallback | Dedicated quick capture |
| `src/lib/ghi-chi-dialog-contract.test.ts` | Shared integration contract | Regression guard |
| Packet + PR memory | Class 3 state/evidence/rollback | Durable handoff |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: additive optional history prop; localStorage format unchanged.
- Rollback: revert PR #596; no data conversion required.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| One unusual transaction hijacks default | 2-of-3 majority |
| Transfer affects expense/income default | Exact-kind filter |
| Non-reviewed row trains pure helper | Require normalized `reviewed` |
| Split expense leaks arbitrary category | Exclude split rows |
| Archived/deleted reference returns | Validate current option sets |
| Newly-created backdated row ranks newest | Canonical `occurredOn` → `occurredAt` → id ordering |
| Local preset overrides stronger history | Precedence contract |
| Edit shortcut bypasses trusted mutation | Existing edit dialog + update mutation only |
| Delete undo conflicts with edit action | Undo retains toast-action priority |
| Quick page becomes blank after recovery window | Return to `/capture` if untouched |

### Verification plan

- Static: policy contracts, deployment config, CSS ownership, architecture, lint, typecheck.
- Unit/domain: helper counterexamples, Ghi contract, existing tests/static RLS.
- Database: classifier selected not required; no database truth change.
- Browser: expense/auth CAPTCHA smoke, authenticated ownership smoke, cross-device UI audit and e2e aggregate.
- Production/manual: only after owner-approved merge/deploy; not authorized in this state.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add stable-ledger helper + tests | Spec | helper + counterexamples | done |
| T2 | Integrate into shared Ghi dialog | T1 | dialog diff + contract | done |
| T3 | Wire post-save `Sửa` through existing mutation | T2 | three host diffs + contract | done |
| T4 | Evaluate counterexamples and exact-head CI | T1-T3 | evaluator review + CI #3742 | done |
| T5 | Record provenance and hand off to owner | T4 | PR memory + this ready_for_review packet | done |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-14 | researcher/planner | implementer | planned | issue #595, repo reconnaissance, primary sources, packet | Runtime evidence not yet collected | Implement focused branch |
| 2026-09-14 | implementer | evaluator | evaluating | PR #596, helper/tests, three host integrations, PR memory | CI initially exposed documentation-contract blockers | Repair and re-evaluate |
| 2026-09-14 | evaluator | human_owner | ready_for_review | PR #596; content head `e1cd796435be0da389c83a839d3639e417867710`; CI #3742 / `34776438370`; CodeQL #2742 / `34776438357`; Secret history #2742 / `34776438354` | Final bookkeeping head must retain green exact-head checks; production behavior remains unverified until owner-approved deploy | Review PR and decide merge; do not merge automatically |

### Current permission boundary

- Granted scope: focused branch/PR implementation for #595.
- Exact resource: `Thunderkill016/moneyflow` branch `feat/595-ghi-stable-defaults` and PR #596.
- Forbidden writes: `main`, provider settings, production data, branch protection, required checks, unrelated branches.
- Human approval required before: merge, deployment/provider write, production acceptance.
- Rollback/stop: revert focused PR; no migration or preference conversion required.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| 2-of-3 exact pair + weak-evidence rejection | `quick-add-defaults.test.ts`; CI #3742 unit/static-RLS job | pass |
| Canonical ordering + backdated counterexample | helper tests + `src/server/finance.ts` ordering comparison | pass |
| Reviewed-only pure-helper eligibility | helper + explicit missing-review counterexample | pass |
| Ledger-before-local precedence | `ghi-chi-dialog-contract.test.ts` | pass |
| Immediate correction reuses existing mutation | three hosts + contract test | pass |
| Delete undo priority | Transactions notice contract | pass |
| Static/build integrity | CI #3742 policy/static/build/verify jobs | pass |
| Browser/auth ownership | CI #3742 Browser smoke | pass |
| Responsive/cross-browser UI | CI #3742 Cross-device UI audit | pass |
| Browser aggregate | CI #3742 `e2e` | pass |
| Security controls | CodeQL #2742 + Secret history #2742 | pass |
| Database scope | CI #3742 classifier: database checks not required | pass / not applicable |

### Research and adoption evidence

- YNAB primary support was rechecked on 2026-09-14 and supports a 2-of-3 recent-history stability pattern.
- Actual Budget primary docs support deterministic, inspectable learned categorization; MoneyFlow did not adopt its rule engine.
- Source limits remain respected: no payee model, fuzzy matching, AI inference or new automation architecture.
- New dependency/provider/service adoption: not applicable.

### Review findings

- Correctness: evaluator repaired two semantic issues before handoff: canonical ordering now prioritizes transaction date over creation time, and the pure helper requires normalized reviewed status rather than merely excluding `needs_review`.
- Security/ownership: no new data source, provider, schema, RLS path or mutation owner.
- UI/UX/accessibility: immediate edit uses existing labeled action/dialog; Quick has a bounded success/recovery state and safe hub fallback.
- Maintainability: one pure helper; correction reuses existing owner.
- Scope: exactly 9 PR files; no schema/provider/dependency expansion.
- CI recovery: #3738 exposed packet trailing whitespace; #3741 exposed missing required PR-memory `Verified` field; both were documentation-contract fixes. #3742 then passed all selected gates on content head `e1cd796435be0da389c83a839d3639e417867710`.

### Remaining limitations

- Stability is global per transaction kind, not merchant/payee-specific; it must not be described as merchant learning.
- Browser-local fallback remains device-local; cross-device preference sync is out of scope.
- Production flow is not yet verified because merge/deployment are owner-gated.

## Delivery record

- Branch: `feat/595-ghi-stable-defaults`
- PR: #596 — merged 2026-09-13
- Content head verified: `e1cd796435be0da389c83a839d3639e417867710`
- CI: #3742 (`34776438370`) success — policy, unit/static RLS, static quality, build, browser, cross-device UI, e2e.
- CodeQL: #2742 (`34776438357`) success.
- Secret history scan: #2742 (`34776438354`) success.
- Squash commit: `f7a5ae07`.
- Production deployment: not authorized.
- Production flow verified: pending owner-approved deploy.
- Work packet moved to `docs/plans/completed/`: no; keep active through owner review/merge/acceptance.
