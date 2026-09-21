# #592 — Activity 2.0 unified maintenance workstream MVP

**Status:** completed
**Execution state:** completed
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
- Primary IA remains `Giao dịch` at `/transactions`. R1 may add only a secondary Activity affordance; primary promotion is R2 and separately authorized.
- `getFinanceWorkspace()` can return safe demo-shaped fallback values together with `dataError` when the authenticated Supabase client is unavailable. Activity must treat `dataError` as loss of ledger authority and must not present or reason from those fallback rows as user facts.
- `getFinanceWorkspace()` can also keep ledger facts healthy while `transaction_review_feed` is unavailable/malformed; in that state `reviewFeatureAvailable=false` and transaction rows default to a non-attention review value. Activity must not convert that unknown review coverage into a confident zero.

Relevant implementation boundaries:

| Area | R1 role |
|---|---|
| `src/server/finance.ts` | existing finance/review loader; unchanged in this slice |
| `src/hooks/client-inbox*.ts` | candidate load/migration compatibility; reuse unchanged |
| `src/lib/inbox/detect.ts` / `readiness.ts` | authoritative candidate detection/readiness; reuse unchanged |
| `src/lib/activity.ts` | new neutral mixed workstream model, fail-closed when ledger is unavailable |
| `src/components/activity/*` | presentation + partial-state/review-coverage ownership |
| `/transactions`, `/inbox` | existing mutation and recovery owners |

Counterexamples explicitly rejected: duplicate review rows, candidates masquerading as ledger facts, provider/source completeness inferred for posted rows, missing finance lookup context converted into fake candidate attention, fallback/demo ledger rows shown during authenticated outages, unknown review coverage reported as `Cần xử lý = 0`, or a new DB RPC added without measured need.

## Research

Focused official research reviewed 2026-09-13:

| Source | Useful pattern | MoneyFlow limit |
|---|---|---|
| Copilot Money Quick Start | focused `To Review` daily queue | no opaque suggestions/AI in R1 |
| YNAB approving/matching | imported attention + matching avoids redundant review | keep MoneyFlow ledger/reconciliation semantics |
| Actual Budget importing | stable import identity and matching avoid duplicate facts | no new matching semantics in R1 |
| Actual Budget rules | imported work follows one processing path; user-owned rules reduce cleanup | rule learning remains a later slice |
| Playwright reporters / CI guidance | raw reporter output and CI artifacts can prove which tests actually executed | use as evaluation evidence only; do not equate a generic green job with route-specific proof |

Decision: unify **attention and presentation**, not truth models. Source state is displayed only from current candidate evidence.

## Specification

### Item model

`ledger_transaction`: one item per authoritative posted transaction id. `reviewStatus` is an attribute; `needs_review` puts the item in `Cần xử lý` without duplication. Actions return to `/transactions`. When the finance read reports `dataError`, Activity includes zero posted items even if the upstream safe fallback object contains transaction-shaped rows. If ledger facts are authoritative but review coverage is unavailable, posted items remain visible because posting truth is known, while review-dependent attention coverage is explicitly unknown.

`inbox_candidate`: pending evidence only. Existing annotation/readiness decides whether it is ready or needs attention. Actions return to `/inbox`. When finance/account/category context is unavailable, readiness inference is disabled and the item remains honestly `Chờ vào sổ`. Candidate duplicate/transfer detection also receives no fallback ledger rows in that state.

### Data flow

```text
getFinanceWorkspace() -> authoritative posted transaction + review state ----\
                                                                        -> buildActivityItems() -> filter/search/sort -> UI
loadInboxForClient()  -> pending candidate + provenance --------------------/

if finance dataError:
  posted ledger authority = unavailable
  -> omit transaction fallback rows
  -> candidate duplicate detection gets an empty ledger
  -> readiness inference disabled

if ledger healthy but reviewFeatureAvailable=false:
  -> keep posted facts visible
  -> mark combined `Cần xử lý` count unknown
  -> show explicit review-coverage warning
  -> attention filter may show known candidate attention but is not claimed complete

Activity action -> existing /transactions or /inbox owner -> existing mutation/recovery contract
```

