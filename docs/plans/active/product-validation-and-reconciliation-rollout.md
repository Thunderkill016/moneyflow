# Product validation and reconciliation rollout

- **Execution state:** planned
- **Active role:** planner / product evaluator
- **Permission scope:** branch_write + repository_read
- **Owner:** Thunderkill016
- **Branch:** `plan/product-validation-rollout`
- **Base:** `main@f57b92ec471e816f96fa13dd464a7a98297bb2d4`
- **Plan date:** 2026-08-02
- **Target start:** 2026-08-03

## Repository reconnaissance

This plan begins after PR #214 merged the durable product competitive memory.

Current truth:

- MoneyFlow is a Vietnamese manual-first personal ledger.
- The financial and engineering foundation is strong enough for controlled owner use.
- Daily-use reliability, physical-phone usability, balance trust, provider readiness, retention and willingness to pay remain unproven.
- Account reconciliation is the next major capability, but implementation must follow real-use evidence and P0/P1 remediation.
- Provider-side Auth and edge controls remain required before broad public beta.

Primary repository sources:

- `docs/research/PRODUCT_COMPETITIVE_MEMORY.md`;
- `docs/MVP_DEFINITION.md`;
- `docs/product/PRINCIPLES.md`;
- `ARCHITECTURE.md`;
- issue #53 — correctness and reconciliation roadmap;
- issue #72 — cross-device route/state audit;
- issue #172 — product validation gaps;
- issue #174 — provider controls before public beta.

Existing behavior that must not be rewritten:

- integer VND and safe-integer boundaries;
- structural balanced transfers excluded from income and expense;
- RLS and tenant-isolation tests;
- narrow idempotent financial write surfaces;
- soft delete and recovery;
- controlled import, provenance and duplicate planning;
- CSV export safety;
- modular-monolith architecture;
- layered static, database, browser and security verification.

## Research

### Decision question

What is the smallest staged rollout that can prove MoneyFlow is a trustworthy daily ledger, remove observed P0/P1 blockers, implement reconciliation safely and reach a supervised external pilot without expanding into competitor-parity work?

### Evidence-derived sequence

The merged product memory requires this order:

1. seven-day owner use and physical-phone evidence;
2. P0/P1 remediation;
3. account-reconciliation specification and implementation;
4. provider-side public-beta controls;
5. supervised external pilot;
6. retention and willingness-to-pay evaluation.

The MVP contract adds these boundaries:

- routine capture should have a path under ten seconds;
- transfers must never enter expense totals;
- export must be discoverable and usable;
- no P0 money bug may remain;
- Inbox/import/rules remain advanced scope;
- correctness, daily UX and export outrank feature expansion.

Issue evidence adds:

- emulation does not prove physical-device readiness;
- real-use evidence must record task time, errors, abandonment and balance confidence;
- reconciliation is separate from import and needs pending, cleared and reconciled states;
- provider changes must be reversible, sequential and verified in production;
- private provider identifiers and defensive thresholds must not enter public Git.

### Adoption review

This plan authorizes no dependency, external service, new architecture or third-party code.

Separate approval is required for:

- analytics or monitoring providers;
- CAPTCHA or edge-control writes;
- database extensions;
- background processing;
- native application shells;
- bank-data providers.

## Specification

### Target outcome

The rollout must produce one honest decision:

- **Proceed:** daily use is reliable, reconciliation works, provider controls are verified and a small external group can use the core flow without live guidance.
- **Pause or narrow:** evidence reveals a trust, usability or positioning problem large enough to stop expansion.

Automated tests alone cannot produce a launch decision.

### Allowed scope

- evidence capture that excludes sensitive financial text;
- P0/P1 fixes discovered through real use;
- physical-phone and Auth/recovery fixes;
- export correctness and discoverability fixes;
- account reconciliation;
- provider controls under explicit write permission;
- supervised pilot support;
- documentation and issue-state reconciliation.

### Prohibited scope without a new specification

- bank sync;
- AI financial advice or automatic financial decisions;
- OCR;
- family/shared finance;
- investments, crypto or net-worth expansion;
- multi-currency accounting;
- native mobile rewrite;
- full envelope budgeting;
- broad dashboard redesign;
- tags, loans, mortgages or utility parity;
- authenticated rule-engine expansion before reconciliation acceptance.

