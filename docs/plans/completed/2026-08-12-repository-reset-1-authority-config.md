# Repository Reset 1 — knowledge, authority and configuration

**Status:** accepted
**Execution state:** accepted
**Active role:** human_owner — merge is the final repository transition
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #360
**Last updated:** 2026-08-12

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This completed packet records
the post-merge accepted state of bounded Repository Reset 1. Owner merge of #360 is
the final repository transition; this record does not authorize Reset 2 source
deletion, product/UI work, provider writes or production changes.

## Outcome

A fresh agent entering through `AGENTS.md` can identify MoneyFlow, current truth, the next sequence, the authority route for a decision, and applicable delivery and permission boundaries without searching historical PR records. Current authority is compact and singular; historical evidence remains available but is not on the default read path.

## Repository reconnaissance

### Current behavior

- `README.md` mixes product orientation, a long sources-of-truth list, runtime/configuration instructions and historical product-phase narrative.
- `CURRENT_PROJECT_MEMORY.md` is the current-status authority but contains a long chronology of completed provider and P3 work.
- `docs/plans/active/` contains historical or superseded packets alongside the active MoneyFlow Trust program, so filename discovery alone does not identify active work.
- `CLAUDE.md` is a thin adapter to `AGENTS.md`; `.claude/settings.json` invokes current local safety hooks. `.specify/` is a bounded Spec Kit adapter. `.agents/` contains reusable skills, including duplicate vendor copies that require evidence before any retirement.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md`, `README.md`, `docs/context/README.md` | Normal entry path and authority routing | compact, route existing authorities |
| `docs/research/CURRENT_PROJECT_MEMORY.md` | Current implementation truth | replace chronology with current state and provenance pointers |
| `docs/plans/active/`, `docs/plans/completed/` | Execution-state authority and history | retain one active program/packet; archive stale packets only with reference checks |
| `docs/product/`, `ARCHITECTURE.md`, `docs/engineering/` | Product, architecture and delivery authority | retain their existing ownership |
| `.agents/`, `.claude/`, `.specify/`, `CLAUDE.md` | Agent adapters and real harness integration | retain real hooks/adapters; remove no tool support without dependency evidence |
| `docs/configuration.md`, `docs/deployment.md`, `.env.example`, `vercel.json`, workflows and policy scripts | Configuration/deployment/gate authority | reconcile routing and add only concrete deterministic checks |

### Existing tests and constraints

- `npm run check:knowledge` and `npm run test:ci-policy` are mandatory documentation-policy gates.
- `scripts/check-project-knowledge.mjs` and `scripts/project-knowledge-contract.test.mjs` are existing lightweight repository-authority guard owners.
- No production, provider, database, financial behavior, UI, source deletion or asset removal is permitted.

### Similar implementation and recent history

- P3 is accepted and archived by `#359` at `4283129`.
- `docs/plans/active/public-beta-trust.md` states the mandatory next sequence: Repository Reset 2 → Brand/Product Experience A0→J → device visual QA → owner public-beta decision.

### Open questions

- [x] Which active-packet files are still referenced by scripts or current authority?
- [x] Whether provider-specific instruction/config files provide a current tool function.

## Research

Not required. This is an internal authority/configuration audit. The repository reference maps were consulted for routing policy only; no external product, dependency, provider or architecture decision is being made.

### Adoption review

Not applicable. No dependency, provider, service, framework or runtime tool is added.

## Specification

### Problem

Current knowledge surfaces make an agent reconstruct status from verbose memory and multiple old “active” packets. This risks treating completed P3/P4 work or candidate instruction systems as current authority.

### User stories

- As a fresh coding agent, I can follow one short route to the current product, project, execution, architecture and delivery authorities.
- As a maintainer, I can distinguish an active packet from archived provenance without deleting reusable historical UI/brand evidence.

### Acceptance criteria

- [x] The default entry route answers the five mission questions from current sources.
- [x] Exactly one document owns current implementation/project status; post-merge,
  the parent program names Repository Reset 2 as immediate next work.
- [x] Completed/superseded packets are not discovered as active execution work, and
  no retained route targets a missing packet.
- [x] Agent adapters retain only current tool functions and defer to the same
  repository authority.
- [x] Configuration/deployment/gate documentation has one route per concern and
  matches shipped configuration without changing provider semantics.
- [x] Deterministic guards prevent each concrete authority-routing regression found.
- [x] Historical brand/UI failure evidence remains discoverable for future A0 review.

### Out of scope

