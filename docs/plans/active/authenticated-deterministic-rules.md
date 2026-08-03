# Authenticated deterministic rules

**Status:** implementing  
**Execution state:** candidate  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** #264 / #265  
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet owns the persisted deterministic categorization-rule slice from roadmap issue #53. It does not authorize production DDL, production data writes or merge.

## Outcome

An authenticated MoneyFlow user can create, edit, enable, order and delete tenant-owned categorization rules, preview the exact first-match result before persistence, and apply a specific immutable rule revision to a pending Inbox candidate without writing a ledger transaction or changing the candidate's raw source text.

## Repository reconnaissance

- Baseline: `main@c54b80750f9a82bd0a32926cc2dd1ca0dd6ef4c1`.
- Existing `/rules` was a browser-local stub backed by `moneyflow-rules-v1`.
- Existing rule semantics were case-insensitive `contains`, lower priority wins and first enabled match only.
- Existing authenticated Inbox persistence and atomic approval live in `inbox_candidates`, `plan_inbox_candidate` and `approve_inbox_candidate`.
- Existing rule consumers read synchronously from local storage and rules referenced category labels rather than stable IDs.
- Existing raw import evidence is retained separately and must not be rewritten by normalization.

## Research

External research is not required for this slice. The governing sources are roadmap issue #53, the merged atomic Inbox provenance contract from PR #183, the current local rule engine and MoneyFlow's existing tenant, integer-money, review-before-ledger and no-guessed-finance laws.

### Adoption review

Not applicable. No dependency, provider, service, background worker, AI model or workflow framework is introduced.

## Specification

### Deterministic evaluation

1. Rules execute only at the explicit `candidate` stage.
2. Enabled rules are ordered by ascending numeric priority.
3. Equal priority ties resolve by creation timestamp and rule ID.
4. Matching is a case-insensitive substring over merchant, note, raw source or their joined value.
5. Only the first matching rule applies.
6. A rule writes normalized category and optional merchant only.
7. Raw source text, amount, date, account and transaction kind are unchanged.
8. The preview and persisted apply path require the same rule ID and version.

### Authenticated persistence

- `inbox_rules` is tenant owned and protected by RLS.
- Authenticated targets use a real category UUID owned by the same tenant.
- Every meaningful rule change increments a monotonic version.
- Reordering is one ownership-checked database RPC.
- Candidate evidence stores `applied_rule_id` and `applied_rule_version` without deleting historical evidence when a rule is later removed.
- Server application rechecks ownership, pending status, category kind, enabled state, version and current match before normalization.

### Demo parity

- Demo rules stay browser local.
- Legacy `moneyflow-rules-v1` records upgrade to the v2 candidate/version contract.
- Demo create, edit, toggle, reorder, delete and preview follow the same pure TypeScript semantics.

### UX

- `/rules` uses the user's actual active categories.
- Users can preview arbitrary text without persisting or posting it.
- Copy explicitly states that rules do not auto-post transactions.
- Version and priority are visible.
- Optimistic-version conflicts ask the user to reload rather than silently overwriting another edit.
- Low-confidence, duplicate and transfer review boundaries remain unchanged.

### Acceptance criteria

- [x] Rule domain has explicit stage, priority, enabled state and version.
- [x] Legacy demo rules upgrade without inventing category IDs.
- [x] Preview is pure, deterministic and includes matched rule revision.
- [x] Authenticated rules persist in a tenant-owned RLS table.
- [x] Cross-tenant category targets are rejected below the UI.
- [x] Rule reorder is atomic and ownership checked.
- [x] Candidate normalization records rule ID/version and preserves raw source.
- [x] Server rejects stale, disabled, nonmatching and cross-tenant applications.
- [x] `/rules` supports create, edit, toggle, reorder, delete and preview.
- [ ] Authenticated rule loading is wired into every current rule consumer.
- [ ] Candidate provenance is round-tripped through TypeScript mappings and Inbox reads.
- [ ] Permanent browser coverage proves demo CRUD, ordering and preview.
- [ ] Exact-head knowledge, architecture, lint, typecheck, unit, build, database, pgTAP, browser, CodeQL and secret scan pass.
- [ ] Independent evaluation finds no blocking financial, tenant-isolation or accessibility issue.

## Implementation plan

1. Version the pure rule contract and migrate local v1 data.
2. Add preview helpers and unit regressions.
3. Add `inbox_rules`, RLS, version trigger, candidate evidence and narrow RPCs.
4. Add tenant/ordering/version/raw-preservation pgTAP.
5. Add viewer-scoped loader, validated Server Actions and demo/authenticated client facade.
6. Rebuild `/rules` against actual categories.
7. Wire authenticated rules into paste, import and direct-entry consumers.
8. Round-trip applied rule evidence through candidate mappings and approval provenance.
9. Add browser regression and run Class 3 exact-head evaluation.

## Risks and defenses

| Risk | Defense |
|---|---|
| same input produces different result | stable priority/tie order plus immutable version evidence |
| category label rename breaks a rule | authenticated rules store category UUID and load current label |
| cross-tenant category or candidate reference | RLS plus security-definer ownership/category checks |
| stale preview applies a changed rule | expected version is required and rechecked in the RPC |
| raw import text is normalized | RPC updates only category/name and optional merchant; pgTAP asserts raw equality |
| rule deletion destroys history | candidate evidence is not a cascading foreign key |
| low-confidence candidate silently posts | rules never call approval or ledger RPCs |
| application deploy precedes DDL | loader and actions report feature unavailable without fabricated data |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | issue, branch and draft PR from current main | done | #264, #265, `c54b8075` baseline |
| T2 | pure versioned rule domain and tests | done | `rules-store*`, `apply-rules*` |
| T3 | RLS schema, RPCs and pgTAP | candidate | migration and database test |
| T4 | server loader, actions and client facade | candidate | `src/server/rules.ts`, actions, hook |
| T5 | authenticated `/rules` workspace | candidate | route and component |
| T6 | integrate all rule consumers | todo | paste/import/direct-entry |
| T7 | rule provenance mappings | todo | Inbox types/mappings/actions |
| T8 | browser regressions | todo | Playwright |
| T9 | exact-head CI and independent evaluation | todo | GitHub checks and review |
| T10 | owner merge decision | blocked | separate explicit command |
| T11 | production migration and authenticated smoke | blocked | separate explicit command |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-04 | owner | implementer | implementing | explicit `tiếp theo`, roadmap #53 | local-only rules were not authenticated | implement focused branch and draft PR |
| 2026-08-04 | implementer | CI/evaluator | candidate | domain, migration, loader/actions and workspace | consumer integration and exact-head evidence incomplete | finish integration, run CI, fix findings |

## Permission boundary

Granted: focused branch writes, issue/PR metadata, repository tests and CI.

Forbidden without a separate owner command: merge, production migration, production data mutation, provider/config changes, deployment acceptance and production smoke.

## Delivery record

- Branch: `feat/authenticated-deterministic-rules`
- Issue: #264
- PR: #265
- Baseline: `c54b80750f9a82bd0a32926cc2dd1ca0dd6ef4c1`
- Production DDL: not authorized
- Production data: not accessed or changed
