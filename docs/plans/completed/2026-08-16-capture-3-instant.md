# Capture 3.0 — amount-only fast path

**Status:** accepted / superseded presentation
**Execution state:** completed
**Issue/PR:** #411 / #412
**Completed:** 2026-08-16

## Outcome

Capture 3.0 kept the trusted `AddTransactionDialog` Expense/Income mutation path and added deterministic browser-local learned presets that remember successful `kind + accountId + categoryId` combinations as coherent pairs. Reopening or switching kind prefers the newest still-valid learned preset. The common path shows the learned category/account before Save, allows one-tap category correction, keeps note/date/keep-open secondary, and no longer guesses an arbitrary first taxonomy item for a first-time user.

## Delivery evidence

- Branch: `capture-3-instant-presets-411`
- PR: #412 — `feat: make Capture truly amount-only`
- Final candidate head: `ad03e607e0794123ab62fea28a95723609791a0f`
- Merged main commit: `30ad41a8cb81c9161af2304a5cef596c80f16dcf`
- CI #2584: SUCCESS
- CodeQL #1652: SUCCESS
- Secret history #1652: SUCCESS
- Browser smoke, Cross-device UI audit and `e2e` aggregation passed before merge.

## Preserved boundaries

- No schema, RLS, provider or production-data mutation.
- VND remains integer đồng.
- Explicit Save and idempotency remain unchanged.
- Transfer remains owned by `TransferDialog` / `addTransfer` and neutral to income/expense.
- Note remains optional; rule matching remains an enhancement only.
- Browser/UI evidence did not close RRB-08 physical-device acceptance.

## Supersession

Direct owner real-phone screenshots after merge showed the interaction logic is now fast, but the presentation still looks too much like a form: repeated instructions, oversized type control, heavy category card, clipped horizontal suggestions, redundant Cancel + close affordances and unnecessary sheet height. #413 supersedes only that presentation layer. The learned preset and financial semantics from #412 remain current authority.
