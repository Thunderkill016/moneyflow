# Debt plans — research + specification (do not implement yet)

**Status:** specified
**Execution state:** specified
**Active role:** human_owner — canon Stage 3 gate; no implementation until the
earlier stages are validated and the owner picks a scope
**Permission scope:** read_only — packet authoring only
**Owner:** agent (Devin)
**Issue/PR:** advances #432 (planning stage, after understanding is proven)
**Last updated:** 2026-09-23

## Repository reconnaissance

Vietnamese personal finance reality: informal debts dominate — "mượn 2 triệu
trả lương", nhóm hụi/họ, trả góp điện thoại, thẻ tín dụng. A debt feature must
answer two directions: **I owe** (khoản vay/nợ) and **owed to me** (cho vay).

- No debt entity exists. The closest surfaces: `commitments` (recurring fixed
  obligations — rent, subscriptions), `savings_goals` (manual allocation
  ledger), transfers (balanced movements, neutral).
- A loan repayment today would be recorded as an ordinary expense — the ledger
  stays truthful, but there is no "còn nợ bao nhiêu" view and no link between
  the principal receipt and the repayments.

## Research

- **Money Lover** (Vietnamese, dominant locally): dedicated "Nợ/Cho vay"
  wallets — a debt is a pseudo-account whose balance is the outstanding
  principal; repayments are transfers against it. Strong fit with local mental
  model, but it makes debt a *second ledger* — violates our one-ledger law if
  done naively.
- **YNAB**: no debt objects; a credit-card category balance *is* the debt, and
  payments are transfers. Elegant but assumes formal credit products, weak for
  informal loans.
- **Actual Budget**: same as YNAB — debts are off-budget accounts; informal
  loans need manual tracking.
- **Firefly III**: full liability objects (loan/mortgage/debt) with interest,
  principal vs interest split per payment — enterprise-grade, heavy for a
  phone-first VND product.

Synthesis: the local incumbent models debt as a **balance-bearing object**;
the envelope systems model it as **category math**. MoneyFlow's ledger law
forbids a second truth — so debts must be a *view/annotation layer* over real
ledger movements, not parallel balances.

## Specification

**A `debts` entity as an annotated ledger view, never a second ledger:**

- `debts` table: `id, user_id, direction ('i_owe'|'owed_to_me'), counterparty
  text, principal_minor bigint, opened_on date, closed_at, note`. RLS
  standard; mutations via `security definer` RPCs.
- `debt_movements` link table: `(debt_id, transaction_id)` — every payment/
  disbursement is a real `financial_transactions` row first, then linked.
  Outstanding = `principal_minor − Σ linked repayment movements` — **derived,
  never stored**.
- Direction mapping to ledger truth:
  - *I owe*: receiving the loan = income linked to the debt (disbursement);
    repayments = expense linked to the debt.
  - *Owed to me*: lending = expense linked; repayments received = income
    linked.
  - Alternatively map disbursement/repayment as transfers to a virtual account
    — rejected: creates phantom account balances; the linked-annotation model
    keeps income/expense honest.
- Commitments integration (optional, later): a fixed installment debt can
  generate a commitment occurrence — but only as a *reminder*; the repayment
  stays a real transaction.

### Explicit non-goals for v1

- Interest/amortization schedules (Firefly-grade) — informal VN debts are
  interest-free or flat-fee; adding interest math invites invented numbers.
- Hụi/họ rotation modeling — a distinct social-financial construct; needs its
  own research.
- Credit-card statement cycles — a separate, formal-product concern.
- Auto-detection of debts from transactions — matching heuristics belong to
  the acquisition/matching stage, not here.

### Open questions for owner

- [ ] Is informal debt tracking actually in the current target user journey,
      or does this wait until after reconciliation/understanding stages prove
      retention? (Recommend: wait — this is Stage 3.)
- [ ] Counterparty as free text only, or linked to a contacts-like entity?
      (Recommend: free text v1.)
- [ ] Should a closed debt require the outstanding to reach zero, or allow
      "forgiven/settled" states with a residual? (Recommend: explicit
      `closed_reason` enum: `repaid | forgiven | written_off`.)

## Implementation plan

_Not started — Stage 3 gate. When opened: migration (`debts` + `debt_movements`
+ link/unlink RPCs), ledger link UI on transaction detail, debts surface with
derived outstanding, contract + RLS tests. No scheduler, no interest engine._

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Owner confirms stage gate + answers open questions | none | checkboxes above | todo |
| T2 | Schema + RPCs for debts and movement links | T1 | migration, contract tests | todo |
| T3 | UI: link a transaction to a debt; debts surface | T2 | browser evidence | todo |

## Evaluation

- Outstanding is always derivable from the ledger links — a contract test
  pins "no stored balance can drift".
- Deleting a linked transaction asks what happens to the debt (unlink vs
  block) — decided in implementation packet.
- RLS isolation tests; integer VND only; soft-delete on debts.

## Why this waits

The canon sequence is Reality → Resilience → Progress → Choice. Debt plans sit
in Progress/Choice. Shipping them now would add a second write surface while
the acquisition→ledger pipeline (the product's differentiator) is still being
proven. This packet exists so the decision is cheap later — not to start work.
