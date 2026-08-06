# MoneyFlow UI-system Phase 5 — Transactions and Capture

**Status:** active
**Execution state:** ready_for_review
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `ca7fa855f0e9278f2c33e4d1aba0272a24d53fb0`
**Branch:** `feat/ui-phase-5-transactions-capture`
**Pull request:** #306
**Last updated:** 2026-08-06

The owner instructed **`tiếp tục p5`** on 2026-08-06. This authorizes bounded Phase 5 specification correction, product-code work and verification on the focused branch. It does not authorize merge, deployment, database/schema/Auth/RLS/provider writes, production-data access, a new visual direction or later UI phases.

## Outcome

Transactions and quick capture become one coherent daily-ledger boundary with local presentation ownership and shared Phase 2 primitives while preserving integer-VND, transfer exclusion, split exactness, mutation payloads and soft-delete recovery.

## Repository reconnaissance

At authorization:

- `transactions-page.tsx` and its module mixed local CSS with global manager/action classes and `:global(...)` repairs.
- add/edit/transfer/split each implemented their own native dialog presentation and focus behavior.
- `MobileShellContract` retained a transaction amount-field dark-mode repair.
- Phase 2 already supplied shared Button, LinkButton, IconButton, fields, Dialog, Alert, EmptyState and MoneyValue contracts.
- browser evidence covered core transaction paths but one rich-state assertion still targeted `.manager-row`.

Verified branch candidate:

- `/transactions` uses `transactions/transactions-workspace.tsx` and its local module.
- `/timeline` has a separate read-only owner and read-only ledger hook; it exposes no edit/delete/review/category mutation controls.
- summary, filters, ranges, selection, bulk correction, day groups, rows, money and actions compose Phase 2 primitives.
- add/edit/transfer/split use shared Dialog/field/action contracts and `transaction-form.module.css`.
- `/capture/quick` reuses the add form in embedded mode behind a route-owned module.
- the retired transactions component/module and `MobileShellContract` remainder were deleted after active-route replacement.
- browser evidence uses stable `data-slot` surfaces rather than retired transaction classes.
- phone transaction dialogs are full-width bottom sheets owned by the transaction form module; the local doubled-class selector intentionally outranks shared utility classes.
- complete large integer-VND values remain visible and unwrapped at 320–390 CSS pixels.
- broader root legacy styles still contain historical transaction selectors interleaved with active account-dialog rules; they are bounded residual debt, not active-route ownership, and were not deleted blindly.

Preserved invariants:

- VND remains integer đồng.
- transfers remain balanced and excluded from income/expense.
- split totals remain exact.
- existing server actions, validation, idempotency and tenant ownership remain unchanged.
- delete remains soft delete with an eight-second undo path.
- no balance, date, category, review state or planning assumption is invented.
- Fresh Blue/B3.2 and signed-in Light/Dark/System behavior remain unchanged.
- App Shell remains the navigation, safe-area, notice/undo and canonical capture owner.

## Research

