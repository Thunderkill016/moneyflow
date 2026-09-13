# #592 — Activity 2.0 unified maintenance workstream MVP

**Status:** evaluating
**Execution state:** evaluation
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** GitHub #592 / PR #593
**Parent intent:** #559
**Last updated:** 2026-09-13

Follow `AGENTS.md` and `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet authorizes only Activity 2.0 rollout R1 on `feat/592-activity-workstream`.

## Outcome

Add an additive `/activity` surface that presents posted ledger facts, pending Inbox evidence and transaction review work as one chronological maintenance workstream without creating a second financial truth model or a new mutation path.

## Repository reconnaissance

- Baseline: `main@77def2218dfb1a66134bbefe8158c993b960ebf6`.
- `/transactions` owns posted ledger facts. `transaction_review_feed` becomes `reviewStatus` on those same transactions; `needs_review` is not a separate record type.
- `/inbox` owns pre-ledger candidates. `loadInboxForClient()` preserves demo localStorage and authenticated local-to-server migration/list behavior.
- Candidate duplicate/transfer annotation and readiness already live in `src/lib/inbox/detect.ts` and `src/lib/inbox/readiness.ts`; Activity must reuse them rather than fork truth.
- Authenticated candidate mapping may carry source lifecycle/match/provenance. Current posted transaction feed does not prove source/provider state, so Activity must not fabricate it for ledger rows.
- Existing `/transactions` and `/inbox` remain mutation owners and rollback surfaces throughout R1.
- Primary IA remains `Giao dịch` at `/transactions`. After a clean route/browser proof, R1 may add only a secondary Activity affordance; primary promotion is R2 and separately authorized.

Relevant implementation boundaries:

| Area | R1 role |
|---|---|
| `src/server/finance.ts` | authoritative posted transaction + review read; reuse unchanged |
| `src/hooks/client-inbox*.ts` | candidate load/migration compatibility; reuse unchanged |
| `src/lib/inbox/detect.ts` / `readiness.ts` | authoritative candidate detection/readiness; reuse unchanged |
| `src/lib/activity.ts` | new neutral mixed workstream model |
| `src/components/activity/*` | new presentation + partial-state ownership |
| `/transactions`, `/inbox` | existing mutation and recovery owners |

Counterexamples explicitly rejected: duplicate review rows, candidates masquerading as ledger facts, provider/source completeness inferred for posted rows, missing finance lookup context converted into fake candidate attention, or a new DB RPC added without measured need.

## Research

Focused official research reviewed 2026-09-13:

| Source | Useful pattern | MoneyFlow limit |
|---|---|---|
| Copilot Money Quick Start | focused `To Review` daily queue | no opaque suggestions/AI in R1 |
| YNAB approving/matching | imported attention + matching avoids redundant review | keep MoneyFlow ledger/reconciliation semantics |
| Actual Budget importing | stable import identity and matching avoid duplicate facts | no new matching semantics in R1 |
| Actual Budget rules | imported work follows one processing path; user-owned rules reduce cleanup | rule learning remains a later slice |

Decision: unify **attention and presentation**, not truth models. Source state is displayed only from current candidate evidence.

## Specification

### Item model

`ledger_transaction`: one item per posted transaction id. `reviewStatus` is an attribute; `needs_review` puts the item in `Cần xử lý` without duplication. Actions return to `/transactions`.

`inbox_candidate`: pending evidence only. Existing annotation/readiness decides whether it is ready or needs attention. Actions return to `/inbox`. When finance/account/category context is unavailable, readiness inference is disabled and the item remains honestly `Chờ vào sổ`.

### Data flow

```text
getFinanceWorkspace() -> posted transaction + review state \
                                                       -> buildActivityItems() -> filter/search/sort -> UI
loadInboxForClient()  -> pending candidate + provenance /

Activity action -> existing /transactions or /inbox owner -> existing mutation/recovery contract
```

R1 deliberately adds no DB Activity RPC or migration. A future optimized read bundle requires measured fan-out/latency evidence.

### Filters/search

- `Tất cả`: pending candidates + posted transactions.
- `Cần xử lý`: candidate attention + posted `needs_review` transactions.
- `Chờ vào sổ`: pending candidates only.
- `Đã vào sổ`: posted transactions only.
- Search covers user-visible merchant/note/category/account/source text; raw snippets and external source IDs are not default searchable/displayed fields.

### UI states

- **Loading:** one Activity-level loading surface; dependent counts are `—`, never fake zero.
- **Populated:** one chronological visual rhythm, but explicit text distinguishes `Chờ vào sổ`, `Cần xử lý`, `Cần xem lại`, `Đã vào sổ`.
- **Empty:** true empty offers capture/import guidance; attention-empty calmly says nothing needs action.
- **Candidate failure:** healthy ledger stays visible; incoming/combined counts are unknown.
- **Finance failure:** candidate evidence may remain visible, posted/combined counts are unknown, readiness inference is disabled, and the surface says financial history is incomplete.
- **Accessibility/responsive:** semantic list/headings, state not color-only, compact CTA target >=44px, 320px phone + desktop light/dark, no horizontal overflow.

### Rollout

**R1 — current PR:** additive `/activity`, typed model, demo/auth proof, then additive discoverability in More after route proof. `/transactions` remains primary and `/inbox` remains available.

**R2 — separate authorization:** promote `Hoạt động` into the primary `Giao dịch` position only after broader action-parity evidence; migrate global ledger search intentionally.

**R3 — separate authorization:** retire duplicated presentation after rollback evidence; consider optimized read RPC only if measured; source-health/rule-learning remain separate slices.

Non-goals: provider/bank integration, source-completeness claims, full source-health monitor, new matching/dedup semantics, learned rules/AI/auto-approval, ledger/reconciliation/transfer/trust semantic changes, production/provider writes, merge.

## Implementation plan

Implemented:

- typed `src/lib/activity.ts` model with deterministic chronological ordering, filters/search/counts and knowledge-aware partial reads;
- unit tests for no duplicate review item, candidate readiness reuse, provenance/search boundaries and partial-read honesty;
- additive `/activity` route using existing `getFinanceWorkspace()` plus existing candidate client loader;
- scoped Activity presentation/loading CSS; initial legacy global-class debt was caught by CI classifier and removed;
- demo Playwright proof and strict authenticated desktop/320px phone proof, including candidate-read failure and malformed-ledger failure;
- after first clean route proof, additive `Hoạt động` entry in `More → Công cụ hàng ngày`; primary `Giao dịch` and advanced `Cần xem` remain unchanged;
- auth navigation contract proves Activity is discoverable while Transactions/Inbox remain present.

Verification plan: policy/project knowledge, lint/typecheck/build/CSS/architecture, unit/static RLS, risk-classified database gate, demo browser, authenticated strict-double browser, cross-device UI audit, CodeQL and Secret history scan. Final acceptance requires all on the same final head and browser-log confirmation that Activity specs executed.

Rollback: remove `/activity`, Activity model/presentation/tests and the additive More entry. Existing transaction/Inbox routes, writes and DB contracts remain intact.

Permission: branch/PR writes for #592 R1 only. No direct `main` write, merge, production migration/data write, provider change, R2 or R3 retirement.

## Tasks

| ID | Task | Status |
|---|---|---|
| 592.1 | repository recon + focused research | done |
| 592.2 | pure Activity model + unit tests | done |
| 592.3 | additive route/workspace | done |
| 592.4 | demo/auth responsive + partial-error browser evidence | done on pre-nav proof head; final-head rerun pending |
| 592.5 | additive More affordance, preserving Transactions/Inbox | done; final-head rerun pending |
| 592.6 | exact-head evaluation + owner handoff | in progress |

## Evaluation

Pre-navigation proof head `e097721394794475cfa0d3f354e1405ac69c75c4` established:

- classifier, policy/project knowledge, static quality, unit/static RLS and production build: green;
- database gate: correctly skipped because no DB/migration/RLS contract changed;
- CodeQL #2702 and Secret history scan #2702: green;
- demo browser: 148/148 passed, including `e2e/activity.spec.ts` on desktop and mobile;
- authenticated browser: 28 passed / 1 intentional skip, including Activity desktop and all three Activity phone tests (mixed workstream, candidate failure, ledger failure).

That proof satisfied the R1 condition to add secondary discoverability. A new final head now includes the More affordance and its navigation contract, so **the pre-navigation green run is evidence, not final acceptance**. PR #593 remains draft until the new exact head passes required CI/browser/UI/security gates. No merge or production/provider action is authorized.
