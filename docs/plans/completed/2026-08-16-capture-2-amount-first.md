# Capture 2.0 — amount-first quick capture

**Status:** accepted / superseded presentation
**Execution state:** completed
**Issue/PR:** #409 / #410
**Completed:** 2026-08-16

## Outcome

Capture 2.0 replaced the old four-step quick transaction form with the shared amount-first `AddTransactionDialog`, compact `Chi / Thu / Chuyển` entry, visible remembered account/category confirmations, progressive disclosure for full choices/date/note/keep-open, direct `/capture/quick` modes and installed-PWA shortcuts. It preserved the existing expense/income mutation, integer-VND parsing, idempotency and trusted transfer handoff.

## Delivery evidence

- Branch: `capture-2-amount-first-409`
- PR: #410 — `feat: make Capture amount-first`
- Candidate exact head: `815b75313d95a71a7bad9ce6f0366a33144d3378`
- Merged main commit: `fd23219400d41a533f6cad0f517585f9ae0b7260`
- CI #2573: SUCCESS
- CodeQL #1635: SUCCESS
- Secret history #1635: SUCCESS
- Production build, lint/typecheck, architecture/CSS ownership, unit/static RLS, Browser smoke, Cross-device UI audit and e2e aggregation passed before merge.

The dedicated browser audit constrained capture to 390×568 and verified amount focus, remembered defaults, optional detail closed, no horizontal overflow and explicit Save reachable. That evidence was browser-only and did not close RRB-08 physical-device acceptance.

## Preserved boundaries

- No schema/RLS/provider/production-data mutation.
- VND remains integer đồng.
- Expense/income submission remains explicit and idempotent.
- Transfer continues through `TransferDialog` / `addTransfer`; transfer remains neutral to income/expense.
- Note/date remain editable secondary data.

## Supersession

Direct owner phone review after #410 found that the disclosure-first category/account presentation still felt too form-like for a genuinely fast daily capture path. #411 / PR #412 therefore supersede only Capture 2.0's default/category presentation with the Capture 3.0 learned-preset and one-tap-category design. The underlying amount-first structure, direct entry modes, PWA shortcuts and trusted mutation boundaries from #410 remain shipped provenance.

RRB-08 remains open until owner-observed physical-device acceptance is recorded.
