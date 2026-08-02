# Competitive capability maturation

- **Execution state:** evaluating
- **Active role:** project auditor / product planner
- **Permission scope:** branch_write + repository_read
- **Owner:** Thunderkill016
- **PR:** #215
- **Branch:** `plan/product-validation-rollout`
- **Base:** `main@f57b92ec471e816f96fa13dd464a7a98297bb2d4`
- **Decision date:** 2026-08-02
- **Current memory:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Gap matrix:** `docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md`

## Repository reconnaissance

The first version of this packet over-reported several gaps because it relied too heavily on earlier summaries. A second audit read current code, merge history and issue follow-up evidence.

Corrected findings:

- reports already include previous-period comparison, expense-change percentage and trends;
- export already supports date ranges, CSV/JSON and transaction/candidate/all bundles;
- recurring commitments and income already use current-month occurrence-to-transaction links;
- goals already have deadlines and planned-daily pace;
- account create/edit/archive/restore and per-currency totals already exist;
- dashboard one-RPC loading, bounded windows and schema-skew fallback are merged;
- import provenance, server dry-run and atomic approval are completed and production-smoked;
- broad rich-VND, long-Vietnamese, 44px, modal and accessibility remediation is merged;
- app-side CAPTCHA plumbing and repository security are merged; provider enforcement remains external.

The project needs a current implementation memory so future work does not repeatedly rediscover completed behavior or execute stale issue sequences.

## Research

### Decision question

What is the accurate current MoneyFlow state, and what is the smallest set of remaining depth improvements that makes existing capabilities competitive without duplicating completed work or expanding into unrelated product categories?

### Sources audited

Primary repository evidence:

- merged code at `main@f57b92ec471e816f96fa13dd464a7a98297bb2d4`;
- `README.md`, `ARCHITECTURE.md`, `docs/MVP_DEFINITION.md` and product principles;
- server workspaces for accounts, finance, dashboard, budgets, commitments, recurring income, goals and reports;
- transaction, reports and export domain/UI code;
- recent merged PR/commit history;
- issues #53, #72, #172 and #174 including follow-up comments;
- open PR inventory.

Competitive patterns remain sourced from `PRODUCT_COMPETITIVE_MEMORY.md`; they do not override merged product truth.

### Adoption review

No dependency, external service, provider setting, schema, runtime architecture or production behavior is adopted or changed by this documentation PR.

- license impact: none;
- security/privacy impact: none;
- production impact: none;
- rollback: remove the new memory and restore the prior links/roadmap files;
- provider writes remain separately authorized.

## Specification

### Deliverables

1. Add `docs/research/CURRENT_PROJECT_MEMORY.md` as the canonical implementation-status snapshot.
2. Correct `PRODUCT_CAPABILITY_GAP_MATRIX.md` against merged code.
3. Update repository entrypoints so agents read current state before historical research.
4. Add a knowledge-contract requirement so current memory cannot silently disappear.
5. Reconcile the status of issues #53, #72, #172 and #174 without pretending the unresolved slices are complete.
6. Preserve the owner decision: capability maturation proceeds now; validation is embedded per workstream rather than used as a global freeze.

### Status contract

Every capability must be classified as one of:

- implemented;
- implemented + production evidenced;
- partial;
- absent;
- external pending;
- candidate only;
- historical/superseded.

A route name, screenshot, open PR or old issue body is not sufficient proof of implementation.

### Product boundary

Allowed roadmap scope:

- accounts, transactions and reconciliation;
- budgets, recurring commitments/income and goals;
- reports, export and performance;
- import/Inbox and deterministic rules;
- dashboard, onboarding, mobile/accessibility and public-beta security.

Not current gaps:

- bank sync;
- AI advice or automatic financial decisions;
- OCR product identity;
- household/shared finance;
- investment/crypto/credit-score products;
- full FX accounting;
- native mobile rewrite;
- full envelope budgeting;
- local-first/CRDT rewrite.

