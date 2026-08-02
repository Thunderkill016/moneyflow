# Spec Kit integration on current main

- **Execution state:** evaluating
- **Active role:** repository governance integrator
- **Permission scope:** branch_write + repository_read
- **Owner:** Thunderkill016
- **Branch:** `chore/adopt-spec-kit-current-main`
- **Base:** `main@25c9e988500dc60d2a22b654714ff22dafeecde3`
- **Supersedes:** PR #226 after this replacement PR is opened
- **Decision date:** 2026-08-03

## Repository reconnaissance

MoneyFlow already used feature artifacts under `specs/001-account-register-detail/`, but the canonical `.specify` adapter, constitution and reusable templates were not merged. PR #226 contained a candidate adapter based on `main@923fc7b80ada67e548628ef2e85b0837780f9ed3` and became conflict-prone after later governance, memory and CodeQL changes.

Current `main` now includes:

- the account-register feature and its completed packet/archive truth;
- risk-proportional application/database/browser CI;
- a provider-required CodeQL workflow that always initializes, analyzes and uploads a real result for every pull request;
- current `AGENTS.md`, `README.md` and project-memory wording that must not be overwritten by the stale PR branch.

## Research

### Decision question

How should MoneyFlow adopt Spec Kit without creating a second governance system or reintroducing the CodeQL false-green merge deadlock?

### Source-derived evidence

- PR #226 established a compatibility-adapter approach: Spec Kit owns feature requirements/plans/tasks while MoneyFlow keeps product law, permissions, work packets, PR memory and owner acceptance.
- Merged PR #228 demonstrated that `specs/<feature>/` artifacts can support a bounded feature without replacing the existing delivery workflow.
- Merged PR #230 established that a successful CodeQL job shell is insufficient; every pull request must upload a real analysis under the active repository rule.
- Current `AGENTS.md`, `README.md` and `RISK_PROPORTIONAL_DELIVERY.md` remain higher-authority integration points.

### Selected approach

Rebuild the adapter directly from current `main`:

- retain the six `.specify` artifacts from the prior candidate;
- change constitution status from falsely ratified to proposed/effective-on-merge;
- add the provider-required CodeQL exception to the adapter, constitution, plan, task and checklist guidance;
- merge only small references into current `AGENTS.md` and `README.md`;
- do not install generated skills, add dependencies or run an unpinned upstream initializer.

### Rejected alternatives

- Merge PR #226 unchanged: rejected because it is based on stale governance files and is currently non-mergeable.
- Replace MoneyFlow work packets with Spec Kit: rejected because execution state, permissions, handoffs and delivery evidence have different responsibilities.
- Commit the full generated upstream scaffold: rejected because it could overwrite MoneyFlow-owned templates and add unreviewed management surface.
- Skip CodeQL on documentation-only feature artifacts: rejected because the repository ruleset requires uploaded analysis.

## Specification

### Required behavior

- `.specify/README.md` defines authority, coexistence, refresh and upgrade rules.
- `.specify/memory/constitution.md` summarizes financial, ownership, product-scope, evidence, permission and verification principles without replacing authoritative sources.
- Templates exist for specification, plan, tasks and requirements-quality checklist.
- `AGENTS.md` and `README.md` route feature work to the adapter without weakening existing workflow requirements.
- Full MoneyFlow packets remain mandatory for Class 3, cross-cutting, multi-day/multi-agent, provider/production, unresolved-research or non-obvious rollback work.
- Protected CodeQL analysis remains required for every pull request independently of risk-selected product-layer gates.
- No application runtime, financial semantics, database, RLS, dependency, provider setting or production data changes.

### Acceptance criteria

- Current `AGENTS.md` and `README.md` content is preserved except for bounded Spec Kit references.
- Constitution status is candidate until merge, not represented as already ratified.
- Templates require observable outcomes, explicit financial/data/security boundaries, permissions, rollback and traceable evidence.
- Plan/tasks/checklist guidance cannot treat skipped CodeQL analysis as valid.
- Project knowledge and CI classification contracts pass on the exact head.
- CodeQL initializes, analyzes and uploads a result on the exact head.
- Secret-history scan passes.
- Documentation-only classifier does not run unrelated application/database/browser work unless selected by policy.

## Implementation plan

1. Create a focused branch from current `main`.
2. Add the adapter, proposed constitution and four MoneyFlow templates.
3. Add bounded references to current `AGENTS.md` and `README.md`.
4. Add the replacement PR memory and record PR #226 as superseded after the replacement PR opens.
5. Update current project memory only for open-PR/governance truth.
6. Run exact-head CI, real CodeQL analysis and secret scan.
7. Leave merge and packet archive to the owner/accepted post-merge lifecycle.

## Tasks

- [x] Inspect PR #226 metadata, changed files and stale baseline.
- [x] Inspect current `AGENTS.md`, `README.md` and current project memory.
- [x] Recreate six `.specify` artifacts on current `main`.
- [x] Align CodeQL guidance with merged PR #230.
- [x] Integrate bounded references into current entrypoints.
- [x] Create this full work packet because governance spans multiple repository policy surfaces.
- [ ] Open the replacement pull request.
- [ ] Add bounded PR records for the replacement and superseded PR #226.
- [ ] Update the open-PR memory table and audited baseline.
- [ ] Pass exact-head CI, CodeQL and secret scan.
- [ ] Prepare owner review handoff.
- [ ] Archive after merge and acceptance.

## Evaluation

### Scope review

Allowed paths are `.specify/**`, `AGENTS.md`, `README.md`, this packet, bounded PR memory and the open-PR section/baseline of current project memory. Runtime code, workflows, dependencies, schema, migrations, RLS, provider settings and production data are forbidden.

### Risk and rollback

This is governance documentation with cross-cutting process impact. The main risk is authority ambiguity or stale CI guidance. Prevention is explicit precedence, bounded coexistence rules and exact-head knowledge/CodeQL evidence.

Rollback is one squash revert removing `.specify/**` and the bounded entrypoint/memory references. Existing feature artifacts under `specs/` remain historical feature evidence and do not require runtime rollback.

### Verification

Required:

- diff hygiene;
- project knowledge contract;
- CI classification contract;
- real CodeQL initialization and analysis;
- secret-history scan.

Application install/lint/typecheck/test/build, database reset/pgTAP and browser/UI evidence are not applicable unless selected because no executable product boundary changes.

## Handoff record

- 2026-08-03: owner instructed continuation after PR #229 merged.
- 2026-08-03: PR #226 was confirmed open, stale and non-mergeable.
- 2026-08-03: clean current-main adapter implementation prepared on `chore/adopt-spec-kit-current-main`.

### Current permission boundary

Branch and documentation writes only. No merge, deployment, provider mutation, dependency installation or production-data access.
