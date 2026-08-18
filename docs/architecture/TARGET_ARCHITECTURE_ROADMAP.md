# MoneyFlow target architecture roadmap

- **Status:** SUPERSEDED as binding direction, pending the same owner decision as the product vision. Retained as architecture reference.
- **Why:** it sequences seams for the "comprehensive personal-finance platform" direction, which `docs/product/MONEYFLOW_PRODUCT_VISION.md` §1 replaces with a fixed-surface direction. Sections covering capabilities now ruled out in vision §9 (wealth, collaboration, provider feeds, multi-currency) describe work that is not planned.
- **Still valid:** the seam analysis of the existing ledger, and the refusal to create microservices or event buses without evidence.
- **Prepared:** 2026-08-03
- **Current architecture authority:** `ARCHITECTURE.md`
- **Product authority:** `docs/product/MONEYFLOW_PRODUCT_VISION.md`
- **Capability horizon:** `docs/research/GLOBAL_PERSONAL_FINANCE_CAPABILITY_ATLAS.md`

## 1. Purpose

MoneyFlow's current single-deployment modular monolith remains the correct architecture. This roadmap defines the domain seams, data distinctions and migration order needed to grow into a comprehensive personal-finance platform without turning every new feature into another flag on `financial_transactions` or another route-specific calculation.

This is not permission to create microservices, packages, event buses or generic repositories. A future boundary becomes a separate runtime only when independent scaling, security, provider, deployment or team ownership evidence exists.

## 2. Architecture principles

1. **One ledger source of truth.** Posted financial facts remain transaction/entry based.
2. **Planning does not mutate facts.** Budgets, expectations, goals and scenarios reference the ledger but never overwrite it.
3. **Read models are disposable.** Dashboards, reports and forecasts can be rebuilt from authoritative facts and plans.
4. **Ownership is explicit.** User, future household and provider access are modeled through durable ownership/permission records, not UI assumptions.
5. **Money semantics are structural.** Transfer, split, currency, debt, investment and valuation behavior cannot rely on category names.
6. **Automation is an actor with provenance.** Every imported, rule-applied or suggested change records source, version and decision path.
7. **Compatibility is staged.** Application and migration skew must fail safely or degrade explicitly.
8. **Public contracts are narrower than storage.** Export/API schemas are versioned and do not expose internal tables directly.
9. **Current simplicity is preserved.** A new domain seam begins as modules and tables inside the monolith.

## 3. Target domain map

```text
Identity and Ownership
├── users
├── future workspaces/households
├── memberships and permissions
└── provider consent and access state

Ledger Core
├── financial transactions
├── transaction entries
├── accounts
├── categories, payees and tags
├── review/clearing/reconciliation
└── mutation audit and recovery

Planning
├── budget plans and allocations
├── recurring definitions and occurrences
├── goals, reserves and contributions
├── debt plans
└── scenario assumptions

Understanding
├── report/query contracts
├── saved views and dashboards
├── net-worth/valuation read models
├── attention items
└── forecast projections

Acquisition and Automation
├── import sources and batches
├── candidates and provenance
├── deterministic rules and versions
├── matching/duplicate decisions
├── provider-feed adapters
└── API/webhook integrations

Wealth
├── assets and liabilities
├── loans and schedules
├── instruments and holdings
├── valuations and prices
└── currency/rate records
```

## 4. Current boundary retained

The current request flow remains:

```text
Route/server entry
  → viewer-aware workspace loader
  → validated read model
  → client feature surface

Client mutation owner
  → validated Server Action
  → viewer-derived authenticated context
  → ownership-safe RPC / constrained database write
  → validated result
  → client reconciliation and revalidation
```

Future modules reuse this flow until evidence justifies a new runtime.

## 5. Ledger evolution

### 5.1 Transaction state model

Do not overload one status field. The target model separates orthogonal concerns:

