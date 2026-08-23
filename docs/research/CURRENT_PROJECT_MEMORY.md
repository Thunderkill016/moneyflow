# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority when read from `main`
**Last reconciled:** 2026-08-23
**Runtime/financial baseline:** `eb8861c71dbc5b8173e7e48fff1293470a639816` (PR #447 merged).
**Post-merge projection:** PR #449
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs. The owner-facing queue is `docs/plans/active/README.md` after `npm run plan:resolve` passes.

## 1. Current decision

MoneyFlow is a functional Vietnamese personal-finance product and is **not public-beta ready**.

Merged #432 is the master product-direction authority: safely acquirable digital transactions should not require permanent retyping, while one user-owned ledger remains financial truth. Manual entry stays first-class for cash, missing/off-system evidence and corrections.

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

Merged P1 chain before #449:

- #435: authenticated Direct CSV persists source evidence and commits selected rows atomically.
- #437: later non-manual evidence can attach to one reviewed existing unprovenanced money fact without changing ledger values or reconciliation.
- #439: deleted unchanged exact-source reimport can restore the same transaction; changed evidence stays blocked.
- #441: changed live same-ID evidence can be preserved as a reviewed observation without overwriting ledger/reconciliation/canonical provenance.
- #445: explicit different-ID predecessor/replacement lineage plus nullable `pending | posted | removed` lifecycle evidence; no fuzzy lineage and one source identity cannot bind to two financial transactions.

### #448 / PR #449 — reviewed lifecycle → clearing projection

PR #449 is candidate evidence until merge. If its exact squash merge activates this projection:

- source identity carries the latest reviewed lifecycle baseline, so same-ID lifecycle-only transitions remain reviewable;
- `pending` and `removed` remain observation-only and cannot delete or demote ledger truth;
- reviewed `posted` evidence may advance exactly one live income/expense account leg from `pending` to `cleared` only when current kind, account, occurred date and signed amount still match exactly;
- source evidence never establishes `reconciled`; statement reconciliation remains stronger truth;
- user-corrected ledger mismatches are preserved as source observations without overwrite or clearing;
- already-cleared/reconciled reviews are replay-safe no-ops;
- explicit predecessor posted evidence uses the same policy; transfers/splits remain outside this slice;
- the financial effect uses the canonical reconciliation RPC and existing privacy-safe mutation audit;
- posted review follows reconciliation account → transaction lock order before source helpers may lock target rows.

## 4. Current execution state

Master #432 remains active. PR #449 is the bounded candidate completion of the source lifecycle → ledger/reconciliation policy slice.

Same-PR convergence is projected in PR #449: the #448 packet is archived at `docs/plans/completed/2026-08-23-448-source-lifecycle-reconciliation.md`, Current Work projects zero agent-executable current slices, and no NEXT child is pre-promoted. While PR #449 is open, only #448 acceptance defects, evaluation and exact-head verification may continue.

After an exact PR #449 merge, fresh-main authority resolution may select the next bounded #432 P1 slice: migrate one real file/share source through the common acquisition/provenance/reconciliation path. That NEXT work is not authorized by this projection.

## 5. Current capability inventory

| Capability | Current `main` truth / PR #449 post-merge projection |
|---|---|
| Core ledger | multiple accounts; income, expense, transfers; edit; soft delete/recovery |
| Accounts | balances, register/history, create/edit/archive/restore and statement reconciliation |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Acquisition | persisted batches/candidates/provenance; exact source matching; atomic CSV approval; later-source attachment; deleted-source restore; changed-observation preservation; explicit predecessor lineage; lifecycle evidence |
| Lifecycle clearing | PR #449 projection: reviewed exact `posted` evidence may advance one eligible account leg `pending → cleared`; never source-driven `reconciled`, ledger overwrite, delete or demotion |
| Ownership | versioned archive/export/validation/restore contract; hosted restore proof still open |
| Agent delivery | provider-neutral `scripts/agent-harness/`, append-only run journals, guarded permissions, same-PR lifecycle convergence; no merge/provider/production authority |
| Runtime modes | explicit demo/browser-local and authenticated/Supabase-RLS modes |
| Release proof | RRB-01/RRB-07 closed; RRB-02/03/04/05/06/08/09 remain open or externally gated |
| Public beta | not approved |

Code, migrations and tests outrank this table on implementation detail. The lifecycle-clearing row is projected candidate truth until PR #449 merges.

## 6. Release/trust state

Release Readiness Audit v1 (#388) remains canonical. RRB-01 authenticated mixed-ledger truth and RRB-07 accessible-auth browser proof are closed.

Still open/external: RRB-02 hosted restore; RRB-03 destructive recent-auth provider edges; RRB-04 provider/Auth/firewall read-back plus #40/#174; RRB-05 operator-controlled contact proof; RRB-06 Vietnam personal-data legal/privacy review; RRB-08 current real-phone proof; RRB-09 production deployment/provider identity.

Controlled closed beta remains blocked until release entry gates clear and no unresolved P0 exists. Public beta also requires controlled-beta evidence and explicit owner go/no-go.

## 7. Security and delivery truth

- `docs/configuration.md` owns environment/provider settings; `docs/deployment.md` owns deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes/gates; `docs/engineering/AGENT_OPERATING_MODEL.md` owns permission scopes and handoffs.
- `docs/plans/PLAN_AUTHORITY.json` + the active registry own strategic task selection; Git history verifies provenance but does not choose authority by recency.
- `plan:resolve` blocks stale/ambiguous authority, unmerged master candidates and pre-merge projections from authorizing new work.
- `scripts/lifecycle-projection.mjs` requires completing slices to archive their packet, clear projected current work, project current memory and leave zero follow-on current slices in the same PR.
- `scripts/agent-harness/` is the local agent runtime; provider capability/readiness is explicit and fail-loud.
- Git/GitHub child commands remain allowlisted; merge, main-branch control, force-push, generic provider writes and production-data writes are not granted.
- CI classification, migration identity and project-knowledge checks are executable governance contracts and are not weakened to make a PR pass.
- Draft PR success is not full evidence when heavy shards skip; final acceptance requires exact-head substantive gates.
- Financial/schema/RLS/import/reconciliation changes are Class 3 and require database/security/browser evidence.

## 8. Reconciled issue status

Completed acquisition inputs: #434/#435, #436/#437, #438/#439, #440/#441 and #442/#445. Master #432 remains the product-development program.

#443/#444 closed the plan-authority discovery defect. #446/#447 closed the repeated lifecycle-cleanup pattern and replaced the local monolithic dispatcher with the event-sourced capability harness.

#448 is projected complete through open PR #449 and its archived completion packet; it is not an active packet while that same-PR completion projection is under review. #403 performance and #426 simplification remain held. PR #431 remains an unmerged conflicting pre-#432 candidate and is not authority.

RRB release gates remain separate and are not auto-resolved by product work.

## 9. Open pull-request memory

PR #449 is the only current product-slice candidate in this projection. It is not authority until merged and cannot authorize the next source migration.

PR-specific evidence lives at `docs/research/pr-memory/2026/Q3/PR-449.md`; earlier acquisition provenance remains in its corresponding PR records. Exact final CI/CodeQL/Secret History run identities remain GitHub evidence rather than self-referential future IDs in this snapshot.

A final branch mutation invalidates older-head verification evidence. Merge remains owner-authorized only.

## 10. True gaps after this audit

After the PR #449 projection, remaining acquisition gaps are:

1. migrate the next real file/share acquisition source through the common candidate/provenance/reconciliation contract;
2. expand low-maintenance Vietnamese file/share acquisition, merchant/payee normalization and exception-first review based on measured maintenance/error outcomes;
3. keep provider connectivity unselected until current official contract, consent and economics evidence supports a bounded read-only adapter;
4. research transfer lifecycle clearing separately before source evidence may affect multi-leg transfers.

Release/trust gaps remain RRB-02/03/04/05/06/08/09 at their existing evidence/authority boundaries.

## 11. Next allowed action

Finish and evaluate PR #449 only. Do not start or promote the next product child while this projection is unmerged.

After #449 merges, start from fresh `main` and run `npm run plan:resolve`. If #432 remains master and no current child exists, create/promote one bounded issue/spec/packet for the next real acquisition source path.

Do not jump to bank/e-wallet/NAPAS integration, infer lineage heuristically, source-drive `reconciled`, perform provider/production writes, or broaden transfer semantics inside #449.

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
- “source lifecycle is evidence only and can never inform clearing” is narrowed by PR #449 projection: lifecycle always remains source evidence, while only reviewed exact `posted` evidence may establish `cleared`; never `reconciled` or ledger economics.
- RRB-07 and RRB-01 are no longer proof gaps; Release Readiness Audit v1 is no longer pending.
- The seven-day self-use gate remains withdrawn without replacement.
