# MoneyFlow product vision

- **Status:** proposed replacement for the binding long-term direction of 2026-08-03. Not in force until the owner accepts it.
- **Supersedes:** the "comprehensive personal-finance platform" direction, its six-pillar product system and its eight-wave sequence.
- **Current product truth:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Execution board:** `docs/plans/active/README.md` (outranks this file on what is being worked now)

---

## 1. Direction

**MoneyFlow is the Vietnamese ledger whose numbers you can check — kept small enough to survive without revenue.**

The previous direction committed to growing "into a comprehensive personal-finance
platform" across six product pillars and eight waves. That is replaced, because it
was a plan about *capability* and this product's actual risk is *survival*.

The three constraints below are the direction. They are testable, and any of them
can be shown to be violated by a proposed feature.

### 1.1 Zero marginal cost per user

No capability may add a recurring per-user cost while the product has no revenue.

This is not caution. It is the single fact that separates MoneyFlow from the products
it would otherwise be compared to. Mint reached roughly 25 million accounts and was
shut down in January 2024: aggregated bank data carries a per-user data fee, and free
personal-finance ARPU does not cover it. Every competitor with bank sync either
charges for it or is subsidised by a larger business.

MoneyFlow's hosting cost is effectively flat. That is the moat, and it is the one
asset a solo product cannot buy back once spent.

**Consequence:** bank synchronisation and any per-request AI model call are ruled out
until revenue exists — not held as "approved horizons".

### 1.2 Payoff before capture

A feature must raise what the user gets *back* per recorded row, or it does not ship.