| Concern | Example states | Meaning |
|---|---|---|
| Posting | draft/candidate/posted/deleted | whether a record is a ledger fact |
| User review | needs_review/reviewed | whether a person has checked classification/details |
| Settlement | pending/cleared | whether the external account statement confirms the entry |
| Reconciliation | open/reconciled/reopened | whether a statement period has been closed |
| Import decision | proposed/duplicate/rejected/approved | acquisition workflow only |

A transaction can be reviewed but uncleared, or cleared but still need category review. Reconciliation locks a period/account leg, not an unrelated product-review state.

### 5.2 Reconciliation seam

Target records:

- reconciliation session: owner, account, statement date, statement balance, calculated difference and lifecycle;
- reconciled account-entry membership;
- reopen event and reason;
- explicit adjustment transaction when the user chooses to correct the difference.

Never write an account balance directly to force agreement. Never infer reconciliation from the current transaction date alone.

### 5.3 Payees, tags and attachments

- Preserve raw imported description and source payload reference.
- Normalize merchant/payee as a separate user-correctable entity.
- Tags are many-to-many metadata, not replacement categories.
- Attachments use private object storage, ownership checks and metadata records; binaries do not enter Git, logs or audit prose.

### 5.4 Financial mutation audit

Store non-sensitive metadata:

- actor type and scoped actor ID;
- action and entity ID;
- request/idempotency ID;
- before/after structural fields where safe;
- timestamp and source channel;
- rule/import/provider version references.

Do not store raw notes, bank payloads, secrets or complete financial snapshots in generic logs.

## 6. Planning architecture

### 6.1 Shared planning primitives

Planning modules should share:

- `plan_period`: date boundaries and timezone policy;
- `plan_amount`: integer native amount plus future currency reference;
- `plan_occurrence`: expected dated amount and lifecycle;
- `plan_link`: connection to category, account, goal, debt or transaction;
- `plan_revision`: effective-date history rather than destructive replacement.

Do not force budgets, recurring definitions and goals into one table. Share primitives and reporting contracts while preserving their different meanings.

### 6.2 Budgets

Target records:

- budget method/configuration;
- period plan;
- category/group allocation;
- rollover policy;
- allocation revision history;
- explicit transfer/reallocation event.

Spent amounts remain derived from ledger entries. A budget allocation is not an account reservation unless a future envelope contract explicitly defines that behavior.

### 6.3 Recurring lifecycle

Separate:

- recurring definition;
- generated expected occurrence;
- occurrence state;
- matched posted transaction;
- skip/pause and revision history.

Occurrences may carry exact, approximate or ranged amount expectations. Matching decisions record reason and confidence.

### 6.4 Goals and debt

Goals require contribution/withdrawal records or links to posted transactions. Editable progress totals are not authoritative.

Debt planning separates:

- real liability account/loan facts;
- contractual interest/payment data;
- user-selected payoff strategy;
- simulated projection outputs.

A simulation never posts a payment.

## 7. Facts, assumptions and projections

### 7.1 Data classes

| Data class | Authority | Mutation rule | Example |
|---|---|---|---|
| Fact | ledger/provider-confirmed record | corrected through audited financial mutation | posted salary |
| Expectation | planning definition/occurrence | revised with effective-date history | rent due next month |
| Assumption | user-owned scenario input | editable within scenario | income increases 10% |
| Projection | deterministic derived output | regenerated, never hand-edited | forecast balance |
| Suggestion | rules/model output | accepted/rejected by user | proposed category |

Database schemas, TypeScript contracts and UI copy must preserve these distinctions.

### 7.2 Forecast engine boundary

Inputs:

- current actual account balance;
- posted future-dated facts where permitted;
- expected recurring occurrences;
- budgeted income/expense events;
- explicit scenario assumptions;
- future transfer events.

Outputs:

- dated account projections;
- consolidated projection;
- low-balance intervals;
- source contribution breakdown;
- confidence/coverage indicators.

The first implementation should be a deterministic pure domain engine plus persisted input records. Persist projections only when performance measurements require a cache, and then add invalidation tests for historical edits and plan revisions.

