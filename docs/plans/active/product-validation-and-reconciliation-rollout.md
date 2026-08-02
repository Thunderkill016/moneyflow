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

This plan starts from the product and competitive memory merged through PR #214.

Current product truth:

- MoneyFlow is a Vietnamese manual-first personal ledger, not a bank aggregator, AI adviser or accounting ERP.
- The technical foundation is strong enough for controlled owner use and a small supervised pilot.
- The largest uncertainty is not feature coverage; it is whether the daily capture, correction, mobile and trust loops work repeatedly in real life.
- Account reconciliation is the next major product capability because MoneyFlow can calculate balances but cannot yet prove them against an external statement or known cash balance.
- Provider-side Auth and edge controls remain incomplete before broad public beta.
- Market demand, retention and willingness to pay remain unproven.

Relevant current sources:

- `docs/research/PRODUCT_COMPETITIVE_MEMORY.md`;
- `docs/MVP_DEFINITION.md`;
- `docs/product/PRINCIPLES.md`;
- `ARCHITECTURE.md`;
- issue #53 — financial correctness and reconciliation roadmap;
- issue #72 — cross-device route/state audit;
- issue #172 — real product assessment and validation gaps;
- issue #174 — provider controls before public beta.

Existing implementation strengths that must not be rewritten:

- integer VND and safe-integer boundaries;
- `financial_transactions` plus `transaction_entries`;
- structural balanced transfers excluded from income and expense;
- RLS and tenant-isolation tests;
- narrow RPC write surfaces and idempotency;
- soft delete and recovery;
- controlled import, provenance, duplicate planning and atomic Inbox approval;
- CSV export and spreadsheet-safety checks;
- modular monolith deployment model;
- layered static, database, browser and security verification.

## Research

### Decision question

What is the smallest staged rollout that can prove MoneyFlow is a trustworthy daily ledger, remove observed P0/P1 blockers, implement account reconciliation safely and reach a supervised external pilot without expanding into competitor-parity features?

### Source-derived constraints

The merged product memory requires this sequence:

1. prove the current daily ledger through seven-day owner use and physical-phone evidence;
2. fix observed P0/P1 failures;
3. implement account reconciliation as the next trust-building vertical slice;
4. complete provider-side public-beta controls;
5. improve review and deterministic automation only after real-use evidence;
6. validate retention and willingness to pay before pricing or broad market claims.

The MVP contract adds these acceptance boundaries:

- routine capture should have a path under ten seconds;
- transfers must never enter expense totals;
- export must be discoverable and usable;
- no P0 money bug may remain;
- Inbox/import/rules stay under advanced scope;
- feature work cannot override money correctness, daily UX or export.

Issue evidence adds these operational constraints:

- emulated browser coverage is not proof of physical-device readiness;
- user testing must include long Vietnamese labels, large VND values, validation errors and dialog/form states;
- daily-use evidence must record time to first transaction, repeated capture friction, errors, abandonment and balance confidence;
- provider changes must be exported first, applied one at a time, verified in production and immediately reversible;
- reconciliation is separate from import and must use explicit pending, cleared and reconciled states.

### Adoption review

No dependency, external service, new architecture or third-party code is approved by this plan.

Potential later adoption decisions must be handled in their own work packets:

- analytics or telemetry provider;
- error monitoring provider;
- CAPTCHA or edge-control changes;
- new database extension;
- background processing system;
- native application shell;
- bank-data provider.

This rollout deliberately avoids all of them unless an observed blocker creates a separate justified decision.

## Specification

### Outcome

At the end of this rollout, MoneyFlow should have evidence for one of two honest outcomes:

1. **Proceed:** the daily ledger is reliable, reconciliation works, provider controls are verified and a small external group can use the core product without live guidance.
2. **Pause or narrow:** daily use or user testing reveals a trust, usability or positioning problem large enough that reconciliation or public expansion should stop.

The rollout must not manufacture a “launch” outcome merely because tests pass.

### Product scope allowed

Allowed during this rollout:

- instrumentation and evidence capture that does not expose sensitive financial text;
- P0/P1 fixes discovered through owner use or pilot use;
- physical-phone and production Auth/recovery fixes;
- CSV export correctness and discoverability fixes;
- account reconciliation vertical slice;
- provider-side security controls under explicit permission;
- small supervised pilot support;
- documentation and issue-state reconciliation.

