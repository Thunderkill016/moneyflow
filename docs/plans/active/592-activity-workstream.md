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

Add an additive `/activity` surface that lets a user understand posted ledger facts, pending Inbox evidence and transaction review work as one chronological maintenance workstream without creating a new ledger truth model or new financial mutation path.

## Repository reconnaissance

### Current behavior

- R1 baseline is `main@77def2218dfb1a66134bbefe8158c993b960ebf6`, which includes merged Home ledger-trust PR #591.
- `/transactions` loads `getFinanceWorkspace()` and owns posted ledger facts. `transaction_review_feed` is mapped onto those facts as `reviewStatus`; `needs_review` is not a separate object.
- `/inbox` also loads finance context, while `InboxPage` separately calls `loadInboxForClient()` for candidate evidence.
- Authenticated `loadInboxForClient()` preserves the current local-to-server migration compatibility path before listing server candidates; demo stays localStorage-backed.
- Candidate rows already carry source/confidence/duplicate/transfer fields. Authenticated mapped candidates may additionally carry source lifecycle, parser/mapping, match and approval provenance.
- Current primary IA exposes `/transactions` as `Giao dịch`; `/inbox` is an advanced route. #559 names Activity as target program intent but does not authorize broad redesign or legacy retirement.
- Existing `/transactions` and `/inbox` remain intact during R1 as mutation owners and rollback surfaces.

### Relevant repository areas

| Area | Role in Activity R1 | Decision |
|---|---|---|
| `src/server/finance.ts` | authoritative posted transaction + review read | reuse unchanged |
| `src/hooks/client-inbox*.ts` | demo/auth candidate loading and migration compatibility | reuse unchanged |
| `src/lib/inbox/detect.ts` | candidate duplicate/transfer annotation | reuse unchanged |
| `src/lib/inbox/readiness.ts` | candidate readiness/attention semantics | reuse unchanged |
| `src/lib/activity.ts` | neutral mixed workstream read/presentation model | new bounded layer |
| `src/components/activity/*` | Activity presentation and partial-state ownership | new bounded surface |
| `e2e/auth/*` | strict authenticated browser evidence | extend with independent fixture/specs |
| `/transactions`, `/inbox` | mutation ownership and rollback | preserve |

### Constraints and counterexamples

- A posted transaction with `needs_review` must appear once, not once as transaction plus once as review item.
- A pending candidate must never masquerade as a posted ledger fact.
- Candidate readiness must reuse existing detection/readiness logic; copying that logic would create competing truth.
- Current posted transaction feed has no provider/source provenance, so Activity must not infer provider health or source completeness for ledger rows.
- When finance/account/category context fails, missing lookup context must not be reinterpreted as candidate maintenance work.
- R1 must not add a database Activity RPC merely to make the UI look unified; optimization needs measured fan-out/latency evidence.

## Research

Accessed 2026-09-13. Focused official product sources were used to answer one decision question: whether a daily finance workflow should expose one attention workstream while preserving explicit transaction/evidence boundaries.

| Source | What it establishes | Applicability / limit |
|---|---|---|
| Copilot Money Quick Start | New transactions enter a focused `To Review` queue; confirmed reviews can reduce repeated work later. | Adopt focused attention workflow, not opaque intelligence in R1. |
| YNAB approving/matching guide | Imported activity requiring action is surfaced together; matching avoids redundant review. | Supports one maintenance mental model; MoneyFlow keeps its own ledger/reconciliation semantics. |
| Actual Budget importing docs | Stable import identity and transaction similarity are used to avoid duplicate facts. | Reinforces candidate-vs-ledger distinction; no matching changes in R1. |
| Actual Budget rules docs | Imported activity uses the same processing path and user-owned rules reduce repetitive cleanup. | Supports future automation direction only; rule learning is out of scope. |

### Research decision

Activity should unify **attention and presentation**, not merge candidate evidence with posted ledger facts or create a parallel posting model. Source state is shown only when current candidate evidence proves it. No new provider, dependency, matching rule or AI system is adopted.

## Specification

### MVP model

`ledger_transaction` represents exactly one posted MoneyFlow transaction. `reviewStatus` is an attribute; `needs_review` puts that row in `Cần xử lý` without creating a second Activity item. Existing `/transactions` continues to own edit/delete/review/category correction.

`inbox_candidate` represents pending source evidence that has not necessarily become a ledger fact. Only pending candidates enter R1. Existing `annotateCandidates()` and `classifyCandidateReadiness()` determine attention state. Existing `/inbox` continues to own approval/match/recovery. If finance lookup context is unavailable, readiness inference is disabled and the candidate remains honestly labeled `Chờ vào sổ`.

### Data flow

```text
getFinanceWorkspace()
  -> posted transactions + review state
                                \
                                 -> buildActivityItems() -> filter/search/sort -> Activity UI
                                /
loadInboxForClient()
  -> pending candidates + current source/provenance evidence

Activity CTA
  -> /transactions or /inbox (existing owner)
  -> existing mutation/recovery contract
  -> Activity refresh on next load
```

R1 deliberately does not add a DB Activity RPC. Existing reads are composed first so demo compatibility, mutation ownership and partial-failure semantics remain visible and testable.

### Filters and search

- `all`: all pending candidate items + posted transaction items.
- `attention`: candidate `needs_attention` plus posted transactions with `reviewStatus=needs_review`.
- `incoming`: pending Inbox candidates only.
- `posted`: posted transaction items only.
- Search covers normalized user-visible merchant/note/category/account/source text. Raw source snippets and external source IDs are not default search/display material.

### UI states

**Loading:** one Activity-level loading surface. Summary values depending on a still-loading source render unknown (`—`), never fake zero.