- Reset 2 source or asset deletion; UI/brand implementation; financial, schema, auth, provider, deployment or production changes; new governance frameworks; changes to CI semantics, workflow permissions, branch protection or `CODEOWNERS`.

## Implementation plan

### Architecture fit

Keep authority in existing layers: product principles, architecture, current memory, active execution packet, delivery policy and research router. The existing project knowledge checker is the executable owner for simple authority invariants.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| entry/context/current-memory documents | establish compact explicit authority route | satisfy fresh-agent discovery without a new framework |
| active/completed plan lifecycle | archive stale execution packets after reference audit | remove competing active state |
| agent adapters/config docs | clarify delegation to shared authority, retain live tooling | avoid parallel instruction systems |
| project-knowledge checker/tests | guard current authority route and active packet lifecycle | prevent demonstrated regressions |

### Data and migration impact

None. No schema, database, provider or deployment mutation.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Valuable historical UI evidence disappears | retain it as historical/reusable input and route A0 to it |
| An archived packet still has a live reference | repository-wide reference scan and guard fixture |
| Documentation claims a config differently from code | inspect env example, `vercel.json`, deployment validator and workflows |
| A thin adapter becomes a competing authority | explicit adapter wording and fresh-context evaluation |

### Verification plan

- Static/policy: `npm run check:knowledge`, `npm run test:ci-policy`, focused guard tests and link/reference scans.
- Typecheck: `npm run typecheck` if JavaScript guard code changes.
- Database/browser/provider/production: not applicable; no affected boundary.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| RR1-T1 | inventory authority, config and agent surfaces | packet | paths, references and code/config audit | complete |
| RR1-T2 | route/compact current authority and archive stale packets safely | RR1-T1 | default-path review and reference scan | complete |
| RR1-T3 | add focused authority/lifecycle guard | RR1-T2 | focused test + policy checks | complete |
| RR1-T4 | fresh-context evaluation and PR delivery | RR1-T3 | evaluator matrix, exact-head checks, PR memory | complete |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-12 | planner | implementer | implementing | this packet; `npm run agent:doctor`; baseline `main@4283129` | stale packet and config-reference audit in progress | complete scoped authority/config edits |
| 2026-08-12 | implementer | evaluator | evaluating | #360; `check:migrations`, `check:knowledge`, `test:ci-policy`, typecheck; fresh evaluator | local Next build runner did not reach completion; exact-head provider checks pending | push PR-memory update and request exact-head CI |
| 2026-08-12 | evaluator | implementer | implementing | exact-head CI failure artifact | README lost the required MVP-definition link during compaction | restore the routed released-MVP reference and rerun gates |
| 2026-08-12 | implementer | evaluator | ready_for_review | #360 exact-head CI: verify, database, e2e, Gitleaks and CodeQL pass; browser/UI skips classified | owner review/merge only; no production boundary applies | await owner review; do not merge autonomously |
| 2026-08-12 | evaluator | human_owner | accepted | fresh-context post-merge authority audit clean; final lifecycle amendment; exact-head CI required again on amended head | owner merge remains required before this accepted record becomes `main` truth | merge #360 when owner approves; then begin no Reset 2 work until separately started |

### Current permission boundary

- Granted scope: one focused branch and repository-documentation/guard changes.
- Forbidden writes: `main`, merge, history rewrite, source/assets deletion, providers, secrets, workflows/permissions, production, database and financial data.
- Stop condition: a required deletion or config action lacks static reference evidence, or a finding crosses Reset 2/product scope.

## Evaluation

| Criterion | Evidence | Result |
|---|---|---|
| default route answers the five questions | `README.md`, `AGENTS.md`, context authority table and compact current memory | pass — fresh-context post-merge evaluator clean |
| single current state and next execution route | current-memory route, active registry, Trust parent sequence | pass — stale P3/P4 and old roadmap claims corrected |
| active lifecycle is safe | 37 historical packets archived; registry/current-reference guard + tests | pass |
| adapters/config remain coherent | hooks, Spec Kit bridge and configuration executable surfaces inspected; no tool/config deletion | pass |
| historical UI failure evidence remains available | UI research ledger and completed UI packets routed to future A0 | pass |
| exact-head delivery gates | #360 amended head CI | pending rerun on this final lifecycle amendment |

## Delivery record

- Branch: `reset/repository-authority-config`
- PR: #360 ready for review
- Squash commit: pending owner merge
- CI run: pending exact-head rerun on lifecycle amendment
- Production deployment: not applicable
- Work packet moved to `docs/plans/completed/`: yes — accepted post-merge record;
  owner merge remains the boundary that makes it authoritative on `main`