Not allowed without a new product specification:

- bank sync;
- AI advice, AI categorization as product identity or automatic financial decisions;
- OCR or receipt capture;
- family/shared finance;
- investments, crypto or net-worth expansion;
- multi-currency accounting;
- native mobile rewrite;
- full envelope budgeting;
- broad dashboard redesign;
- tags, loans, mortgages or utility parity work;
- authenticated rule engine before reconciliation and provenance acceptance.

### Severity model

| Severity | Definition | Required response |
|---|---|---|
| P0 | Data loss, cross-user exposure, wrong balance, transfer counted as income/expense, duplicate financial commit, account lockout or unrecoverable corruption | Stop rollout immediately; isolate, reproduce, fix and verify before further use |
| P1 | Core daily task cannot be completed reliably, physical mobile flow is blocked, export is unusable, recovery fails or reconciliation can produce a false trusted state | Fix before the current phase can exit |
| P2 | Noticeable friction with a safe workaround, inconsistent hierarchy, avoidable extra steps or non-critical layout defects | Record and batch by root cause; do not interrupt the phase unless repeated evidence shows material abandonment |
| P3 | Polish, preference or speculative improvement | Backlog only |

### Evidence handling

Every finding must record:

- date and environment;
- route and product state;
- device, browser and viewport;
- exact user goal;
- expected and actual result;
- severity and financial risk;
- reproduction steps;
- screenshot or test artifact when safe;
- issue or PR reference;
- retest result.

Do not store real account numbers, private notes, provider identifiers, exact defensive thresholds or authentication secrets in public Git history.

## Implementation plan

## Phase 0 — establish the execution board

**Target:** 2026-08-03

Create or reconcile one execution issue for each workstream:

1. owner daily-ledger trial;
2. physical-phone and Auth/recovery acceptance;
3. P0/P1 remediation queue;
4. reconciliation specification and implementation;
5. provider controls and production verification;
6. supervised external pilot;
7. rollout decision and market-learning report.

Rules:

- one issue represents one outcome, not a miscellaneous checklist;
- defects discovered during use get separate issues when they require code;
- each code issue links back to this plan and the evidence that created it;
- unrelated cleanup remains outside this rollout;
- no reconciliation implementation PR starts before Phase 1 exit unless the owner explicitly overrides the gate and records the reason.

### Exit gate

- execution issues exist or current issues are explicitly mapped;
- one owner is named for every workstream;
- the production account and physical Android device are ready;
- a private place exists for sensitive provider evidence;
- the current `main` build and production Auth path are known before trial data begins.

## Phase 1 — seven-day owner trust trial

**Target window:** 2026-08-04 through 2026-08-10

### Daily use target

Record at least 50–100 real transactions across:

- cash;
- bank or e-wallet;
- income;
- routine expense;
- one internal transfer scenario;
- one edit;
- one delete and restore;
- one recurring commitment interaction;
- one budget review;
- one report review;
- one CSV export and spreadsheet open.

### Physical-device scenarios

Run on the actual Android device:

- registration or login;
- logout and login again;
- password recovery;
- first account creation;
- expense capture with virtual keyboard;
- income capture;
- transfer between two accounts;
- editing a transaction;
- deleting and restoring;
- narrow-screen search/filter use;
- export discovery and download;
- long Vietnamese labels;
- large VND values;
- validation and network-error recovery;
- dark mode on critical routes.

### Required measurements

Capture at minimum:

- time from landing/login to first valid transaction;
- median time for a routine expense after onboarding;
- number of abandoned or failed submissions;
- number of transactions entered late because capture was inconvenient;
- number and cause of edits;
- delete/restore success;
- transfer balance correctness;
- balance discrepancy against real sources;
- export success and Vietnamese-character integrity;
- subjective confidence in each account balance on a 1–5 scale;
- daily note: “Would I continue using this tomorrow without being forced?”

### Stop conditions

Pause the trial immediately for any P0.

Pause feature work but continue evidence capture for:

- repeated P1 capture failure;
- account balance divergence that cannot be explained;
- Auth or recovery lockout;
- export corruption;
- mobile form obstruction that blocks repeated entry.

### Exit gate

All must be true:

- seven consecutive days completed;
- at least 50 real transactions recorded;
- at least one transfer reconciles mathematically across both accounts;
- no unexplained balance difference remains;
- CSV opens safely in a common spreadsheet tool;
- no open P0;
- all P1 findings have owners and reproducible issues;
- median routine expense capture is measured, even if it misses the target;
- the owner can state whether the product earned daily trust and why.

## Phase 2 — P0/P1 remediation and repeat acceptance

**Target window:** 2026-08-11 through 2026-08-16

### Implementation rule

Each fix must be the smallest root-cause slice and include the gate matching its risk:

- financial/domain defect: tests first, database and browser evidence where affected;
- Auth/recovery defect: exact production flow verification;
- physical mobile defect: failing viewport regression plus physical-device retest;
- export defect: content and spreadsheet-open verification;
- UX friction without correctness impact: do not redesign unrelated surfaces.

### Retest pack

After all P0/P1 fixes:

1. rerun every failed scenario;
2. record five new routine transactions on the physical phone;
3. repeat one transfer, edit, delete/restore and export;
4. compare all account balances with known external balances;
5. run the risk-selected CI and affected production smoke.

### Exit gate

- zero open P0;
- zero open P1 in capture, correction, Auth/recovery, transfer, balance or export;
- the owner completes the core loop without live developer intervention;
- remaining P2 issues are deduplicated by root cause;
- a go/no-go note authorizes reconciliation specification.

## Phase 3 — account reconciliation specification

**Target window:** 2026-08-17 through 2026-08-19

This is a Class 3 financial/data change and requires a dedicated feature work packet before implementation.

### Required product contract

Define:

- account eligibility;
- meaning of pending, cleared and reconciled;
- statement date and statement balance;
- cleared, uncleared and difference calculations;
- session states: draft, completed/locked, reopened;
- behavior when a reconciled transaction is edited, deleted or restored;
- behavior for transfers and split expenses;
- adjustment transaction semantics;
- audit metadata;
- permissions and RLS;
- empty, error and recovery states;
- migration and rollback behavior.

### Required invariants

- reconciliation never directly overwrites an account balance;
- a completed session cannot claim success when the difference is non-zero unless an explicit adjustment transaction makes it zero;
- an adjustment is a financial transaction with provenance, not hidden metadata;
- transfer neutrality remains intact;
- one user's sessions and transaction states cannot be read or modified by another user;
- reopen and reconciled-history changes are explicit and auditable;
- soft delete and restore preserve a coherent reconciliation history;
- all VND values remain safe integers.

### Explicit non-scope

- bank sync;
- automatic statement import;
- fuzzy matching service;
- multi-currency reconciliation;
- accounting period close;
- AI discrepancy explanation;
- rule engine expansion.

### Exit gate

- owner approves the written contract;
- acceptance tests are listed before schema changes;
- migration, rollback and production-verification plans exist;
- unresolved behavior is not left for UI implementation to guess.

## Phase 4 — reconciliation implementation

**Target window:** begins after Phase 3 approval; estimated as four focused PRs, not one large branch

### PR R1 — domain and database contract

Deliver:

- transaction clearing-state model if current schema cannot express it safely;
- reconciliation-session model;
- RLS and least-privilege grants;
- RPC or transaction boundary for completing/reopening sessions;
- pgTAP tests for tenant isolation, calculations, lock/reopen and adjustment behavior;
- migration replay and rollback evidence.

No UI beyond temporary test harnesses.

### PR R2 — account register reconciliation workflow

Deliver:

- choose account and statement date;
- enter statement balance;
- view pending, cleared and reconciled transactions;
- toggle eligible transactions between pending and cleared;
- display cleared total, uncleared total and exact difference;
- clear empty, loading, error and retry states;
- physical-phone-safe interaction.

Do not allow completion yet unless the R1 completion contract is already proven.

### PR R3 — complete, lock, adjust and reopen

Deliver:

- zero-difference completion;
- explicit adjustment-transaction flow;
- locked/completed state;
- reopen warning and audit record;
- warning and recovery behavior for edits to reconciled history;
- delete/restore interaction tests;
- transfer and split-transaction regression tests.

### PR R4 — production acceptance and documentation

Deliver:

- full migration replay and pgTAP;
- browser smoke and responsive audit;
- production smoke with non-sensitive test data;
- account balance comparison before and after reconciliation;
- rollback drill or documented reversible path;
- update product memory, architecture map, MVP/readiness status and issue #53;
- no performance or trust claim without measured evidence.

### Reconciliation exit gate

- at least two account types complete reconciliation correctly;
- one mismatch is resolved through an explicit adjustment transaction;
- one completed session is reopened and audited safely;
- transfer and report totals remain unchanged by reconciliation state;
- tenant-isolation tests pass;
- physical-phone flow is usable;
- production verification succeeds;
- no P0/P1 reconciliation defect remains.

## Phase 5 — provider controls in parallel

**Owner permission required before every provider write.**

This work maps to issue #174 and may proceed in parallel with Phases 1–4 only when it does not disrupt the owner trial.

Sequence:

1. export or privately record current provider configuration;
2. verify trusted origins, callbacks and email-confirmation behavior;
3. align provider password policy;
4. verify deployed CAPTCHA token flow before enabling enforcement;
5. review Auth rate limits and enumeration behavior;
6. enable breached-password protection when supported;
7. add conservative route- and method-scoped edge controls;
8. smoke legitimate Auth, share and import flows after each change;
9. roll back immediately on regression;
10. keep exact thresholds, rule IDs, provider IDs and request IDs outside public Git.

### Exit gate

- every provider change has before/after evidence and rollback instructions;
- registration, login, recovery, email confirmation and legitimate public flows pass in production;
- malformed, oversized and repeated abusive requests are rejected before expensive processing where controls apply;
- issue #174 acceptance is complete;
- no public document exposes operational defense details.

## Phase 6 — supervised external pilot

**Target:** after Phases 2, 4 and provider acceptance are complete

Recruit five target users who currently use memory, notes, a bank app, Money Lover/MISA or a spreadsheet.

### Pilot protocol

- no live instruction during onboarding or core tasks;
- use a fresh account;
- ask users to create an account/wallet, record income and expense, make a transfer, correct a mistake, inspect the month and export data;
- let users stop when they naturally would;
- record questions and confusion without teaching the interface during the task;
- do not require users to enter sensitive real financial data;
- run for at least seven days when a participant agrees to continued use.

### Measures

- first-transaction completion rate;
- time to first transaction;
- core task success without guidance;
- D2 and D7 return;
- transactions per active day;
- number of corrections and abandoned submissions;
- balance-confidence score;
- export success;
- reconciliation completion where appropriate;
- reason for stopping;
- product replaced or used alongside;
- stated willingness to continue;
- willingness to pay as qualitative evidence only, not pricing proof.

### Exit gate

- all five participants complete or explicitly abandon the protocol;
- every abandonment reason is categorized;
- no unresolved P0/P1 remains;
- at least three users can complete the core loop without guidance, or the rollout is paused for product correction;
- retention and trust findings are written without inflating the sample.

## Phase 7 — rollout decision

Create a dated decision report with one of these outcomes:

### Outcome A — continue private beta

Use when the core loop works but retention, positioning or provider readiness needs more evidence.

### Outcome B — begin controlled public beta

Use only when:

- owner trial passed;
- reconciliation passed;
- provider controls passed;
- external pilot has no unresolved P0/P1;
- support, privacy, deletion and recovery paths are operational;
- the product can describe its value without unsupported claims.

### Outcome C — narrow or pause

Use when users do not repeat the daily loop, do not trust balances, cannot understand the model or consistently prefer an existing substitute.

Pausing is a valid successful research outcome.

## Delivery sequence and dependencies

| Workstream | Can start | Depends on | Blocks |
|---|---|---|---|
| Execution board | Immediately | PR #214 merged | All later tracking |
| Owner trust trial | After board and production baseline | Physical device, production account | Reconciliation implementation |
| P0/P1 remediation | As findings appear | Reproducible evidence | Phase 2 exit |
| Reconciliation specification | After owner-trial and remediation go/no-go | Phase 2 exit | Reconciliation implementation |
| Reconciliation implementation | After spec approval | Dedicated Class 3 packet | External pilot readiness |
| Provider controls | After explicit provider-write permission | Private evidence storage and rollback | Public beta |
| External pilot | After P0/P1, reconciliation and provider acceptance | Stable production | Rollout decision |
| Pricing/business model | After pilot evidence | Retention and switching evidence | Commercial claims |

