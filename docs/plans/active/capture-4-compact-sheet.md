# Capture 4 — compact keyboard-first quick sheet

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** owner-authorized from direct real-phone screenshots
**Issue/PR:** #413 / #414
**Last updated:** 2026-08-16

## Outcome

Make the already-fast Capture 3 interaction visually match its real primary task: a familiar expense/income should feel like `open → amount → Save`, with learned category/account context visible but lightweight, correction still one tap, and secondary detail out of the way—especially while the software keyboard is open.

## Repository reconnaissance

### Current truth

- Main baseline is `30ad41a8cb81c9161af2304a5cef596c80f16dcf` (#412 merged).
- `AddTransactionDialog` remains the trusted Expense/Income quick-entry owner and already preserves integer-VND parsing, explicit Save, idempotency, optional note/date, and deterministic learned `kind + account + category` presets.
- `TransferDialog` / `addTransfer` remain the separate trusted transfer boundary.
- Direct real-phone screenshots after #412 show functional success but presentation debt: repeated instructions, an oversized Chi/Thu selector, a visually heavy category card, a horizontally clipped category rail, redundant visible Cancel + close affordances, and a sheet taller than the common task needs.
- `capture-fast-path.module.css` owns Capture-specific fast-path presentation; `transaction-form.module.css` continues to own shared transaction dialog geometry.

## Research

### Decision question

How should MoneyFlow compress the real-phone capture presentation without hiding material financial context or breaking keyboard reachability?

### Sources consulted on 2026-08-16

| Source | Authority/type | Decision applied |
|---|---|---|
| Apple HIG — Entering data | platform guidance | pre-gather known data, use reasonable defaults, minimize entry and decision load |
| Apple HIG — Designing for iOS | platform guidance | prioritize the primary task; keep secondary controls discoverable with minimal interaction |
| Apple HIG — Sheets (updated 2026-03-24) | platform guidance | keep sheet tasks scoped/brief and avoid needlessly covering most of the context |
| Android Developers — Material 3 ModalBottomSheet / window insets (2026) | platform/runtime guidance | respect IME/system insets and keep critical controls reachable through keyboard transitions |
| Existing MoneyFlow code/tests | repository authority | learned presets and financial mutation semantics are already correct and must not be rewritten |

### Research decision

Do not add another capture model. Keep #412 semantics and redesign only the decision surface:

1. concise dynamic task title;
2. amount remains dominant, with its label accessible but visually hidden in the high-frequency modal;
3. type switching stays touch-safe but visually compact;
4. one selected category/account row replaces the heavy explanatory card;
5. at most two alternative category actions plus one explicit `Khác` action are shown—no clipped horizontal rail;
6. date/note/keep-open remain available but secondary;
7. modal footer shows only the primary Save action; close/back/dismiss owns cancellation;
8. constrained keyboard height keeps amount, type, selected context and Save ahead of secondary detail.

## Specification

### User stories

- Familiar transaction: open capture, type amount, Save.
- Wrong learned category: tap one of two likely alternatives, then Save.
- Uncommon category/account: tap `Khác`, then use the full existing picker.
- Need date/note/repeated entry: open secondary detail explicitly.
- Need to abandon: close/back/dismiss without competing with the Save CTA.

### Acceptance criteria

- [ ] Default modal title is dynamic and concise (`Ghi khoản chi` / `Ghi khoản thu`).
- [ ] The amount field keeps a programmatic label but does not spend a visible row on label + explanatory paragraph in the high-frequency modal.
- [ ] `Chi / Thu / Chuyển` remains touch-safe while consuming materially less visual height.
- [ ] Selected category + account are represented once, in one lightweight row.
- [ ] The first viewport exposes no more than two alternative categories plus one `Khác` action; there is no horizontally clipped/scrolling category rail.
- [ ] Full category/account controls remain accessible one explicit action away.
- [ ] Optional date/note/keep-open remain available but do not dominate the common path.
- [ ] Modal footer has one visible primary Save action; embedded capture may retain explicit cancel if host semantics require it.
- [ ] 320/360/390 responsive evidence shows no horizontal overflow/clipped chips.
- [ ] 390×568 constrained-height evidence keeps amount, selected context and Save reachable with secondary detail closed.
- [ ] No CSS `!important`; no new arbitrary literal geometry used merely to satisfy audits. Prefer existing design tokens/shared primitives.
- [ ] Existing mutation, idempotency, transfer neutrality and learned-preset tests remain green.

## Architecture fit

- `AddTransactionDialog` remains the only quick Expense/Income submit owner.
- #412 `quick-add-prefs` preset persistence is unchanged.
- Capture-only presentation belongs in `capture-fast-path.module.css`; shared transaction primitives remain unchanged in this candidate.
- No schema/RLS/provider/deployment/production-data mutation.

## Planned changes

| Area | Change |
|---|---|
| `src/components/add-transaction-dialog.tsx` | simplify modal copy, selected context, category alternatives, secondary actions, and modal footer cancellation |
| `src/components/transactions/capture-fast-path.module.css` | compact selected-context/category/type/footer/keyboard layout using existing tokens |
| focused static/e2e/audit tests | replace Capture 3 heavy-card/rail expectations with Capture 4 compact-sheet contracts |
| lifecycle docs | archive #412 active packet and record #413/#414 candidate state |

## Risks and prevention

| Risk | Prevention |
|---|---|
| Compact UI hides what will be saved | selected category/account remain explicit before Save |
| Fewer category buttons make correction harder | two likely alternatives + `Khác` one tap away; full taxonomy unchanged |
| Removing footer Cancel traps users | modal close button, Escape/back and dialog dismiss remain; embedded host retains explicit Cancel |
| Keyboard hides Save/context | existing one-scroll-owner + constrained-height audit updated around compact decision surface |
| Cosmetic patch regresses design-system discipline | reuse existing tokens and component target-size contract; tests continue to reject CSS `!important` |

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | inspect current main, real-phone evidence and current research | done |
| T2 | create #413 and branch from `main@30ad41a8…` | done |
| T3 | implement compact keyboard-first presentation | done |
| T4 | reconcile static/e2e/UI audit contracts | done |
| T5 | open PR, run exact-head gates and inspect artifacts | doing |

## Handoff record

| Date | From | To | State | Evidence | Remaining boundary |
|---|---|---|---|---|---|
| 2026-08-16 | human_owner | implementer | implementing | direct phone screenshots + #413 + PR #414 + research above | ready-state browser/CI next; final physical-phone acceptance remains owner-observed under RRB-08 |

## Evaluation

### Acceptance evidence

- Draft PR #414 exists; draft CI only classifies and intentionally skips heavy verification.
- Ready-state exact-head build/static/unit/browser/UI/e2e evidence is still pending.

### Remaining limitations

- Browser constrained-height evidence is not a physical keyboard/device verdict.
- This slice deliberately does not add merchant capture, AI classification, bank sync or cross-device preset sync.

## Delivery record

- Branch: `capture-4-compact-sheet-413`
- Base: `30ad41a8cb81c9161af2304a5cef596c80f16dcf`
- PR: #414
- Exact head: pending final ready-state head
- CI: pending final ready-state run
- Merge/deployment: pending
