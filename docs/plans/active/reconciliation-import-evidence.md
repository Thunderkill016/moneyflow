# Reconciliation import evidence and exact-difference matching

**Status:** planned  
**Execution state:** planned  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** pending  
**Last updated:** 2026-08-10

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is Class 3 financial/trust work. It changes application behavior around reconciliation but does not authorize production/provider/database writes or merge.

## Outcome

Strengthen the existing MoneyFlow reconciliation loop without rebuilding it: when a reconciled account contains ledger transactions created through the existing import/Inbox pipeline, the reconciliation workspace shows their durable source evidence; when the remaining statement difference exactly equals one pending account-leg impact, MoneyFlow surfaces that row as a deterministic review candidate while requiring the user to decide whether it really appears on the statement.

## Repository reconnaissance

### Current behavior

- Current `main` baseline is `ca23b1f74cf4b886072e81276f325d87672dcd08`.
- Reconciliation is already implemented and merged. PR #261 (`2d8550f739f179fcd42a8fb029c1091467b97847`) owns the database/domain contract; PR #263 (`c54b80750f9a82bd0a32926cc2dd1ca0dd6ef4c1`) owns the account-scoped user workspace.
- `/accounts/[accountId]/reconcile` already supports statement date/balance, pending/cleared account-leg state, deterministic difference, exact-zero completion, stable completed-session snapshots and latest-only reopen.
- `transaction_entries` reconciliation state is account-leg scoped: split siblings for one transaction/account mutate together while transfer legs in different accounts remain independent.
- Reconciled financial transactions reject financial rewrites; review state may still change independently.
- Import/Inbox is already a separate proven boundary. PR #183 atomically approves a candidate into the ledger and writes `transaction_import_provenance` with tenant RLS, source row, original description, parser/mapping versions, duplicate/transfer evidence and a durable transaction link.
- Imported transactions are already ordinary ledger transactions after approval; there must not be a second imported-transaction accounting model.
- The current reconciliation workspace does not expose import provenance and does not provide a deterministic aid for locating a row that exactly explains the current difference.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/reconciliation.ts` | pure reconciliation workspace/domain helpers | extend narrowly with provenance presentation data and exact-difference candidate helper |
| `src/server/reconciliation.ts` | viewer-aware reconciliation read model | reuse existing entry/session reads; add own-row provenance enrichment |
| `src/app/actions/reconciliation.ts` | canonical authenticated mutations | reuse unchanged unless type propagation requires no-op mapping changes |
| `src/components/account-reconciliation-page.tsx` | current user reconciliation flow | add source evidence and review hint; do not redesign flow |
| `src/components/account-reconciliation-page.module.css` | local reconciliation presentation owner | add bounded source/hint styles only |
| `src/lib/account-register.ts` | account-leg impact semantics | reuse unchanged |
| `transaction_import_provenance` | durable import source evidence | SELECT only through existing RLS; no schema change |
| `account_reconciliation_entry_feed` | representative logical account legs | reuse unchanged |
| `supabase/migrations/20260803142000_account_reconciliation_current_main.sql` | current reconciliation invariant authority | no edits |
| `supabase/migrations/20260801043000_import_provenance_and_atomic_approval.sql` | current import/provenance authority | no edits |
| `e2e/account-reconciliation-workspace.spec.ts` | existing full user-flow evidence | extend with exact-difference candidate flow |

### Existing tests and constraints

- Related unit tests: `src/lib/reconciliation.test.ts`, account-register/transaction tests.
- Database/RLS tests: current reconciliation pgTAP suites, workspace read-model test, import-provenance schema/invariant tests.
- Browser tests: `e2e/account-reconciliation-workspace.spec.ts` already covers start/clear/complete/reopen, non-zero completion, phone width and unknown-account isolation.
- Product/architecture rules: integer money, no direct balance overwrite, transfer neutrality, split exactness, RLS ownership, no automatic financial inference.

### Similar implementation and recent history

- Existing pattern to reuse: reconciliation Server Action mutations always reload canonical viewer-owned reconciliation state from the server after success.
- Historical PR #222 is design provenance only. It was superseded by #261; its useful invariants were reimplemented on current main rather than merged stale.
- Transaction review (#255) and import approval (#183) remain separate states/boundaries. Reconciliation must not collapse review status, Inbox status and cleared/reconciled state into one flag.

### Reuse-first declaration

- Existing MoneyFlow implementation reviewed: **yes — #261/#263 and current main source/tests**.
- Historical reconciliation implementation reviewed: **yes — #222 as candidate history only**.
- Existing import primitives reused: **yes — #183 provenance + atomic approval; no parser rewrite**.
- Existing transaction/account semantics reused: **yes — account register, transfer legs, split account legs and current reconciliation RPCs**.
- New code exists only for: **read-only import provenance enrichment and one pure deterministic exact-difference review hint**.

### Open questions

- [x] Should import provenance create a second reconciliation state? **No.** Provenance is evidence only; the existing account-leg state remains authoritative.
- [x] Should exact amount equality auto-clear a row? **No.** Equality is a deterministic search aid, not proof that the statement contains that transaction.
- [x] Is a new database migration required? **No.** `transaction_import_provenance` already has own-row RLS and the needed columns; application-side enrichment is sufficient.

## Research

### Research scope and source selection

- Decision question: what small matching aid strengthens reconciliation without silently asserting a financial match?
- Reference map consulted: not required; current MoneyFlow contract is primary.
- Source budget: two current first-party product references because external reconciliation UX is only a pattern check, not a financial-model authority.
- Expected decision: preserve human-controlled matching and zero-difference completion; use deterministic hints only.

### Questions researched

1. Do mature reconciliation flows still require users to compare/mark statement transactions and reach exact zero before completion?
2. How should possible matches be presented when a system can suggest them but cannot prove identity?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Intuit QuickBooks Online, `Reconcile an account` | first-party product workflow | 2026-08-10 | user enters ending date/balance, marks matching transactions, cleared balance changes, difference must reach zero, completed history/report remains available | business-accounting product; bank connectivity/AI features do not apply to MoneyFlow |
| Xero Central, `Find transactions to match to bank statement lines` | first-party product workflow | 2026-08-10 | matching tools help locate possible existing transactions; user still reviews/selects the records used to reconcile | Xero invoice/bill semantics and bank-feed model do not apply |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Rebuild reconciliation around imported statement rows | strongest statement-centric UI | duplicates current proven model, creates new semantics and large migration risk | reject |
| Automatically clear a row when `impact === difference` | fast | amount equality can be coincidental; creates false trust | reject |
| Show import source evidence + exact-difference candidate hint | small, deterministic, uses current contracts, user stays in control | hint may be non-unique; provenance may be unavailable | selected |
| Add fuzzy merchant/date matching now | potentially useful | requires matching policy, confidence thresholds and much larger test surface | defer |

### Research decision

Observed: current MoneyFlow already implements the standard statement-balance → mark cleared → difference zero → complete loop. External product workflows reinforce that zero difference and human comparison remain central. Inference: the highest-value missing connection is not a new reconciliation model but better evidence that a row came from a statement/import plus a deterministic way to narrow a nonzero difference. Product judgment: exact amount equality may be shown as a candidate only, never as an automatic match or cleared state.

### Adoption review

Not applicable. No dependency, provider, service, framework or architecture pattern is added.

## Specification

### Problem

A user can already reconcile an account, but imported ledger rows lose visible connection to their durable import provenance inside the reconciliation workspace. When a difference remains, the user must scan every pending row even when one pending account-leg exactly equals the difference. This weakens the trust loop without requiring a new accounting model.

### User stories

- As a user reconciling an account, I can see when a ledger transaction came through MoneyFlow's import/Inbox pipeline and inspect its source evidence so I can compare it with the statement more confidently.
- As a user with a nonzero difference, I can see any pending row whose account impact exactly equals that difference so I know which row is worth checking next.
- As a user, I remain the only authority who marks the row as matching the statement; MoneyFlow never auto-clears from a numeric coincidence.

### Acceptance criteria

- [ ] REI-AC1: current #261/#263 reconciliation semantics remain unchanged; no new reconciliation state or direct balance write exists.
- [ ] REI-AC2: authenticated reconciliation rows can carry existing own-row `transaction_import_provenance` source evidence without changing ledger/provenance schema.
- [ ] REI-AC3: imported rows visibly identify source and source-row evidence when available; absent/unavailable provenance is represented as unknown/absent, never invented.
- [ ] REI-AC4: a pure deterministic helper returns only eligible `pending` rows whose signed account-leg impact exactly equals the current nonzero difference.
- [ ] REI-AC5: zero difference, later-date rows, cleared rows and reconciled rows produce no exact-difference candidate for that row.
- [ ] REI-AC6: the UI presents the result as `kiểm tra`/candidate evidence only; it does not change reconciliation state automatically.
- [ ] REI-AC7: transfer account legs and grouped split rows keep current semantics because the hint operates on the existing account-register impact/logical entry row.
- [ ] REI-AC8: a provenance read failure does not break core reconciliation; it produces a bounded non-blocking source-evidence warning while canonical reconciliation state remains usable.
- [ ] REI-AC9: existing start/clear/exact-zero complete/history/reopen and cross-tenant behavior remain green.
- [ ] REI-AC10: no AI/LLM/API dependency, bank aggregation, parser rewrite or unrelated feature is added.

### Required states

- Loading: reuse current route loading behavior; no new async client fetch.
- Empty: rows without provenance render normally; no empty provenance card.
- Populated: imported row shows compact source evidence; exact candidate shows an explicit review hint.
- Validation/error: provenance enrichment failure is non-blocking and clearly scoped to source evidence; reconciliation data failures keep current behavior.
- Recovery/undo: current pending↔cleared and latest-only reopen remain unchanged.
- Long data / large VND: original imported description must wrap/truncate safely; money remains existing `MoneyValue`.
- Mobile/tablet/desktop: source evidence and hint must not create horizontal overflow or hide the state action.
- Accessibility: source evidence is text, not color-only; hint is understandable without icon/color; existing buttons keep accessible names.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: provenance is queried only through the existing authenticated own-row RLS table; no service-role or client-supplied user ID.
- Exact-difference suggestion is derived from signed account-leg impact and current statement difference; it never writes.

### Out of scope

- fuzzy amount/date/merchant matching;
- statement-row-to-ledger persistent match table;
- importing a statement directly from the reconciliation page;
- changing CSV/XLSX/PDF parsers;
- auto-clearing or auto-completing;
- reconciliation adjustments or direct balance writes;
- bank feeds/aggregation;
- split-line editor, transaction correction redesign or mutation-audit UI;
- non-VND reconciliation expansion.

## Implementation plan

### Architecture fit

`src/server/reconciliation.ts` already owns viewer-aware reconciliation reads and is the correct place to enrich rows with an existing tenant-scoped persistence fact. `src/lib/reconciliation.ts` owns pure calculations and is the correct place for exact-difference candidate logic. The current reconciliation page remains presentation/controller. Existing RPCs, views, import parsers and transaction mutation owners remain unchanged.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/reconciliation.ts` | add optional provenance fields and pure exact-difference candidate helper | one testable financial-trust calculation |
| `src/lib/reconciliation.test.ts` | candidate/provenance counterexamples | lock deterministic/non-writing semantics |
| `src/server/reconciliation.ts` | query own-row import provenance for loaded transaction IDs and merge metadata; non-blocking error | connect existing import evidence to reconciliation |
| `src/components/account-reconciliation-page.tsx` | render compact source evidence and exact-difference review hint | make trust evidence visible/actionable |
| `src/components/account-reconciliation-page.module.css` | local responsive styles for evidence/hint | preserve current presentation ownership |
| `e2e/account-reconciliation-workspace.spec.ts` | extend demo flow for exact-difference hint and no auto-clear | user-flow regression proof |
| capability/current task docs | correct stale reconciliation status and record bounded candidate | truthful project routing/provenance |

