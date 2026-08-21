# #432 — MoneyFlow master development program

**Status:** active
**Execution state:** evaluating
**Active role:** planner / evaluator
**Permission scope:** branch documentation/research only for P0; later phases require their own bounded permission
**Owner:** human owner
**Issue/PR:** #432 / PR #433
**Branch:** `research/432-vietnam-long-term-product-strategy`
**Last updated:** 2026-08-21

## Outcome

Develop MoneyFlow into a durable Vietnamese personal-finance product whose long-term default is **automatic or near-automatic acquisition of digital money activity**, while preserving a trustworthy user-owned ledger and manual capture as a fallback for cash, corrections and missing/off-system events.

Dependency order:

```text
Sources / evidence
  -> candidates + provenance
  -> normalization / duplicate / transfer matching
  -> trustworthy ledger facts
  -> clearing / reconciliation / correction
  -> understanding / review
  -> connected planning
  -> automation
  -> selective read-only providers
  -> wealth / together / optional intelligence when validated
```

This program governs sequencing and evidence. It does not authorize every horizon at once.

## Repository reconnaissance

### Current main truth

Baseline inspected before research and planning: `main@6d81d334fd7e6d491196bd993b283514cad2c160`.

Current shipped product remains a released manual/import-assisted Vietnamese PFM MVP and is **not public-beta ready**. Current implementation/trust evidence remains owned by code/tests and `docs/research/CURRENT_PROJECT_MEMORY.md`; this strategy branch must not claim bank sync, native capture, wealth or household capability before implementation merges.

Release evidence remains independent:

- RRB-08 physical-phone proof is still open and requires a real owner-observed phone run;
- RRB-04/05/06/09 remain provider/contact/legal/deployment evidence gates;
- strategy, browser, CI or documentation cannot close those boundaries.

### Existing architecture worth preserving

The existing target architecture already contains the correct seams: Ledger Core, Planning, Understanding, Acquisition and Automation, Wealth, Identity/Ownership. It already names import sources/batches, candidates/provenance, rules, duplicate decisions and provider adapters.

The problem is primarily **dependency order**: earlier direction placed broad planning/forecast/wealth work ahead of acquisition/provider-independent reconciliation. #432 reorders those seams rather than authorizing a rewrite.

### Conflicting/open work reconciled by P0

- **#403 performance:** still open; #415 established measurement but no demonstrated high-value LCP win. Hold unless owner deliberately promotes it again.
- **#426 simplification:** retain evidence-backed simplification ideas only; its original desktop-navigation premise was corrected by later #425 evidence. It is not master direction.
- **PR #431:** conflicting product-direction candidate; not authority merely because it is open. Reconcile against #432 before any merge.
- **RRB-08/release gates:** separate independent lanes.

### Existing implementation areas P1 must inspect before code

P1 reconnaissance must read the actual current import/share/capture implementation and tests before proposing schema changes, especially current `/imports`, paste/share/upload/direct CSV paths, parser helpers, transaction mutations, transfer logic, reconciliation behavior and RLS/database contracts.

## Research

### Research scope and source selection

The decision question is not “which PFM features should MoneyFlow copy?” It is:

> How can a Vietnamese user maintain a trustworthy whole-money picture with progressively less work, despite fragmented banks, QR payments, e-wallets, cash and uneven provider access?

Market/regulatory evidence lives in `docs/research/VIETNAM_LONG_TERM_PRODUCT_STRATEGY_2026.md`. Implementation references live in `docs/research/MONEYFLOW_REFERENCE_REPO_ATLAS_2026.md`.

Default future research rule: select **2–4 sources per bounded decision**. Official platform/provider/regulatory sources outrank reference-product assumptions.

### Vietnam/provider findings

- Digital banking/QR activity is sufficiently widespread that permanent retyping of already-digital transactions is the wrong long-term workflow.
- Vietnamese Open API regulation creates a real account/transaction-information path, but third-party access requires contracts, consent/revoke and security/operational controls; it is not a universal free feed.
- No researched evidence establishes one universal consumer transaction-history API across all Vietnamese e-wallets.
- Provider connectivity therefore must be optional, read-only first, source-adapter based and able to degrade when unavailable.