### Severity model

| Severity | Definition | Response |
|---|---|---|
| P0 | Data loss, cross-user exposure, wrong balance, transfer miscount, duplicate commit, account lockout or unrecoverable corruption | Stop rollout; isolate, fix and verify |
| P1 | Core daily task blocked, physical mobile flow blocked, export unusable, recovery fails or reconciliation can claim false trust | Fix before phase exit |
| P2 | Material friction with a safe workaround | Record and batch by root cause |
| P3 | Polish, preference or speculation | Backlog only |

### Evidence record

Each finding must include:

- date and environment;
- route and state;
- device/browser/viewport;
- user goal;
- expected and actual behavior;
- severity and financial risk;
- reproduction steps;
- safe artifact when useful;
- issue/PR reference;
- retest result.

Never store real account numbers, private notes, provider IDs, exact defensive thresholds or secrets in public Git.

## Implementation plan

### Phase 0 — execution board

**Target:** 2026-08-03

Create or reconcile workstreams for:

1. owner daily-ledger trial;
2. physical-phone and Auth/recovery acceptance;
3. P0/P1 remediation;
4. reconciliation specification and implementation;
5. provider controls;
6. supervised external pilot;
7. final rollout decision.

Exit gate:

- each workstream has one owner;
- production baseline and physical Android device are ready;
- a private location exists for sensitive provider evidence;
- no reconciliation implementation starts before the Phase 2 go/no-go unless the owner records an explicit override.

### Phase 1 — seven-day owner trust trial

**Target window:** 2026-08-04 through 2026-08-10

Record 50–100 real transactions covering:

- cash and bank/e-wallet accounts;
- income and routine expenses;
- at least one internal transfer;
- edit, delete and restore;
- recurring commitment and budget review;
- report review;
- CSV export and spreadsheet open.

Run on the physical Android device:

- registration/login/logout/recovery;
- account creation;
- expense and income capture with virtual keyboard;
- transfer;
- edit/delete/restore;
- narrow-screen search/filter;
- export;
- long Vietnamese labels;
- large VND values;
- validation/network recovery;
- dark mode on critical routes.

Measure:

- time to first transaction;
- median routine-expense capture time;
- failed or abandoned submissions;
- transactions entered late due to friction;
- corrections and their causes;
- transfer correctness;
- balance discrepancies;
- export success and Vietnamese text integrity;
- confidence in each account balance on a 1–5 scale;
- daily willingness to continue using the product.

Stop immediately for any P0. Pause feature work for repeated P1 failure, unexplained balance divergence, Auth lockout, export corruption or mobile-form obstruction.

Exit gate:

- seven consecutive days completed;
- at least 50 transactions recorded;
- at least one transfer matches both accounts;
- no unexplained balance difference remains;
- CSV opens safely;
- no open P0;
- all P1 findings have reproducible issues and owners;
- the owner records whether MoneyFlow earned daily trust and why.

### Phase 2 — P0/P1 remediation and retest

**Target window:** 2026-08-11 through 2026-08-16

Implementation rules:

- financial defects: tests first plus database/browser evidence where affected;
- Auth/recovery defects: exact production verification;
- physical-mobile defects: viewport regression plus physical-device retest;
- export defects: content and spreadsheet-open verification;
- no unrelated redesign or cleanup.

Retest:

1. rerun every failed scenario;
2. create five new routine transactions on the phone;
3. repeat transfer, edit, delete/restore and export;
4. compare all balances with known external balances;
5. run risk-selected CI and affected production smoke.

Exit gate:

- zero open P0;
- zero open P1 in capture, correction, Auth/recovery, transfer, balance or export;
- the owner completes the core loop without developer intervention;
- remaining P2 issues are deduplicated by root cause;
- a written go/no-go authorizes reconciliation specification.

### Phase 3 — reconciliation specification

**Target window:** 2026-08-17 through 2026-08-19

Create a dedicated Class 3 feature packet defining:

