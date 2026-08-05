# MoneyFlow UI-system Phase 5 — Transactions and Capture

**Status:** active
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 4 evidence:** PR #301 merged as `4b48626935aa0ed3ddd0058bb0561ae1c2d17335`; closure PR #303 merged as `ca7fa855f0e9278f2c33e4d1aba0272a24d53fb0`
**Base main:** `ca7fa855f0e9278f2c33e4d1aba0272a24d53fb0`
**Branch:** `feat/ui-phase-5-transactions-capture`
**Last updated:** 2026-08-06

The owner instructed **“tiếp tục p5”** on 2026-08-06. This authorizes bounded Phase 5 specification correction and product-code work on a focused branch. It does not authorize merge, deployment, database/schema/Auth/RLS/provider writes, production-data access, a new visual direction or later UI phases.

This packet supersedes the stale blocked Phase 5 rows in the parent packet while retaining the parent program sequence.

## Outcome

Transactions and quick capture become one coherent daily-ledger boundary with local presentation ownership and shared Phase 2 primitives while preserving all financial behavior:

- summary, filters, date/amount ranges, selection and bulk correction have explicit contracts and local owners;
- day groups and transaction rows preserve complete Vietnamese text and large integer-VND values;
- add/edit/transfer/split dialogs use the shared dialog, action and field contracts where their behavior matches;
- quick capture remains amount-first, keyboard-safe and usable at 320 CSS pixels;
- soft delete and eight-second undo remain available;
- stale selector-based audit helpers move to stable route/component evidence;
- transaction-specific global manager/dialog compatibility is deleted only after zero-consumer proof.

## Repository reconnaissance

### Current implementation truth

- `src/components/transactions-page.tsx` owns filtering, grouping, selection, bulk review/category changes, pagination, add/edit/split/transfer orchestration and delete/undo behavior.
- The component imports a CSS Module but still renders legacy global vocabularies including `dashboard`, `transactions-workspace`, `transaction-manager`, `panel`, `manager-row`, `secondary-button`, `primary-button` and dialog families.
- `src/components/transactions-page.module.css` currently contains many `:global(...)` bridges and `!important` declarations to repair the legacy manager owner.
- `add-transaction-dialog.tsx`, `edit-transaction-dialog.tsx`, `transfer-dialog.tsx` and `split-expense-dialog.tsx` still implement native dialog/action/form presentation independently.
- Phase 2 already provides `Button`, `LinkButton`, `IconButton`, `TextField`, `SelectField`, `CheckboxField`, `RadioGroup`, `Dialog`, `Alert`, `EmptyState` and `MoneyValue` contracts.
- `MobileShellContract` retains only the dark transaction amount-field repair; Phase 5 owns its removal after the amount field has a real owner.
- Existing browser evidence covers expense creation, transfer/split paths, delete/undo, rich VND values, long Vietnamese text, keyboard focus and cross-device layouts. Some audit assertions still target legacy class names such as `.manager-row`.

### Preserved financial and product invariants

- VND stays integer đồng; no floating-point money.
- Transfers remain balanced movements and never income or expense.
- Split totals remain exact.
- Filtered totals preserve current transfer exclusion.
- Existing server actions, validation, idempotency and tenant ownership are unchanged.
- Delete remains soft delete with recoverable undo.
- No balance, date, category, review status or planning assumption is invented.
- The selected Fresh Blue/B3.2 identity and signed-in Light/Dark/System behavior remain unchanged.
- App Shell remains the owner of navigation, mobile chrome, safe area and the primary `Ghi chi tiêu` action.

## Focused research

