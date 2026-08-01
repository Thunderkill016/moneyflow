# Separate transaction contracts, category presentation and demo fixtures

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** AI agent; human owner controls merge and acceptance  
**Issue/PR:** #156 / pending PR  
**Last updated:** 2026-08-01

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Production transaction contracts, category presentation metadata and demo fixtures have distinct owners. Production/core code can no longer depend on a module whose authority is sample data, while runtime behavior and fixture values remain unchanged.

## Repository reconnaissance

### Current behavior

`src/lib/sample-data.ts` currently contains:

- production transaction and mutation contracts;
- category icon/color presentation metadata;
- demo accounts, categories and transaction fixtures.

Issue #156 records this as a real ownership defect. `ARCHITECTURE.md` already says production contracts must not be owned by sample/demo data, and `check-architecture.mjs` should enforce only proven boundaries.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/sample-data.ts` | Mixed authority | Split and remove |
| `src/lib/transactions/` | Neutral transaction-domain owner | Add contracts and presentation modules |
| `src/lib/demo/` | Explicit fixture owner | Add fixtures |
| `scripts/check-architecture.mjs` | Existing dependency gate | Prevent production imports from demo fixtures and retired sample barrel |
| `ARCHITECTURE.md` | Boundary source of truth | Clarify owner paths |

### Existing tests and constraints

- Runtime values and behavior must not change.
- No schema, RPC, RLS, Server Action, UI redesign or new repository/service layer.
- Full CI is required because imports span many surfaces.

### Similar implementation and recent history

- Issue #156 defines the exact bounded scope.
- PR #179 introduced explicit state, handoff and permission contracts.

### Open questions

- [x] Which authorities are mixed? Contracts, presentation metadata and demo fixtures.
- [x] Is a new architecture layer needed? No; neutral modules inside the existing modular monolith are sufficient.

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
| `actualbudget/actual` | Finance product repository | 2026-08-01 | Mature finance products keep core models separate from sample/demo concerns | Its local-first architecture and scale do not apply wholesale |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep one file and rename it | Minimal diff | Mixed authority remains | Reject |
| Create domain, presentation and demo modules under existing `src/lib` | Clear ownership with no new runtime layer | Import migration required | Select |
| Introduce repository/service/domain packages | Strong formal separation | Excessive architecture for current scale | Reject |

### Research decision

Split by authority and reason-to-change, not by framework template. Keep all modules inside the current modular monolith. Add an import rule only after the replacement paths exist.

### Adoption review

No dependency, provider, framework or service is added. Concepts only; rollback is restoring the single file and import paths.

## Specification

### Problem

Production code imports contracts from `sample-data.ts`, while the same module owns presentation and demo fixtures. This obscures authority and makes accidental production-to-demo dependencies likely.

### User stories

- As a maintainer, I can find production transaction contracts in a neutral domain path.
- As a UI maintainer, I can change category presentation without touching demo fixtures or transaction contracts.
- As a developer, I cannot import demo fixtures from production/core modules without CI failing.

### Acceptance criteria

- [ ] Production contracts live in a neutral transaction module.
- [ ] Category icon/color metadata lives in a distinct presentation module.
- [ ] Demo accounts/categories/transactions live in an explicit demo-fixture module.
- [ ] `sample-data.ts` is removed.
- [ ] All imports use the new owners.
- [ ] Architecture gate rejects imports from the retired barrel and production/core imports from demo fixtures.
- [ ] Fixture values and runtime behavior remain unchanged.
- [ ] Full exact-head CI passes.

### Required states

- Loading/empty/populated/error/recovery/mobile/accessibility: unchanged; this is an ownership-only refactor.

### Financial and security constraints

- Integer VND values and transaction shapes remain unchanged.
- No schema, RLS or authenticated ownership behavior changes.

### Out of scope

- Ledger redesign, provenance/reconciliation, UI redesign, schema changes, repository/service layer or fixture content changes.

## Implementation plan

### Architecture fit

- `src/lib/transactions/contracts.ts` owns stable transaction/account/category contracts.
- `src/lib/transactions/category-presentation.ts` owns category icon/color defaults.
- `src/lib/demo/transaction-fixtures.ts` owns demo data and may depend on contracts/presentation.
- Production modules may depend on contracts/presentation, never on demo fixtures.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| New transaction modules | Move contracts and presentation metadata | Separate authorities |
| New demo fixture module | Move all sample values | Isolate demo concern |
| Importers | Point to exact owner | Remove ambiguous barrel |
| `sample-data.ts` | Delete | Eliminate mixed authority |
| Architecture checker/docs | Add proven import boundary | Prevent regression |

### Data and migration impact

- Schema/migration/backfill: none.
- Compatibility: TypeScript import-only refactor; runtime objects remain identical.
- Rollback: restore old file/imports.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Circular dependency between fixtures and presentation | Fixtures depend one-way on contracts/presentation |
| Runtime value drift | Copy exact constants and run full CI/browser smoke |
| Type-only import rules break Node tests | Preserve explicit `.ts` extension for runtime imports inside `src/lib` |
| Checker blocks legitimate demo surfaces | Scope rule by importer path and exact demo module |

### Verification plan

- Static: architecture, lint, typecheck.
- Unit/domain: full test suite.
- Database: full CI regression.
- Browser/responsive: full CI regression.
- Production/manual: no behavior change; no special production action.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Create separate authority modules | plan | exact copied values/types | in progress |
| T2 | Remove old barrel and migrate imports | T1 | typecheck/build | todo |
| T3 | Add architecture regression rule/docs | T2 | `check:architecture` | todo |
| T4 | Open PR and run exact-head CI | T3 | PR/CI | todo |
| T5 | Evaluate diff against #156 | T4 | acceptance matrix | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-01 | researcher/planner | implementer | implementing | issue #156, architecture map, this packet | Importer list must be proven by typecheck/CI | Create modules and migrate imports |

### Current permission boundary

- Granted scope: `branch_write` on `agent/separate-transaction-authorities`.
- Exact resources: issue #156 and files listed in the plan.
- Forbidden writes: `main`, database/provider/production data, unrelated UI/domain changes.
- Human approval required before: merge or scope expansion.
- Stop condition: runtime behavior/value changes or need for a new layer beyond the plan.

## Evaluation

### Acceptance evidence

Pending implementation and exact-head CI.

### Research and adoption evidence

The selected sources support ownership/dependency direction; their heavier architecture templates remain intentionally unadopted.

### Review findings

Pending.

### Remaining limitations

This slice clarifies transaction/sample ownership only; it does not reorganize every domain module.

## Delivery record

- Branch: `agent/separate-transaction-authorities`
- PR/CI/merge/deployment: pending
