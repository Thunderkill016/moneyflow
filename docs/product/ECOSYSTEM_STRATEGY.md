# MoneyFlow ecosystem strategy

- **Status:** strategic authority once merged; candidate evidence while this PR is open
- **Product law:** [`PRINCIPLES.md`](./PRINCIPLES.md)
- **Product strategy:** [`PRODUCT_STRATEGY.md`](./PRODUCT_STRATEGY.md)
- **Metrics and stage gates:** [`PRODUCT_METRICS.md`](./PRODUCT_METRICS.md)
- **Scope:** defines how future MoneyFlow capabilities may form one ecosystem around a single financial truth model. It does not authorize implementation of any horizon by itself.

## 1. Ecosystem thesis

MoneyFlow should become an ecosystem by deepening one coherent financial model, not by launching unrelated finance apps.

Every surface must preserve the same product law:

```text
user/source evidence
  -> normalized, reviewable information
  -> one financial truth model
  -> understanding and planning
  -> bounded actions
```

No ecosystem module may invent a competing balance, ownership, transaction, currency or recommendation model.

The ecosystem exists to improve four outcomes:

> **Financial Reality → Financial Resilience → Financial Progress → Financial Choice**

## 2. Ecosystem map

```text
                         MoneyFlow Intelligence
                    explain / detect / compare / assist
                                  │
                                  ▼
MoneyFlow Acquire ──► MoneyFlow Personal/Core ──► MoneyFlow Resilience
      │                        │                         │
      │                        │                         ▼
      │                        │                    MoneyFlow Plan
      │                        │                         │
      │                        ├──────────────► MoneyFlow Wealth
      │                        │                         │
      │                        └──────────────► MoneyFlow Together
      │
      └──────────────► provider/device/file/share adapters

             MoneyFlow Automation spans approved workflows
             MoneyFlow Mobile is a client/capability surface
             MoneyFlow Connect exposes bounded integration contracts
```

This diagram is a dependency model, not a release sequence.

## 3. Shared ecosystem contracts

Every future module must preserve these contracts.

### 3.1 One financial truth

Posted ledger facts remain the authoritative transaction history. External balances, statements, provider payloads, valuations and AI outputs are evidence or observations until their product contract says how they relate to financial truth.

### 3.2 One ownership model

The system must be able to answer who owns, may view and may mutate every financial resource. Household or professional collaboration must extend ownership explicitly rather than weaken tenant boundaries.

### 3.3 One provenance model

Where a fact or suggestion is source-backed, the user should be able to inspect the meaningful origin and correction path.

### 3.4 One correction model

Errors must be correctable without silently rewriting unrelated history. Automation and provider data do not bypass correction/recovery rules.

### 3.5 Explicit uncertainty

Unknown, partial and stale information must remain distinguishable from known information. Ecosystem breadth cannot turn incomplete coverage into apparent certainty.

### 3.6 User-owned portability

Export/backup and the ability to leave remain part of the trust contract even as the ecosystem becomes more valuable.

## 4. MoneyFlow Personal / Core

**Strategic role:** the financial system of record and the smallest independently useful MoneyFlow product.

Core responsibilities:

- accounts;
- income, expense and balanced internal transfers;
- balances derived from accepted financial facts;
- transaction history and search;
- correction, soft delete and recovery;
- reconciliation;
- categories and other validated organization semantics;
- reports grounded in contributing records;
- export, backup and restore;
- explicit source/coverage state where relevant.

Core must remain useful without bank connections, AI, wealth, household setup or native mobile.

Core should not become a dumping ground for every future capability. Advanced domains should attach through explicit contracts.

## 5. MoneyFlow Acquire

**Strategic role:** reduce the work required to maintain Financial Reality.

Potential input channels:

- manual capture;
- CSV and statements;
- paste/share flows;
- structured files;
- device-assisted evidence;
- contracted bank/provider APIs;
- future third-party connectors.

All channels converge on one neutral pipeline:

```text
source evidence
  -> parser/adapter + version
  -> normalized candidate + provenance
  -> validation
  -> duplicate / transfer / rule decision
  -> review or bounded approved automation
  -> atomic financial fact
  -> reconciliation / correction
```

### Success condition

Acquire succeeds when it reduces **total maintenance** while preserving correctness and explainability.

Raw import volume, provider count or number of connectors is not a success metric by itself.

### Required boundaries

- provider adapters do not write arbitrary ledger truth;
- reconnect/disconnect/expiry are explicit states;
- replay and idempotency are defined;
- source failure degrades gracefully;
- duplicate and transfer errors are measurable;
- source-specific complexity does not leak into the core financial model without justification.

## 6. MoneyFlow Resilience

**Strategic role:** help the user understand what must remain protected before optimizing long-term goals.

Potential domains:

- recurring income and cadence;
- bills and obligations;
- liquidity;
- emergency reserves;
- irregular expenses;
- debt obligations;
- payment timing;
- protected or unavailable money;
- insurance/protection inventory only when explicit data and product scope justify it.

Resilience is not a generic score. It is a set of explainable financial constraints and capacities.

A future affordability or safe-to-spend experience must derive from a defined planning contract. It must not infer spendability from total assets alone.

## 7. MoneyFlow Plan

**Strategic role:** transform facts into explicit future plans without creating a second ledger.

Potential capabilities:

- goals and reserves;
- planned contributions;
- debt plans;
- financial calendar;
- explicit assumptions;
- deterministic projections;
- scenario comparison;
- plan-versus-actual monitoring;
- monitoring/update loops.

Plan must preserve these distinctions:

- financial fact;
- expectation;
- assumption;
- projection;
- suggestion.

A plan may guide decisions but must not rewrite actual account history.

## 8. MoneyFlow Wealth

**Strategic role:** extend the financial model from cash-flow management into the broader balance sheet when the user problem and architecture justify it.

Potential domains:

- investments/holdings;
- property;
- loans and other liabilities;
- retirement assets;
- gold and other user-relevant assets;
- foreign-currency assets after an explicit currency architecture exists;
- valuation observations/history;
- net-worth composition;
- performance methods defined by separate contracts.

MoneyFlow Wealth is not a trading terminal and should not make transaction execution its identity.

The central question is not merely “what is this asset worth?” but “how does this resource or liability affect the user's total financial reality, resilience and goals?”

## 9. MoneyFlow Together

**Strategic role:** extend the financial system from one individual to explicit trusted collaboration.

Potential use cases:

- couples;
- households;
- shared expenses;
- shared goals and obligations;
- selective professional/adviser read access if validated.

Required architecture before implementation:

- workspace or equivalent ownership boundary;
- membership lifecycle;
- private versus shared resources;
- roles and permissions;
- activity/audit history;
- separation/export/delete behavior;
- RLS threat model and migration design.

Together must not be implemented as a simple `family_id` attached to all current data.

Together may become strategically valuable before Wealth if user and retention evidence supports it. Ecosystem order is evidence-led rather than category-led.

## 10. MoneyFlow Automation

**Strategic role:** reduce repetitive maintenance and execution cost while preserving user control.

Automation is horizontal across the ecosystem.

Maturity ladder:

1. explicit deterministic rule;
2. suggestion requiring user confirmation;
3. user-reviewed batch action;
4. bounded high-confidence automatic action;
5. narrowly authorized agentic action.

Every automated action must have a defined owner, provenance, correction/reversal behavior and failure boundary.

Automation should be measured by net maintenance reduction and error cost, not action count.

## 11. MoneyFlow Intelligence

**Strategic role:** make trusted financial data easier to understand and use, without turning AI into a second source of truth.

Potential capabilities:

- natural-language exploration over authorized records;
- explanations of changes;
- duplicate/anomaly assistance;
- merchant/category suggestions;
- recurring-pattern detection;
- scenario assistance;
- trade-off explanation;
- summarization of unresolved financial maintenance.

### Intelligence boundary

AI may propose, explain, search, compare or assist. It must not silently manufacture a financial fact, planning assumption or irreversible action.

