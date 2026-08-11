# Reconciliation import evidence and exact-difference matching

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #335
**Last updated:** 2026-08-10

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is Class 3 financial/trust work. It does not authorize merge or production/provider/database writes.

## Outcome

Strengthen the existing MoneyFlow reconciliation loop without rebuilding it: imported ledger rows expose their durable Inbox/import source evidence inside reconciliation, and a pending account leg whose signed impact exactly equals the current nonzero statement difference is surfaced as a deterministic review candidate. The user still decides whether the transaction appears on the statement.

## Repository reconnaissance

### Current behavior

- Baseline: `main@ca23b1f74cf4b886072e81276f325d87672dcd08`.
- Reconciliation is already merged: PR #261 (`2d8550f739f179fcd42a8fb029c1091467b97847`) owns the database/domain contract; PR #263 (`c54b80750f9a82bd0a32926cc2dd1ca0dd6ef4c1`) owns `/accounts/[accountId]/reconcile`.
- Current behavior already includes statement date/balance, pending/cleared account-leg state, exact difference, zero-only completion, stable completed snapshots and latest-only reopen.
- Transfer legs remain account-scoped and independent; split siblings for one transaction/account mutate together.
- Historical PR #222 is superseded evidence only. Its useful invariants were ported to current main by #261; the stale branch is not reused.
- PR #183 already owns import provenance and atomic Inbox approval. Approved imported items become ordinary ledger transactions and keep `transaction_import_provenance` under tenant RLS.
- PR #255 already owns independent `needs_review` / `reviewed` transaction review state. Review, Inbox status and reconciliation state must stay separate.

### Relevant repository areas

| Area | Role in this slice | Decision |
|---|---|---|
| `src/lib/reconciliation.ts` | current financial reconciliation authority | reuse unchanged |
| `src/lib/account-register.ts` | signed account-leg impact | reuse unchanged |
| `src/app/actions/reconciliation.ts` | four authoritative mutation RPCs | reuse unchanged |
| `src/server/reconciliation.ts` | current reconciliation state loader | reuse unchanged |
| `transaction_import_provenance` | durable imported-source evidence | read through existing RLS; no migration |
| `src/lib/reconciliation-import-evidence.ts` | new pure labels + exact-difference helper | bounded addition |
| `src/server/reconciliation-import-evidence.ts` | new viewer/RLS-backed provenance read | bounded addition |
| reconciliation route/workspace | present evidence and hint | bounded change |
| reconciliation Playwright | existing end-to-end proof | extend |

### Existing tests and constraints

- Unit: `src/lib/reconciliation.test.ts` plus new focused import-evidence tests.
- Database/RLS: existing reconciliation, split-leg, locking, correction, read-model and import-provenance pgTAP remain authoritative.
- Browser: `e2e/account-reconciliation-workspace.spec.ts` already proves start/clear/complete/reopen, nonzero blocking, phone width and unknown-account isolation.
- Product laws: integer money, no direct balance writes, transfer neutrality, split exactness, tenant RLS, no inferred financial mutation.

### Similar implementation and recent history

- Existing reconciliation mutations reload canonical state after every authenticated RPC.
- Existing import approval stores provenance once and links it to the approved ledger transaction.
- This slice does not create statement-row accounting, a second ledger, a matching table or a new reconciliation state.

### Reuse-first declaration

- Existing MoneyFlow implementation reviewed: **#261/#263 and current source/tests**.
- Historical reconciliation implementation reviewed: **#222 as candidate history only**.
- Existing import primitives reused: **#183 provenance + atomic approval; no parser rewrite**.
- Existing transaction/account semantics reused: **account register, transfer legs, split account legs and current reconciliation RPCs**.
- New code exists only for: **read-only provenance enrichment, one pure exact-difference review hint, UI presentation and tests**.

### Open questions

- [x] New reconciliation state? **No.**
- [x] Auto-clear on amount equality? **No.** Equality is a search aid, not proof.
- [x] New database migration? **No.** Existing provenance columns/RLS are sufficient.

## Research

### Research scope and source selection

- Decision question: what small matching aid strengthens reconciliation without asserting a false financial match?
- Reference map consulted: not required; current MoneyFlow executable contract is primary.
- Source budget: two first-party product workflow references.
- Expected decision: preserve human-controlled matching and zero-difference completion.

### Questions researched

1. Do mature reconciliation flows retain explicit user matching and exact-zero completion?
2. Are suggested matches aids rather than authority to silently reconcile?

### Sources

