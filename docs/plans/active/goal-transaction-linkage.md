# Goal ↔ transaction linkage

**Status:** specified
**Execution state:** specified
**Active role:** human_owner — product semantics decision required before implementation
**Permission scope:** read_only — packet authoring only
**Owner:** agent (Devin)
**Issue/PR:** advances #432 (understanding/planning stage)
**Last updated:** 2026-09-23

## Repository reconnaissance

- `savings_goal_allocations` is a **manual delta ledger**: `adjust_savings_goal`
  inserts signed `amount_minor` rows; goal progress = sum. No reference to any
  `financial_transactions` row exists — an "allocation" is a number the user
  typed, with no provenance into the ledger.
- `transaction_feed` carries no `goal_id`; goals have no spend side.
- `src/lib/planning/goals.ts` owns the math (progress, daily pace, funding
  window); `src/server/goals.ts` loads goals + allocations; `reserve` is
  already `null` rather than invented.

So today a goal is a labeled pile of intent, disconnected from both the money
that funded it and the purchase that fulfilled it.

## Research

Two real questions the product cannot answer:

1. "Số tiền đã góp vào mục tiêu này nằm ở giao dịch nào?" — allocations are
   unverifiable against the ledger.
2. "Khoản chi này là để hoàn thành mục tiêu nào?" — buying the laptop is an
   ordinary expense; the goal never sees it.

### Options

| Option | Shape | Trade-offs |
|---|---|---|
| A. `savings_goal_allocations.transaction_id` nullable link | Allocation optionally references the transaction that moved the money (e.g. a transfer to a savings account). Provenance-preserving; allocation stays manual-first. | Doesn't cover the spend side |
| B. `financial_transactions.goal_id` nullable tag | An expense/income row can declare "this is for goal X". Goal page can list its transactions; spend-against-goal becomes derivable. | One goal per transaction; needs feed + RPC + UI tag |
| C. Both (link funding side and spend side) | Full loop: fund goal → allocate → spend against goal → goal completed by a real transaction | Two migrations, two RPC surfaces, UI work on both sides |

### Recommended slice

**Option B first** — tag a transaction with a goal:

- `alter table financial_transactions add column goal_id uuid null` + composite
  FK `(goal_id, user_id)` mirroring the `savings_goal_allocations` pattern.
- `create/update` RPCs gain optional `p_goal_id`; `transaction_feed` exposes
  `goal_id` + `goal_name`; edit dialog gets an optional goal picker.
- Goal detail shows linked transactions; goal progress stays allocation-based
  (unchanged math — no silent redefinition).
- Option A (allocation provenance) is the natural follow-up once B proves the
  linking UX.

Rationale: B is the smaller contract change, keeps goal math honest
(allocations unchanged), and directly answers question 2. Option A alone would
improve auditability but not the user-visible "this spend served that goal".

## Specification

### Constraints

- Integer VND; no new arithmetic — linkage is a pointer, not a calculation.
- RLS: composite FK `(goal_id, user_id)` prevents cross-tenant links.
- A goal tag never changes how the transaction counts toward income/expense/
  transfer — it is annotation, not reclassification.
- Archived goal: keep the tag (history) but hide from pickers.

### Open questions for owner

- [ ] Should spending a tagged transaction count toward goal progress
      automatically, or is the tag informational only? (Recommend:
      informational only in v1 — progress stays the manual allocation ledger.)
- [ ] May one transaction serve multiple goals (split lines per goal)? Recommend
      deferring — single `goal_id` v1.
- [ ] Demo mode: fixture goal IDs are demo-local — the picker should be
      demo-aware like other pickers.

## Implementation plan

_Not started — owner resolves the open questions first. Indicative touch list:
migration (`financial_transactions.goal_id`, feed view, RPC params), feed
schema + `Transaction.goalId`, create/update action schemas, edit dialog
picker, goal detail transaction list, contract + RLS tests._

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Owner answers open questions | none | checkboxes above | todo |
| T2 | Migration + RPC params + feed exposure | T1 | migration file, contract test | todo |
| T3 | UI: goal picker on edit + goal detail transaction list | T2 | browser evidence | todo |

## Evaluation

- Goal page lists the transactions linked to it (read path).
- Editing a transaction can set/clear the goal; the link survives.
- Deleting/archiving a goal does not delete transactions; tag displays
  gracefully.
- Contract test pins: tag is annotation (totals unchanged), composite FK
  enforced, RLS unchanged.
