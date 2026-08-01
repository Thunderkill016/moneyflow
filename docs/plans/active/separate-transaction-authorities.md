# Separate transaction contracts, category presentation and demo fixtures

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** AI agent; human owner controls merge and acceptance  
**Issue/PR:** #156 / #180  
**Last updated:** 2026-08-01

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Production transaction contracts, category presentation metadata and demo fixtures now have distinct owners. Runtime demo values can no longer flow through the ambiguous `sample-data.ts` barrel. A deprecated compatibility surface remains temporarily for type/presentation imports so this architecture fix does not become a risky 63-file type-only churn.

## Repository reconnaissance

### Current behavior

Before this branch, `src/lib/sample-data.ts` directly owned:

- production transaction and mutation contracts;
- category icon/color presentation metadata;
- demo accounts, categories and transaction fixtures.

Issue #156 records this as a real ownership defect. `ARCHITECTURE.md` already required production contracts not to be owned by sample/demo data.

Initial exact-head typecheck after physically splitting the file identified **63 stale importers**. Nine imported runtime demo values; the remainder imported only types or category presentation metadata. That evidence changed the implementation plan from an all-import codemod to a smaller runtime-boundary migration.

### Relevant repository areas

| Area | Why it matters | Resolution |
|---|---|---|
| `src/lib/transactions/contracts.ts` | Stable cross-runtime contracts | New authority |
| `src/lib/transactions/category-presentation.ts` | Icon/color/name defaults | New presentation authority |
| `src/lib/demo/transaction-fixtures.ts` | Seeded demo values | New fixture authority |
| `src/lib/sample-data.ts` | Existing high-fanout import path | Deprecated compatibility re-export; cannot export fixtures or own constants |
| Runtime demo adapters/workspaces | Legitimate fixture consumers | Migrated to explicit fixture owner |
| `scripts/check-architecture.mjs` | Dependency gate | Enforces authority files and an allowlisted demo-fixture boundary |
| `ARCHITECTURE.md` | Boundary source of truth | Updated |

### Existing tests and constraints

- Runtime values and behavior must not change.
- No schema, RPC, RLS, Server Action behavior, UI redesign or new repository/service layer.
- Full exact-head CI is required.

### Similar implementation and recent history

- Issue #156 defines the bounded ownership problem.
- PR #179 introduced explicit state, handoff and permission contracts.
- CI #707 provided the full stale-import inventory; CI #709/710 safely exercised a temporary codemod against a copied source tree only.

### Open questions

- [x] Which authorities are mixed? Contracts, presentation metadata and demo fixtures.
- [x] Is a new architecture layer needed? No.
- [x] Must all 63 imports change in this slice? No; only runtime fixture imports are load-bearing. Type/presentation compatibility can be removed later without changing the authority boundary.

## Research

### Research scope and source selection

- Decision question: What is the smallest split that restores ownership clarity without introducing Clean Architecture ceremony?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Selected sources: `kgrzybek/modular-monolith-with-ddd`, `ardalis/CleanArchitecture`, `actualbudget/actual`.
- Expected decision: separate authorities by reason-to-change and enforce dependency direction, without copying package/layer structures.

### Questions researched

1. When should contracts, presentation metadata and fixtures be separated?
2. How can the boundary be enforced with the existing checker?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `kgrzybek/modular-monolith-with-ddd` | Pattern repository | 2026-08-01 | Explicit module ownership inside one deployment | Its .NET/DDD layering is much heavier than MoneyFlow needs |
| `ardalis/CleanArchitecture` | Pattern repository | 2026-08-01 | Dependencies should point toward stable business contracts | Its project/package template is not copied |
| `actualbudget/actual` | Finance product repository | 2026-08-01 | Core finance models should remain separate from demo/sample concerns | Its local-first architecture and scale do not apply wholesale |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep one file and rename it | Minimal diff | Mixed authority remains | Reject |
| Rewrite all 63 imports immediately | Removes compatibility path | Large mechanical diff with little runtime value | Reject for this slice |
| Separate owners, migrate runtime fixtures, retain restricted compatibility re-exports | Restores actual dependency direction with bounded risk | Old type/presentation import path remains temporarily | Select |
| Introduce repository/service/domain packages | Strong formal separation | Excessive architecture for current scale | Reject |

### Research decision

Split by authority and reason-to-change, not by framework template. Runtime fixtures must use the explicit demo module. The old path may temporarily re-export only contracts and presentation metadata; CI prevents it from owning constants or exposing fixtures.

### Adoption review

No dependency, provider, framework or service is added. Concepts only. Rollback is restoring the former file and imports.

## Specification

### Problem

One module owned stable production contracts, display metadata and seeded demo values. This obscured authority and allowed production/core code to acquire demo data through an ambiguous import path.

### User stories

- As a maintainer, I can find production transaction contracts in a neutral domain path.
- As a UI maintainer, I can change category presentation independently of fixtures/contracts.
- As a developer, I cannot import demo fixtures outside approved demo adapters/workspaces/tests without CI failing.

### Acceptance criteria

