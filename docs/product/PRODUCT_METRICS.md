# MoneyFlow product metrics and stage gates

- **Status:** strategic measurement authority once merged; candidate evidence while this PR is open
- **Product law:** [`PRINCIPLES.md`](./PRINCIPLES.md)
- **Product strategy:** [`PRODUCT_STRATEGY.md`](./PRODUCT_STRATEGY.md)
- **Ecosystem strategy:** [`ECOSYSTEM_STRATEGY.md`](./ECOSYSTEM_STRATEGY.md)
- **Scope:** defines what MoneyFlow should measure and what evidence is needed before expanding strategic scope. It does not create hidden release gates or authorize a feature by itself.

## 1. Measurement philosophy

MoneyFlow should measure whether it improves the user's financial reality and agency, not whether it maximizes app activity.

A good MoneyFlow may require **less** user interaction over time because acquisition, matching, reconciliation and automation reduce maintenance.

Therefore:

- DAU is a diagnostic, not a north star;
- feature count is not progress;
- provider count is not progress;
- imported transaction volume is not progress;
- AI action count is not progress;
- time in app is not inherently good.

Metrics must be tied to an explicit user outcome, trust contract or stage gate.

## 2. Metric hierarchy

MoneyFlow uses four metric layers.

### Layer A — Financial trust

Does the product maintain a correct and explainable representation of what is known?

### Layer B — Maintenance efficiency

How much work does the user have to perform to keep that representation trustworthy?

### Layer C — Resilience and progress

Does the product help the user understand obligations, buffers and movement toward explicit goals without making unsupported claims?

### Layer D — Agency and choice

Does the product help the user compare alternatives and make deliberate choices while preserving ownership and uncertainty?

Higher-layer metrics must not hide regressions in lower layers.

## 3. North-star metric system

The existing primary operational concept remains valuable:

> **Trusted financial periods maintained with decreasing maintenance effort.**

This is not a single vanity number. It is a system with two requirements:

1. the period is trustworthy enough under an explicit coverage/reconciliation contract;
2. the effort required to maintain that state decreases or stays acceptably low.

MoneyFlow should not declare success by reducing effort if trust worsens, or by increasing trust through unsustainably high manual work.

## 4. Core trust metrics

### 4.1 Time to first trustworthy period

**Question:** How long does it take a new user to reach a financial period they can reasonably rely on?

Possible measurement components:

- time from onboarding to sufficient account setup;
- time to first reviewed/imported period;
- unresolved candidate/duplicate count;
- reconciliation state;
- explicit coverage gaps.

Do not reduce this metric by silently lowering the trust definition.

### 4.2 Reconciliation completion/confidence

Measure whether represented balances and records have been checked under the relevant product contract.

A “reconciled” label must have explicit semantics. Do not infer reconciliation from absence of user complaints.

### 4.3 Unresolved rate

Possible numerator:

- unresolved source candidates;
- suspected duplicates;
- uncertain transfer matches;
- review-required posted records;
- known source gaps.

Denominator and category must be explicit; do not combine unlike states into one opaque score.

### 4.4 Correction rate

Track how often users need to correct:

- amount;
- account;
- transaction type;
- category/merchant where material;
- duplicate/match decisions;
- automation results.

Correction is not inherently bad. A high correction rate may indicate poor acquisition quality; a low rate may also reflect an inaccessible correction path. Interpret with workflow evidence.

### 4.5 Export/restore success

Data ownership is part of the trust contract.

Measure:

- successful export completion;
- backup completeness;
- restore validation where supported;
- failure/recovery rate;
- format/version compatibility.

## 5. Maintenance-efficiency metrics

### 5.1 Manual interventions per 100 observed transactions

This is a primary acquisition/automation efficiency metric.

An intervention may include:

- manual creation;
- manual categorization when required;
- duplicate resolution;
- transfer confirmation;
- correction after import/automation;
- source mapping repair.

Define the intervention taxonomy before comparing cohorts.

### 5.2 Maintenance minutes per active user per month

Measure the total time spent keeping MoneyFlow trustworthy, not merely time spent entering transactions.

Include review and repair costs caused by automation.

### 5.3 Acquired-versus-retyped share

Track what share of safely observable digital activity arrives through trusted acquisition instead of permanent retyping.

This metric must be paired with correction and unresolved rates. A high acquisition share with poor quality is not success.

### 5.4 Exception burden

Measure how many items require active attention after automation/import.

Useful views may include:

- exceptions per 100 source items;
- median review session size;
- repeat exception causes;
- source/provider-specific burden.

### 5.5 Automatic-match precision

For duplicate, transfer or other matching, measure precision from user-confirmed outcomes before expanding auto-approval.

