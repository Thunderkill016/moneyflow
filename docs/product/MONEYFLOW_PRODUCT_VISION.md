# MoneyFlow product vision

- **Status:** binding long-term product direction
- **Owner direction:** 2026-08-21
- **Current shipped truth:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Product law:** `docs/product/PRINCIPLES.md`
- **Architecture sequence:** `docs/architecture/TARGET_ARCHITECTURE_ROADMAP.md`
- **Program authority:** issue #432 and `docs/plans/active/432-vietnam-long-term-product-strategy.md`

## 1. Vision

MoneyFlow will grow from today's Vietnamese manual/import-assisted income-and-expense ledger into a **low-maintenance, provider-independent personal-finance platform**.

Its durable job is:

> **Maintain one trustworthy, understandable picture of a person's money while steadily reducing the work required to keep that picture correct.**

The product is not defined by how transactions are entered. A user may have financial activity from bank apps, VietQR, e-wallets, cards, cash, statements, share targets or future contracted provider feeds. MoneyFlow should converge those sources into one correctable and user-owned ledger rather than force the user to maintain parallel records.

Long-term acquisition principle:

> **A digital transaction that can be acquired safely should not need to be retyped.**

Manual capture remains essential for cash, corrections and unseen/off-system events. It is a fallback and explicit user action, not the long-term default for already-digital activity.

## 2. Product promise

> Every financial fact has a source. Every match can be explained. Every plan states its assumptions. Every automation can be reviewed or corrected. The user remains in control of their data and decisions.

MoneyFlow is calm, factual and non-judgmental. It may acquire, normalize, reconcile, explain, compare and project. It does not invent missing information, silently rewrite financial truth or make autonomous financial decisions.

## 3. Primary user and first wedge

MoneyFlow serves a Vietnamese individual managing their own money without accounting jargon or provider lock-in.

The first segment to validate is digitally banked Vietnamese adults with enough payment/account activity that maintaining a whole-money picture is recurring work. Urban salaried users are an initial recruiting hypothesis because their digital transaction trail and income regularity make the workflow easier to test. This is not yet proven demand or willingness to pay.

Irregular-income users remain strategically important but require their own observed workflow rather than being treated as a variant of salaried behavior.

## 4. Product laws

1. **Ledger before dashboard.** Financial facts are the source; summaries are derived.
2. **Acquire once, reconcile once.** All input sources converge on one candidate/provenance/matching/ledger path.
3. **Correctness before automation.** Reducing user work never justifies silent duplicate, transfer, ownership or amount errors.
4. **Provider-independent by design.** No one bank/e-wallet/provider becomes a second source of truth or a prerequisite for core usefulness.
5. **Progressive disclosure.** Complexity appears only when the user has relevant data or chooses it.
6. **Facts, expectations, assumptions, projections and suggestions remain distinct.**
7. **Explainable automation.** Source, rule/match/version and correction path are inspectable.
8. **Safe correction and recovery.** High-impact edits are bounded, audited and recoverable.
9. **No hidden lock-in.** Export/backup and ownership survive the business model.
10. **Vietnamese-first, globally capable later.** Vietnamese copy, VND and local payment reality are first-class.
11. **Web-first, capability-led mobile.** Native apps are built when device capabilities solve validated jobs the web cannot reliably solve.
12. **A horizon is not implementation permission.** Each high-risk module needs an accepted specification and evidence gate.

## 5. Product system

### MoneyFlow Core — trustworthy financial facts

Default foundation:

- accounts and balances;
- income, expense and internal transfers;
- review, correction, soft delete and recovery;
- category/payee/tag/search semantics as validated;
- reconciliation state;
- trustworthy export and backup;
- provenance/audit for source-backed facts.

Core remains usable without provider connections, planning, AI, investments or household setup.

### MoneyFlow Acquire — reduce maintenance

This becomes the strategic layer immediately above Core:

- statement/file/share/paste/manual sources;
- future read-only provider feeds;
- source batches and provenance;
- parser/adapter versions;
- normalized candidates;
- stable source identity and fallback fingerprints;
- duplicate and internal-transfer matching;
- pending/cleared updates;
- deterministic rules;
- review/exception queue;
- atomic commit and replay/idempotency.

A parser/provider cannot write arbitrary financial truth directly.

### MoneyFlow Understand — show what is known and unresolved

- current balance state with coverage/reconciliation context;
- period inflow/outflow;
- meaningful-change explanations;
- unresolved/duplicate/source exceptions;
- traceable reports and drill-down;
- weekly/monthly review or close states;
- known upcoming obligations.

Every aggregate must expose or reconstruct the contributing records and calculation boundary.

### MoneyFlow Plan — use facts to manage future money

- recurring income/obligations and matched occurrences;
- budgets and allocations;
- goals/reserves and real contributions;
- debt plans;
- financial calendar;
- deterministic forecasts/scenarios with explicit coverage and assumptions.

Planning never changes account facts directly and must not become a second parallel database users maintain by hand.

### MoneyFlow Automate — remove proven repetitive work safely

- versioned deterministic rules;
- learned suggestions from confirmed corrections;
- bounded high-confidence auto-approval;
- background sync health and alerts;
- scoped APIs/webhooks;
- rollback, replay/idempotency and audit.

### MoneyFlow Connect — selective read-only providers

Connectivity is an accelerator after the acquisition contract exists:

- bank/Open API consent and revoke;
- account mapping;
- account information/balances/transaction history first;
- sync cursors, rate limits, retries and provider health;
- token/secret isolation;
- disconnect/delete behavior;
- provider economics/support evidence.

Connection count is not success. Reduced maintenance with correct reconciliation is success.

### MoneyFlow Wealth — broader balance sheet

- assets and liabilities;
- loans and credit;
- investments/holdings;
- valuation observations and history;
- explicit multi-currency model;
- net-worth composition and performance methods defined by separate specs.

### MoneyFlow Together — shared ownership

- workspace/membership;
- private/shared financial resources;
- scoped roles;
- shared expenses/plans/goals;
- adviser read-only access where validated;
- separation/export/delete and activity history.

Together begins only after an ownership threat model and RLS migration design.

### MoneyFlow Intelligence — optional interface over trusted data

- ambiguous classification suggestions;
- merchant normalization assistance;
- recurring/anomaly explanations;
- natural-language exploration;
- scenario assistance.

Intelligence is a consumer of authorized facts and suggestions, not a source of ledger truth or autonomous financial advice.

## 6. User experience progression

### Level 1 — establish the ledger

Create accounts, capture/import initial activity, verify balances and retain ownership of data.

### Level 2 — make acquisition cheaper

Import/share/source activity, resolve exceptions, match transfers and reach a trustworthy period with fewer manual actions.

### Level 3 — review and understand

See what changed, what is unresolved and what upcoming known obligations matter.

### Level 4 — connect planning to facts

Budgets, recurring items, goals and forecasts stay linked to actual transactions and explicit assumptions.

### Level 5 — automate and connect

Rules and selected provider feeds reduce routine maintenance while preserving source/review/recovery.

### Level 6 — extend to wealth/together/intelligence

Only after Core + Acquire + Understand prove continuing value.

## 7. Success measures

Primary north-star concept:

> **Trusted periods maintained with decreasing maintenance effort.**

### Trust and data quality

- unexplained balance-change rate;
- duplicate/unmatched/correction rate;
- automatic-match precision;
- reconciliation completion/confidence;
- export/restore success;
- user-reported confidence in known balances and coverage.

### Maintenance reduction

- manual interventions per 100 observed transactions;
- maintenance minutes per active user/month;
- share of activity acquired rather than retyped;
- time to first trustworthy period;
- source-sync/import failure and recovery rates.

### Continuing value

- multi-period retention / trusted months maintained;
- repeated use of review/report/planning after data exists;
- reasons for abandonment;
- willingness to pay for meaningful work reduction.

### Provider/business evidence

- provider and support cost per retained paying user;
- consent/connect success/expiry recovery;
- maintenance reduction for connected vs non-connected cohorts;
- concentration risk by provider.

DAU and feature count are secondary diagnostics, not north-star measures.

## 8. Development waves

Waves are dependency order, not fixed dates.

### Wave 0 — Authority and release trust

- reconcile product law and architecture with #432;
- keep release/physical/provider/legal gates truthful and independent;
- instrument only privacy-safe product evidence needed for future decisions.

### Wave 1 — Acquisition Foundation

- one neutral source/candidate/provenance pipeline;
- stable source IDs/fingerprints;
- dry-run, duplicate and transfer decisions;
- atomic/idempotent commit;
- pending/cleared and correction precedence.

### Wave 2 — Low-Maintenance Ingestion

- robust real statement/file/share formats;
- merchant normalization and deterministic rules;
- recurring recognition;
- exception-first review and reconciliation.

### Wave 3 — Trustworthy Understanding

- compact whole-money/review state;
- shared report query/drill-down/export contract;
- period close/up-to-date coverage semantics;
- known obligations/attention.

### Wave 4 — Selective Connectivity

- first contracted read-only provider(s) chosen from real retention/economics evidence;
- consent/token/sync-health/rollback boundaries;
- same neutral acquisition pipeline.

### Wave 5 — Connected Planning

- recurring matching;
- goals/contributions;
- financial calendar;
- deterministic forecast/scenarios.

### Wave 6 — Automation Platform

- versioned/learned rules;
- bounded auto-approval;
- durable background workflow as required;
- scoped API/webhooks.

### Wave 7 — Wealth

- assets/liabilities/loans/investments;
- valuations, performance and explicit multi-currency.

### Wave 8 — Together

- workspace ownership, permissions and shared-finance flows.

### Wave 9 — Optional Intelligence

- grounded suggestions/explanations/NL exploration with opt-out and deterministic fallback.

## 9. Current boundaries

This vision authorizes direction, not implementation of every horizon.

Separate researched specifications and explicit permission remain mandatory for:

- production bank/Open API provider integration;
- native Android/iOS applications;
- sensitive notification/SMS-based acquisition;
- AI/probabilistic mutation;
- household/workspace migration;
- wealth/investment accounting;
- explicit multi-currency accounting;
- payment initiation, credit scoring, insurance, tax or regulated financial advice.

## 10. Relationship to current shipped MVP

Today's product can truthfully remain manual/import-assisted while the long-term direction is acquisition-first. Documentation must distinguish **current capability** from **future product law** and never claim bank sync, native capture or automation before implementation evidence exists.

`docs/MVP_DEFINITION.md` records the released MVP. `CURRENT_PROJECT_MEMORY.md` and current code/tests own implementation truth. This vision owns the accepted long-term shape once merged to the default branch.