## 8. Reporting and query architecture

### 8.1 Shared filter contract

Create one neutral report query contract for:

- date range and comparison mode;
- accounts;
- transaction types;
- categories/groups;
- payees/merchants;
- tags;
- review/settlement state;
- native/base currency view when supported.

Route URLs, server workspaces and export use the same validated contract. No report and CSV implementation may independently interpret a range.

### 8.2 Drill-down contract

Every aggregate returns or can reconstruct:

- calculation boundary;
- excluded record types;
- contributing transaction query;
- currency and rounding policy;
- comparison range.

Charts are presentation. The query and financial calculation live in testable domain/server modules.

### 8.3 Saved reports and dashboards

Persist user-owned configuration, not calculated financial snapshots by default:

- filter/query definition;
- visualization type and layout;
- title and description;
- ownership and sharing scope;
- schema version.

## 9. Automation and acquisition architecture

### 9.1 Import pipeline

```text
source bytes/reference
  → parser + parser version
  → normalized candidate
  → provenance and raw description retention
  → validation and mapping
  → duplicate/transfer/rule plan
  → human review or bounded auto-approval
  → atomic ledger commit
  → audit and source linkage
```

Each stage is restartable or explicitly terminal. A parser upgrade does not silently reinterpret already-approved facts.

### 9.2 Rule engine

Target model:

- rule set and owner;
- ordered rule version;
- condition tree;
- action list;
- execution stage;
- preview result;
- execution audit;
- enable/disable and supersession history.

Rules operate on defined fields, not arbitrary code. Probabilistic suggestions do not enter the deterministic rule executor until accepted as explicit rules.

### 9.3 Provider adapters

A future bank/provider connector owns:

- encrypted provider consent/token reference outside application logs;
- institution/account mapping;
- sync cursor and health state;
- source transaction identity;
- retry/backoff and rate limits;
- disconnect and deletion behavior;
- provider-specific normalization behind a neutral acquisition contract.

The adapter creates candidates or matched source records. It does not write balances or classifications directly into the ledger without the normal validation path.

### 9.4 Public API and webhooks

- Use scoped, revocable tokens.
- Version request/response schemas.
- Enforce the same ownership and financial mutation paths as the UI.
- Sign webhooks and support replay/idempotency.
- Never expose service-role access or internal table names as the contract.

## 10. Wealth and multi-currency architecture

### 10.1 Balance-sheet entities

Separate daily spending accounts from broader assets/liabilities through account capabilities or dedicated entities, chosen by the relevant specification. Required distinctions:

- transaction-driven account balance;
- manually valued asset;
- loan principal/interest schedule;
- investment position and market valuation.

### 10.2 Investment records

Potential target entities:

- instrument/security;
- investment account;
- trade, contribution, withdrawal, dividend and fee event;
- holding lot/cost basis;
- price/valuation observation;
- benchmark reference.

Market prices are observations with source/time. They do not rewrite trade history.

### 10.3 Multi-currency model

Before implementation, migrate from implicit VND to explicit currency-aware money while retaining integer VND behavior:

- ISO currency code and minor-unit policy;
- native integer amount per entry;
- transaction-level exchange-rate/fee records for cross-currency movement;
- dated rate observations with source;
- report base currency selected by user/workspace;
- no retroactive historical drift without an explicit revaluation view.

Do not convert every stored amount to floating point. Currency precision and conversion calculations require a dedicated numeric contract and counterexample tests.

## 11. Ownership and collaboration architecture

### 11.1 Future workspace model

Potential target:

```text
workspace
  ├── membership(role, status)
  ├── owned financial resources
  ├── private visibility grants
  └── activity/audit records
```

Migration from current user-owned rows must be explicit and reversible. A single-user workspace may be created for each existing user before household sharing is enabled.

### 11.2 Permission principles

- least privilege;
- explicit private/shared scope;
- viewer-aware reads and server-derived actor context;
- database-enforced ownership/membership;
- export and delete constrained by scope;
- separation/removal flow that does not orphan or leak records.

