# MoneyFlow target architecture roadmap

- **Status:** binding architecture direction, not an immediate rewrite plan
- **Updated:** 2026-08-21
- **Current architecture authority:** `ARCHITECTURE.md`
- **Product authority:** `docs/product/PRINCIPLES.md` + `docs/product/MONEYFLOW_PRODUCT_VISION.md`
- **Program authority:** issue #432 / `docs/plans/active/432-vietnam-long-term-product-strategy.md`

## 1. Purpose

MoneyFlow's current single-deployment modular monolith remains the correct architecture. The long-term change is **dependency order**, not a rewrite: Acquisition + Reconciliation must become a first-class layer immediately above the trusted ledger so digital activity can enter MoneyFlow without creating provider-specific financial semantics.

Do not introduce microservices, event buses, generic repository layers, queues or provider SDKs because they appear in reference projects. A new runtime exists only when security, failure recovery, scaling, legal isolation or team ownership proves the boundary.

## 2. Architecture laws

1. **One ledger source of truth.** Posted financial facts are transaction/entry based.
2. **Sources are evidence, not facts by default.** Bank/provider/file/share/device/manual channels feed one acquisition contract.
3. **Provider adapters do not bypass validation.** They create source records/candidates, never arbitrary balances or final classifications outside the normal ledger path.
4. **Acquisition is idempotent.** Stable external identity is preferred; deterministic fingerprints and explicit match decisions handle sources without one.
5. **Reconciliation is structural.** Duplicate, transfer, clearing and account reconciliation state are explicit, not inferred from category names or current balance hacks.
6. **Planning does not mutate facts.** Budgets, expectations, goals and scenarios reference the ledger but never overwrite it.
7. **Read models are disposable.** Dashboards, reports and forecasts can be rebuilt.
8. **Ownership is explicit.** User, future workspace and provider access use durable permission/consent records.
9. **Automation is an actor with provenance.** Imported, matched, rule-applied or suggested changes record source/version/decision path.
10. **Public contracts are narrower than storage.** Export/API schemas are versioned and do not expose internal tables directly.
11. **Current simplicity is preserved.** New seams begin as modules/tables inside the monolith.

## 3. Target domain map

```text
Identity and Ownership
├── users
├── future workspaces / memberships / permissions
└── provider consent and access state

Ledger Core
├── financial transactions / entries
├── accounts
├── categories / payees / tags
├── correction / recovery
└── mutation audit

Acquisition and Reconciliation
├── sources and batches
├── source events / candidates
├── provenance + parser/adapter versions
├── external IDs / fingerprints
├── duplicate / transfer / rule decisions
├── review / pending / cleared state
├── reconciliation sessions
└── provider-feed adapters

Understanding
├── report/query contracts
├── drill-down / saved views
├── attention / unresolved items
└── net-worth/valuation read models when supported

Planning
├── budget plans / allocations
├── recurring definitions / occurrences
├── goals / reserves / contributions
├── debt plans
└── scenario assumptions / forecasts

Automation
├── rule versions
├── learned suggestions
├── bounded auto-approval
├── background sync/workflows
└── scoped API / webhooks

Wealth
├── assets / liabilities
├── loans / schedules
├── instruments / holdings
├── valuations / prices
└── currency / rate records
```

## 4. Current request boundary retained

```text
Route/server entry
  -> viewer-aware loader
  -> validated read model
  -> client feature surface

Client mutation owner
  -> validated Server Action
  -> server-derived authenticated context
  -> ownership-safe RPC / constrained database write
  -> validated result
  -> reconciliation and revalidation
```

Future source ingestion may execute asynchronously, but ledger mutation still routes through the same domain/ownership invariants.

## 5. Ledger and transaction state model

Do not overload one status field. Separate orthogonal concerns:

| Concern | Example states | Meaning |
|---|---|---|
| Posting | candidate / posted / deleted | whether the row is a ledger fact |
| User review | needs_review / reviewed | whether classification/details were checked |
| Settlement | pending / cleared / cancelled where source supports it | external settlement state |
| Reconciliation | open / reconciled / reopened | account/statement close state |
| Acquisition decision | proposed / matched / duplicate / rejected / approved | source workflow only |

A transaction can be reviewed but uncleared or cleared but still need review. Source status changes such as pending -> cleared update the appropriate source/settlement state without silently replacing a user correction.

## 6. Neutral acquisition contract

### 6.1 Pipeline

```text
source bytes / API record / share text / manual event
  -> source + batch identity
  -> parser/adapter + version
  -> normalized candidate
  -> provenance + raw-description/reference policy
  -> validation
  -> exact source-ID match when possible
  -> duplicate / fuzzy / transfer / rule plan
  -> dry-run / review or bounded auto-approval
  -> atomic ledger commit
  -> source linkage + audit
  -> clearing / reconciliation updates
```