| Source | Authority/type | Date accessed | Applied finding | Limits |
|---|---|---|---|---|
| Intuit QuickBooks Online, `Reconcile an account` | first-party workflow | 2026-08-10 | statement ending balance/date, user-selected matches, live cleared balance/difference, finish at zero, history afterward | bank connectivity and AI-specific features not adopted |
| Xero Central, `Find transactions to match to bank statement lines` | first-party workflow | 2026-08-10 | matching tools help locate existing transactions while the user selects what reconciles | invoice/bill/bank-feed semantics not adopted |

### Alternatives considered

| Option | Benefit | Risk | Decision |
|---|---|---|---|
| Rebuild around statement rows | statement-centric | duplicates proven model, large migration | reject |
| Auto-clear exact amount | fast | coincidental amounts become false trust | reject |
| Source evidence + exact-difference candidate | small, deterministic, reuse-first | candidate can be non-unique | selected |
| Fuzzy merchant/date matching | richer matching | new confidence policy and much larger scope | defer |

### Research decision

Current MoneyFlow already implements the core reconciliation pattern. The missing trust connection is visible import provenance and a deterministic way to narrow a difference. Exact equality is presented only as `Kiểm tra giao dịch này`; no state mutation is triggered by the helper.

### Adoption review

Not applicable. No dependency, provider, service, framework or architecture pattern is added.

## Specification

### Problem

Imported transactions become correct ordinary ledger rows, but reconciliation currently hides their durable import source. When a difference remains, the user must scan pending rows even when one row exactly explains the difference numerically.

### User stories

- As a user, I can see source evidence for an imported ledger row while comparing it to a statement.
- As a user, I can see which pending row exactly equals the current difference so I know what to inspect next.
- As a user, I remain the authority who marks the row as matched.

### Acceptance criteria

- [ ] REI-AC1: #261/#263 reconciliation semantics and the four mutation RPCs remain unchanged.
- [ ] REI-AC2: authenticated rows can show existing own-row import provenance with no schema change.
- [ ] REI-AC3: source/source-row/original description are shown only when evidence exists; none is invented.
- [ ] REI-AC4: exact-difference helper returns only eligible `pending` rows with `impact === difference` for a nonzero safe-integer difference.
- [ ] REI-AC5: zero/unsafe difference, later-date, cleared and reconciled rows do not qualify.
- [ ] REI-AC6: hint never auto-clears or auto-completes; the existing user action remains required.
- [ ] REI-AC7: transfer and split correctness continue through existing account-leg impact/logical-row semantics.
- [ ] REI-AC8: provenance read failure is non-blocking and does not fabricate evidence.
- [ ] REI-AC9: existing reconciliation unit/browser/security behavior remains green.
- [ ] REI-AC10: no AI/API, bank aggregation, parser rewrite, direct balance adjustment or unrelated feature is added.

### Required states

- Loading: no new client fetch; server route loads state/evidence.
- Empty: non-imported rows render normally.
- Populated: compact `Nguồn nhập` evidence; exact candidate shows explicit review-only copy.
- Validation/error: provenance read errors are scoped, non-blocking status; core reconciliation errors remain authoritative.
- Recovery/undo: pending↔cleared and latest-only reopen unchanged.
- Long data / large VND: source text wraps safely; `MoneyValue` remains money owner.
- Mobile/tablet/desktop: evidence must not create horizontal overflow or hide action controls.
- Accessibility: evidence/hint use text, not color alone; existing accessible action names remain.

### Financial and security constraints

- No guessed transaction identity or silent match.
- Integer money and existing difference formula stay authoritative.
- Provenance reads use existing authenticated RLS and no service-role/client user-id override.
- Imported transactions remain one ledger model after Inbox approval.

### Out of scope

- fuzzy matching or confidence scoring;
- persistent statement-line match records;
- import parser changes;
- direct statement upload from reconciliation;
- auto-clear/auto-complete;
- bank feeds;
- reconciliation adjustments/direct balance writes;
- unrelated planning/reporting/UI work.

## Implementation plan

### Architecture fit