Recall may also matter, but low precision is especially damaging when the product can silently corrupt financial interpretation.

## 6. Retention and value metrics

### 6.1 Trusted periods retained

Prefer retention defined around maintained trustworthy periods rather than login frequency alone.

Examples:

- users with 2, 3, 6 or 12 consecutive maintained periods;
- users returning to reconcile or review after new financial activity;
- users retaining usable financial history over time.

### 6.2 Repeated value usage

Measure whether users continue to use relevant capabilities after data exists:

- review/reconciliation;
- reports/drill-down;
- planning;
- goals;
- scenario comparison;
- export/backup.

Do not interpret clicks as value without understanding the job completed.

### 6.3 Abandonment reasons

Collect structured and qualitative evidence for why users stop maintaining MoneyFlow.

Important hypotheses include:

- too much manual work;
- low trust in data;
- poor mobile flow;
- incomplete source coverage;
- complexity;
- insufficient ongoing value;
- price;
- privacy/provider concerns.

Abandonment evidence should influence product scope more than competitor feature parity.

## 7. Resilience metrics

These metrics should be introduced only after their underlying semantics exist. Do not create a financial-health score as a shortcut.

Potential measures include:

### 7.1 Obligation coverage

What proportion of near-term obligations are explicitly represented and linked to timing/account context where required?

Unknown obligations remain unknown rather than being treated as zero.

### 7.2 Income coverage and cadence confidence

How much of expected near-term income is supported by explicit recurring patterns, user confirmation or source evidence?

Irregular income requires different semantics from fixed salary income.

### 7.3 Liquidity/reserve visibility

Can the user distinguish current assets from liquid funds, reserved funds and intentionally unavailable money?

Do not infer an emergency-fund target without an explicit user/product planning contract.

### 7.4 Irregular-expense preparedness

Where the user chooses to track predictable non-monthly expenses, measure whether upcoming needs are represented and funded according to their plan.

### 7.5 Debt progress

For explicitly modeled debt, measure movement against user-selected repayment plans and actual posted payments.

Do not imply that one repayment strategy is universally optimal.

## 8. Progress metrics

Progress metrics depend on explicit goals and assumptions.

### 8.1 Goal completeness

A goal should be considered planning-ready only when required fields for its contract exist, such as amount, timing, contribution source/intent and relevant constraints.

The exact fields vary by goal type.

### 8.2 Plan-versus-actual

Measure the gap between explicit plan expectations and actual financial facts.

A useful metric must preserve whether the difference came from:

- changed income;
- changed spending;
- timing;
- a changed goal;
- a changed assumption;
- missing data.

### 8.3 Projection coverage

A projection should expose what share of relevant inputs is known, user-assumed or missing.

Never report precision unsupported by input quality.

### 8.4 Goal trajectory

Show whether the user is ahead, on track or behind only when the target and assumptions make that classification meaningful.

Prefer explainable drivers over opaque status labels.

## 9. Choice and agency metrics

These measures assess whether decision support increases understanding rather than obedience.

Potential measures include:

- scenario comparison completion;
- user changes to assumptions before acting;
- acceptance/rejection/edit rate for suggestions;
- reversal rate after automated or assisted actions;
- comprehension of why a suggestion appeared;
- user-reported confidence in understanding trade-offs;
- whether users can identify missing information before acting.

A high suggestion acceptance rate is not inherently good. The product should not optimize users into agreeing with the software.

## 10. Automation metrics

Every automation capability should track at least:

- eligible item count;
- suggested/actioned count;
- precision or confirmed correctness;
- correction/reversal rate;
- unresolved/failure rate;
- user time saved versus review/repair time;
- version/rule/model context needed to reproduce the action.

### Promotion rule

Do not promote a workflow from suggestion to automatic action based on qualitative confidence alone.

Require a bounded error contract appropriate to the financial consequence and enough real confirmed outcomes to estimate performance honestly.

The threshold is capability-specific and must be specified before auto-approval is enabled.

## 11. Provider and acquisition economics

For each provider or paid acquisition channel, measure:

- connection success rate;
- consent expiry/reconnect success;
- sync failure and recovery rate;
- coverage completeness;
- correction and duplicate burden;
- provider/support cost per retained user;
- maintenance reduction for connected versus comparable non-connected users;
- concentration risk;
- disconnect/delete success.

Provider count is not a KPI.

A provider that increases support cost or correction burden without improving retention/maintenance may be strategically negative even if users request it.

## 12. Business metrics

Business metrics should not override the product trust hierarchy.

Useful measures may include:

- retained paying users;
- conversion after proven continuing value;
- willingness to pay for maintenance reduction or advanced planning;
- gross margin after provider/AI/data costs;
- support cost by capability;
- churn reason by segment;
- revenue concentration by feature/provider tier.

