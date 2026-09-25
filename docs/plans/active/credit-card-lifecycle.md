# Credit-card lifecycle — research + specification (do not implement yet)

**Status:** specified
**Execution state:** specified
**Active role:** human_owner — canon Stage 3 gate; no implementation until
the earlier stages are validated and the owner picks a scope
**Permission scope:** read_only — packet authoring only
**Owner:** agent (Devin)
**Issue/PR:** backlog item "Credit-card lifecycle: 6 open questions"
**Last updated:** 2026-09-25

## Repository reconnaissance

What a `credit_card` account already is today:

- `account_kind = 'credit_card'`; the dialog negates its starting balance
  ("Dư nợ hiện tại" → negative `initial_balance_minor`), so the card is a
  liability inside the one ledger — spending makes it *more* negative,
  paying the card is a `transfer` from an asset account (never income or
  expense). This is honest and matches the domain-rules decision: a
  negative card balance is debt.
- `credit_limit_minor` exists in the schema **and** the archive contract —
  but nothing writes or reads it: the dialog has no field, the RPCs accept
  no param, no surface renders utilization.
- Missing entirely: statement cycles (open/close/due dates), minimum
  payment, "spent this cycle" view, interest/fee handling, payment
  suggestions.

The card today is a correct *ledger account* with a negative balance —
not a credit *product* with a lifecycle.

## Research

- **Money Lover (VN incumbent):** credit wallets show "đến kỳ hạn trả
  X ngày", outstanding vs limit, and a pay action that is a transfer —
  the local mental model is date-anchored debt, not amortization.
- **YNAB/Actual:** the card *balance* is the debt; a budget category
  absorbs the obligation and payment is a transfer. No statement-cycle
  object. Strong fit with our one-ledger law.
- **Firefly III:** liability objects with interest schedules —
  enterprise-grade, mismatched to informal VN card use (flat-fee or
  interest-free installments dominate retail).
- **Local reality:** the highest-value user question is *"kỳ này phải
  trả bao nhiêu, hạn ngày nào?"* — a statement-window + due-date
  concern, not an interest engine.

## Specification

**The card stays a ledger account; the lifecycle is a dated annotation
layer, never a second balance:**

- `credit_card_cycles` (when opened): `account_id, statement_open_on,
  statement_close_on, due_on` — derived per statement from a card-level
  `statement_day` + `due_day` config rather than stored rows. Cycle spend
  = Σ expenses on the card with `occurred_on` inside the window —
  **derived, never stored**.
- Due reminder rides the existing commitments/reminder machinery — a
  "trả thẻ" commitment occurrence, not a new scheduler.
- Minimum payment / full-balance suggestion = a computed figure on the
  cycle view; the payment stays a plain transfer with an optional
  "trả hết kỳ này" prefilled amount.
- `credit_limit_minor`: either becomes user-facing (utilization on the
  card detail) or is dropped from the write contract — leaving it
  archived-but-never-writable is the worst state.
- Interest and fees are ordinary expenses when they occur — no
  amortization math, same decision as debt-plans.

### Explicit non-goals for v1

- Interest/amortization schedules.
- Installment (trả góp) plan objects — separate construct, needs its own
  research alongside debt-plans.
- Statement-cycle *auto-detection* from imported statements — matching
  belongs to the acquisition/matching stage.
- Issuer perks/points tracking.

## Open questions for owner

- [ ] Q1 — `credit_limit_minor`: expose utilization on card detail (read
      path exists in archive already), or drop the column from the write
      contract until a Progress-stage need appears? (Recommend: expose —
      the column is already archived, the cost is one field + one line.)
- [ ] Q2 — Statement window: per-account `statement_day`/`due_day`
      config deriving cycles, or no cycle object at all and the month
      view stays the period? (Recommend: two integers config; derived
      windows, zero stored balances.)
- [ ] Q3 — Does "trả thẻ" need a dedicated action with a suggested
      amount (full cycle spend / custom), or is the existing transfer
      enough? (Recommend: prefill amount on the existing transfer
      dialog — no new mutation surface.)
- [ ] Q4 — Should the due-date reminder be a commitment occurrence
      (reuses notification + checklist machinery) or a card-local
      field? (Recommend: commitment — one reminder system stays one
      reminder system.)
- [ ] Q5 — When a linked repayment transfer is edited/deleted, the cycle
      view just recomputes (derived) — is any "over-payment" warning
      needed, or is the negative balance self-evident? (Recommend:
      show, don't warn — derived UI.)
- [ ] Q6 — Stage gate: is the minimal lifecycle (limit display + cycle
      spend + due reminder) a Resilience-stage aid for existing card
      users, or strictly Stage 3 with debts? (Recommend: limit display
      can ship earlier; cycles wait for Stage 3.)

## Implementation plan

_Not started — stage gate. When opened: `statement_day`/`due_day` on
accounts (two small columns or a card_prefs table), cycle-window
derivation in a domain module, card-detail cycle section, commitment
generation for the due date, transfer prefill for "trả kỳ này",
contract + pgTAP tests._

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Owner answers Q1–Q6 + confirms stage gate | none | checkboxes | todo |
| T2 | Schema + cycle derivation domain module | T1 | migration, tests | todo |
| T3 | Card-detail cycle section + transfer prefill | T2 | browser evidence | todo |
| T4 | Due-date commitment integration | T2 | pgTAP + UI | todo |

## Evaluation

- Cycle spend must always equal Σ real ledger expenses in the window —
  a contract test pins "no stored cycle balance can drift".
- A payment that over-pays the cycle is visible, never silently clamped.
- RLS isolation on any new table/column; integer VND only.

## Why this waits

Same gate as debt-plans: Reality → Resilience → Progress → Choice. A
card lifecycle adds dated obligation surfaces while the
acquisition→ledger pipeline is still being proven. This packet exists so
the six questions are cheap to answer when the stage opens.