| Source | Authority/type | Applied decision |
|---|---|---|
| [WAI-ARIA APG Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | W3C WAI | shared Dialog owns focus entry/containment/return, Escape and dismissal behavior |
| [H102: modal dialogs with the HTML dialog element](https://www.w3.org/WAI/WCAG22/Techniques/html/H102) | W3C WAI | retain native `showModal()`, Escape and focus restoration while changing phone geometry only |
| [WCAG 2.2 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI | validate before mutation and retain confirmation plus reversible delete/undo |
| [WCAG 2.2 Reflow / G225](https://www.w3.org/WAI/WCAG22/Techniques/general/G225) | W3C WAI | daily ledger content and complete financial values reflow at 320 CSS pixels without document-level horizontal scrolling |
| [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) | web-platform reference | keep native modal/top-layer and backdrop semantics; presentation remains CSS-owned |
| [MDN viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport) | web-platform reference | transaction forms use dynamic viewport sizing so virtual-keyboard layouts keep final actions reachable |

Observed: the old dialogs duplicated lifecycle behavior, selector ownership was split across global and local layers, and the existing domain behavior/tests were worth preserving. The first full cross-device run also proved that same-specificity utility rules could defeat phone owner geometry and that large seeded VND values still exceeded narrow boxes.

Decision: use Branch-by-Abstraction inside the existing product. Move one complete daily-ledger flow onto shared primitives and local presentation owners, preserve domain payloads, then remove compatibility only after the final active consumer moves. Fix measured layout defects in the owner instead of weakening audit thresholds.

## Specification

```text
/transactions
  -> TransactionsWorkspace + existing domain hooks
       -> transactions-workspace.module.css
       -> ledger summary / filters / bulk toolbar
       -> day group -> ledger row
       -> Phase 2 feedback, actions, empty state and money primitives
       -> shared add/edit/transfer/split Dialog + field contracts
  -> AppShell owns chrome, primary capture and undo notice

/timeline
  -> TimelineWorkspace + read-only ledger hook
       -> reviewed transactions only
       -> search / summary / export
       -> no mutation hooks or dialogs

/capture/quick
  -> AddTransactionDialog embedded mode
       -> shared amount/category/form behavior
       -> transaction-form.module.css
       -> capture-quick-page.module.css
```

Ledger contracts:

- filtered summary counts income and expense only; transfers never alter filtered income/expense/net;
- invalid date/amount ranges expose errors instead of silent reinterpretation;
- each day group has a semantic heading, absolute/relative date and signed daily net;
- rows retain note, category/account/transfer/split provenance and complete signed money text;
- review selection has transaction-specific accessible names and explicit status text;
- bulk category changes preserve amount/date/account and require confirmation;
- edit/delete/recurring actions use important touch targets;
- no-results and true-empty states expose the correct recovery action;
- Timeline projects reviewed ledger facts without mounting mutation owners.

Dialog/capture contracts:

- shared Dialog owns modal lifecycle and focus return;
- amount is initial focus for add/edit/transfer; first split amount is initial focus for split;
- invalid amount returns focus to the affected field;
- pending state prevents duplicate submission and locks dismissal;
- errors attach to the field or an assertive form alert;
- embedded quick capture reuses the same form without a nested modal;
- phone dialogs use deliberate full-width bottom-sheet geometry;
- 320px, 200% text and virtual-keyboard layouts keep form content and final actions reachable.

Stable evidence slots:

- `transactions-workspace`, `ledger-summary`, `ledger-filters`, `ledger-list`, `ledger-day-group`, `ledger-row`;
- `timeline-workspace`, `timeline-summary`, `timeline-row`;
- `capture-quick-workspace`, `quick-capture-form`;
- `dialog`, `dialog-content`, `empty-state` and child empty-state slots;
- browser tests prefer roles, labels and slots over retired class names.

## Implementation plan

1. Establish ledger contracts and stable evidence selectors.
2. Move summary, filters, ranges, selection/bulk controls, day groups and rows behind the local module and Phase 2 primitives.
3. Preserve all orchestration and financial calculations while changing presentation ownership only.
4. Migrate add/edit/transfer/split to the shared Dialog/action/field contracts.
5. Reuse the add form for embedded quick capture with dynamic-viewport and narrow-screen ownership.
6. Split Timeline into an explicit read-only projection.
7. Repair browser evidence to target roles/labels/slots.
8. Remove retired component/module and invisible amount repair after active-consumer proof; bound broader dead global cleanup with zero-reference evidence.
9. Run exact-head policy, static, unit, build, browser, Chromium/WebKit, CodeQL and secret-history gates.
10. Record truthful PR memory and stop for explicit owner merge decision.

## Tasks

| ID | Task | Status |
|---|---|---|
| P5-T1 ledger contracts | completed and verified |
| P5-T2 summary/filters/ranges/bulk owner | completed and verified |
| P5-T3 rows/money/actions/review owner | completed and verified, including large-VND phone states |
| P5-T4 shared add/edit/transfer/split dialogs | completed and verified, including full-width phone geometry |
| P5-T5 soft delete and eight-second undo | completed and browser-verified |
| P5-T6 embedded quick capture and keyboard-safe layout | completed and verified |
| P5-T7 stable audit evidence | completed and verified |
| P5-T8 remove compatibility after last consumer | active component/module and MobileShellContract compatibility removed; residual historical global selectors explicitly bounded |
| P5-T9 full verification matrix | completed on implementation head `81d9cf0cc289a8676e9150278789b4d9957a3c32` |
| P5-T10 owner approval and merge | blocked pending explicit owner decision |

## Evaluation

PR #306 was marked ready-for-review only to activate heavy gates; this is not merge authorization. Earlier draft CI shells are not accepted as evidence because heavy shards were skipped.

Evaluation found and fixed real defects rather than weakening tests:

1. Timeline initially retained review/filter mutation controls; it was split into a read-only owner and read-only hook.
2. Browser assertions still depended on `.manager-row`, `.empty-state-actions`, `.transaction-dialog` and old SAFE-09 classes; they now use stable roles and slots.
3. The shared Dialog utility width defeated a same-specificity local phone rule, leaving an 18px inset; the transaction form owner now deterministically wins and produces a full-width bottom sheet.
4. Seeded 12.345.678.900 VND and 4.567.890.123 VND values overflowed narrow summary/row boxes; responsive money ownership now keeps the complete values visible without ellipsis or wrapping.
5. Parent-controlled closing initially defeated `Lưu & thêm tiếp`; the add form now preserves the keep-open session and refocuses amount.

Exact implementation-head evidence:

- Head: `81d9cf0cc289a8676e9150278789b4d9957a3c32`.
- CI #1827, run `31070085106`: success.
- Policy/knowledge/diff hygiene: success.
- Deployment contract, CSS ownership/debt budget, architecture, lint and typecheck: success.
- Complete unit/static RLS suite: success.
- Production build: success.
- Browser smoke: success; artifact `browser-smoke-evidence-31070085106-1`, SHA-256 `65ccb37db1437903da99395a081f91d508b02f9472a5675d61cba310ce165a1d`.
- Cross-device UI audit: success across phone 320/360/390, tablet, desktop, dark mode, Chromium/WebKit, 200% text and keyboard; artifact `ui-audit-evidence-31070085106-1`, SHA-256 `e8df3389fcdda6e2e987e73a7863548967d0057cb0f284bd597c07ae0b46b069`.
- Final browser aggregation: success.
- CodeQL #945, run `31070085098`: success.
- Secret history scan #945, run `31070085113`: success.
- Database checks correctly reported not required; no database, migration or RLS path changed.

The documentation evidence commits after this implementation head do not change runtime behavior. Their cumulative PR diff remains subject to repository exact-head checks before owner review.

Acceptance matrix:

| Boundary | Required proof | State |
|---|---|---|
| policy/knowledge | diff hygiene, knowledge and CI-policy contracts | passed |
| static | deployment env, CSS ownership, architecture, lint, typecheck | passed |
| domain | complete unit/static RLS tests | passed |
| build | production build | passed |
| expense add/edit/delete/undo | browser smoke/focused flows | passed |
| transfer/split | browser flows and invariant tests | passed |
| Timeline read-only boundary | focused source and browser contracts | passed |
| 320px/long Vietnamese/large VND | Chromium/WebKit artifacts | passed |
| dialog focus and keyboard | modal placement/focus/Escape plus keyboard matrix | passed |
| security | CodeQL and secret-history | passed |
| production/provider | separate post-merge boundary | not attempted; not authorized |
| physical Android/iOS acceptance | later migration acceptance phase | not part of automated P5 closure |

Open risks:

- automated Chromium/WebKit evidence does not replace later physical Android/iOS acceptance;
- historical root transaction selectors remain dead debt interleaved with active account-dialog rules and require a separately bounded zero-reference cleanup;
- no production behavior exists until the owner merges and the exact merge is deployed/verified.

## Risk and rollback

- Primary risk: a presentation refactor regresses a high-frequency financial flow despite unchanged domain logic.
- Mitigation: preserved payloads/hooks plus exact-head source, unit, build and browser evidence.
- Schema/migration/backfill: none.
- Database/Auth/RLS/provider/production-data writes: none authorized or performed.
- Rollback: revert the eventual Phase 5 merge commit; no database rollback is required.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-06 | human owner | implementer | implementing | explicit `tiếp tục p5` | bounded branch implementation and verification |
| 2026-08-06 | implementer | evaluator | evaluating | PR #306 ready-for-review to activate heavy gates | inspect and fix evidence-backed failures only |
| 2026-08-06 | evaluator | human owner | ready_for_review | CI #1827, CodeQL #945, secret scan #945 and browser artifacts green on implementation head | review PR and explicitly approve or reject merge; no deployment implied |

## Current permission boundary

- Writes are allowed only on `feat/ui-phase-5-transactions-capture` for this packet.
- Merge and deployment remain owner decisions.
- No database, migration, Auth, RLS, provider-setting or production-data operation is authorized.
- No later UI phase or new product/visual requirement is authorized.