- account eligibility;
- pending, cleared and reconciled semantics;
- statement date and balance;
- cleared, uncleared and difference calculations;
- draft, completed/locked and reopened sessions;
- behavior for edits, deletes, restores, transfers and splits;
- explicit adjustment transactions;
- audit metadata;
- RLS and permissions;
- migration and rollback;
- empty, loading, error and recovery states.

Required invariants:

- never overwrite account balance directly;
- non-zero difference cannot be declared complete unless an explicit adjustment makes it zero;
- adjustments are financial transactions with provenance;
- transfer neutrality remains intact;
- sessions and states are tenant-isolated;
- reopen and historical changes are explicit and auditable;
- soft delete/restore preserves coherent history;
- all amounts remain safe integer VND.

Non-scope:

- bank sync;
- statement-import automation;
- fuzzy matching service;
- multi-currency reconciliation;
- accounting period close;
- AI discrepancy explanations;
- rule-engine expansion.

Exit gate:

- owner approves the contract;
- acceptance tests exist before schema changes;
- migration, rollback and production verification are specified;
- unresolved behavior is not delegated to UI guesswork.

### Phase 4 — reconciliation implementation

Deliver through four focused PRs:

#### R1 — domain and database contract

- reconciliation session and clearing-state model;
- RLS and least-privilege grants;
- complete/reopen transaction boundary;
- pgTAP for calculations, tenant isolation, lock/reopen and adjustment behavior;
- migration replay and rollback evidence.

#### R2 — account reconciliation workflow

- select account and statement date;
- enter statement balance;
- view/toggle pending and cleared transactions;
- show cleared, uncleared and exact difference;
- mobile-safe empty/loading/error/retry states.

#### R3 — complete, lock, adjust and reopen

- zero-difference completion;
- adjustment-transaction flow;
- locked state;
- reopen warning and audit record;
- edit/delete/restore behavior for reconciled history;
- transfer and split regressions.

#### R4 — production acceptance

- migration replay and pgTAP;
- browser smoke and responsive audit;
- production smoke with non-sensitive test data;
- balance comparison before/after reconciliation;
- documented rollback;
- update product memory, architecture, MVP/readiness and issue #53.

Exit gate:

- two account types reconcile correctly;
- one mismatch is resolved through an explicit adjustment;
- one completed session reopens safely with audit evidence;
- transfer/report totals remain unchanged;
- tenant isolation passes;
- physical-phone flow passes;
- production verification passes;
- no open P0/P1 reconciliation defect remains.

### Phase 5 — provider controls in parallel

Every provider write requires explicit owner permission.

Sequence:

1. export or privately record current configuration;
2. verify trusted origins, callbacks and email confirmation;
3. align password policy;
4. verify deployed CAPTCHA tokens before enforcement;
5. review Auth rate limits and enumeration behavior;
6. enable breached-password protection when supported;
7. add conservative route/method-scoped edge controls;
8. smoke legitimate Auth, share and import flows after each change;
9. roll back immediately on regression;
10. keep IDs, thresholds and request evidence outside public Git.

Exit gate:

- every change has before/after and rollback evidence;
- registration, login, recovery and email confirmation pass in production;
- legitimate public flows still work;
- issue #174 is complete;
- no operational defense details are exposed publicly.

### Phase 6 — supervised external pilot

Start after Phases 2, 4 and provider acceptance.

Recruit five target users who currently rely on memory, notes, a bank app, Money Lover/MISA or spreadsheets.

Protocol:

- no live instruction during core tasks;
- fresh accounts;
- create wallet, record income/expense, transfer, correct, inspect month and export;
- users may use synthetic or minimally sensitive data;
- record confusion without teaching during the task;
- run for seven days where participants agree.

Measure:

- first-transaction completion and time;
- unguided core-task success;
- D2/D7 return;
- transactions per active day;
- corrections and abandonment;
- balance confidence;
- export and reconciliation completion;
- reason for stopping;
- substitute replaced or used alongside;
- qualitative willingness to continue/pay.

Exit gate:

- all five complete or explicitly abandon;
- abandonment reasons are categorized;
- no unresolved P0/P1;
- at least three complete the core loop without guidance, otherwise pause for correction;
- results are reported as directional evidence, not market proof.

