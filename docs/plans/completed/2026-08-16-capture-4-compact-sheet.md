# Capture 4 — compact keyboard-first quick sheet

**Status:** accepted and merged
**Execution state:** completed
**Active role:** none
**Permission scope:** closed
**Owner:** owner-authorized from direct real-phone screenshots
**Issue/PR:** #413 / #414
**Completed:** 2026-08-16

## Outcome

Capture 4 preserved Capture 3 learned `kind + account + category` presets and the existing trusted transaction mutations while making the common phone path visually match `open → amount → Save`.

The merged presentation:

- uses concise dynamic `Ghi khoản chi` / `Ghi khoản thu` titles;
- keeps the amount label accessible without spending a visible instructional row on it;
- keeps `Chi / Thu / Chuyển` touch-safe but visually compact;
- shows the selected category/account once in a lightweight row;
- exposes at most two quick category corrections plus `Khác`, with no clipped horizontal chip rail;
- keeps full account/category controls and optional date/note/keep-open on explicit disclosure;
- removes redundant visible modal `Hủy` while preserving close/back/dismiss and embedded-host cancellation;
- preserves keyboard-pressure reachability without CSS `!important` or test-specific geometry hacks.

## Preserved boundaries

- VND remains integer đồng.
- Expense/Income submission, idempotency and learned-preset persistence remain owned by the existing transaction path.
- Transfer continues through the existing `TransferDialog` / `addTransfer` boundary and remains neutral to income/expense.
- No schema, RLS, Auth/provider, deployment, production-data or shared-cache semantics changed.

## Research applied

The slice used current Apple data-entry/sheet guidance to minimize repeated decisions and current Android Material 3/IME guidance to keep critical actions reachable under keyboard pressure. External guidance informed presentation only; MoneyFlow code, tests and financial invariants remained authority.

## Verification and acceptance evidence

- Final PR head: `f1b72033bb8ed81567d3b6acd2f5c3c47c7dfed0`.
- Exact-head CI #2602: success.
- Production build, static quality, unit/static RLS, Browser smoke, Cross-device UI audit and `e2e`: success.
- CodeQL #1669: success.
- Secret history #1669: success.
- Merged to `main` as `8ef322badc34457c8d50f0e0f0e66e600db83055`.
- Issue #413 closed as completed with the merge.

## Remaining boundary

Physical-phone acceptance remains owned by RRB-08. Browser/constrained-height evidence does not substitute for a real software keyboard and physical-device observation after the merged build is deployed.

## Lifecycle

This packet is historical evidence only. It no longer grants execution authority and must not be used to reopen Capture work. Current execution is owned by `docs/plans/active/README.md`.