For mutation, Intelligence must use the same bounded domain actions as every other client.

Model/provider choice is implementation detail and must not become the product moat.

## 12. MoneyFlow Connect

**Strategic role:** expose mature MoneyFlow contracts to selected external systems after those contracts are safe enough to support externally.

Potential surfaces:

- read APIs;
- scoped write APIs where separately justified;
- webhooks;
- connector SDK/adapters;
- automation extensions;
- authorized third-party integrations;
- developer sandbox.

Connect should not exist merely because an API is fashionable. It is justified when integrations create durable user value or materially reduce maintenance.

External access must preserve scope, consent, auditability, revocation and rate/operational boundaries.

## 13. MoneyFlow Mobile

**Strategic role:** provide a native/device surface only where device capabilities solve validated jobs better than the web.

Potential native advantages:

- fast capture;
- share targets;
- camera/document workflows;
- device-assisted acquisition;
- notifications where platform policy and privacy permit;
- widgets;
- biometrics;
- better offline behavior.

Mobile is not a second financial product. It must use the same financial contracts as web and must not own divergent balances, rules or transaction semantics.

Native development should be capability-led, not category convention.

## 14. Provider ecosystem strategy

Provider connectivity is a strategic acquisition capability, not the foundation of MoneyFlow's identity.

Provider decisions require current evidence for:

- legal/contractual access;
- consent and revocation;
- credentials/token handling;
- data coverage and semantics;
- sync reliability and recovery;
- duplicate/transfer implications;
- support burden;
- provider cost;
- retained-user value;
- concentration risk.

Read-only connectivity remains the default strategic starting point. Payment initiation or other regulated/high-impact actions require separate product and legal strategy.

MoneyFlow must remain useful when a provider is unavailable or a connection expires.

## 15. Business and packaging architecture

The ecosystem may eventually support multiple paid packages, but package names are not product commitments.

Possible long-term packaging logic:

- **Personal/Core:** trustworthy personal financial management;
- **Advanced/Plus:** deeper acquisition, planning, analysis and automation;
- **Together:** household collaboration and shared ownership;
- **Connect/Professional:** specialized integrations or collaboration if economics and user evidence support them.

Do not use feature fragmentation to cripple basic data ownership, correction or export.

Provider, AI and market-data costs may justify different packaging where marginal cost is real and transparent.

## 16. Ecosystem expansion decision test

Before creating a new module or branded surface, answer:

1. Which Reality/Resilience/Progress/Choice outcome becomes materially better?
2. Does the need recur across enough users or a strategically valuable segment?
3. Can the existing product model support it without creating a second financial truth?
4. What new ownership/privacy/security boundary appears?
5. What new financial semantics appear?
6. Does the capability need its own module, or can it remain progressive disclosure inside an existing one?
7. What ongoing operational/provider cost appears?
8. What is the rollback/disconnect/export path?
9. What evidence would justify retiring the capability later?
10. Why is this expansion more valuable than improving the lower layer first?

Default to **Defer** when the lower layer is not ready.

## 17. Ecosystem anti-patterns

Reject these shapes:

- one app per financial category with duplicated state;
- a “super-app” navigation where every capability competes for primary attention;
- provider-specific ledger forks;
- AI actions outside normal financial mutation contracts;
- household collaboration with implicit ownership;
- wealth numbers with undefined valuation/currency semantics;
- a developer API that exposes unstable internal concepts prematurely;
- native mobile that permanently diverges from web financial behavior;
- monetization that depends on selling financial data or maximizing transaction volume.

## 18. Long-term ecosystem picture

MoneyFlow should feel like one product that grows with the user's financial life:

```text
capture / acquire
      ↓
know what is true
      ↓
understand what must be protected
      ↓
plan and measure progress
      ↓
compare choices
      ↓
automate proven repetitive work
```

Household, wealth, mobile, provider connectivity, APIs and intelligence are branches around that core progression — not independent identities.

The ecosystem is successful when broader capability makes the user's financial life easier to understand and maintain without making the product itself harder to trust.