R1 deliberately adds no DB Activity RPC or migration. A future optimized read bundle requires measured fan-out/latency evidence.

### Filters/search

- `Tất cả`: pending candidates + authoritative posted transactions.
- `Cần xử lý`: known candidate attention + known posted `needs_review` transactions; if review coverage is unavailable the UI explicitly warns this filter can be incomplete.
- `Chờ vào sổ`: pending candidates only.
- `Đã vào sổ`: authoritative posted transactions only.
- Search covers user-visible merchant/note/category/account/source text; raw snippets and external source IDs are not default searchable/displayed fields.

### UI states

- **Loading:** one Activity-level loading surface; dependent counts are `—`, never fake zero.
- **Populated:** one chronological visual rhythm, but explicit text distinguishes `Chờ vào sổ`, `Cần xử lý`, `Cần xem lại`, `Đã vào sổ`.
- **Empty:** true empty offers capture/import guidance; attention-empty only claims no work when review/candidate coverage is known. With partial review coverage it says completeness is unknown instead.
- **Candidate failure:** healthy ledger stays visible; incoming/combined counts are unknown.
- **Finance failure:** candidate evidence may remain visible; posted rows are omitted; fallback/demo rows cannot affect duplicate detection; posted/combined counts are unknown; readiness inference is disabled; the surface says financial history is incomplete.
- **Review failure:** posted facts and candidate evidence remain visible; `Cần xử lý` is `—`; an explicit warning says review coverage may be incomplete; the attention filter remains usable for known attention but is not presented as complete.
- **Accessibility/responsive:** semantic list/headings, state not color-only, compact CTA target >=44px, 320px phone + desktop light/dark, no horizontal overflow.

### Rollout

**R1 — current PR:** additive `/activity`, typed model, demo/auth proof, and additive discoverability in More. `/transactions` remains primary and `/inbox` remains available.

**R2 — separate authorization:** promote `Hoạt động` into the primary `Giao dịch` position only after broader action-parity evidence; migrate global ledger search intentionally.

**R3 — separate authorization:** retire duplicated presentation after rollback evidence; consider optimized read RPC only if measured; source-health/rule-learning remain separate slices.

Non-goals: provider/bank integration, source-completeness claims, full source-health monitor, new matching/dedup semantics, learned rules/AI/auto-approval, ledger/reconciliation/transfer/trust semantic changes, production/provider writes, merge.

## Implementation plan

Implemented:

- typed `src/lib/activity.ts` model with deterministic chronological ordering, filters/search/counts and knowledge-aware partial reads;
- unit tests for no duplicate review item, candidate readiness reuse, provenance/search boundaries, fallback-ledger exclusion and partial-read honesty;
- additive `/activity` route using existing `getFinanceWorkspace()` plus existing candidate client loader;
- scoped Activity presentation/loading CSS; initial legacy global-class debt was caught by CI classifier and removed;
- demo Playwright proof and strict authenticated desktop/320px phone proof, including candidate-read failure, malformed-ledger failure and unavailable review-state handling;
- additive `Hoạt động` entry in `More → Công cụ hàng ngày`; primary `Giao dịch` and advanced `Cần xem` remain unchanged;
- auth navigation contract proving Activity discoverability while Transactions/Inbox remain present;
- evaluator correctness fix #1: Activity accepts explicit ledger availability, omits non-authoritative fallback transactions when finance reports an error, excludes those rows from candidate duplicate/transfer detection, disables readiness inference, and has a unit regression proving the fallback ledger cannot appear in `Đã vào sổ`;
- evaluator correctness fix #2: the route passes `reviewFeatureAvailable`; Activity marks review-dependent attention coverage unknown when unavailable, shows a warning, avoids a false zero/false empty attention claim, and an authenticated browser fixture uses malformed review data to prove the partial-review path without weakening the strict Supabase double.