## Implementation plan

### Track A — current-state authority

- audit current code and merge history;
- record merged capability inventory;
- record operational/security/performance state;
- record open PRs as candidates only;
- record stale/superseded claims;
- define an update protocol for future merges.

### Track B — corrected capability roadmap

- distinguish existing foundations from real gaps;
- remove false gaps in reports, export, recurring, goals, dashboard, import and UI quality;
- prioritize reconciliation, transaction operations, planning history, report drill-down, provider controls, rules and measured performance;
- allow independent workstreams to run in parallel.

### Track C — repository integration

- link current memory from `README.md`;
- make the README-first agent path point to current implementation status;
- index current memory in `docs/research/README.md`;
- enforce file and marker presence in `scripts/check-project-knowledge.mjs`;
- update PR title/body and exact-head evidence.

### Delivery waves after this plan

#### Wave 1

- reconciliation specification/invariant tests;
- transaction date/amount filters and review-state contract;
- budget history/drill-down;
- report arbitrary range/drill-down contract;
- onboarding/mobile remaining states;
- PR #211 current-main database canary;
- provider work only under explicit permission.

#### Wave 2

- reconciliation domain/UI;
- recurring history/lifecycle/matching;
- goal contribution/lifecycle;
- account register/detail;
- shared report/register filters.

#### Wave 3

- bounded bulk correction;
- import mapping/batch UX;
- export schema/restore path;
- dashboard attention/drill-down;
- staging/large-ledger performance;
- financial mutation audit.

#### Wave 4

- authenticated persisted rules;
- rule preview/order/version/audit;
- rule-management UI and integration.

## Tasks

- [x] Audit current `main` product and architecture entrypoints.
- [x] Inspect accounts, transactions, dashboard, planning, reports and export code.
- [x] Reconcile recent merged PR/commit history.
- [x] Reconcile issues #53, #72, #172 and #174.
- [x] Identify false gap claims in the first PR #215 draft.
- [x] Add `CURRENT_PROJECT_MEMORY.md`.
- [x] Correct the capability gap matrix.
- [x] Update README, research index and knowledge contract.
- [ ] Update PR metadata for the expanded current-memory scope.
- [ ] Run exact-head risk-selected CI, CodeQL and secret scan.
- [ ] Hand off for owner review without merging.

## Evaluation

Evaluation must verify:

- no merged feature is described as absent;
- current-month occurrence linkage is distinguished from full recurring history;
- report comparison/trends and export date range/JSON are recorded as existing;
- provider-side security remains distinct from repository readiness;
- open PRs are not described as current product behavior;
- issue #53 PR B is marked completed;
- issue #72 completed UI slices are not re-planned;
- issue #172 feature freeze is marked superseded by the owner;
- the roadmap deepens existing modules instead of introducing parity sprawl;
- no production, schema, dependency or provider write occurs.

Selected verification:

- diff hygiene;
- project knowledge contract;
- CI classifier contract;
- JavaScript syntax and full verify because the knowledge script changes;
- database/browser gates only if the fail-safe classifier selects them;
- CodeQL and secret-history scan;
- production verification not applicable because runtime behavior is unchanged.

## Handoff record

### Current permission boundary

Allowed:

- repository/history/issue audit;
- documentation and knowledge-contract changes on the focused branch;
- PR metadata and CI inspection.

Not allowed:

- direct `main` writes;
- PR merge without explicit owner instruction;
- runtime/schema/provider/production changes;
- production data mutation;
- dependency adoption.

| Time | From | To | State | Evidence |
|---|---|---|---|---|
| 2026-08-02 | owner | planner | planned | Requested development of existing capabilities rather than validation-first freeze |
| 2026-08-02 | owner | project auditor | evaluating | Requested full project-information refresh because many previously listed gaps were already implemented |
| 2026-08-02 | project auditor | owner review | evaluating | Current-state memory, corrected gap matrix, README/research entrypoints and knowledge contract prepared; exact-head CI pending |