Do not optimize revenue through ads, sale of financial data or incentives that reward harmful financial product recommendations.

## 13. Stage-gate scorecards

The following are decision frameworks, not automatic promotion rules. Owner judgment and qualitative evidence remain required.

### Stage 0 — Trustworthy Reality

Evidence expected before treating the foundation as mature:

- no open material correctness/ownership/recovery defects in the affected release contract;
- transfer neutrality and money invariants proven by tests;
- authentication and tenant isolation verified for production-relevant paths;
- backup/export/restore contract proven where applicable;
- mobile core flows usable;
- reconciliation/coverage states understandable;
- real-user or realistic end-to-end evidence that a trustworthy period can be maintained.

### Stage 1 — Low-maintenance Reality

Evidence expected before scaling acquisition breadth:

- source/provenance/candidate contract stable enough for multiple sources;
- duplicate and transfer matching measured;
- imported/observed activity does not create a parallel ledger;
- intervention and correction burden measured;
- replay/idempotency and disconnect/recovery behavior defined;
- total maintenance is lower for the tested acquisition path.

### Stage 2 — Financial Resilience

Evidence expected before global affordability/resilience claims:

- enough explicit income/obligation/reserve semantics for the selected planning mode;
- unknown coverage remains visible;
- irregular-income and protected-money counterexamples are addressed or explicitly excluded;
- output is more useful and less misleading than showing underlying facts alone.

### Stage 3 — Deliberate Progress

Evidence expected before presenting projections as decision-support outputs:

- fact/expectation/assumption/projection distinctions are implemented;
- plans link to actual financial records where relevant;
- counterexamples around timing, missing income, debt, goals and reserves are tested;
- projections are reproducible;
- users can inspect/change assumptions.

### Stage 4 — Financial Choice and bounded automation

Evidence expected before increasing software authority:

- alternatives and trade-offs are explainable;
- suggestion/automation performance is measured from confirmed outcomes;
- correction/reversal paths are clear;
- scope and permission are explicit;
- errors cannot silently mutate unrelated financial truth;
- users retain the ability to choose or disable automation.

### Stage 5 — Ecosystem expansion

Evidence expected for each new ecosystem track:

- validated segment/job;
- lower-layer dependencies are sufficiently trustworthy;
- financial semantics are specified;
- ownership/privacy/security boundary is understood;
- economics/support burden is acceptable;
- module placement does not overload the core experience;
- rollback/export/disconnect exists;
- success criteria are defined before implementation.

## 14. Anti-gaming rules

Metrics can create harmful incentives. Apply these safeguards.

### Do not optimize intervention count by hiding review

If the system auto-accepts uncertain records, interventions fall while trust may collapse.

### Do not optimize retention through lock-in

A user unable to leave is not a successful retained user.

### Do not optimize engagement by creating anxiety

Notifications, warnings and alerts should correspond to meaningful user jobs rather than app-open goals.

### Do not optimize provider connection rate by weakening consent clarity

Connection is useful only when informed, revocable and operationally reliable.

### Do not optimize AI acceptance rate

Users rejecting or editing a suggestion can be evidence of agency and a useful learning signal.

### Do not compress uncertainty into a proprietary score

A single health score may hide the reason an outcome changed. Prefer explainable components unless research proves a composite adds decision value.

## 15. Measurement maturity

Not every metric should be instrumented immediately.

Use this order:

1. define the product contract;
2. identify the decision the metric will change;
3. collect the minimum privacy-safe data required;
4. validate event/metric semantics;
5. analyze alongside qualitative evidence;
6. remove metrics that no longer influence decisions.

Telemetry is not a reason to collect unnecessary personal financial detail.

## 16. External framework applicability

MoneyFlow's Reality → Resilience → Progress → Choice framing is informed by established financial well-being/planning frameworks, especially:

- CFPB: control over day-to-day finances, capacity to absorb shocks, progress toward goals and freedom of choice;
- Financial Health Network: spend, save, borrow and plan/protect as connected dimensions;
- CFP Board: understand circumstances, set goals, analyze alternatives, develop/present actions, implement and monitor/update.

MoneyFlow adapts these frameworks as product-design guidance. It does not claim to provide CFP professional financial planning, regulated advice or a validated financial-health score.

## 17. Review cadence

Review this measurement strategy when any of these occur:

- a new strategic stage becomes active;
- a provider or paid data source materially changes unit economics;
- user evidence contradicts the current north-star assumptions;
- a metric creates visible gaming or harmful product behavior;
- regulation/privacy obligations change the permissible measurement boundary;
- at least annually for high-level strategic fit.

Do not rewrite historical metrics to make past work appear successful. Version definitions when semantics materially change.