### Android/platform findings

- Android `NotificationListenerService` is a possible user-authorized source, not guaranteed financial truth.
- Modern Android may redact sensitive notification content from ordinary third-party listeners.
- Google Play heavily restricts SMS/Call Log permissions; SMS-based money management can qualify only under declared/reviewed policy exceptions, so MoneyFlow must not assume unrestricted `READ_SMS` access for mainstream distribution.
- Native/device assistance is evaluated only after a neutral source/candidate engine exists.

### Reference implementation findings

Primary subsystem references:

| Domain | References | Evidence used |
|---|---|---|
| import/reconciliation | `actualbudget/actual`, `firefly-iii/firefly-iii` | stable source IDs, duplicate handling, rules, transfers, dry-run/review, reconciliation lifecycle |
| Open Banking abstraction | `OpenBankProject/OBP-API` | provider-neutral consent/account/transaction boundaries |
| mobile source fusion | `sarim2000/pennywiseai-tracker`, `p4r1ch4y/upi-analyser` | parser/fusion/permission/privacy patterns, not Vietnam policy assumptions |
| ledger correctness | `ledger/ledger`, `blnkfinance/blnk`, `flash-oss/medici` | balancing, reversal/audit and reconciliation patterns |
| background workflows | `graphile/worker`, `dbos-inc/dbos-transact-ts` | Postgres-first queue/durability choices when requirements justify them |
| future wealth/together | Wealthfolio/Ghostfolio/Rotki; Spliit/SplitPro | future domain boundaries only |
| analytics/security | Umami; OWASP ASVS/CheatSheetSeries | privacy-minimized measurement and security verification |

Actual Budget specifically demonstrates a useful principle: a stable imported/source ID prevents duplicate ingestion, fallback matching handles weaker sources, import can run rules/dry-run and a later source update can reconcile existing records. MoneyFlow adopts the contract principles, not Actual's storage/sync architecture.

### Adoption and license review

- MIT/Apache references may be evaluated for code/library reuse only after maintenance/security/runtime review.
- AGPL/GPL references are primarily architecture/domain/test references unless legal review explicitly approves reuse.
- Custom/restricted sources are research only unless the exact license is approved.
- GitHub stars are a weak adoption signal, never correctness evidence.

## Specification

### Product thesis

MoneyFlow remains a Vietnamese personal-finance-management product. Its durable job is:

> **Maintain one trustworthy, understandable picture of a person's money while reducing the work required to keep it correct.**

### Owner decisions now represented by #432

1. Manual entry must **not** remain the primary long-term workflow for digital transactions.
2. Automatic/near-automatic acquisition is the strategic default for safely observable digital activity.
3. Manual capture remains first-class for cash, corrections and unseen/off-system events.
4. Bank APIs, provider feeds, statements, file/share inputs, Android assistance and manual capture converge on one neutral acquisition/reconciliation contract.
5. Existing ledger correctness, transfer neutrality, RLS ownership, correction/recovery and export/backup are assets to evolve, not rewrite.
6. Develop the whole product over time in dependency order, not by accumulating unrelated modules.
7. External repositories are references, not a product blueprint.
8. Merge, provider writes, production writes and public-beta acceptance remain owner decisions.

### Program invariants

**Financial**

- VND stays integer đồng.
- Transfers stay equal/opposite and never income/expense.
- External source records are evidence, not permission to overwrite balances.
- Corrections remain recoverable/audited.
- Fact / expectation / assumption / projection / suggestion stay distinct.

**Ownership/privacy**

- Authenticated data remains database-enforced tenant-isolated.
- Bank tokens, raw statements/provider payloads and participant financial data never enter generic logs/project memory.
- Provider credentials/tokens require a dedicated secret lifecycle.
- Export/backup remain ownership capabilities, not lock-in.

**Architecture**