## Task decomposition

### Planning and evidence

- [ ] Create/reconcile execution issues and owners.
- [ ] Prepare owner-trial evidence template.
- [ ] Prepare physical Android checklist.
- [ ] Prepare balance-comparison worksheet without storing secrets in Git.
- [ ] Prepare pilot script and consent/privacy boundaries.

### Owner validation

- [ ] Complete seven consecutive days.
- [ ] Record 50–100 real transactions.
- [ ] Complete transfer, correction, delete/restore and export scenarios.
- [ ] Record metrics and daily trust decision.
- [ ] Open reproducible P0/P1 issues.

### Remediation

- [ ] Fix all P0 issues.
- [ ] Fix all P1 issues in the core loop.
- [ ] Repeat physical-phone acceptance.
- [ ] Publish the reconciliation go/no-go note.

### Reconciliation

- [ ] Create dedicated Class 3 work packet.
- [ ] Approve product/domain contract.
- [ ] Deliver R1 database/domain contract.
- [ ] Deliver R2 register workflow.
- [ ] Deliver R3 complete/lock/adjust/reopen behavior.
- [ ] Deliver R4 production acceptance and documentation.

### Provider readiness

- [ ] Obtain explicit provider-write permission.
- [ ] Complete issue #174 sequentially with private evidence.
- [ ] Verify production Auth and edge behavior after every change.

### External validation

- [ ] Recruit five target users.
- [ ] Run unguided first-session tasks.
- [ ] Measure D2/D7 where participation permits.
- [ ] Record abandonment, trust and switching evidence.
- [ ] Publish rollout decision.

## Evaluation

### Plan-quality checks

Before merging this plan, confirm:

- the plan follows the product memory sequence instead of treating reconciliation as immediate feature work;
- each phase has an explicit entry and exit gate;
- P0/P1 definitions prioritize financial and access risk;
- physical-device evidence is not replaced by emulation;
- provider writes require separate explicit permission and private operational evidence;
- reconciliation is decomposed into focused financial/data PRs;
- external users are not required to expose sensitive financial information;
- pricing and public-launch claims remain blocked on retention evidence;
- no date is represented as a guaranteed delivery promise;
- the plan does not authorize deferred competitor-parity features.

### Required verification for this planning PR

- diff hygiene;
- project knowledge contract;
- CI classification contract;
- no database, runtime, browser or production verification unless the repository classifier selects it because another executable policy file changed.

### Rollout evaluation rule

Passing automated tests is necessary but insufficient. Each phase exits only with the human-use, physical-device, production or external-user evidence named in that phase.

## Risks and controls

| Risk | Control |
|---|---|
| Feature work starts before daily-use evidence | Reconciliation implementation is blocked by Phase 2 go/no-go |
| Owner trial becomes informal and unauditable | Use one evidence template and open reproducible issues |
| P2 polish consumes the rollout | P0/P1 severity gate and root-cause batching |
| Reconciliation corrupts balances | No direct balance overwrite; tests-first financial RPC/session contract |
| Reconciled history is silently changed | Lock/reopen warnings and audit metadata |
| Provider change breaks production | Export current state, one reversible change at a time, immediate smoke and rollback |
| Public Git leaks defensive details | Store rule IDs, thresholds and request IDs privately |
| Pilot users expose private finances | Synthetic or minimally sensitive data is acceptable; no real data requirement |
| Five users are treated as market proof | Report results as directional qualitative evidence only |
| Schedule pressure creates a fake launch | Outcome C explicitly permits pause or narrowing |

## Handoff record

### Current permission boundary

Allowed now:

- repository and issue research;
- planning document changes on the focused branch;
- planning PR creation and CI inspection.

Not allowed by this plan alone:

- implementation commits;
- direct `main` writes;
- provider or production writes;
- production data mutation;
- merging later implementation PRs without explicit instruction;
- adoption of dependencies or services.

| Time | From | To | State | Evidence |
|---|---|---|---|---|
| 2026-08-02 | owner | planner | planned | Requested merge of PR #214 and an implementation rollout plan |
| 2026-08-02 | planner | owner review | planned | Staged validation, reconciliation, provider and pilot plan written on focused branch |