Five consecutive releases (#404, #408, #410, #412, #414) drove capture cost down.
None raised payoff. Manual ledgers are not abandoned because entry is slow; they are
abandoned because entry is unrewarded. Optimising capture attacks the cost side of a
trade the user is already losing.

The measured symptom: until 2026-08-18 the dashboard contained **zero links**. Numbers
were displayed and could not be interrogated — the traceability half of the product
promise was documented rather than built.

### 1.3 A fixed surface

The product surface does not grow by default. Adding a capability requires naming the
one being removed or explicitly accepting that the surface got larger.

Evidence that this is needed, from this repository's own history: #406 was superseded
by #408, #410 by #412, and #412's presentation by #414. Three of five releases were
replaced by the next one. That is a loop, not progress, and it is what an infinite
roadmap produces when it meets finite capacity.

---

## 2. Product promise

> Every number has a source. Every plan states its assumptions. Every automation can
> be reviewed. The user remains in control of their data and decisions.

This is unchanged, and it is now the whole competitive claim rather than one of many.

A bank-sync product cannot make it. Its figures arrive from an aggregator the user
cannot audit; when a balance looks wrong the user has no path from the number to the
fact. MoneyFlow's numbers are entered by the user and every aggregate can open the
rows behind it. Traceability is not a feature here — it is the only durable advantage
that costs nothing per user.

MoneyFlow is calm, factual and non-judgmental. It may explain and compare. It does not
shame spending, invent missing information, or make financial decisions.

---

## 3. Who this is for

### 3.1 The daily ledger user — the only served persona

A Vietnamese individual who wants to record income, expense and transfers quickly,
know where money is held, and correct mistakes without accounting jargon.

### 3.2 The planner — served only where it reuses the ledger

Budgets, recurring obligations and goals, connected to actual recorded transactions.
Already partly built. It does not get its own expansion track.

### 3.3 Deliberately not served

The "power user" (custom reports, API access, multi-currency, wealth tracking) and the
"household or adviser participant" are removed as personas. They were listed as future
users, but listing a persona creates roadmap pressure toward it. Neither can be served
without breaking §1.3, and neither exists yet as a real person asking.

---

## 4. Product laws

1. **Ledger before dashboard.** Financial facts are the source; summaries are derived.
2. **Correctness before breadth.** A new module cannot weaken transfer, split, ownership, integer-money or recovery invariants.
3. **Progressive disclosure.** Advanced surfaces appear after explicit choice or relevant data.
4. **Facts, expectations, assumptions and projections are distinct.** They may interact but never masquerade as one another.
5. **Explainable automation.** The user can see why a rule, match or alert occurred.
6. **Safe correction.** High-impact edits are bounded, previewed, atomic where needed, recoverable.
7. **No hidden lock-in.** Export and backup are first-class trust features.
8. **Vietnamese-first.** Vietnamese language, VND and local mental models are first-class. Other currencies and regions are not a design constraint.
9. **Web-first.** Native applications are not a prerequisite for anything in this document.
10. **A figure and the rows behind it must agree**, or the drill-down is not shipped. Where they cannot agree exactly, the weaker guarantee is stated rather than implied.
11. **No capability may add recurring per-user cost without revenue.** (§1.1)

Law 11 is new and is the one that decides the hard cases.

---

## 5. What MoneyFlow is

One surface, four jobs:

| Job | State |
|---|---|
| Record a transaction quickly | Built, and optimised past the point of return |
| Know balances | Built |
| Understand where money went | Partly built — drill-downs shipped 2026-08-18 |
| Retain and export trustworthy data | Built locally; **hosted restore is unproven** (RRB-02) |

Advanced capture — inbox, paste, import, rules — is a **tool inside job one**, not a
product area. It has no roadmap of its own.

The previous six-pillar system (Core / Plan / Understand / Automate / Wealth /
Together) is withdrawn. Four of those six were unbuilt, and naming them made them feel
owed.

---

## 6. Levels of use

1. **Start a ledger.** Record a transaction, see the correct balance. No setup.
2. **Keep it trustworthy.** Correction, review and export appear when useful.
3. **Plan the next period.** Budgets, recurring obligations and goals, after enough data.

Levels 4–6 of the previous document (forecast, automate/extend, wealth/collaborate)
are removed. They described a product with staff.

---

## 7. What tells us this is working

Most of the previous measures cannot be read at zero users. Narrowed to what is
actually observable:

**Now, by the owner in self-use:**
- Does a week of recorded data get looked at again?
- Median capture time on a physical phone (RRB-08, still unproven).
- Any balance the owner cannot explain — this is a defect, not a metric.
- Hosted restore succeeds against a real hosted project, not local Postgres.

**Only once real users exist:**
- Day-7 and day-30 retention. This is the number the product lives or dies on.
- Whether anyone voluntarily continues after a month.

Deliberately dropped: module-enablement rates, breadth health, support burden per
module, conversion funnels. They measure a product that does not exist.

No repository test substitutes for any of these.

---

## 8. Prioritization

1. Known money correctness or data-loss defect.
2. Inability to complete the daily ledger loop.
3. Trust and correction depth.
4. **Payoff per recorded row** (§1.2).
5. Friction observed in real self-use.
6. Everything else.

A feature's popularity in another app is not evidence that MoneyFlow should build it.

---

## 9. Ruled out, and why

The previous document listed these as "approved long-term research and product
horizons". That framing is the problem: a horizon is a commitment with no date, and it
keeps the roadmap infinite. They are now **ruled out**, each with the condition that
would reopen it.

| Capability | Status | Reopens when |
|---|---|---|
| Bank synchronisation | Ruled out | Revenue covers per-user data cost. See §10. |
| Generative AI / LLM features | Ruled out | Revenue covers per-request cost, and the output can be made auditable under §2. |
| Household / shared finance | Ruled out | A real second user asks, and the ownership model is redesigned. |
| Investment and wealth tracking | Ruled out | Not before the ledger has retained users for a quarter. |
| Multi-currency | Ruled out | A user who needs it exists. |
| Native mobile apps | Ruled out | Web capture is proven insufficient on a physical phone. |
| Credit scoring, tax, insurance, regulated advice | Ruled out | Not contemplated. |

Nothing here is forbidden forever. Each has a condition, and the condition is
falsifiable.

---

## 10. On bank connection specifically

Researched 2026-08-18, because it is the capability most often assumed to be
MoneyFlow's missing half.

Vietnam's Circular **64/2024/TT-NHNN** (effective 2025-03-01, full compliance
2027-03-01) makes open banking a legal reality rather than a screen-scraping exercise.
But for payment initiation and e-wallet funding, banks may deploy Open APIs **only to
third parties that are themselves banks or licensed intermediary payment service
providers**. Whether read-only account data carries the same condition is not
established here and would need the text of the Circular, not press summaries.

The practical route for a product without that licence is an aggregator that holds one
— which reintroduces exactly the per-user cost that closed Mint. So this is ruled out
by §1.1 rather than by regulation.

**The substitute already exists in the product** and is much cheaper: the app registers
a `share_target`, so a bank or MoMo notification can be shared straight into MoneyFlow
and parsed by `src/lib/inbox/parse-text.ts`. That reaches the same outcome — the user
does not type the amount — with no licence, no fee and no third party holding their
data.

It currently does not work well enough. Measured against 8 real-format Vietnamese bank
SMS: 8/8 parsed, 7/8 classified correctly, **4/8 extracted the wrong amount** — every
failure taking the account number as the amount. **Fixing that is worth more than any
bank integration**, and it is days of work rather than months plus a licence.

Revisit this section after 2027-03-01, when banks have published what they actually
expose and aggregators have published prices.

---

## 11. How this direction changes

By owner decision, recorded here with a date and a reason. Not by a plan document, not
by an agent, and not by accumulation.

A capability moving out of §9 requires its condition to be *met*, not argued.