### Phase 7 — rollout decision

Choose one dated outcome:

- **Continue private beta:** core works but more retention, positioning or provider evidence is needed.
- **Controlled public beta:** owner trial, reconciliation, provider controls and pilot all pass with no P0/P1.
- **Pause or narrow:** users do not repeat the loop, trust balances or prefer MoneyFlow over existing substitutes.

Pausing is a valid successful research outcome.

## Tasks

### Planning and evidence

- [ ] Create/reconcile execution issues and owners.
- [ ] Prepare owner-trial evidence template.
- [ ] Prepare physical Android checklist.
- [ ] Prepare a private balance-comparison worksheet.
- [ ] Prepare pilot script and privacy boundaries.

### Owner validation

- [ ] Complete seven consecutive days.
- [ ] Record 50–100 transactions.
- [ ] Complete transfer, correction, delete/restore and export scenarios.
- [ ] Record metrics and daily trust decision.
- [ ] Open reproducible P0/P1 issues.

### Remediation

- [ ] Fix all P0.
- [ ] Fix all core-loop P1.
- [ ] Repeat physical-phone acceptance.
- [ ] Publish reconciliation go/no-go.

### Reconciliation

- [ ] Create dedicated Class 3 packet.
- [ ] Approve product/domain contract.
- [ ] Deliver R1 database/domain contract.
- [ ] Deliver R2 workflow.
- [ ] Deliver R3 complete/lock/adjust/reopen behavior.
- [ ] Deliver R4 production acceptance and docs.

### Provider readiness

- [ ] Obtain provider-write permission.
- [ ] Complete issue #174 sequentially with private evidence.
- [ ] Verify production after every change.

### External validation

- [ ] Recruit five users.
- [ ] Run unguided tasks.
- [ ] Measure D2/D7 where participation permits.
- [ ] Record abandonment, trust and switching evidence.
- [ ] Publish rollout decision.

## Evaluation

Before merging this plan, confirm:

- the sequence follows product memory;
- reconciliation cannot start before daily-use/P0/P1 gates;
- every phase has an explicit exit gate;
- physical evidence cannot be replaced by emulation;
- provider writes remain separately authorized and privately evidenced;
- reconciliation is tests-first and does not overwrite balances;
- users are not required to expose real sensitive financial data;
- five-user findings cannot be overstated;
- dates are targets, not promises;
- deferred competitor-parity work remains prohibited.

Verification for this planning PR:

- diff hygiene;
- project knowledge contract;
- CI classification contract;
- no database, runtime, browser or production verification unless selected by repository policy.

Passing automated checks is necessary but insufficient. Each rollout phase exits only with the human-use, physical-device, production or external-user evidence named above.

## Risks and controls

| Risk | Control |
|---|---|
| Feature work starts too early | Reconciliation blocked by Phase 2 go/no-go |
| Owner trial becomes anecdotal | Standard evidence record and reproducible issues |
| P2 polish consumes rollout | P0/P1 gate and root-cause batching |
| Reconciliation corrupts balances | No direct overwrite; tests-first financial boundary |
| Reconciled history changes silently | Lock/reopen warnings and audit metadata |
| Provider change breaks production | One reversible change, smoke and rollback |
| Public Git leaks defenses | Private IDs, thresholds and request evidence |
| Pilot exposes private finances | Synthetic/minimally sensitive data allowed |
| Five users become fake market proof | Directional reporting only |
| Schedule pressure creates fake launch | Pause/narrow is an accepted outcome |

## Handoff record

### Current permission boundary

Allowed:

- repository and issue research;
- planning-document changes on this branch;
- planning PR and CI inspection.

Not allowed by this plan alone:

- implementation commits;
- direct `main` writes;
- provider or production writes;
- production data mutation;
- dependency/service adoption;
- merging later implementation PRs without explicit instruction.

| Time | From | To | State | Evidence |
|---|---|---|---|---|
| 2026-08-02 | owner | planner | planned | Requested PR #214 merge and implementation rollout plan |
| 2026-08-02 | planner | owner review | planned | Gated validation, reconciliation, provider and pilot plan created in PR #215 |
