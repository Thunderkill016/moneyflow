# #592 — Activity 2.0 unified maintenance workstream MVP

**Status:** implementing
**Execution state:** implementation
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** GitHub #592 / PR pending
**Parent intent:** #559
**Last updated:** 2026-09-13

Follow `AGENTS.md` and `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet authorizes only Activity 2.0 rollout R1 on `feat/592-activity-workstream`.

## Outcome

Add an additive `/activity` surface that lets a user understand posted ledger facts, pending Inbox evidence and transaction review work as one chronological maintenance workstream without creating a new ledger truth model or new financial mutation path.

## Current-state reconciliation

- `src/app/transactions/page.tsx` loads `getFinanceWorkspace()`; the returned transaction objects already contain optional `reviewStatus` from `transaction_review_feed`.
- `src/app/inbox/page.tsx` also loads `getFinanceWorkspace()`, while `src/components/inbox/inbox-page.tsx` separately calls `loadInboxForClient()` for candidates.
- Authenticated `loadInboxForClient()` preserves the current local-to-server migration compatibility path before listing server candidates; demo stays localStorage-backed.
- Candidate rows already contain source/confidence/duplicate/transfer fields. Authenticated mapped candidates may additionally carry source lifecycle, external-id, parser/mapping, match and approval provenance.
- `needs_review` belongs to a posted transaction; it is not a separate Activity object.
- Current primary IA exposes `/transactions` as `Giao dịch`; `/inbox` is an advanced route. #559 names `Activity` as the target combined mental model but does not itself authorize runtime work.
- Legacy `/transactions` and `/inbox` must remain intact during R1 for rollback and behavior comparison.

## Focused research

Accessed 2026-09-13; official sources only for the selected interaction decision.

| Source | What it establishes | Applicability / limit |
|---|---|---|
| Copilot Money Quick Start | New transactions enter a focused `To Review` queue; confirmed reviews later support suggestions. | Adopt focused attention workflow, not opaque intelligence in R1. |
| YNAB approving/matching guide | Imported activity requiring action is surfaced together; matched activity can remove redundant approval; bulk actions exist. | Supports one attention mental model; MoneyFlow keeps its own trust/posting semantics. |
| Actual Budget importing docs | Stable import identity then date/amount/payee similarity are used to avoid duplicates and reconcile later evidence. | Reinforces candidate-vs-ledger distinction and source identity; no matching changes in R1. |
| Actual Budget rules docs | Imported activity follows the same processing pipeline and user-owned rules reduce repetitive cleanup. | Supports future rule-learning direction only; rules are out of scope here. |

Research decision: Activity should unify **attention and presentation**, not merge candidate evidence with posted ledger facts or create a parallel posting model.

## MVP model

### `ledger_transaction`

- Exactly one Activity item per posted transaction id.
- `reviewStatus` is an attribute.
- `needs_review` means the item belongs in `Cần xử lý`; it does not create a duplicate row.
- Existing `/transactions` owns edit, delete, bulk review and category correction.

### `inbox_candidate`

- Only pending candidates appear in the R1 workstream; approved/rejected candidates stay historical evidence in existing Inbox/import surfaces.
- Candidate readiness comes from existing `classifyCandidateReadiness()` so the Activity layer does not invent a second readiness contract.
- Existing `/inbox` owns candidate approval/match/recovery.
- Candidate source label and provenance come from existing candidate evidence only.

## Data flow

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

R1 deliberately does not add a DB Activity RPC. The first slice reuses established reads to preserve demo compatibility and partial-failure behavior. Request count/latency must be observed before a future RPC is justified.

## Filters

- `all`: all pending candidate items + posted transaction items.
- `attention`: candidate readiness `needs_attention` plus posted transactions with `reviewStatus=needs_review`.
- `incoming`: pending Inbox candidates only, regardless of ready/attention state.
- `posted`: posted transaction items only.

Search matches normalized user-visible merchant/note/category/account/source text. Source ids/raw snippets are not search/display defaults.

## UI state contract

### Loading

- Activity shows one loading surface until the candidate read resolves.
- Ledger data is already server-owned but is not rendered as a misleading complete Activity feed while candidate state is unknown.

### Populated

- One chronological list; newest by `occurredOn`, then observation/creation time, then stable key.
- Candidate and ledger rows share hierarchy but have explicit text state: `Chờ vào sổ`, `Cần xử lý`, `Cần xem lại`, `Đã vào sổ`.
- Amount uses integer VND; transfer neutrality is not reinterpreted.
- Source labels are evidence, not completeness claims.

### Empty

- Truly empty: capture/import guidance.
- Empty attention filter: calm `Không có mục nào cần xử lý` copy.
- Candidate-only and transaction-only workspaces remain valid.

### Partial/error

- Candidate load failure + healthy finance: keep ledger rows visible and show `Nguồn chờ vào sổ chưa tải được`; do not claim the list is complete.
- Finance `dataError`: show error prominently; candidate rows may be shown only as `Chờ vào sổ`, accompanied by explicit notice that posted activity is unavailable.
- No count or trust/completeness state is fabricated from a failed source.

### Accessibility/responsive

- Semantic page heading and list.
- Status meaning in text, never color only.
- Primary row CTA >= 44px where it is the compact/mobile action.
- 320px phone and 1280px desktop evidence, light/dark.
- No horizontal overflow.

## Rollout order

### R1 — this issue/PR

1. Pure typed Activity model + unit tests.
2. Additive `/activity` route + client workspace using existing finance and Inbox loaders.
3. Candidate/transaction row presentation + job filters/search.
4. Auth/demo browser proof, mobile/desktop/light/dark/error-state proof.
5. Only after route proof: add an **additive** Activity affordance; do not remove `/transactions` or `/inbox`.

### R2 — separate authorization

- Promote `Hoạt động` to the primary `Giao dịch` position after action parity is proven.
- Intentionally migrate the global ledger-search shortcut.
- Keep compatibility links.

### R3 — separate authorization

- Retire duplicated presentation after measured rollback window.
- Consider a bounded Activity RPC only if request/latency evidence justifies it.
- Source health and learned rule suggestions remain independent slices.

## Non-goals

- No provider/bank integration.
- No new source completeness claim.
- No full source-health monitor.
- No new matching/dedup semantics.
- No learned rules, AI categorization or auto-approval.
- No transaction/reconciliation/transfer/trust semantic changes.
- No migration or production/provider write.
- No merge without owner authorization.

## Test plan

### Unit/domain

- A `needs_review` transaction maps to one item and `attention=true`.
- A normal transaction maps once to `posted` state.
- Pending candidate maps to one `incoming` item with existing readiness.
- Approved/rejected candidates do not enter R1 Activity.
- Mixed chronological ordering is deterministic.
- Filters do not duplicate items.
- Search covers visible fields only.
- Candidate source label is derived from known source enum; no provider completeness wording.

### Browser

- Demo Activity renders mixed workstream.
- Auth strict fixture proves mixed workstream and partial candidate failure.
- 320px + desktop, light/dark, no overflow, CTA targets.
- Existing `/transactions` and `/inbox` still work.

### Static/build

- lint, typecheck, production build, architecture/CSS/policy gates selected by CI.

## Rollback

Delete the additive Activity route/model/component and additive nav affordance. Existing transaction and Inbox routes, mutations, DB schema and source contracts remain the rollback path.

## Permission boundary

- Allowed: branch/PR writes for #592 R1.
- Forbidden: push/commit directly to `main`, merge, production migration/data write, provider config/write, R2/R3 retirement.
- Stop/re-spec if implementation requires new financial semantics, a second posting path, source completeness inference, or a DB RPC solely to mask unmeasured performance.

## Tasks

| ID | Task | Status |
|---|---|---|
| 592.1 | current-state recon + focused research | done |
| 592.2 | pure Activity model + tests | implementing |
| 592.3 | additive route/workspace | pending |
| 592.4 | browser/responsive/error-state evidence | pending |
| 592.5 | additive nav affordance after proof | pending |
| 592.6 | exact-head evaluation + owner handoff | pending |
