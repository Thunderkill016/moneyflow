# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority when read from `main`
**Last reconciled:** 2026-08-23
**Runtime/financial baseline:** `e0b30350c1e819237ce769a9d5af40cc2d0324c0` (PR #445 merged).
**Post-merge projection:** PR #447
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs. The owner-facing queue is `docs/plans/active/README.md` after `npm run plan:resolve` passes.

## 1. Current decision

MoneyFlow is a functional Vietnamese personal-finance product and is **not public-beta ready**.

Merged #432 is the master product-direction authority: safely acquirable digital transactions should not require retyping, while one user-owned ledger remains financial truth. Manual entry stays first-class for cash, missing/off-system evidence and corrections.

Dependency order is source/evidence → candidates/provenance → normalization/dedup/matching → trustworthy ledger facts → reconciliation/correction → understanding/review → connected planning → automation → selective read-only providers → wealth/together/optional intelligence when validated.

Source adapters create evidence/candidates, not arbitrary balances or silently rewritten ledger facts. Exact source identity is stronger than heuristic similarity; different-ID lineage is accepted only when the source explicitly supplies predecessor identity.

Release readiness remains separate from product development. Product work cannot substitute for provider read-back, production evidence, legal review, physical-device proof or owner decisions.

## 2. Current runtime and financial truth

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- VND is integer đồng; transfers are balanced account movements and neutral to income/expense/net.
- Authenticated ledger data is server-owned; demo state is browser-local.
- Ledger facts support edit plus recoverable soft delete where required.
- Accounts support balances, register/history, archive/restore and reconciliation.
- Planning includes category budgets, recurring commitments/income and savings goals.
- Understanding includes weekly/monthly/yearly reports and controlled import/export.
- Complete versioned archive lives at `/settings/backup`; hosted restore remains unexecuted under RRB-02.
- Repository/static, unit/domain, database, browser, provider, production, physical-device and owner/legal evidence are separate proof layers.

## 3. Acquisition and reconciliation truth

### #434 / PR #435 — atomic Direct CSV

Authenticated Direct CSV persists import batches/candidates/provenance and commits selected rows through one batch-atomic approval boundary. A failed selected financial approval rolls back the batch rather than leaving a partial ledger commit.

### #436 / PR #437 — later source evidence for an existing fact

Authenticated Inbox can conservatively attach later non-manual source evidence to one reviewed existing unprovenanced money fact. Attachment writes provenance + candidate linkage without changing transaction values or reconciliation; user corrections remain authoritative.

### #438 / PR #439 — deleted exact-source reimport

Live same-ID remains hard `source_external_id_match`. A soft-deleted same-ID with unchanged fingerprint/version can be explicitly restored as the same transaction; changed/missing evidence stays blocked. Restore preserves entries, reconciliation and canonical provenance.

### #440 / PR #441 — changed live same-ID observations

Unchanged live same-ID evidence stays hard duplicate. Changed/unknown evidence under that stable source ID becomes hard `source_external_id_changed`; a reviewed observation can link to the same transaction without changing transaction/entry/reconciliation/canonical-provenance values. Approved observation evidence cannot be fabricated by ordinary authenticated INSERT/UPDATE.

### #442 / PR #445 — explicit different-ID lineage + lifecycle evidence

Merged as `e0b30350c1e819237ce769a9d5af40cc2d0324c0` after final head `631386482cea3261d53567e709ae7b765fa53976` passed CI #2839, CodeQL #1897 and Secret history #1897.

Current behavior:

- source observations can carry nullable `pending | posted | removed` lifecycle evidence and an explicit predecessor source ID;
- different-ID lineage is never inferred from amount/date/merchant/fingerprint similarity;
- exact source identity resolves through approved observation history before canonical provenance fallback;
- same-ID revisions compare against the latest safe reviewed observation baseline;
- explicit live predecessor identity produces hard `source_predecessor_match`; deleted predecessors stay hard-blocked;
- reviewed replacement observation links the new source ID to the existing transaction without changing ledger, reconciliation, deletion state or canonical provenance;
- one `(user, source, source_external_id)` cannot bind to two financial transactions;
- observation-only lineage creates no financial mutation audit event;
- archive producer/ingress/restore support the source-lineage schema generation while preserving historical archive validation.

Source lifecycle is still **evidence only**. No automatic source-driven clearing, reconciliation or ledger mutation is shipped.

## 4. Current execution state

Master #432 remains active. Merged P1 sequence is #435 atomic source ingestion → #437 later-source attachment → #439 deleted-source restore precedence → #441 changed same-ID observation preservation → #445 explicit different-ID lineage/lifecycle evidence.

Repository task selection is fail-closed through `docs/plans/PLAN_AUTHORITY.json`, the active packet registry, Current Work freshness and Git first-parent provenance. `npm run plan:resolve` is the pre-work entrypoint; `agent:doctor -- --json` consumes the same selection result.

PR #447 is a **one-time legacy recovery plus systemic agent-delivery upgrade** after #445 exposed repeated lifecycle cleanup overhead. Its post-merge projection does two things without promoting a product child:

1. removes merged #442 from active state and changes the default delivery contract so future current-slice PRs converge their board, packet and current-memory lifecycle inside the same implementation PR before owner handoff;
2. replaces the repository-local monolithic Codex dispatcher with an event-sourced capability harness under `scripts/agent-harness/`.

The projected harness uses a thin coordinator, named source/workspace/permission/agent providers, fail-loud capability negotiation, append-only JSONL run journals, explicit interrupted-run no-replay semantics, holder-owned run cleanup and a one-time migration of v1 `.agent-dispatcher/state.json` identities. Codex is one registered provider rather than the execution loop itself. The old executable dispatcher is removed in the projection; legacy dispatcher state remains read-only migration input.

Unmerged PR #447 is still candidate evidence. Its projection remains selection-blocked and may not be used to pre-promote follow-on work. After #447 merges, routine second cleanup PRs are no longer part of normal feature delivery. Dedicated reconciliation remains recovery-only for legacy/stale state or merge races that predate/bypass the same-PR convergence contract.

The first unpromoted #432 P1 candidate remains source lifecycle → ledger/reconciliation policy. It requires a fresh resolver pass plus its own bounded issue/spec/packet before implementation.

## 5. Current capability inventory

| Capability | Current main truth / PR #447 post-merge projection |
|---|---|
| Core ledger | multiple accounts; income, expense, transfers; edit; soft delete/recovery |
| Accounts | balances, register/history, create/edit/archive/restore and reconciliation |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Acquisition | persisted batches/candidates/provenance; exact source/fingerprint matching; atomic Direct CSV approval; later-source attachment; deleted-source restore precedence; changed same-ID observation preservation; explicit different-ID predecessor/replacement lineage and lifecycle evidence |
| Ownership | versioned archive/export/validation/restore contract; hosted restore proof still open |
| Agent delivery | PR #447 projection: provider-neutral local harness with source/workspace/permission/agent capability seams, append-only run journals, legacy-state migration and Codex provider; no merge/provider/production authority |
| Runtime modes | explicit demo/browser-local and authenticated/Supabase-RLS modes |
| Experience | responsive light/dark web UI; Inbox exposes reviewed source/reconciliation decisions without claiming provider sync |
| Release proof | RRB-01/RRB-07 closed; RRB-02/03/04/05/06/08/09 remain open or externally gated |
| Public beta | not approved |

Code, migrations and tests outrank this table on implementation detail. The agent-delivery row is projected candidate truth until PR #447 merges.

## 6. Release/trust state

Release Readiness Audit v1 (#388) remains canonical.

Closed: RRB-01 authenticated mixed-ledger financial truth through #391; RRB-07 MoneyFlow-owned accessible-authentication browser proof through #394.

Open/external: RRB-02 hosted restore; RRB-03 destructive recent-auth provider edges; RRB-04 provider/Auth/firewall read-back plus #40/#174; RRB-05 operator-controlled contact proof; RRB-06 competent Vietnam personal-data legal/privacy review; RRB-08 current real-phone proof; RRB-09 current production deployment/provider identity.

Controlled closed beta remains blocked until release entry gates clear and no unresolved P0 exists. Public beta also requires controlled-beta evidence and explicit owner PBT-AC15 go/no-go.

## 7. Security and delivery truth

- `docs/configuration.md` owns environment/provider settings; `docs/deployment.md` owns deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes/gates; `docs/engineering/AGENT_OPERATING_MODEL.md` owns permission scopes, handoffs and local harness permission semantics.
- `docs/plans/PLAN_AUTHORITY.json` + the active registry own strategic plan selection; Git history verifies provenance but does not choose authority by recency.
- `plan:resolve` blocks stale/ambiguous authority, unmerged master candidates and pre-merge board projections from task selection.
- Same-PR lifecycle convergence is enforced by `scripts/lifecycle-projection.mjs`: completing a current slice requires the same PR to remove it from current work, archive its packet, project current memory and leave zero follow-on current slices before handoff.
- PR #447 projects `scripts/agent-harness/` as the sole local agent runtime. Harness changes are CI policy changes and select full gates.
- The harness does not infer provider capability from a name: a provider must explicitly satisfy isolated-workspace and guarded-environment requirements before a command is accepted.
- `.agent-harness/runs/*.jsonl` is append-only lifecycle state. A non-terminal accepted run is treated as interrupted and blocks automatic replay. V1 completed/failed/running identities migrate before source dispatch so upgrade cannot silently duplicate old work.
- Child Git/GitHub commands remain behind the preserved allowlist. GitHub token environment variables are stripped before agent execution; merge, main-branch control, force-push, generic `gh api`, provider writes and production-data writes are not granted.
- CI classification, migration identity and project-knowledge checks are executable governance contracts; do not weaken them to make a PR pass.
- Draft PR success is not full evidence when heavy shards skip; exact-head evidence is required after the final branch mutation.
- Financial/schema/RLS/import/reconciliation changes are Class 3 and need bounded packets plus risk-selected database/security/browser evidence.
- Production/provider writes remain separately authorized.

Recent acquisition merge provenance: #433 → `a35d6f96…`; #435 → `38ae8f86…`; #437 → `1ae4c765…`; #439 → `d5324c47…`; #441 → `6123d263…`; #445 → `e0b30350…`.

## 8. Reconciled issue status

Completed P1 inputs: #434/#435, #436/#437, #438/#439, #440/#441 and #442/#445. Master #432 remains the product-development program.

#443/#444 closes the plan-authority discovery defect. #446/#447 is the one-time post-#445 recovery plus agent-harness replacement: same-PR convergence prevents the repeated closeout pattern, while the local v1 Codex dispatcher is superseded by the event-sourced capability harness if #447 merges.

#403 performance and #426 simplification remain held/reconcile work rather than the current acquisition dependency. PR #431 remains an unmerged conflicting pre-#432 candidate and is not authority.

RRB release gates remain separate and are not auto-resolved by product/governance work.

## 9. Open pull-request memory

No open product PR is current authority. PR #447 is agent-governance candidate evidence until merged; its projection cannot be used to start follow-on work.

PR-specific provenance for #445 lives at `docs/research/pr-memory/2026/Q3/PR-445.md`; `PR-447.md` owns the lifecycle-system and harness-v2 replacement evidence. Exact provider check identities remain external GitHub evidence rather than self-referential future run IDs in this snapshot.

Open PRs are candidate evidence even when newer, mergeable or green. A final branch mutation invalidates older-head verification evidence.

## 10. True gaps after this audit

Acquisition gaps after merged #445:

1. define when source `pending/posted/removed/modified` evidence may affect clearing, completeness and reconciliation without overwriting user truth;
2. migrate the next real acquisition source through the neutral contract after that policy is explicit;
3. expand low-maintenance Vietnamese file/share acquisition, normalization and exception-first review based on measured maintenance/error outcomes;
4. provider connectivity remains unselected until current official contract/consent/economics evidence supports a bounded adapter.

Release/trust gaps remain RRB-02/03/04/05/06/08/09 at their existing evidence/authority boundaries.

Agent-delivery gaps deliberately remain bounded after PR #447: only the Codex provider is registered; dynamic self-modification, unrestricted multi-agent orchestration and provider/production-write capabilities are not part of the harness contract.

## 11. Next allowed action

Finish and evaluate PR #447 only. Because its projection is unmerged, do not start or promote the next product child from this branch.

After #447 merges, start from fresh `main` and run `npm run plan:resolve`. If merged #432 remains master and no current child exists, create/promote one bounded #432 P1 issue/spec/packet for source lifecycle → ledger/reconciliation policy before implementation. That future PR must close its own lifecycle via the same-PR convergence contract if it completes the slice.

Do not jump to bank/e-wallet/NAPAS integration, infer different-ID lineage heuristically, perform provider/production writes, or treat a newly registered agent provider as expanded authority.

Owner/external lanes remain independent: real phone → RRB-08; provider read access → RRB-04/RRB-09 and #40/#174; contact proof → RRB-05; legal/privacy review → RRB-06; disposable hosted target → RRB-02; explicit owner/provider authorization → RRB-03.

## 12. Superseded-status register

- “manual-first is the long-term MoneyFlow product law” is superseded by merged #432/#433.
- `docs/plans/PRODUCT_DEVELOPMENT_PLAN.md` from #420 is predecessor history, not the master plan after #433.
- “the newest plan file/open PR can be treated as current authority” is superseded by #443/#444 fail-closed graph + registry + merged-history selection.
- “an unmerged replacement master can authorize work because its graph validates” is superseded by the separate selection-ready gate; candidate masters remain non-authoritative until merge.
- “Direct CSV authenticated commit loops ordinary transaction creation” is superseded by #435.
- “later imported evidence cannot reconcile to an existing unprovenanced user fact” is superseded by #437.
- “deleted exact-source reimport is indistinguishable from an ordinary live exact-ID duplicate” is superseded by #439.
- “changed evidence under a live stable source ID is indistinguishable from unchanged replay” is superseded by #441.
- “different-ID source lineage must be guessed from similarity or cannot be represented” is superseded by #445 explicit predecessor evidence.
- “#442 is current NOW work” is superseded by #445 merge.
- “every completed feature needs a second lifecycle-closeout PR” is superseded by PR #447's same-PR convergence projection; dedicated reconciliation is recovery-only.
- “the local Codex dispatcher + mutable `state.json` is the repository agent runtime” is superseded by PR #447's event-sourced capability-harness projection; until merge, this remains candidate truth.
- RRB-07 and RRB-01 are no longer proof gaps; Release Readiness Audit v1 is no longer pending.
- The seven-day self-use gate remains withdrawn without replacement.