**Populated:** one chronological list, newest by occurrence date, then observed/created time, then stable key. Candidate and ledger rows share rhythm but state is explicit in words: `Chờ vào sổ`, `Cần xử lý`, `Cần xem lại`, `Đã vào sổ`. VND remains integer đồng and transfer meaning is not changed.

**Empty:** true empty state offers capture/import guidance; an empty attention filter calmly states that nothing currently needs action. Candidate-only and transaction-only states are valid.

**Partial/error:** candidate failure keeps healthy ledger rows visible and marks combined/incoming counts unknown. Finance failure may keep candidate evidence visible, but posted/combined counts are unknown and candidate readiness inference is disabled. No partial surface may claim a complete financial activity history.

**Accessibility/responsive:** semantic heading/list; text conveys state without color dependence; compact row action target >=44px; explicit 320px phone and 1280px desktop proof in light/dark; no horizontal overflow.

### Rollout order

**R1 — #592 / PR #593:** typed Activity model, additive `/activity`, job filters/search, demo/auth runtime evidence, then an additive discoverability affordance only after route proof. Do not remove or redirect `/transactions` or `/inbox`.

**R2 — separate authorization:** promote `Hoạt động` into the primary `Giao dịch` position only after action parity evidence; intentionally migrate the global ledger-search shortcut; keep compatibility links.

**R3 — separate authorization:** retire duplicated presentation after rollback evidence; consider an optimized Activity read bundle only if measurement justifies it; source health and learned-rule work remain independent slices.

### Non-goals

No provider/bank integration, full source-health monitor, source-completeness claim, new matching/dedup semantics, learned rules, AI categorization, auto-approval, ledger/reconciliation/transfer/trust semantic change, migration, production/provider write or merge authorization.

## Implementation plan

### Architecture fit and implemented changes

- `src/lib/activity.ts` adds the typed Activity read/presentation model and deterministic filter/search/sort/count helpers.
- `src/lib/activity.test.ts` proves no duplicate review row, candidate readiness reuse, visible-field search, bounded provenance, chronological ordering and partial-read honesty.
- `/activity` server route reuses `getFinanceWorkspace()`; no new DB read contract or migration.
- `ActivityWorkspace` loads candidates through existing `loadInboxForClient()`, annotates them with existing detection logic, composes the workstream and routes actions back to existing owners.
- Summary counts are knowledge-aware: attention requires both sources; incoming requires candidates; posted requires a healthy finance read.
- Scoped Activity CSS owns the new presentation; the first CI classifier caught and removed accidental legacy global classes from the loading route.
- Auth strict fixtures cover mixed work, source lifecycle evidence, candidate failure and malformed-ledger partial failure. Demo Playwright coverage proves the localStorage/sample path separately.

### Verification plan

- Unit/domain: Activity model and existing finance/Inbox suites.
- Static/policy: no-new-UI-debt classifier, project knowledge, CSS ownership, architecture, lint, typecheck, production build.
- Database: no DB changes; risk classifier may skip DB tests and that skip must be explicit.
- Browser: demo desktop/mobile plus authenticated 320px phone and 1280px desktop; light/dark; no horizontal overflow; 44px action targets; strict double reports no unserved requests.
- Final acceptance: exact-head CI, CodeQL and Secret history scan; inspect browser job output to prove the new specs actually executed.

### Rollback

Remove additive `/activity`, its model/presentation/tests and any additive navigation affordance. Existing `/transactions`, `/inbox`, mutation actions and DB contracts remain unchanged fallback surfaces.

### Permission boundary

- Allowed: branch/PR repository writes for #592 R1.
- Forbidden: direct `main` write, merge, production migration/data write, provider config/write, R2/R3 retirement.
- Stop/re-spec if implementation requires new financial semantics, a second posting path, source-completeness inference, or a DB RPC solely to hide unmeasured performance.

### Tasks

| ID | Task | Status |
|---|---|---|
| 592.1 | current-state recon + focused research | done |
| 592.2 | pure Activity model + tests | done |
| 592.3 | additive route/workspace | done |
| 592.4 | demo/auth browser + responsive/error-state evidence | implemented; exact-head CI pending |
| 592.5 | additive nav affordance after first route proof | blocked on runtime proof |
| 592.6 | exact-head evaluation + owner handoff | pending |

### Handoff record

| Date | From | To | State | Evidence | Open risk / next allowed action |
|---|---|---|---|---|---|
| 2026-09-13 | researcher | planner | specified | #592, routes/loaders, focused official research | preserve truth-model boundaries |
| 2026-09-13 | planner | implementer | implementing | packet + `feat/592-activity-workstream` | route/runtime not yet proven |
| 2026-09-13 | implementer | evaluator | evaluating | draft PR #593; unit/demo/auth specs committed | resolve CI findings; only add discoverability after route proof |

## Evaluation

### Findings so far

1. Initial Activity loading reused legacy global classes (`dashboard`, `transaction-manager`, `panel`). The CI no-new-debt classifier rejected this. The loading surface now has its own scoped CSS module; subsequent classifier passed.
2. Partial failure originally risked showing zero counts while candidate coverage was unknown. Summary values now render `—` whenever their required source is unavailable.
3. A finance failure can erase accounts/categories and could have made every candidate look unresolved. `candidateReadinessAvailable=false` now disables that inference, preserving evidence without manufacturing work.
4. Project-knowledge CI then identified packet/memory schema mismatches. This revision adds the required canonical headings and companion PR-memory fields; exact-head revalidation remains pending.

### Acceptance state

Runtime/product acceptance is not yet claimed. PR #593 remains draft. Navigation promotion, merge and any production/provider action remain outside current authorization.