Verification plan: policy/project knowledge, lint/typecheck/build/CSS/architecture, unit/static RLS, risk-classified database gate, demo browser, authenticated strict-double browser, repository-wide cross-device UI regression audit, CodeQL and Secret history scan. Activity-specific responsive evidence comes from the authenticated desktop/320px light/dark specs; the global audit route matrix does not include `/activity` and must not be represented as Activity-specific proof.

Rollback: remove `/activity`, Activity model/presentation/tests and the additive More entry. Existing transaction/Inbox routes, writes and DB contracts remain intact.

Permission: branch/PR writes for #592 R1 only. No direct `main` write, merge, production migration/data write, provider change, R2 or R3 retirement.

## Tasks

| ID | Task | Status |
|---|---|---|
| 592.1 | repository recon + focused research | done |
| 592.2 | pure Activity model + unit tests | done |
| 592.3 | additive route/workspace | done |
| 592.4 | demo/auth responsive + candidate/ledger/review partial-error evidence | done on accepted source/runtime head |
| 592.5 | additive More affordance, preserving Transactions/Inbox | done on accepted source/runtime head |
| 592.6 | exact-head evaluation + owner handoff | done — PR #593 merged 2026-09-13, squash `20c4ae88` |

## Evaluation

Pre-navigation proof head `e097721394794475cfa0d3f354e1405ac69c75c4` established green classifier/policy/static/unit/build/security evidence plus demo 148/148 and authenticated 28 passed / 1 intentional skip, including initial Activity mixed/candidate-failure/ledger-failure specs. That proof justified R1 secondary discoverability but was not final acceptance.

Evaluator review later found two honesty gaps in partial reads. First, the existing finance loader can pair `dataError` with demo-shaped fallback rows; Activity initially merged those rows regardless of lost ledger authority. The local R1 fix uses `ledgerAvailable=false` to remove those rows from both the mixed feed and candidate detection, with a unit regression. Second, the ledger can remain healthy while `transaction_review_feed` is unavailable/malformed; finance intentionally exposes that via `reviewFeatureAvailable=false`, but Activity initially ignored it and could report a false `Cần xử lý = 0`. The R1 fix carries the availability flag to Activity, marks attention coverage unknown, displays a warning and adds authenticated browser proof using malformed review data.

Accepted source/runtime head `7907f990d9661c5e6a584d254120cc912fc53452` passed the final runtime evaluation against unchanged `main@77def2218dfb1a66134bbefe8158c993b960ebf6`:

- CI #3717 (run `34758071170`): completed success;
- policy/project knowledge/migration identity: success;
- static quality, lint, typecheck, architecture and CSS ownership: success;
- production build and presentation ownership: success;
- unit/static-RLS and aggregate verify: success;
- database job: success with DB tests correctly skipped because R1 changes no database/migration/RLS contract;
- generic/demo Browser smoke raw log: `148 passed`, including `e2e/activity.spec.ts` on Chromium desktop and mobile;
- authenticated Browser smoke raw log: `30 passed, 1 skipped`; the skip is the existing #403 FCP attribution spec, unrelated to Activity;
- authenticated Activity desktop/mobile/nav specs all executed and passed, including mixed workstream/no duplication, candidate failure, review-state failure, ledger failure, More discoverability without replacing Transactions/Inbox, light/dark rendering, >=44px targets and no horizontal overflow;
- repository-wide Cross-device UI audit: success; it is regression evidence, not route-specific `/activity` evidence because the global audit route matrix does not include Activity;
- CodeQL #2719: success;
- Secret history scan #2719: success;
- no unresolved PR review threads or submitted reviews were present during evaluator handoff.

The commits that close this work packet and bounded PR memory are documentation-only; they do not alter the accepted runtime source above. The resulting PR head must still pass exact-head checks before the draft is marked Ready for review. No merge, production/provider write, production data write or deployment is authorized.

## Handoff

Evaluator → owner: R1 implementation has no remaining known semantic/security blocker. After the documentation-only closeout head passes required exact-head CI/security gates, PR #593 can be marked Ready for review. The next owner decision is merge or further review; R2 primary-nav promotion, R3 retirement, provider changes and production actions remain separate authorization boundaries.