Each stage is restartable or explicitly terminal. A parser upgrade does not reinterpret already-approved facts silently.

### 6.2 Source identity and idempotency

Prefer provider/institution stable transaction IDs. When unavailable, define a versioned deterministic fingerprint over only fields established by the source specification. Fingerprints are matching aids, not proof of identity.

Required behavior:

- replaying the same exact source event does not create another financial fact;
- a manually entered transaction can later match a stronger imported/provider record;
- deleted/reimport behavior is explicit;
- provider correction/update semantics are explicit;
- batch failure is atomic at the contract-selected boundary;
- idempotency/request IDs are auditable without logging secrets/raw financial payloads.

### 6.3 Provenance

Preserve enough provenance to answer:

- which source and account produced the event;
- parser/adapter/version;
- stable external ID or fingerprint version;
- original description/reference where policy permits;
- why a match/rule/transfer decision occurred;
- who/what approved/changed the fact.

Do not store bank tokens, raw private statements or complete provider payloads in generic logs/audit prose. Sensitive payload storage requires a separately owned encrypted/private boundary.

## 7. Duplicate and transfer matching

Matching is a deterministic plan with reason/evidence, not an opaque side effect.

Order:

1. exact stable source identity;
2. previously linked source/fact relationship;
3. structurally safe duplicate candidate match using bounded source-specific fields/windows;
4. internal-transfer pairing using equal/opposite amount, account ownership, bounded time and additional evidence where available;
5. otherwise unresolved/review.

Never auto-delete a user fact merely because a fuzzy match exists. False-positive match precision is more important than maximizing automation coverage.

## 8. Reconciliation seam

Target records:

- reconciliation session: owner, account, statement/source boundary date, statement/source balance if supplied, calculated difference and lifecycle;
- reconciled account-entry membership;
- reopen event and reason;
- explicit adjustment transaction only when the user chooses to correct a difference.

Never write an account balance directly to force agreement. Never claim MoneyFlow is complete through a date if source coverage cannot establish that claim.

## 9. Payees, rules and attachments

- Preserve raw imported description separately from normalized merchant/payee.
- Merchant/payee normalization is user-correctable and source-independent.
- Tags remain many-to-many metadata, not replacement categories.
- Deterministic rules have owner, ordered version, conditions, actions, execution stage, preview, enable/disable/supersession history and audit.
- Probabilistic suggestions do not enter deterministic rules until accepted through an explicit contract.
- Attachments use private object storage with ownership checks; binaries never enter Git/logs.

## 10. Provider adapters

A future bank/provider connector owns:

- consent/revoke state;
- encrypted token/secret reference outside application logs;
- institution/account mapping;
- sync cursor/time window;
- source transaction identity;
- provider health, retry/backoff and rate limits;
- disconnect/delete behavior;
- provider-specific normalization behind the neutral acquisition contract.

Read-only account information/balances/transaction history are the first allowed provider capabilities when the provider/regulatory contract permits them. Payment initiation is a separate regulated product boundary and is not implied by personal-finance connectivity.

Provider adapters do not get their own ledger tables/financial meanings that bypass Core.

## 11. Background workflow decision

Do not select infrastructure before measuring the workload.

Decision order:

1. current request/runtime + PostgreSQL transactions when synchronous work is bounded;
2. PostgreSQL-native job runner (for example a Graphile Worker class of solution) when retry/scheduling/background execution is enough;
3. durable Postgres-backed workflow (for example a DBOS class of solution) when multi-step sync/import must resume reliably across crashes and long waits;
4. heavier external workflow/queue infrastructure only when throughput/availability requirements exceed simpler choices.

Required properties for source/provider jobs:

- idempotent step inputs;
- resumable cursor state;
- bounded concurrency per provider/account;
- rate-limit/backoff handling;
- structured health/error state;
- no secret leakage in logs;
- safe replay.

## 12. Understanding architecture

Create one validated report query contract for date range/comparison, accounts, transaction types, categories/groups, payees/merchants, tags, review/settlement state and future currency view.

Every aggregate returns or can reconstruct calculation boundary, excluded record types, contributing transaction query, currency/rounding policy and comparison range.

The review/home layer should be able to distinguish:

- known/current financial state;
- unresolved/missing/duplicate candidates;
- source/sync health;
- known upcoming obligations;
- analytics derived from reconciled/posted facts.

## 13. Planning architecture

Shared primitives may include plan periods, expected occurrences, links to ledger records and effective-dated revisions, while keeping budgets/recurring/goals/debt semantically separate.

Recurring lifecycle separates definition, expected occurrence, occurrence state and matched posted transaction.

Goals use contribution/withdrawal records or explicit links to posted transactions; editable progress totals are not authoritative.