- Keep the modular monolith until a measured/security/legal boundary justifies extraction.
- Parsers/adapters create neutral source records/candidates.
- Import/provider jobs are idempotent/restartable.
- Read models remain rebuildable.
- No queue/provider/mobile/AI/multi-currency technology is selected before the bounded spec proves the requirement.

**Product**

- Reduce maintenance without reducing trust.
- Exception-first review beats making users approve every correctly matched record.
- Aggregates remain traceable to contributing facts.
- Advanced capability remains progressively disclosed.

### Program metrics

North-star concept: **trusted periods maintained with decreasing maintenance effort**.

Measure:

- manual interventions / 100 observed transactions;
- maintenance minutes / active user / month;
- source coverage and parse success by source/version;
- exact-ID vs fallback-match rate;
- automatic-match and transfer-match precision;
- unresolved/duplicate/correction rates;
- reconciliation completion/confidence;
- time to first trustworthy period;
- multi-period retention;
- export/restore success;
- provider/support cost per retained paying user when connectivity exists.

DAU and feature count are not primary success metrics.

### Validation/falsification gates

Before expensive provider/native/wealth/AI work, require evidence that users value a provider-independent whole-money picture, maintenance effort falls, multi-period value/retention persists, financial errors stay acceptable and provider/ops economics can be supported.

Revise the thesis if lower maintenance does not improve continuing value, if the combined view is not a repeated job, or if legal/provider/support burden exceeds retained user value.

## Implementation plan

### P0 — Authority Alignment — **NOW**

Goal: make repository authority non-contradictory before runtime work.

Deliverables:

- promote #432 to master program authority;
- persist this active packet and the reference-repo atlas;
- distinguish current manual/import-assisted capability from future acquisition-first direction in `AGENTS.md`, README and product law;
- reorder Product Vision and Target Architecture around Acquire + Reconcile before broad expansion;
- register #432 on the Current Work Board;
- hold/reconcile #403, #426 and PR #431 without falsely closing them;
- run exact-head docs/knowledge/CI-policy/diff-hygiene gates and independent evaluation before owner merge decision.

P0 changes **no runtime code, schema, RLS, provider, deployment or financial semantics**.

### P1 — Acquisition Foundation

Goal: every future source feeds one deterministic ledger-ingestion path.

Specify before implementation:

- source/batch identity;
- source event/candidate schema;
- parser/adapter/version provenance;
- stable external transaction ID when present;
- versioned deterministic fallback fingerprint when absent;
- raw description/reference retention policy;
- candidate validation states;
- duplicate/transfer/reject decisions with reasons;
- dry-run/preview;
- atomic/idempotent commit;
- deleted/reimport and source-update behavior;
- source correction versus user-correction precedence;
- safe audit fields and disconnect/delete semantics.

Implementation order:

1. inventory existing source paths and tests;
2. write pure contracts/fixtures/counterexamples first;
3. migrate one current source path end-to-end;
4. prove replay/idempotency/atomic failure;
5. migrate the remaining existing source paths one at a time;
6. add schema only where existing structures cannot express the accepted contract.

P1 exit:

- replay cannot create a second fact;
- manual + later-imported copies can reconcile rather than duplicate;
- failed batches cannot partially corrupt ledger state;
- source updates cannot silently destroy user corrections;
- source/decision provenance is inspectable without leaking sensitive payloads.

### P2 — Low-Maintenance Ingestion

Goal: materially reduce maintenance before depending on provider contracts.

Evidence-promoted work may include real Vietnamese statement/file/share sources, merchant/payee normalization, user-confirmed rules, recurring recognition, pending/cleared lifecycle, reconciliation sessions and exception-first batch review.

Exit: maintenance minutes and manual interventions fall materially while match/correction errors do not worsen.

### P3 — Understanding + Trustworthy Review

Goal: make trusted data useful without dashboard clutter.

- unresolved/source-health state first;
- balances and period inflow/outflow;
- traceable meaningful-change explanations;
- weekly/monthly review/close semantics;
- honest `up to date through X` coverage;
- known upcoming obligations;
- shared report query/drill-down/export contract;
- privacy-minimized product telemetry.