| Source | Authority | Decision applied | Limit |
|---|---|---|---|
| [WAI-ARIA APG: Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | W3C WAI | opened dialogs move focus inside, contain tab order, close with Escape when dismissible and return focus to the invoker; destructive final steps favor the least-destructive initial action | APG examples require real browser/assistive-technology verification and do not replace native/shared primitive behavior |
| [WCAG 2.2 — Error Prevention (Legal, Financial, Data)](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI | changes to user-controlled financial records must be reversible, checked or confirmed; keep delete confirmation plus soft-delete undo and validate form errors before mutation | MoneyFlow records are not bank transactions; confirmation is not required for every ordinary save when validation/correction is available |
| [WCAG 2.2 — Reflow / G225](https://www.w3.org/WAI/WCAG22/Techniques/general/G225) | W3C WAI | ordinary ledger content and each horizontally navigable panel must remain readable at 320 CSS pixels without document-level horizontal scrolling | wide data tables may use bounded internal scrolling, but transaction rows should reflow rather than become a desktop table on phones |
| [MDN: viewport meta and interactive widgets](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport) | authoritative web-platform reference | virtual keyboards can change the visual/layout viewport; dialog and embedded capture content must use dynamic viewport sizing and keep final actions reachable | browser support differs; existing Playwright phone/keyboard coverage remains the project authority |

### Research decision

Observed:

- current dialog implementations duplicate focus/close behavior and depend on a global dark-mode rescue;
- selector ownership is split between global CSS, module bridges and invisible contracts;
- the daily ledger already has domain behavior and broad browser tests worth preserving.

Inference:

- this is a Branch-by-Abstraction migration inside the existing product: adopt shared primitives and local presentation owner one coherent flow at a time, then delete compatibility after the final consumer moves.

Product judgment:

- do not redesign transaction semantics or invent a generic data-grid framework;
- keep amount-first quick capture, current filter vocabulary and current confirmation/undo timing;
- prefer stable `data-slot`/accessible-role evidence over legacy class selectors in browser tests.

## Accepted component and ownership contracts

```text
/transactions and timeline route
  -> TransactionsPage orchestration and domain hooks
       -> transactions-page.module.css (route presentation owner)
       -> LedgerSummary
       -> LedgerFilters and BulkToolbar
       -> LedgerDayGroup -> LedgerRow
       -> Phase 2 Alert / Button / LinkButton / IconButton / EmptyState / MoneyValue
       -> shared add/edit/transfer/split Dialog + field contracts
  -> AppShell owns application chrome, notice/undo and primary capture

/capture/quick
  -> AddTransactionDialog embedded mode
       -> same amount/category/form contracts
       -> route-owned embedded layout
```

### Ledger contracts

- **Summary:** count, income, expense and net are derived only from the filtered result; transfers do not alter income/expense/net.
- **Filter state:** URL state remains deterministic; invalid ranges expose an error and do not silently reinterpret values.
- **Day group:** one semantic heading contains relative and absolute date plus signed daily net; headers remain in normal flow on phones.
- **Row:** note is the primary label; category/account/transfer/split provenance remains visible; money is complete, signed by kind and never relies on color alone.
- **Review state:** checkbox has a transaction-specific accessible name; status has explicit text; bulk category mutation keeps amount/date/account unchanged and requires confirmation.
- **Actions:** edit/delete/recurring controls are keyboard and touch reachable with the MoneyFlow important target policy.
- **Empty states:** no-results clears filters; true-empty offers the canonical capture action without competing with App Shell hierarchy.

### Dialog and capture contracts

- Shared `Dialog` owns modal lifecycle, focus entry/return, Escape and backdrop behavior.
- Amount is the initial focus for add/quick capture; invalid amount returns focus to that field.
- Pending state disables duplicate submission and announces progress.
- Validation errors are associated with the affected field or an assertive form alert.
- Cancel remains available and least-destructive; destructive actions retain confirmation/undo boundaries.
- Embedded quick capture uses the same form behavior without a nested modal.
- At 320px and with the virtual keyboard visible, content scrolls inside the owned boundary and final actions remain reachable.

## Implementation plan

1. Establish typed ledger contracts and stable evidence selectors.
2. Move Transactions summary, filters, ranges, selection/bulk controls, day groups and rows behind the route CSS Module and Phase 2 actions/feedback.
3. Preserve all current orchestration and financial calculations while splitting presentational sections only where it reduces ownership ambiguity.
4. Migrate add/edit/transfer/split dialogs to the shared Dialog/action/field contracts without changing input payloads or server/domain behavior.
5. Give the amount/category/embedded quick-capture boundary a local CSS owner, including dark mode and dynamic-viewport behavior.
6. Repair audit helpers to target current routes, roles and stable slots rather than retired class names.
7. Prove zero active consumers, then remove manager/dialog global families and the remaining `MobileShellContract` amount-field repair.
8. Run exact-head policy, CSS ownership, architecture, lint, typecheck, complete tests, production build, browser smoke, Chromium/WebKit cross-device audit, CodeQL and secret-history scan.
9. Record truthful PR memory and current-project-memory candidate truth. Stop for owner merge decision.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P5-T1 | Specify shared ledger row, day group, summary and filter contracts | this packet plus source/unit contract | completed |
| P5-T2 | Migrate summary, filters, ranges and bulk toolbar to local owners/primitives | source, filter, keyboard and 320px evidence | implementing |
| P5-T3 | Migrate rows, amounts, actions and review states | long Vietnamese, large VND, touch and semantic evidence | pending |
| P5-T4 | Migrate add/edit/transfer/split dialogs to shared form/dialog contracts | validation, pending, cancel, focus and error evidence | pending |
| P5-T5 | Preserve soft delete and undo; review destructive wording/timing | confirmation plus delete/undo browser flow | pending |
| P5-T6 | Migrate quick capture, paste/upload entry and keyboard-safe layout | 320/360/390 phone, long-input and keyboard evidence | pending |
| P5-T7 | Repair stale audit route/evidence helpers | exact route/role/slot assertions and artifacts | pending |
| P5-T8 | Remove global manager/dialog families after last consumer moves | zero-consumer report and deletion list | pending |
| P5-T9 | Run full expense/transfer/split/capture matrix | exact-head CI/browser/security workflows | pending |
| P5-T10 | Owner approves daily-use flow and merge | explicit owner decision | blocked |

## Risk and rollback

- **Primary risk:** presentation refactor alters a high-frequency financial flow despite unchanged domain logic.
- **Mitigation:** preserve payloads and hooks, migrate by vertical slice, keep stable browser flows and review exact screenshots/geometry.
- **Schema/migration/backfill:** none.
- **Database/Auth/RLS/provider/production-data writes:** none authorized or planned.
- **Rollback:** revert the Phase 5 merge commit; no database rollback is required.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-06 | human_owner | implementer | implementing | explicit **“tiếp tục p5”** | daily-use UI regression | bounded branch implementation and verification |

## Current permission boundary

- Product-code writes are allowed only on `feat/ui-phase-5-transactions-capture` for this packet.
- Merge/deployment remains an owner decision.
- No database, migration, Auth, RLS, provider-setting or production-data operation is authorized.
- No later UI phase or new product/visual requirement is authorized by this instruction.
