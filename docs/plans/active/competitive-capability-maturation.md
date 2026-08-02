# Competitive capability maturation

- **Execution state:** planned
- **Active role:** product planner / implementation coordinator
- **Permission scope:** branch_write + repository_read
- **Owner:** Thunderkill016
- **Branch:** `plan/product-validation-rollout`
- **Base:** `main@f57b92ec471e816f96fa13dd464a7a98297bb2d4`
- **Decision date:** 2026-08-02
- **Gap matrix:** `docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md`

## Repository reconnaissance

MoneyFlow already has:

- authentication and demo runtime;
- multiple accounts;
- income, expense and balanced transfer entries;
- transaction search/filter, edit, soft delete and restore;
- dashboard and period summaries;
- category budgets;
- recurring commitments and recurring income templates;
- savings goals;
- weekly, monthly and yearly reports;
- controlled import, provenance, duplicate planning and atomic approval;
- CSV export;
- responsive light/dark UI;
- RLS, pgTAP, browser tests and risk-proportional CI.

The problem is feature depth. Several screens exist as isolated or basic workflows while comparable products connect them through review, history, drill-down, reconciliation, rules, reminders and export.

The owner direction supersedes the validation-first sequence previously proposed in PR #215:

- development continues immediately;
- existing capabilities are matured toward competitive depth;
- validation is embedded in every implementation PR;
- real-use evidence may reorder or correct work but does not freeze all development;
- unrelated competitor categories remain out of scope.

## Research

### Decision question

What implementation sequence can bring MoneyFlow's existing accounts, transactions, planning, reporting, import/export and mobile/Auth capabilities to competitive depth without creating a feature-parity sprawl or weakening financial correctness?

### Source selection

Primary internal sources:

- `docs/research/PRODUCT_COMPETITIVE_MEMORY.md`;
- `docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md`;
- `docs/product/PRINCIPLES.md`;
- `docs/MVP_DEFINITION.md`;
- `ARCHITECTURE.md`;
- issues #53, #72 and #174;
- current merged code and tests.

External patterns already consolidated in the product memory:

- YNAB and Actual Budget for reconciliation and explicit transaction states;
- Copilot and Monarch for review, correction, rules, report hierarchy and recurring awareness;
- Money Lover and MISA for Vietnamese daily-use expectations;
- Wallet for account lifecycle, export and broad workflow depth;
- Rocket Money for recurring attention patterns;
- Firefly III for deterministic rules and auditability;
- spreadsheets for portability expectations.

### Adoption review

No new dependency, service, provider or architecture is approved by this plan.

Any external tool adoption requires a separate review of:

- license;
- security and privacy;
- data ownership;
- operational burden;
- rollback;
- whether the existing stack can implement the requirement directly.

## Specification

### Product objective

Turn the existing MoneyFlow modules into complete connected loops:

```text
record → review → correct → reconcile → plan → understand → export
```

A feature is not considered complete because a route or CRUD form exists. It must have coherent states, calculations, correction, history, drill-down, mobile behavior and ownership boundaries.

### Allowed scope

- deepen existing accounts, transactions, budgets, recurring, goals, reports, import/Inbox, rules, export, dashboard, onboarding, mobile and Auth/security;
- add reconciliation as an extension of the current account and ledger domain;
- add bounded data structures required to complete those workflows;
- add reminders/attention states tied to current recurring and planning data;
- add audit and performance protections required by those capabilities;
- update navigation and UI only where required to support the completed workflow.

### Prohibited scope without a new owner decision

- bank sync;
- AI financial advice or automatic financial decisions;
- OCR/receipt capture;
- household/shared finance;
- investment, crypto, credit-score or marketplace products;
- multi-currency accounting;
- native mobile rewrite;
- full envelope budgeting;
- local-first/CRDT architecture rewrite;
- broad redesign disconnected from an implementation workstream.

### Cross-cutting laws

- VND remains integer đồng.
- Transfers remain structural and neutral to income/expense.
- Financial state transitions require domain and database tests.
- User-owned data remains tenant-isolated through RLS.
- Corrections remain recoverable.
- Imported and automated facts remain reviewable and traceable.
- No balance is directly overwritten to hide a discrepancy.
- No expected recurring item is presented as an already-posted transaction.
- No dashboard recommendation may invent missing income or reserve assumptions.

## Implementation plan

## Track A — accounts, transactions and reconciliation

This track owns the shared financial state model. Its PRs are sequential unless the domain contract proves independent boundaries.

### A1 — reconciliation specification and invariant tests

Deliver:

- exact pending, cleared and reconciled semantics;
- account reconciliation session contract;
- statement date/balance and difference calculation;
- adjustment transaction contract;
- transfer, split, delete and restore behavior;
- lock/reopen behavior;
- acceptance tests written before schema changes;
- migration and rollback plan.

Acceptance:

- no unresolved state transition is left for UI code to invent;
- direct balance overwrite is prohibited;
- tenant isolation and audit expectations are explicit.

### A2 — reconciliation domain and database implementation

Deliver:

- required schema and constraints;
- RLS and least-privilege grants;
- atomic complete/reopen boundaries;
- pgTAP for calculations, tenant isolation and idempotency;
- migration replay and rollback evidence.

### A3 — reconciliation product workflow

Deliver:

- account selection and statement date/balance;
- pending/cleared transaction list;
- cleared, uncleared and difference totals;
- adjustment flow;
- complete, lock and reopen;
- mobile-safe empty/loading/error/retry states;
- warnings for reconciled-history edits.

### A4 — ledger-wide review and filtering

Deliver:

- general review state outside Inbox;
- account/category/type/date/amount filters;
- predictable filter reset and URL/state behavior;
- list-context edit and review completion;
- links to import provenance, recurring occurrence and reconciliation state;
- saved/recent filter behavior only if the current state model supports it cleanly.

### A5 — bounded bulk correction

Deliver:

- multi-select;
- safe bulk category, review-state and eligible type changes;
- preview and explicit confirmation;
- permission and reconciled-history guards;
- partial-failure prevention;
- audit metadata without sensitive notes.

### A6 — account lifecycle and register depth

Deliver:

- complete account register/history;
- explicit archive, hidden and report-inclusion semantics;
- account-level drill-down and export;
- controlled adjustments through financial transactions;
- behavior for current cash/bank/e-wallet/credit/savings representations.

## Track B — budgets, recurring and goals

These modules can advance in parallel after shared transaction-state dependencies are identified.

### B1 — budget periods and drill-down

Deliver:

- budget-period history;
- previous-period comparison;
- copy previous month;
- explicit rollover/no-rollover policy;
- remaining/overspent/no-data states;
- category-to-transaction drill-down;
- edit/delete/archive regressions.

### B2 — recurring occurrence model

Deliver:

- occurrence states: upcoming, due, overdue, paid, skipped and cancelled;
- edit one occurrence versus future schedule;
- occurrence history;
- duplicate prevention;
- recurring income and commitment consistency;
- no conversion of expected items into posted facts without user action.

### B3 — recurring transaction matching and attention

Deliver:

- match an observed transaction to an occurrence;
- confidence/review when matching is uncertain;
- calendar/timeline;
- reminders and dashboard attention states;
- monthly expected commitments/income view clearly separated from posted totals.

### B4 — goals contribution and lifecycle

Deliver:

- contribution history;
- target date and required pace;
- explicit funding/source semantics;
- pause, complete, reopen and archive;
- drill-down to contributions;
- dashboard/report integration;
- correction behavior when contributing records change.

## Track C — reports, export and performance

### C1 — custom periods and comparison

Deliver:

- custom date range;
- previous comparable period;
- income, expense, net and balance trends;
- consistent period labels and transfer exclusions;
- safe handling of empty/partial periods.

### C2 — report drill-down

Deliver:

- click from summary/chart into exact transactions;
- account, category and transaction-type dimensions;
- filters shared with the transaction register;
- back-navigation that preserves report context;
- large-VND and long-label resilience.

### C3 — export and portability depth

Deliver:

- export current filters/date/account;
- stable documented column/schema version;
- complete export coverage for user-owned core and planning data where appropriate;
- export-before-delete flow;
- documented restore/import path;
- spreadsheet-open and Vietnamese-text verification.

### C4 — realistic performance acceptance

Deliver:

- benchmark transaction register, dashboard, budgets and reports at realistic row counts;
- query plans for affected hot paths;
- cache only after measurement;
- invalidation tests for historical edits/deletes/restores;
- responsive loading/error states.

## Track D — import, Inbox and rules

### D1 — import mapping and batch history

Deliver:

- reusable mapping presets;
- batch history and status;
- retry/resume without duplicate commit;
- source/parser/mapping visibility;
- clear failure and recovery states.

### D2 — bulk Inbox review and duplicate resolution

Deliver:

- multi-select candidate correction;
- explain duplicate/match reason and confidence;
- explicit create/update/skip/transfer actions;
- atomic approval boundaries;
- shared review vocabulary with the transaction register.

### D3 — authenticated persistent rules

Deliver:

- per-user storage with RLS;
- priority, stage and enabled state;
- deterministic conditions/actions;
- preview before approval;
- version and audit metadata;
- original imported fields preserved;
- no low-confidence auto-posting.

### D4 — rule management experience

Deliver:

- create/edit/disable/reorder;
- conflict explanation;
- test a rule against sample candidates;
- impact preview;
- rollback or disable path;
- rule-use history without sensitive content leakage.

## Track E — onboarding, mobile, dashboard and public readiness

### E1 — onboarding and quick-capture completion

Deliver:

- account → first transaction → first insight continuity;
- remembered safe defaults;
- keyboard-safe mobile entry;
- clear validation/network retry;
- routine capture path measured against the current under-ten-second goal;
- no hidden assumptions or guessed values.

### E2 — physical mobile and accessibility remediation

Deliver:

- physical Android acceptance;
- touch targets;
- icon names and keyboard access;
- sheets/dialogs with virtual keyboard;
- large VND and long Vietnamese labels;
- dark mode and narrow viewport states;
- PWA/navigation stability where already supported.

### E3 — exception-oriented dashboard

Deliver:

- direct drill-down from balance, budget, recurring and goal states;
- actionable exceptions based on recorded facts;
- no duplicate summaries that belong in reports;
- no safe-to-spend/free-to-spend claim without a separate approved planning contract.

### E4 — provider and production Auth controls

Deliver under explicit owner permission:

- provider password-policy parity;
- trusted origins/callbacks;
- email confirmation and recovery acceptance;
- deployed CAPTCHA token verification before enforcement;
- Auth rate-limit and enumeration review;
- breached-password control when supported;
- conservative route/method edge controls;
- before/after, smoke and rollback evidence stored privately where sensitive.

## Delivery waves

### Wave 1 — close the largest visible gaps

Start these focused packets/PRs:

1. A1 reconciliation specification and tests;
2. A4 ledger-wide review and filters;
3. B1 budget periods and drill-down;
4. C1 custom report periods and comparison;
5. E1 onboarding/quick-capture completion;
6. E4 provider controls only after explicit permission.

These may proceed in parallel except where they touch the same transaction-state contract.

### Wave 2 — connect planning to actual transactions

1. A2/A3 reconciliation implementation;
2. B2/B3 recurring occurrences and matching;
3. B4 goal contribution history;
4. C2 report drill-down;
5. E2 physical mobile remediation.

### Wave 3 — efficiency and ownership

1. A5 bulk correction and A6 account lifecycle;
2. C3 export/portability;
3. D1/D2 import workflow completion;
4. E3 dashboard attention states;
5. C4 performance acceptance.

### Wave 4 — deterministic automation

1. D3 persistent authenticated rules;
2. D4 rule management;
3. integration across recurring, review, reports and export;
4. supervised beta acceptance and roadmap recalibration.

## Planning and branch rules

Each numbered item becomes its own issue or feature packet before code changes.

- Class 3 financial/data/security items use a full packet.
- Bounded UI/domain items use a concise PR plan when the risk policy allows.
- Do not combine multiple tracks into a single giant PR.
- Do not merge a downstream PR before its shared domain contract is accepted.
- Every PR states which competitor pattern it learns from and what it deliberately does not copy.
- Every PR updates the capability matrix when its status changes.

## Tasks

### Roadmap setup

- [x] Record the owner decision replacing validation-first sequencing.
- [x] Create the competitive capability gap matrix.
- [x] Define tracks, waves, dependencies and non-goals.
- [ ] Reconcile PR #215 title/body with the new direction.
- [ ] Pass exact-head documentation checks.
- [ ] Merge the roadmap after owner review.

### Wave 1 execution backlog

- [ ] Create A1 reconciliation specification issue/packet.
- [ ] Create A4 transaction review/filter issue.
- [ ] Create B1 budget periods/drill-down issue.
- [ ] Create C1 report custom-period/compare issue.
- [ ] Create E1 onboarding/quick-capture issue.
- [ ] Link issue #174 as E4 and preserve provider-write permission boundary.

### Acceptance management

- [ ] Define a shared capability status vocabulary: basic, functional, competitive, accepted.
- [ ] Update the gap matrix after every merged feature PR.
- [ ] Run physical mobile and production evidence inside affected workstreams.
- [ ] Reassess priority after each wave without adding unrelated categories.

## Evaluation

The roadmap is acceptable when:

- it upgrades current modules rather than building unrelated products;
- reconciliation remains the highest financial-trust gap but does not block unrelated feature-depth work;
- planning/report/import/mobile work can proceed in parallel through focused PRs;
- validation exists inside each workstream rather than as a global freeze;
- no bank sync, AI, OCR, household, investment, multi-currency or native-app scope is implied;
- every high-risk change has tests, rollback and production evidence;
- the gap matrix is maintained as merged capability status changes.

## Handoff record

### Current permission boundary

Allowed now:

- planning and issue creation;
- documentation changes on the focused branch;
- CI inspection;
- implementation research.

Not allowed by this plan alone:

- direct `main` writes;
- provider or production writes;
- merging implementation PRs without explicit instruction;
- adopting dependencies/services;
- expanding into prohibited product categories.

| Time | From | To | State | Evidence |
|---|---|---|---|---|
| 2026-08-02 | validation-first planner | owner | superseded | Owner rejected a development freeze and requested competitive maturation |
| 2026-08-02 | owner | capability planner | planned | Gap matrix and parallel maturation tracks defined |
