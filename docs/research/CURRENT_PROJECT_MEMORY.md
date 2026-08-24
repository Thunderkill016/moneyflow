# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority when read from `main`
**Last reconciled:** 2026-08-24
**Runtime/financial baseline:** `4d80fbe915155061fc3152740bb65c9cfa5c09ba` (PR #451 merged).
**Post-merge projection:** PR #453
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs. The owner-facing queue is `docs/plans/active/README.md` after `npm run plan:resolve` passes.

## 1. Current decision

MoneyFlow is a functional Vietnamese personal-finance product and is **not public-beta ready**.

Merged #432 remains the master product-direction authority: safely acquirable digital transactions should not require permanent retyping, while one user-owned ledger remains financial truth. Manual entry stays first-class for cash, missing/off-system evidence and corrections.

Dependency order is source/evidence → candidates/provenance → normalization/dedup/matching → trustworthy ledger facts → reconciliation/correction → understanding/review → connected planning → automation → selective read-only providers → wealth/together/optional intelligence when validated.

Source adapters create evidence/candidates, not arbitrary balances or silently rewritten ledger facts. Exact source identity is stronger than heuristic similarity; different-ID lineage is accepted only when the source explicitly supplies predecessor identity. Release readiness remains separate from product development.

## 2. Current runtime and financial truth

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- VND is integer đồng; transfers are balanced account movements and neutral to income/expense/net.
- Authenticated ledger data is server-owned; demo state is browser-local.
- Ledger facts support edit plus recoverable soft delete where required.
- Account-leg reconciliation states are `pending | cleared | reconciled`.
- `reconciled` is statement-close truth: statement completion creates it, reopening returns it to `cleared`, and reconciled financial facts are mutation-guarded.
- Planning includes category budgets, recurring commitments/income and savings goals.
- Understanding includes weekly/monthly/yearly reports and controlled import/export.
- Complete versioned archive lives at `/settings/backup`; hosted restore remains unexecuted under RRB-02.

## 3. Acquisition and reconciliation truth

Merged P1 chain:

- #435: authenticated Direct CSV persists source evidence and commits selected rows atomically.
- #437: later non-manual evidence can attach to one reviewed existing unprovenanced money fact without changing ledger values or reconciliation.
- #439: deleted unchanged exact-source reimport can restore the same transaction; changed evidence stays blocked.
- #441: changed live same-ID evidence can be preserved as a reviewed observation without overwriting ledger/reconciliation/canonical provenance.
- #445: explicit different-ID predecessor/replacement lineage plus nullable `pending | posted | removed` lifecycle evidence; no fuzzy lineage and one source identity cannot bind to two financial transactions.
- #449: source identity carries the latest reviewed lifecycle baseline; lifecycle-only transitions remain reviewable. `pending` and `removed` remain observation-only. Reviewed exact `posted` evidence may advance one live one-leg income/expense account leg from `pending` to `cleared` only when current kind/account/date/signed amount still match. Source evidence never establishes `reconciled`, overwrites ledger economics, deletes facts or demotes user/statement truth. Replays of already-cleared/reconciled reviews are no-ops, and eligible posted review follows reconciliation account → transaction lock order.

### #450 / PR #451 — merged PWA Share Target source completion

The installed-PWA Share Target already receives bounded shared title/text/url and text/CSV files through `/api/share-target`, then parses them in `/capture/share` into the existing candidate model.

Current gap: authenticated persistence is browser-orchestrated across separate generic mutations — text candidates are inserted separately, and each CSV file creates an import batch, then candidates, then marks the batch committed. A later failure can therefore leave a prefix of one share action persisted even though the source action was one user gesture.

Merged PR #451 changes only that acquisition boundary:

- authenticated shared text + CSV from one share action must persist through one transactional server/database operation;
- shared text receives a durable `paste` batch and CSV rows retain their own `csv` batch + source row identity;
- existing parser/mapping versions, bounded raw snippets and source identity contracts are reused;
- no source external ID is fabricated;
- all created candidates remain pending Inbox evidence;
- ingestion creates no financial transaction, entry or transaction-import provenance row;
- demo remains browser-local;
- request/file limits and unsupported XLSX/PDF Share Target behavior remain fail-closed.

## 4. Current execution state

Master #432 is active. #450 closed through exact matching squash merge `main@4d80fbe915155061fc3152740bb65c9cfa5c09ba`; its completed packet is `docs/plans/completed/2026-08-24-450-share-target-atomic-source.md`.

PR #453 is the same-PR completion projection for #452 on branch `feat/452-confirmed-inbox-rule`; its packet is `docs/plans/completed/2026-08-24-452-confirmed-inbox-rule-capture.md`. Candidate behavior is an explicit, separate review-time save of an existing candidate-stage deterministic rule for future non-transfer candidates. It cannot post, approve, backfill, alter raw source or change rule persistence/RLS semantics.

No projected agent-executable product child remains. Until PR #453 merges, only #452 acceptance defects, evaluation, exact-head verification and same-scope documentation corrections may proceed. Do not pre-promote the next #432 child.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, transfers; edit; soft delete/recovery |
| Accounts | balances, register/history, create/edit/archive/restore and statement reconciliation |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Acquisition | persisted batches/candidates/provenance; exact source matching; atomic CSV approval; later-source attachment; deleted-source restore; changed-observation preservation; explicit predecessor lineage; lifecycle evidence; merged #451 PWA Share Target atomic persistence; PR #453 is candidate review-time rule capture only |
| Lifecycle clearing | merged #449: reviewed exact `posted` evidence may advance one eligible account leg `pending → cleared`; never source-driven `reconciled`, ledger overwrite, delete or demotion |
| Ownership | versioned archive/export/validation/restore contract; hosted restore proof still open |
| Agent delivery | provider-neutral `scripts/agent-harness/`, append-only run journals, guarded permissions, same-PR lifecycle convergence; no merge/provider/production authority |
| Runtime modes | explicit demo/browser-local and authenticated/Supabase-RLS modes |
| Release proof | RRB-01/RRB-07 closed; RRB-02/03/04/05/06/08/09 remain open or externally gated |
| Public beta | not approved |

Code, migrations and tests outrank this table on implementation detail.

## 6. Release/trust state

Release Readiness Audit v1 (#388) remains canonical. RRB-01 authenticated mixed-ledger truth and RRB-07 accessible-auth browser proof are closed.

Still open/external: RRB-02 hosted restore; RRB-03 destructive recent-auth provider edges; RRB-04 provider/Auth/firewall read-back plus #40/#174; RRB-05 operator-controlled contact proof; RRB-06 Vietnam personal-data legal/privacy review; RRB-08 current real-phone proof; RRB-09 production deployment/provider identity.

Controlled closed beta remains blocked until release entry gates clear and no unresolved P0 exists. Public beta also requires controlled-beta evidence and explicit owner go/no-go.

## 7. Security and delivery truth

- `docs/configuration.md` owns environment/provider settings; `docs/deployment.md` owns deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes/gates; `docs/engineering/AGENT_OPERATING_MODEL.md` owns permission scopes and handoffs.
- `docs/plans/PLAN_AUTHORITY.json` + the active registry own strategic task selection; Git history verifies provenance but does not choose authority by recency.
- `plan:resolve` blocks stale/ambiguous authority, unmerged master candidates and unactivated pre-merge projections from authorizing new work.
- `scripts/lifecycle-projection.mjs` requires completing slices to archive their packet, clear projected current work, project current memory and leave zero follow-on current slices in the same PR.
- `scripts/agent-harness/` is the local agent runtime; provider capability/readiness is explicit and fail-loud.
- Git/GitHub child commands remain allowlisted; merge, main-branch control, force-push, generic provider writes and production-data writes are not granted.
- CI classification, migration identity and project-knowledge checks are executable governance contracts and are not weakened to make a PR pass.
- Draft PR success is not full evidence when heavy shards skip; final acceptance requires exact-head substantive gates.
- Financial/schema/RLS/import/reconciliation changes are Class 3 and require database/security/browser evidence.
- Shared PWA payloads are untrusted source material. The existing bridge bounds request/file/text sizes and accepted formats; #450 does not weaken those checks.

## 8. Reconciled issue status

Completed acquisition inputs: #434/#435, #436/#437, #438/#439, #440/#441, #442/#445 and #448/#449. Master #432 remains the product-development program.

#443/#444 closed the plan-authority discovery defect. #446/#447 closed the repeated lifecycle-cleanup pattern and replaced the local monolithic dispatcher with the event-sourced capability harness.

#451 is merged runtime truth. PR #453 is the current completion projection for #452, not merged runtime truth; #403 performance and #426 simplification remain held. PR #431 remains an unmerged conflicting pre-#432 candidate and is not authority. RRB release gates remain separate and are not auto-resolved by product work.

## 9. Open pull-request memory

PR #451 is the durable merged record for #450; its record is `docs/research/pr-memory/2026/Q3/PR-451.md`. PR #453 is the exact durable completion-projection identifier for #452; its record is `docs/research/pr-memory/2026/Q3/PR-453.md`. The projection cannot authorize follow-on work before an exact matching squash merge.

A final branch mutation invalidates older-head verification evidence. Merge remains owner-authorized only.

## 10. True gaps after this audit

Current candidate ingestion ergonomics work is #452: allow an explicitly confirmed Inbox merchant/category to seed an existing deterministic candidate-stage rule without adding a parallel ledger path.

After #450, remaining program gaps include:

1. expand low-maintenance Vietnamese file/share acquisition, merchant/payee normalization and exception-first review based on measured maintenance/error outcomes;
2. keep provider connectivity unselected until current official contract, consent and economics evidence supports a bounded read-only adapter;
3. research transfer lifecycle clearing separately before source evidence may affect multi-leg transfers.

Release/trust gaps remain RRB-02/03/04/05/06/08/09 at their existing evidence/authority boundaries.

## 11. Next allowed action

Complete PR #453 only: resolve #452 acceptance defects, run exact-head Class 3 evidence, then await the owner merge decision. Do not select a follow-on child before fresh-main authority resolution after an exact matching merge.

Do not jump to bank/e-wallet/NAPAS integration, infer rules from behavior, auto-approve/backfill candidates, source-drive `reconciled`, perform provider/production writes, broaden matching semantics, or expand transfer behavior inside #452.

Owner/external lanes remain independent: real phone → RRB-08; provider read access → RRB-04/RRB-09 and #40/#174; contact proof → RRB-05; legal/privacy review → RRB-06; hosted target → RRB-02; explicit owner/provider authorization → RRB-03.

## 12. Superseded-status register

- “manual-first is the long-term MoneyFlow product law” is superseded by merged #432/#433.
- `docs/plans/PRODUCT_DEVELOPMENT_PLAN.md` from #420 is predecessor history, not master authority after #433.
- “the newest plan/open PR can be treated as current authority” is superseded by #444 fail-closed graph + registry + merged-history selection.
- “Direct CSV authenticated commit loops ordinary transaction creation” is superseded by #435.
- “later imported evidence cannot reconcile to an existing unprovenanced user fact” is superseded by #437.
- “deleted exact-source reimport is indistinguishable from a live exact-ID duplicate” is superseded by #439.
- “changed evidence under a stable source ID is indistinguishable from unchanged replay” is superseded by #441.
- “different-ID lineage must be guessed from similarity or cannot be represented” is superseded by #445 explicit predecessor evidence.
- “every completed feature needs a second lifecycle-closeout PR” and “the monolithic dispatcher is the local agent runtime” are superseded by merged #447.
- “source lifecycle can never inform clearing” is superseded narrowly by merged #449: lifecycle remains source evidence, while only reviewed exact `posted` evidence may establish `cleared`; never `reconciled` or ledger economics.
- “PR #449 is unmerged candidate evidence” is superseded by exact merge `9e709a2116a560da673539a3ff3994928b22262b`.
- “#450 is an active agent-executable child” is superseded by exact merge `4d80fbe915155061fc3152740bb65c9cfa5c09ba`; #452 is now the one active P2 child.
- RRB-07 and RRB-01 are no longer proof gaps; Release Readiness Audit v1 is no longer pending.
- The seven-day self-use gate remains withdrawn without replacement.