No collaboration implementation begins with UI invitations alone.

## 12. Optional intelligence boundary

Optional intelligence may produce suggestions or explanations over authorized records. Architecture requirements:

- explicit feature opt-in;
- minimum necessary data exposure;
- provider/data-retention review;
- redaction and privacy boundary;
- source record citations in the product;
- confidence and uncertainty;
- deterministic fallback;
- no autonomous financial posting or regulated advice;
- feedback and deletion of derived artifacts.

Natural-language answers are read-model consumers, not an alternative source of truth.

## 13. Delivery sequence and migration checkpoints

### Stage 1 — Ledger Trust

- integrate review state after PR #255 owner decision;
- define clearing/reconciliation status relationships;
- evaluate/rebuild PR #222 contract;
- split correction, merchant/tag seam and mutation audit.

**Checkpoint:** all financial mutation paths remain integer-safe, tenant-isolated, recoverable and exact-head tested.

### Stage 2 — Planning primitives

- introduce period, occurrence and revision contracts;
- budget history/rollover;
- recurring lifecycle/matching;
- goal contributions and debt-plan simulations.

**Checkpoint:** facts and plans cannot be confused in queries, totals or UI copy.

### Stage 3 — Shared query and understanding

- shared report filters;
- dimensions and drill-down;
- saved reports/dashboards;
- net-worth baseline from existing supported balances.

**Checkpoint:** page, drill-down and export agree for the same query.

### Stage 4 — Forecast

- deterministic forecast engine;
- financial calendar;
- scenarios and low-balance attention;
- actual-versus-forecast review.

**Checkpoint:** every projection shows coverage, assumptions and source contributions.

### Stage 5 — Automation and public ownership

- persisted rule versions;
- mapping presets and batch history;
- backup/restore schema;
- scoped API and webhooks.

**Checkpoint:** automation has provenance, preview, idempotency, audit and rollback.

### Stage 6 — Wealth and currency

- liability/loan semantics;
- assets and valuations;
- investments;
- explicit multi-currency migration.

**Checkpoint:** valuation and FX data cannot corrupt historical ledger facts.

### Stage 7 — Collaboration and providers

- workspace/membership migration;
- shared/private permissions;
- provider adapters after approved market and operating model.

**Checkpoint:** RLS and destructive/export flows prove separation and least privilege.

## 14. Extraction criteria

Keep a module inside the current deployment unless at least one is true:

- independent secrets/provider security boundary;
- independent scaling or latency profile proven by measurement;
- separate availability/rollback requirement;
- long-running/background workload incompatible with current request runtime;
- independent team ownership and release lifecycle;
- legal/data residency isolation.

Even then, first define a neutral contract and dual-run/rollback plan. File size, feature count or competitor architecture is not enough.

## 15. Verification matrix

| Boundary | Required evidence when changed |
|---|---|
| Financial semantics | pure domain tests, counterexamples, migration replay and pgTAP |
| Ownership/RLS | cross-tenant pgTAP, grants and viewer-derived actions |
| Import/rules | fixtures, provenance, idempotency, atomic failure and browser review |
| Reports/forecast | deterministic unit tests, query parity and drill-down/export browser evidence |
| UI/module disclosure | phone/desktop, keyboard, long Vietnamese, large VND and error states |
| Providers | private before/after evidence, rollback, rate/error behavior and production smoke |
| API/webhooks | auth scopes, replay/idempotency, version compatibility and abuse controls |
| Wealth/currency | accounting counterexamples, precision, historical stability and reconciliation |
| Household | threat model, membership/RLS matrix, separation/export/delete tests |

## 16. Explicit non-decisions

This roadmap does not select:

- microservices;
- an event-sourcing rewrite;
- a bank, market-data or AI provider;
- a background-job platform;
- a currency conversion source;
- a portfolio accounting method;
- a household permission matrix;
- a native mobile stack.

Those decisions occur only when the relevant bounded feature reaches research and specification.