`src/lib/reconciliation-import-evidence.ts` owns the pure hint and serializable evidence vocabulary. `src/server/reconciliation-import-evidence.ts` performs bounded reads from the already-RLS-protected provenance table. The existing route composes this read with the current reconciliation loader. The existing reconciliation component only presents evidence/hints; all financial writes continue through unchanged reconciliation actions/RPCs.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/reconciliation-import-evidence.ts` | pure candidate helper + evidence labels/types | keep new logic testable and non-writing |
| `src/lib/reconciliation-import-evidence.test.ts` | counterexamples and labels | deterministic proof |
| `src/server/reconciliation-import-evidence.ts` | chunked RLS provenance SELECT | reuse current import evidence safely |
| reconciliation route | parallel load state + evidence | no client waterfall |
| reconciliation page + evidence component/module | show source/hint | calm bounded UI |
| reconciliation e2e | prove hint before manual clear and zero after clear | user-flow proof |
| PR packet/memory | durable rationale/evidence | handoff truth |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: rows without provenance behave exactly as before.
- Rollback: revert PR #335; no persisted shape introduced.

### Risks and counterexamples

| Risk | Prevention/test |
|---|---|
| coincidental equal amount | hint says inspect; no write path |
| multiple equal rows | all remain candidates; no false winner |
| later or already-cleared row | pure helper excludes it |
| provenance query failure | discard source evidence and keep core reconciliation usable |
| cross-tenant ID | existing RLS hides row |
| transfer/split drift | current account-register and reconciliation row/RPC owners remain unchanged |
| stale #222 logic | current #261/#263 wins |

### Verification plan

- Static: knowledge/diff/CI policy, deployment, CSS ownership, architecture, lint, typecheck.
- Unit/domain: complete `npm run test`, including focused hint tests.
- Database: schema unchanged; CI correctly may classify DB reset/pgTAP as not required. Do not claim skipped tests ran.
- Browser: reconciliation E2E and selected browser smoke.
- Responsive/visual: cross-device audit because UI changes.
- Security: CodeQL and secret-history scan.
- Production/manual: separate post-merge owner decision; no production mutation in this PR.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Reconstruct current contract and #222 supersession | none | current source/#261/#263/#222 | done |
| T2 | Reuse import provenance boundary | T1 | #183 schema/RLS/source | done |
| T3 | Implement provenance read/types | T2 | current PR diff | done |
| T4 | Implement exact-difference helper/tests | T1 | current PR diff | done |
| T5 | Render source evidence + review-only hint | T3,T4 | current PR diff | done |
| T6 | Extend browser regression | T5 | current PR diff | done |
| T7 | Record PR memory | T3-T6 | `PR-335.md` | done |
| T8 | Run exact-head Class 3 gates | T3-T7 | CI/CodeQL/secret | evaluating |
| T9 | Evaluate ACs and findings | T8 | actual diff + exact-head evidence | blocked on T8 |
| T10 | Owner merge/production decision | T9 | explicit owner instruction | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-10 | owner | researcher | discovery | mission | mission framing assumed reconciliation might need rebuilding | inspect current main |
| 2026-08-10 | researcher | planner | specified | #261/#263 current implementation, #222 history, #183 provenance, first-party research | runtime enrichment unverified | implement bounded slice |
| 2026-08-10 | implementer | evaluator | evaluating | PR #335 implementation + focused tests | exact-head gates not complete | inspect CI, fix findings, rerun |

### Current permission boundary

- Granted: branch/PR/test/CI writes in `Thunderkill016/moneyflow` for #335.
- Forbidden: `main`, production database/data/Auth/provider writes, branch protection and unrelated PR changes.
- Human approval required before: merge or any production/provider mutation.
- Stop if: a new financial model, provenance mutation, direct balance adjustment or parser redesign becomes necessary.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| REI-AC1..10 | implementation present; exact-head gates running | pending |

### Research and adoption evidence

- Selected first-party workflows still support human-controlled matching and exact-zero completion.
- Bank-feed/accounting/AI-specific features remain excluded.
- No new dependency/adoption review required.

### Review findings

- Correctness: pending exact-head unit/e2e results.
- Security/ownership: no new write path or schema; RLS-backed provenance read only; pending CodeQL.
- UI/UX/accessibility: explicit textual source/hint; pending browser/cross-device gates.
- Maintainability/duplication: current financial owners preserved; new logic isolated.
- Scope compliance: no Atoryn, AI, bank sync, parser or unrelated feature work.

### Remaining limitations

- No fuzzy or persistent statement-line matching.
- No production acceptance is claimed by this PR.

## Delivery record

- Branch: `feat/reconciliation-import-evidence`
- PR: #335
- Squash commit: pending
- CI run: full Class 3 run in progress; first run found only packet trailing whitespace and is superseded after this fix
- Production deployment: not authorized
- Production flow verified: no
- Work packet moved to `docs/plans/completed/`: no