### Data and migration impact

- Schema/migration: none planned.
- Backfill: none.
- Compatibility: old/import-free rows have null provenance; core reconciliation behavior remains current.
- Rollback: revert the focused application/docs PR; no persisted data shape is introduced.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| two pending rows have the same impact as difference | both may be candidates; copy says inspect, not matched |
| exact amount is coincidental | no auto-clear or auto-complete; existing user action required |
| provenance query fails | keep core rows/sessions and expose non-blocking provenance error |
| imported transfer | existing account-leg impact and independent account IDs remain authority |
| split transaction | existing representative logical account-leg row remains authority |
| row occurs after statement date | helper excludes it |
| row already cleared/reconciled | helper excludes it |
| difference is zero | helper returns no candidate |
| cross-tenant transaction ID | RLS hides provenance; no user-id override |
| stale #222 behavior differs | #261/#263 current main wins |

### Verification plan

- Static: `npm run check:knowledge`, `npm run test:ci-policy`, `npm run check:deployment-env`, `npm run check:css-ownership`, `npm run check:architecture`, lint, typecheck.
- Unit/domain: full `npm run test` plus focused reconciliation tests.
- Database: no DB contract change planned; existing pgTAP RLS/transfer/split contract remains relevant. If CI runs `test:db`, it must remain green; do not claim a skipped DB shard ran.
- Browser flow: `npm run test:e2e`, including reconciliation exact-difference hint flow.
- Responsive/visual: selected cross-device audit because reconciliation UI/CSS changes.
- Production/manual: after owner-approved merge/deploy, verify one safe authenticated reconciliation workspace with an imported transaction without completing/destructively changing real financial data unless separately approved.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Reconstruct current contract and #222 supersession | none | #261/#263/current source + packet | done |
| T2 | Reuse import provenance and define enrichment boundary | T1 | #183 schema/RLS/source | done |
| T3 | Implement provenance types/server enrichment | T2 | unit/type/static evidence | todo |
| T4 | Implement exact-difference helper + counterexamples | T1 | focused unit tests | todo |
| T5 | Render source evidence + non-auto matching hint | T3,T4 | UI diff + browser evidence | todo |
| T6 | Extend browser regression | T5 | Playwright exact-difference flow | todo |
| T7 | Correct reconciliation capability docs + PR memory | T3-T6 | bounded docs record | todo |
| T8 | Run exact-head Class 3 application/UI/security gates | T3-T7 | GitHub CI/CodeQL/secret evidence | todo |
| T9 | Independent evaluation against ACs | T8 | actual diff/evidence findings | todo |
| T10 | Owner merge/production decision | T9 | explicit owner instruction | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-10 | human_owner | researcher | discovery | mission text | mission assumed reconciliation may need building | inspect current main before implementation |
| 2026-08-10 | researcher | planner | specified | current #261/#263 implementation, #222 history, #183 import provenance, first-party reconciliation workflow research | authenticated provenance enrichment not yet implemented/tested | implement bounded slice on focused branch |
| 2026-08-10 | planner | implementer | planned | this packet | no exact-head executable evidence yet | implement T3-T7 without provider writes |

### Current permission boundary

- Granted scope: focused repository branch writes and PR/CI operations for this mission.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` branch only; provider reads may be used only if needed for evidence.
- Forbidden writes: `main`, Supabase production schema/data/Auth/config, Vercel/provider config, branch protection, unrelated PRs.
- Human approval required before: merge, production/provider/database/data write.
- Rollback or stop condition: stop if the slice requires a new financial model, provenance mutation, direct balance adjustment or unrelated parser redesign; update specification before expanding scope.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| REI-AC1..10 | pending implementation and exact-head gates | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending final review.
- Important source limitations remain respected: bank connectivity/accounting-specific behavior is not adopted.
- New tool/dependency/pattern passed the adoption review, or not applicable: not applicable.

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- UI/UX/accessibility: pending.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- This slice does not persist statement-line matches or add fuzzy matching.
- It does not change the public-beta Secure/Recover sequence or claim new production acceptance.

## Delivery record

- Branch: `feat/reconciliation-import-evidence`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not authorized
- Production flow verified: no
- Work packet moved to `docs/plans/completed/`: no
