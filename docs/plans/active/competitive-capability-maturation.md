# Competitive capability maturation

- **Execution state:** evaluating
- **Active role:** product planner / implementation coordinator
- **Permission scope:** branch_write + repository_read
- **Owner:** Thunderkill016
- **Branch:** `plan/product-validation-rollout`
- **Base:** `main@f57b92ec471e816f96fa13dd464a7a98297bb2d4`
- **Decision date:** 2026-08-02
- **Current project memory:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Mandatory PR memory:** `docs/research/PR_MEMORY_LOG.md`
- **Gap matrix:** `docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md`

## Repository reconnaissance

MoneyFlow already has:

- authentication and demo runtime;
- multiple accounts with add/edit/archive/restore, per-currency display and same-currency transfers;
- income, expense, split expense and balanced transfer entries;
- transaction search/filter, edit, soft delete and restore;
- dashboard one-RPC loading, bounded windows and schema-skew fallback;
- current-period budgets;
- recurring commitments and income with current-month occurrence-to-transaction linkage;
- savings goals with deadlines and planned-daily pace;
- week/month/year reports with previous comparable periods and trends;
- period CSV plus date-range CSV/JSON export;
- Inbox/import provenance, server dry-run and atomic approval;
- local deterministic parse rules;
- responsive light/dark UI with broad browser audit evidence;
- RLS, pgTAP, CodeQL, secret-history scan and risk-proportional CI.

Old issue bodies and status tables often describe these completed capabilities as absent or future work. `CURRENT_PROJECT_MEMORY.md` now reconciles those claims against merged code and evidence.

## Research

### Decision question

Which existing MoneyFlow capabilities remain incomplete at competitive depth after removing items that current code already implements?

### Sources and limits

- Current merged code, migrations and tests establish implementation truth.
- Recent merge history and exact-head/production evidence establish verification depth.
- Issues #53, #72, #172 and #174 retain useful open requirements, but their old bodies do not override later comments or code.
- External competitors remain pattern references, not acceptance authorities.

### Result

The highest remaining trust gap is account reconciliation. Other valid depth work can proceed in parallel when database contracts do not conflict. Provider security operations remain external and require explicit owner permission.

## Specification

### Product direction

Continue developing existing MoneyFlow capabilities toward competitive depth. Do not globally freeze feature work for validation. Embed validation and acceptance inside each workstream.

### Memory contract

Every pull request targeting `main` must:

1. append one truthful entry to `docs/research/PR_MEMORY_LOG.md`;
2. state `Status impact: none` when the bounded change does not alter implementation status;
3. update the affected row or section in `CURRENT_PROJECT_MEMORY.md` when capability, architecture, security, operational or verification status changes;
4. keep open-PR behavior classified as candidate evidence until merge;
5. record exact verification and remaining work without turning a build or screenshot into a completion claim.

The existing required project-knowledge check fails a pull request that omits the per-PR memory log.

### Acceptance criteria

- current implementation status is grounded in merged code and evidence;
- completed behavior is not planned again as missing;
- partial behavior is distinguished from absent behavior;
- provider readiness is separated from provider enforcement;
- every future PR leaves a durable memory entry;
- status-changing PRs update the canonical snapshot;
- CI enforces the per-PR memory file without adding a bypassable standalone workflow.

## Implementation plan

### Wave 1 — financial trust and visible depth

- reconciliation specification and permanent database tests;
- transaction review state, date/amount filters and bounded bulk correction;
- account register/detail;
- budget history/drill-down;
- report arbitrary periods and drill-down;
- remaining onboarding/quick-capture and physical-device findings.

### Wave 2 — connect planning to actual transactions

- reconciliation workflow;
- recurring history, lifecycle, calendar/reminders and matching;
- goal contribution history and funding semantics;
- deeper report dimensions;
- remaining destructive/error-state remediation.

### Wave 3 — efficiency and ownership

- export schema/version, broader planning-data coverage and restore path;
- import mapping presets, batch management and bulk review;
- non-sensitive mutation audit;
- staging and large-ledger performance acceptance;
- evidence-based dashboard attention/drill-down.

### Wave 4 — deterministic automation

- authenticated persisted rules with RLS;
- ordering, preview, versioning and audit;
- rule management and cross-module acceptance.

## Tasks

- [x] Audit merged behavior against old status claims.
- [x] Create `CURRENT_PROJECT_MEMORY.md`.
- [x] Correct the capability gap matrix.
- [x] Index current memory from README, AGENTS and research README.
- [x] Create mandatory `PR_MEMORY_LOG.md`.
- [x] Add per-PR memory fields to the pull-request template.
- [x] Enforce per-PR memory updates through `npm run check:knowledge` in existing CI.
- [x] Record PR #215 in the memory log and current snapshot.
- [ ] Verify the final exact head after memory enforcement changes.
- [ ] Owner review and merge.

## Evaluation

### Scope review

This PR changes documentation and repository verification policy only. It does not change runtime behavior, database schema, dependencies, provider configuration or production data.

### Required exact-head evidence

- diff hygiene;
- mandatory PR memory diff check;
- project knowledge contract;
- CI classifier contract;
- full static/domain/build verification because AGENTS and the knowledge script changed;
- CodeQL;
- secret-history scan;
- database/browser checks only if selected by the classifier.

### Current decision boundary

- PR #215 remains unmerged candidate evidence until owner approval.
- Provider writes remain outside this branch permission.
- Future agents must not claim completion without the memory entry and affected verification.

## Handoff record

- 2026-08-02: owner replaced validation-first freeze with capability maturation.
- 2026-08-02: repository audit corrected stale feature-gap claims.
- 2026-08-02: owner required every PR to update project memory.
- 2026-08-02: two-layer memory contract established: mandatory per-PR log plus status snapshot updates when facts change.

### Current permission boundary

Branch/documentation/CI-policy writes only. No merge, provider write, schema change, dependency change or production mutation is authorized by this packet.