### P4 — Selective Read-Only Connected Sources

Goal: reduce import/retyping for retained cohorts where legal/commercial economics work.

Before selection: current official API/contract evidence, consent/revoke, threat model, token isolation, sandbox/real access, cursor/retry/rate limits, disconnect/delete, provider health and support/economic model.

First capability is account information/balances/transaction history where allowed. Payment initiation is a separate regulated product boundary.

### P5 — Connected Planning

- expected recurring occurrences match posted facts;
- goals use explicit contributions/withdrawals or transaction links;
- reserves/commitments/financial calendar;
- deterministic forecast with visible coverage and assumptions;
- demote planning surfaces that do not create measured recurring value.

### P6 — Automation Platform

- versioned deterministic rules;
- learned suggestions from confirmed corrections;
- measured confidence/error thresholds;
- bounded reversible auto-approval;
- sync health and alerts;
- scoped API/webhooks;
- select background-workflow technology only after failure/throughput/latency requirements are measured.

### P7 — Wealth

Assets/liabilities, loans, holdings, valuation observations, cost-basis/performance contract and explicit multi-currency migration before non-VND accounting.

### P8 — Together

Workspace/membership migration, private/shared scopes, RLS permission matrix, shared-expense/settlement semantics, separation/export/delete.

### P9 — Optional Intelligence

Grounded explanations, ambiguous categorization, anomaly/recurring explanations and natural-language exploration with source links, confidence, data minimization, opt-out and no autonomous advice/posting.

### User validation program

Before provider/native/wealth/AI commitments:

1. recruit a small cohort with varied digital account complexity;
2. observe reconstruction of a real period from available sources;
3. test improved import/reconciliation as a concierge workflow;
4. measure maintenance/correction burden;
5. repeat for another period;
6. test willingness to pay with a real commitment mechanism rather than survey intent;
7. record churn/non-use reasons without storing participant financial details in the repo.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P0.1 | promote #432 from research to master program | issue #432 body | done |
| P0.2 | promote packet to active execution | this packet | done |
| P0.3 | persist reference repository atlas + license policy | `MONEYFLOW_REFERENCE_REPO_ATLAS_2026.md` | done |
| P0.4 | reconcile AGENTS/README/principles/vision | PR #433 diff | done |
| P0.5 | reorder target architecture around Acquire + Reconcile | PR #433 architecture diff | done |
| P0.6 | register #432 and hold/reconcile competing work on board | active board | done |
| P0.7 | satisfy active-packet/AGENTS executable knowledge markers | checker-source review + PR diff | done |
| P0.8 | exact-head docs/knowledge/CI-policy/diff-hygiene gates | CI #2723 proved policy shard runs and caught trailing whitespace; fixes in progress | in_progress |
| P0.9 | independent evaluator + any fixes | post-merge wording review + external-source recheck | in_progress |
| P0.10 | owner merge decision | exact-head green PR #433 required | blocked |
| P1.0 | Acquisition Foundation reconnaissance/spec | separate bounded Class 3 packet/spec after P0 merge | blocked |

Do not pre-create P1–P9 issue backlogs. Promote only the next bounded slice.

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-18 | owner | researcher | discovery | original #432 mandate | long-term thesis unknown | first-principles research |
| 2026-08-18 | researcher | owner | evaluating | Vietnam strategy research + owner acquisition correction | retention/WTP/provider economics unproven | owner decide direction |
| 2026-08-21 | owner | planner/implementer | implementing | instruction to create detailed plan, persist, track and execute | repository authority still conflicted | execute P0 docs-only alignment |
| 2026-08-21 | planner/implementer | PR verification | evaluating | PR #433; CI #2717 rejected as false green; real CI #2723 executed policy and caught trailing whitespace | clean remaining diff-hygiene findings; rerun exact-head knowledge/policy; CodeQL/secret scan | fix exact-head findings, then owner handoff |

### Current permission boundary

Granted for P0:

- documentation/research writes on `research/432-vietnam-long-term-product-strategy`;
- issue #432 and board tracking necessary to persist the accepted program;
- PR #433 creation and review-state verification under the owner's instruction to execute the plan.

Not granted by P0:

- application/runtime changes;
- schema/migration/RLS changes;
- provider credentials/configuration or production/deployment writes;
- native application/provider integration;
- financial semantic mutation;
- merge;
- closing RRB-08/provider/legal/owner gates.

Stop rather than improvise if a claimed P0 result would require inventing provider availability, claiming automatic capture that does not ship, or resolving a conflicting owner/provider/legal decision without evidence.

## Evaluation

### Scope evaluation

PR #433 remains docs/research only; no `src/**`, migrations, schema, RLS or runtime/provider configuration has been changed by P0.

### Knowledge-contract evaluation

The repository checker source was inspected directly. Active packets require exact headings:

- `## Repository reconnaissance`
- `## Research`
- `## Specification`
- `## Implementation plan`
- `## Tasks`
- `## Evaluation`

This packet contains them. `AGENTS.md` was also reconciled with the literal project-contract markers required by `scripts/check-project-knowledge.mjs` while keeping procedural hot memory bounded.

### Verification status

- PR #433 opened from `research/432-vietnam-long-term-product-strategy` to `main` and marked ready for review.
- CI #2717 on head `748c4abd…` reported success but is **rejected as evidence** because the known #417 draft-to-ready race left `Verify policy contracts` and the aggregate `verify` job skipped.
- A later synchronize event while the PR was already non-draft produced CI #2723 on head `b39cf1d…`. This is valid execution evidence: `Verify policy contracts` actually ran and failed at `Diff hygiene`, identifying only trailing whitespace before later policy steps could execute.
- The whitespace findings are being fixed without weakening the checker. The next exact-head run must show `Diff hygiene`, `Project knowledge contract` and `CI classification and retry contract` actually execute successfully; aggregate `verify` must also pass.
- Exact-head CodeQL and Secret history must be green on the final head. Secret history was green on the #2723 head; final-head evidence still must be checked after the fixes.

Browser/database/provider/production/physical-device evidence is not applicable to this docs-only P0 and is not claimed. The database shard in CI #2723 correctly reported database checks not required.

### Independent evaluation findings

The review challenged post-merge durability rather than only branch correctness and found three real documentation defects: `PRINCIPLES.md`, `MONEYFLOW_PRODUCT_VISION.md` and `TARGET_ARCHITECTURE_ROADMAP.md` described themselves as branch/candidate documents in wording that would become stale immediately after merge. They were corrected to durable authority wording while preserving the rule that open PRs remain candidate evidence.

The review also rechecked the external implementation/platform claims against current primary documentation:

- Actual Budget documents `imported_id`, import reconciliation/rules, dry-run and update behavior, supporting the neutral ingestion/idempotency pattern rather than a storage-architecture copy.
- Android documents notification-listener callbacks and sensitive-content redaction constraints.
- Google Play treats SMS/Call Log access as restricted/high-risk; SMS-based money management is an exception path subject to declaration/review, so MoneyFlow correctly treats SMS as an optional source adapter rather than a default permission assumption.

Remaining evaluator questions before merge: confirm no final document claims bank/native functionality is already shipped, no release gate is closed, and the final exact-head CI fully executes the policy/knowledge steps.

### Remaining uncertainties

Direct Vietnamese cohort retention, willingness to pay, actual provider economics, first bank/provider selection, e-wallet history access, native distribution details and future wealth/household/AI semantics remain intentionally unproven.

## Delivery record

- Master issue: #432
- Branch: `research/432-vietnam-long-term-product-strategy`
- Base inspected: `main@6d81d334fd7e6d491196bd993b283514cad2c160`
- PR: #433 open, non-draft; owner merge decision pending
- First CI: #2717 rejected as false green due #417 skip race
- Real verification run: CI #2723 failed honestly at diff hygiene; remediation underway
- Merge: owner decision only
- Runtime/schema/provider/production change: none
- Current phase: P0 Authority Alignment, evaluation/verification in progress
