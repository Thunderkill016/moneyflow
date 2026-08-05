# MoneyFlow UI-system Phase 5 — Transactions and Capture

**Status:** active
**Execution state:** evaluating
**Active role:** implementer
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

Current branch candidate:

- `/transactions` and `/timeline` use `transactions/transactions-workspace.tsx` and its local module.
- summary, filters, ranges, selection, bulk correction, day groups, rows, money and actions compose Phase 2 primitives.
- add/edit/transfer/split use shared Dialog/field/action contracts and `transaction-form.module.css`.
- `/capture/quick` reuses the add form in embedded mode behind a route-owned module.
- the retired transactions component/module and `MobileShellContract` remainder were deleted after active-route replacement.
- rich-state evidence now targets `data-slot="ledger-row"`.
- broader root legacy styles may still contain dead transaction selectors; deletion requires zero-reference proof rather than blind broad removal.

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
| [WCAG 2.2 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI | validate before mutation and retain confirmation plus reversible delete/undo |
| [WCAG 2.2 Reflow / G225](https://www.w3.org/WAI/WCAG22/Techniques/general/G225) | W3C WAI | daily ledger content reflows at 320 CSS pixels without document-level horizontal scrolling |
| [MDN viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport) | web-platform reference | transaction forms use dynamic viewport sizing so virtual-keyboard layouts keep final actions reachable |

Observed: the old dialogs duplicated lifecycle behavior, selector ownership was split across global and local layers, and the existing domain behavior/tests were worth preserving.

Decision: use Branch-by-Abstraction inside the existing product. Move one complete daily-ledger flow onto shared primitives and local presentation owners, preserve domain payloads, then remove compatibility only after the final active consumer moves.

## Specification

```text
/transactions and /timeline
  -> TransactionsWorkspace + existing domain hooks
       -> transactions-workspace.module.css
       -> ledger summary / filters / bulk toolbar
       -> day group -> ledger row
       -> Phase 2 feedback, actions, empty state and money primitives
       -> shared add/edit/transfer/split Dialog + field contracts
  -> AppShell owns chrome, primary capture and undo notice

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
- no-results and true-empty states expose the correct recovery action.

Dialog/capture contracts:

- shared Dialog owns modal lifecycle and focus return;
- amount is initial focus for add/edit/transfer; first split amount is initial focus for split;
- invalid amount returns focus to the affected field;
- pending state prevents duplicate submission and locks dismissal;
- errors attach to the field or an assertive form alert;
- embedded quick capture reuses the same form without a nested modal;
- 320px and virtual-keyboard layouts keep form content and final actions reachable.

Stable evidence slots:

- `transactions-workspace`, `ledger-summary`, `ledger-filters`, `ledger-list`, `ledger-day-group`, `ledger-row`;
- `capture-quick-workspace`, `quick-capture-form`;
- browser tests prefer roles, labels and slots over retired class names.

## Implementation plan

1. Establish ledger contracts and stable evidence selectors.
2. Move summary, filters, ranges, selection/bulk controls, day groups and rows behind the local module and Phase 2 primitives.
3. Preserve all orchestration and financial calculations while changing presentation ownership only.
4. Migrate add/edit/transfer/split to the shared Dialog/action/field contracts.
5. Reuse the add form for embedded quick capture with dynamic-viewport and narrow-screen ownership.
6. Repair browser evidence to target roles/labels/slots.
7. Remove retired component/module and invisible amount repair after active-consumer proof; bound broader dead global cleanup with zero-reference evidence.
8. Run exact-head policy, static, unit, build, browser, Chromium/WebKit, CodeQL and secret-history gates.
9. Record truthful PR memory and stop for explicit owner merge decision.

## Tasks

| ID | Task | Status |
|---|---|---|
| P5-T1 ledger contracts | completed |
| P5-T2 summary/filters/ranges/bulk owner | completed; evaluating |
| P5-T3 rows/money/actions/review owner | completed; evaluating |
| P5-T4 shared add/edit/transfer/split dialogs | completed; evaluating |
| P5-T5 soft delete and eight-second undo | completed; evaluating |
| P5-T6 embedded quick capture and keyboard-safe layout | completed; evaluating |
| P5-T7 stable audit evidence | completed; evaluating |
| P5-T8 remove compatibility after last consumer | retired component/module and MobileShellContract removed; broader dead global selectors remain under evaluation |
| P5-T9 full verification matrix | evaluating |
| P5-T10 owner approval and merge | blocked |

## Evaluation

- PR #306 was marked ready-for-review only to activate heavy gates; this is not merge authorization.
- CI #1792 selected policy, static, unit/static tests, production build, browser smoke, cross-device UI audit and CodeQL for exact head `103593eda2e3309232a2da37f359d384e6f55a2a`; database checks were correctly not selected.
- Secret-history scan #910 passed on that head.
- The first policy run rejected the head because this packet lacked the exact `Specification`/`Evaluation` headings and PR memory lacked required fields. This commit corrects those knowledge contracts.
- Earlier draft CI #1784 is not accepted as implementation evidence because all heavy shards were skipped.
- Static, test, build, browser, audit and CodeQL results must be re-evaluated on the new exact head before the candidate can be called verified-unmerged.

Acceptance matrix:

| Boundary | Required proof | State |
|---|---|---|
| policy/knowledge | diff hygiene, knowledge and CI-policy contracts | rerun required |
| static | deployment env, CSS ownership, architecture, lint, typecheck | pending exact head |
| domain | complete unit/static RLS tests | pending exact head |
| build | production build | pending exact head |
| expense add/edit/delete/undo | browser smoke/focused flows | pending exact head |
| transfer/split | browser flows and invariant tests | pending exact head |
| 320px/long Vietnamese/large VND | Chromium/WebKit artifacts | pending exact head |
| dialog focus and keyboard | role/focus browser evidence | pending exact head |
| security | CodeQL and secret-history | exact-head rerun pending |
| production/provider | separate post-merge boundary | not attempted; not authorized |

Open risks:

- heavy gates may reveal stale browser assumptions or typing errors;
- broad legacy CSS deletion must avoid collateral changes to unrelated routes;
- automated audit does not replace physical Android/iOS acceptance, which remains Phase 11.

## Risk and rollback

- Primary risk: a presentation refactor regresses a high-frequency financial flow despite unchanged domain logic.
- Mitigation: preserve payloads/hooks and require exact-head source, unit, build and browser evidence.
- Schema/migration/backfill: none.
- Database/Auth/RLS/provider/production-data writes: none authorized or planned.
- Rollback: revert the eventual Phase 5 merge commit; no database rollback is required.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-06 | human owner | implementer | implementing | explicit `tiếp tục p5` | bounded branch implementation and verification |
| 2026-08-06 | implementer | evaluator | evaluating | PR #306 ready-for-review for heavy gates | fix evidence-backed failures only; no merge/deploy |

## Current permission boundary

- Writes are allowed only on `feat/ui-phase-5-transactions-capture` for this packet.
- Merge and deployment remain owner decisions.
- No database, migration, Auth, RLS, provider-setting or production-data operation is authorized.
- No later UI phase or new product/visual requirement is authorized.
