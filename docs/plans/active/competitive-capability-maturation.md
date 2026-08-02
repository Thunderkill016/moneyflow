# Competitive capability maturation

- **Execution state:** evaluating
- **Active role:** product planner / implementation coordinator
- **Permission scope:** branch write + repository/provider read
- **Owner:** Thunderkill016
- **Branch:** `plan/current-project-memory-v2`
- **Base:** current `main` after PR #213
- **Decision date:** 2026-08-02
- **Current project memory:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Mandatory PR memory:** `docs/research/PR_MEMORY_LOG.md`
- **Gap matrix:** `docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md`

## Repository reconnaissance

MoneyFlow already has authenticated/demo runtimes, multi-account ledger behavior, balanced transfers, split expenses, transaction correction and recovery, current-period budgets, recurring templates with current-month occurrence linkage, savings goals, comparative reports, controlled import/export, responsive UI, RLS/pgTAP and risk-proportional CI.

PR #213 additionally merged the selected project-wide brand system, product-proof landing and task-first authentication and was verified on production. PR #216 was closed because its research was folded into #213. PR #215 diverged from current `main`; PR #219 is its clean replacement.

## Research

### Decision question

Which existing MoneyFlow capabilities remain incomplete at competitive depth after removing stale claims and reconciling the merged public-experience rollout?

### Sources and limits

- Merged code, migrations and tests establish implementation truth.
- Exact-head CI and affected production evidence establish verification depth.
- Current issues and historical research remain useful but do not override later code or owner decisions.
- External competitors are pattern references, not acceptance authorities.

### Result

The highest remaining financial-trust gap is account reconciliation. Other valid depth work may proceed in parallel when boundaries do not conflict. Provider enforcement remains externally controlled.

## Specification

### Product direction

Continue maturing existing capabilities rather than freezing all feature work. Embed validation and acceptance in each workstream.

### Memory contract

Every PR targeting `main` must:

1. create one bounded record under `docs/research/pr-memory/YYYY/QN/PR-<number>.md`;
2. state `Status impact: none` when current truth does not change;
3. update `CURRENT_PROJECT_MEMORY.md` when capability, architecture, security, operational or verification status changes;
4. keep open-PR behavior classified as candidate evidence;
5. record exact verification without treating build or screenshots as universal completion proof.

### Acceptance criteria

- merged behavior is not planned again as missing;
- partial behavior is distinguished from absent behavior;
- PR #213 is recorded as implemented and production evidenced;
- PR #216 is recorded as folded into #213, not independently merged;
- PR #215 is recorded as superseded by clean replacement #219;
- every future PR leaves a bounded record;
- CI enforces the record without adding a standalone workflow or bypass.

## Implementation plan

1. Introduce the compact current-state snapshot and capability gap matrix.
2. Route README, AGENTS and research index through the snapshot.
3. Add the per-PR record policy and PR template fields.
4. Extend the existing project-knowledge check with memory size and ownership rules.
5. Verify exact head, then archive this packet after merge and acceptance.

## Tasks

- [x] Audit merged capability truth against stale claims.
- [x] Reconcile PR #213, #216 and the public-experience production evidence.
- [x] Create `CURRENT_PROJECT_MEMORY.md`.
- [x] Create `PRODUCT_CAPABILITY_GAP_MATRIX.md`.
- [x] Create `PR_MEMORY_LOG.md` and PR #219 record.
- [x] Route README, AGENTS, research index and PR template through the memory model.
- [x] Enforce bounded records in `npm run check:knowledge`.
- [ ] Exact-head CI after ready-for-review.
- [ ] Owner review and merge.
- [ ] Move this packet to `docs/plans/completed/` after acceptance.

## Evaluation

### Scope review

This PR changes documentation and the existing repository knowledge check only. It does not change runtime behavior, financial calculations, database schema, provider configuration, dependencies or production data.

### Required evidence

- diff hygiene;
- project knowledge and own-record enforcement;
- CI classification contract;
- full static/domain/build verification because AGENTS and the knowledge script changed;
- CodeQL and secret-history scan;
- database/browser only if selected by the classifier.

### Current decision boundary

PR #219 remains candidate evidence until merge. Provider writes, schema changes and production mutations are outside this packet.

## Handoff record

- 2026-08-02: owner replaced validation-first freeze with capability maturation.
- 2026-08-02: repository audit corrected stale feature-gap claims.
- 2026-08-02: PR #213 merged the public brand/landing/auth rollout and was production-smoked.
- 2026-08-02: PR #216 closed after its research was folded into #213.
- 2026-08-02: conflicted PR #215 was replaced by clean PR #219 from current `main`.

### Current permission boundary

Branch/documentation/CI-policy writes and read-only provider verification. No provider mutation, schema change, dependency change or unrelated runtime change is authorized by this packet.