Forecast inputs are explicit facts, expectations and user assumptions. Outputs are deterministic projections with source contribution and coverage; they never post financial facts.

## 14. Wealth and currency

Before non-VND accounting, define an explicit currency contract that preserves integer money semantics and historical stability.

Wealth distinguishes transaction-driven cash accounts, manually valued assets, liabilities/loans, investment events/holdings and valuation observations. Market prices never rewrite trade history.

## 15. Ownership and Together

Future collaboration requires:

```text
workspace
  ├── membership(role, status)
  ├── owned financial resources
  ├── private/shared visibility grants
  └── activity/audit records
```

Migration from user-owned rows must be explicit and reversible. RLS/membership proves least privilege before invitation/share UI ships.

## 16. Optional intelligence boundary

AI/probabilistic systems may produce suggestions or explanations over authorized records only with:

- explicit opt-in where required;
- minimum necessary data exposure;
- source-linked answers;
- confidence/uncertainty;
- review/correction and opt-out;
- deterministic fallback;
- no autonomous financial posting or regulated advice.

## 17. Delivery sequence

### Stage 0 — Authority + release trust

Align product/architecture authority under #432 while keeping RRB/provider/legal/physical-device evidence truthful.

### Stage 1 — Acquisition Foundation

Source/batch/candidate/provenance/identity/fingerprint/dry-run/duplicate/transfer/idempotency contracts. Migrate one existing source path end-to-end.

**Checkpoint:** replay and failed batches cannot create duplicate/partial financial facts.

### Stage 2 — Low-Maintenance Ingestion + Reconciliation

Real statement/file/share inputs, merchant normalization, deterministic rules, recurring recognition, pending/cleared and reconciliation sessions.

**Checkpoint:** maintenance effort falls without higher financial correction/match error.

### Stage 3 — Understanding + Review

Shared query/drill-down/export contract, unresolved/source coverage state, period review/close and known obligations.

**Checkpoint:** summaries remain traceable and coverage claims are honest.

### Stage 4 — Selective Connected Sources

First contracted read-only provider(s) chosen from current official capability, retention and economics. Consent/token/sync-health/rollback boundaries.

**Checkpoint:** connected cohort shows correct reconciliation and supportable maintenance/provider economics.

### Stage 5 — Connected Planning

Recurring matches, goals/contributions, reserves/debt/financial calendar/forecast.

**Checkpoint:** plans cannot be confused with facts and stay current from ledger relationships.

### Stage 6 — Automation Platform

Versioned rules/suggestions, bounded auto-approval, durable jobs as justified, API/webhooks.

**Checkpoint:** automation has provenance, precision/error evidence, replay, rollback and audit.

### Stage 7 — Wealth + Currency

Assets/liabilities/loans/investments/valuations/explicit multi-currency.

### Stage 8 — Together

Workspace/membership/RLS/shared-private ownership.

### Stage 9 — Optional Intelligence

Grounded explanations/NL exploration and assistive suggestions.

## 18. Extraction criteria

Keep a module in the current deployment unless at least one is proven:

- independent secrets/provider security boundary;
- independent scaling/latency profile;
- separate availability/rollback requirement;
- long-running/background workload incompatible with current runtime;
- independent team ownership/release lifecycle;
- legal/data-residency isolation.

Even then, define a neutral contract and rollback/dual-run path first.

## 19. Verification matrix

| Boundary | Required evidence when changed |
|---|---|
| Financial semantics | pure domain tests, counterexamples, migration replay, pgTAP where relevant |
| Ownership/RLS | cross-tenant pgTAP/grants/viewer-derived actions |
| Acquisition/import | fixtures, parser/source versions, exact ID/fingerprint tests, dry-run, idempotency, atomic failure, duplicate/transfer counterexamples |
| Reconciliation | statement/session difference tests, reopen behavior, browser review |
| Reports/forecast | deterministic unit tests, query parity, drill-down/export evidence |
| UI/module disclosure | phone/desktop, keyboard, long Vietnamese, large VND and error/loading/empty states |
| Providers | official contract evidence, consent/revoke/security review, failure/rate behavior, rollback and authorized production smoke |
| API/webhooks | scopes, replay/idempotency, version compatibility and abuse controls |
| Wealth/currency | precision/cost-basis counterexamples, historical stability and reconciliation |
| Together | threat model, membership/RLS matrix, separation/export/delete tests |

## 20. Explicit non-decisions

This roadmap does not yet select:

- a bank/e-wallet/Open Banking provider;
- a background-job/workflow platform;
- native mobile stack;
- AI provider/model;
- event sourcing;
- microservices;
- market-data/FX provider;
- investment cost-basis method;
- household permission matrix.

Those decisions occur only inside the relevant bounded specification.