- [x] Production contracts live in `src/lib/transactions/contracts.ts`.
- [x] Category metadata lives in `src/lib/transactions/category-presentation.ts`.
- [x] Demo values live in `src/lib/demo/transaction-fixtures.ts`.
- [x] Runtime fixture consumers import the explicit fixture owner.
- [x] `sample-data.ts` owns no constants and exports no demo fixture.
- [x] Architecture gate asserts the owner files and restricts fixture imports to approved demo boundaries/tests.
- [ ] Fixture values and runtime behavior remain unchanged under full exact-head CI.
- [ ] Full exact-head CI passes.

### Required states

Loading, empty, populated, error, recovery, mobile and accessibility behavior are unchanged; this is an ownership-only refactor.

### Financial and security constraints

- Integer VND values and transaction shapes remain unchanged.
- No schema, RLS or authenticated ownership behavior changes.
- Demo fixture data must never become an authenticated fallback.

### Out of scope

- Removing every compatibility type/presentation import.
- Ledger redesign, provenance/reconciliation, UI redesign, schema changes or repository/service layers.

## Implementation plan

### Architecture fit

- `transactions/contracts.ts` owns stable transaction/account/category contracts.
- `transactions/category-presentation.ts` owns display defaults.
- `demo/transaction-fixtures.ts` owns seeded values and depends one-way on contracts/presentation.
- `sample-data.ts` is a deprecated compatibility re-export, not an authority.
- Explicit demo adapters/workspace loaders and tests may import fixtures; other production/core modules may not.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| Transaction modules | Move definitions/metadata | Separate authorities |
| Demo fixture module | Move exact sample values | Isolate demo data |
| Nine runtime/test consumers | Import fixture owner directly | Remove ambiguous runtime dependency |
| Compatibility barrel | Remove fixture exports and runtime constants | Safe transition for type/presentation imports |
| Architecture checker/docs | Add proven boundary and owner map | Prevent regression |

### Data and migration impact

- Schema/migration/backfill: none.
- Compatibility: old type/presentation imports continue to compile.
- Rollback: restore old module/imports.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Runtime value drift | Exact fixture copy + full CI/browser smoke |
| Demo data leaks into production fallback | Explicit allowlist and existing viewer branches |
| Compatibility barrel regains fixture exports | Architecture check scans its content |
| Checker blocks legitimate demo surfaces | Exact allowlist plus tests allowed |
| Type-only import churn hides behavior changes | Deferred; compatibility layer remains non-owning |

### Verification plan

- Static: knowledge, deployment, CSS, architecture, lint, typecheck.
- Unit/domain: full test suite.
- Database: fresh reset + pgTAP regression.
- Browser/responsive: expense smoke + cross-device audit.
- Production/manual: no behavior change; deployment smoke not required for a path-only refactor.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Create separate authority modules | plan | exact definitions/values moved | done |
| T2 | Migrate runtime fixture consumers and restrict compatibility barrel | T1 | nine explicit imports; no fixture re-export | done |
| T3 | Add architecture regression rule/docs | T2 | checker + architecture map | done |
| T4 | Run exact-head CI | T3 | PR #180 CI | in progress |
| T5 | Evaluate diff against revised bounded spec | T4 | acceptance matrix | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-01 | researcher/planner | implementer | implementing | issue #156, architecture map, original packet | Importer count unknown | Split modules and let typecheck map importers |
| 2026-08-01 | implementer | planner | planned | CI #707 importer inventory: 63 total, nine runtime fixture consumers | Full import codemod would create excessive churn | Revise to runtime-boundary migration |
| 2026-08-01 | implementer | evaluator/CI | evaluating | PR #180, explicit fixture imports, restricted barrel, architecture gate | Exact-head CI pending | Run exact-head CI and review diff |

### Current permission boundary

- Granted scope: `branch_write` on `agent/separate-transaction-authorities`.
- Exact resources: issue #156 and files in this packet.
- Forbidden writes: `main`, database/provider/production data, unrelated UI/domain changes.
- Human approval required before: merge or scope expansion.
- Stop condition: runtime behavior/value changes or need for a new layer.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Distinct owners | three new modules | pass |
| Runtime fixture boundary | nine direct fixture imports + restricted barrel | pass |
| CI enforcement | architecture checker | pending exact-head run |
| No runtime/schema behavior change | diff + full CI | pending |

### Research and adoption evidence

The selected sources support ownership/dependency direction. Their heavier architecture templates remain intentionally unadopted.

### Review findings

- Correctness: pending exact-head CI.
- Security/ownership: no provider/data writes; demo boundary is stricter.
- UI/UX/accessibility: no intended UI change.
- Maintainability: one source per authority; compatibility path is explicitly deprecated.
- Scope compliance: no framework or layer added.

### Remaining limitations

Type-only and category-presentation imports may still reference the deprecated barrel. They do not expose demo fixtures or own definitions and can migrate opportunistically in small future edits.

## Delivery record

- Branch: `agent/separate-transaction-authorities`
- PR: #180
- Exact-head CI: pending after architecture/work-packet commits
- Merge/deployment/acceptance: pending owner review
