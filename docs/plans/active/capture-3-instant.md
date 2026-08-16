# Capture 3.0 — amount-only fast path

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** owner-authorized ChatGPT implementation
**Issue/PR:** #411 / pending
**Last updated:** 2026-08-16

## Outcome

Redevelop MoneyFlow quick capture so a familiar expense/income is genuinely `open → amount → Save`. Category/account become learned, visible confirmations; a different recent category is one tap; note/date/keep-open remain optional secondary detail.

## Repository reconnaissance

### Current behavior

- #410 merged as `fd232194…` and made `AddTransactionDialog` amount-first, but the common surface still presents account/category as disclosure controls.
- `src/lib/quick-add-prefs.ts` remembers kind/account/category independently plus recent category ids.
- A successful transaction already uses the trusted `onAdd` mutation, integer-VND parsing, idempotency key, current account/category ids and optional note/date.
- Note-based Inbox rules can recategorize after text entry, but note is not required by the mutation.
- Transfer remains owned by `TransferDialog` / `addTransfer` and must stay neutral to income/expense.

### Relevant repository areas

| Area | Role |
|---|---|
| `src/components/add-transaction-dialog.tsx` | quick-entry state, trusted submit semantics and presentation |
| `src/lib/quick-add-prefs.ts` | local deterministic quick-entry memory |
| `src/components/transactions/transaction-form.module.css` | shared dialog/form geometry |
| `src/components/transactions/capture-fast-path.module.css` | Capture 3 instant-decision presentation owner |
| `e2e/audit/capture-amount-first.audit.spec.ts` | constrained phone acceptance evidence |

### Existing constraints

- No schema/provider/RLS change.
- No guessed financial amount or auto-save.
- Explicit Save remains required.
- Browser evidence cannot close RRB-08 physical-device acceptance.

## Research

### Decision question

How can a manual-first finance capture flow minimize taps and text entry without hiding or guessing material financial choices?

### Sources consulted on 2026-08-16

| Source | What it establishes | MoneyFlow use |
|---|---|---|
| Apple HIG — Entering data | pre-gather known information, prefill reasonable defaults, reduce text entry and decisions | make known category/account defaults explicit confirmations instead of mandatory form work |
| Apple HIG — Designing for iOS | prioritize the primary task and keep secondary controls discoverable with minimal interaction | first viewport stays amount + fast defaults + Save |
| YNAB 2026 categorization guidance | remembers most recently used category for a payee and surfaces several predictive recent categories on mobile | surface recent category choices directly; learn from successful use rather than requiring repeated full-picker work |
| YNAB 2026 add-transaction guidance | shortcuts can open entry with prefilled transaction context | keep direct/PWA quick entry compatible with learned defaults |
| Toshl manual-entry guidance | amount/category/save is the basic core; description and other data are advanced detail | note/date stay secondary and optional |
| Monarch transaction rules | deterministic merchant/account/category rules can automate categorization | keep current deterministic rule enhancement; do not introduce AI in this slice |
| Existing MoneyFlow code/tests | note is optional; current mutation/idempotency/transfer boundaries are trusted | repository truth outranks external product patterns |

### Research decision

Capture 3 uses deterministic learned presets from successful manual captures. The preset stores `kind + accountId + categoryId` as one coherent pair. On reopen or kind switch, the newest still-valid preset is preferred. The first viewport shows the selected category/account plus up to four recent category buttons. Full account/category controls and note/date remain behind disclosure. Note-based rules stay optional enhancement only.

### Alternatives rejected

- AI categorization: unnecessary new uncertainty/provider scope.
- Auto-save after amount: too easy to create an unintended financial record.
- Require note/merchant for classification: adds text entry to the high-frequency path.
- Continue hiding category behind a disclosure: owner feedback shows it still feels like form work.

## Specification

### User stories

- Familiar transaction: open, type amount, Save.
- Different recent category: open, type amount, tap one category, Save.
- Uncommon account/category: open the explicit full picker.
- Extra context: open optional detail and add note/date.

### Acceptance criteria

- [ ] Successful quick captures learn coherent account/category presets.
- [ ] Reopening capture prefers the newest valid preset for the selected kind.
- [ ] Selected category/account are visible without opening a disclosure.
- [ ] Up to four category choices are directly tappable in the first viewport.
- [ ] Note is labeled and treated as optional; category does not depend on typing note.
- [ ] Full account/category controls remain accessible on demand.
- [ ] Familiar transaction requires no category/details opening before Save.
- [ ] Existing explicit Save, idempotency, integer-VND and transfer boundaries remain unchanged.
- [ ] 390×568 audit proves amount, defaults, category suggestions and Save are reachable with secondary disclosures closed.

## Implementation plan

### Architecture fit

Extend the existing quick-add local preference contract rather than adding a new storage/provider model. `AddTransactionDialog` remains the sole quick expense/income submit owner. A small CSS module owns only the new instant-decision surface; the shared transaction form module still owns dialog/footer/optional detail geometry.

### Planned changes

| File | Change |
|---|---|
| `src/lib/quick-add-prefs.ts` | optional `recentPresets`, validator and newest-first dedupe helper |
| `src/lib/quick-add-prefs.test.ts` | backward-compatible validation + preset learning contracts |
| `src/components/add-transaction-dialog.tsx` | hydrate coherent preset; first-viewport category chips; optional full picker/detail |
| `src/components/transactions/capture-fast-path.module.css` | local fast-default/chip geometry |
| affected source/e2e/audit tests | contract the amount-only common path |

### Data and migration impact

- No database migration.
- Existing `moneyflow-quick-add-prefs-v1` remains valid because `recentPresets` is optional.
- Stored presets contain only existing ids/kind; no amount is memorized or auto-submitted.

### Risks and prevention

| Risk | Prevention |
|---|---|
| stale account/category id | use only presets whose account and kind/category still exist |
| independently remembered fields form a never-used combination | learned preset keeps account/category as one pair |
| wrong default silently posts | selected pair remains visible and Save remains explicit |
| category chips overflow narrow phones | horizontal local rail; full picker remains available |
| optional note accidentally becomes required for rules | mutation accepts empty note; fast path tests keep optional disclosure closed |

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | research current finance-entry patterns and inspect current main | done |
| T2 | create #411 and branch from `main@fd232194…` | done |
| T3 | implement learned preset + instant first viewport | doing |
| T4 | reconcile source/e2e/UI contracts | doing |
| T5 | open PR and obtain exact-head CI/artifact evidence | todo |

## Handoff record

| Date | From | To | State | Evidence | Remaining boundary |
|---|---|---|---|---|---|
| 2026-08-16 | human_owner | implementer | implementing | owner request + #411 + research above | browser/CI first; physical-phone acceptance remains owner-observed |

## Evaluation

### Acceptance evidence

Pending exact-head CI and UI artifact review.

### Review findings

- Financial/domain behavior is intentionally reused, not reimplemented.
- Learning is deterministic local preference behavior, not AI or provider inference.
- Note remains available for explicit context and existing rules but is no longer positioned as needed for a usable category.

### Remaining limitations

- Learned presets are browser-local because the existing quick-add preference model is browser-local; this slice does not add cross-device preference sync.
- Browser constrained-height evidence is not a physical keyboard/device proof.

## Delivery record

- Branch: `capture-3-instant-presets-411`
- PR: pending
- Base: `fd23219400d41a533f6cad0f517585f9ae0b7260`
- Exact head: pending
- CI: pending
- Merge/deployment: pending
