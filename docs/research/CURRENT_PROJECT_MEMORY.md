# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority when read from `main`
**Last reconciled:** 2026-08-21
**Baseline entering this snapshot:** `main@1ae4c765af9789a6a7e34179a1d3a2733eb436fe` (#437 merged). Statements introduced by PR #439 are candidate evidence until this file lands on `main`.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs. The owner-facing execution queue is `docs/plans/active/README.md`.

## 1. Current decision

MoneyFlow is a functional Vietnamese personal-finance product and is **not public-beta ready**.

The merged #432 program is the current product-direction authority. The long-term product is a low-maintenance, provider-independent PFM: safely acquirable digital transactions should not require retyping, while the ledger remains the single financial source of truth. Manual entry is a fallback for cash, missing evidence and corrections rather than the intended primary long-term workflow.

Dependency order:

> trusted ledger → acquisition + reconciliation → understanding → planning → automation → selective connectivity → wealth → together → optional intelligence

Source adapters create normalized evidence/candidates, not arbitrary balances or silently rewritten ledger facts. Exact source identity is stronger than heuristic similarity. Human review remains the boundary for weak matches; false merges are worse than visible duplicates.

Release readiness is separate from product development. Product work never substitutes for provider read-back, production evidence, legal review, physical-device proof or owner go/no-go decisions.

## 2. Current runtime and financial truth

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- Missing credentials never select demo implicitly.
- VND is integer đồng; transfers are balanced account movements and neutral to income/expense/net.
- Authenticated ledger data is server-owned; demo state is browser-local.
- Ledger facts support edit plus recoverable/soft-delete behavior where the product contract requires it.
- Accounts support balances, register/history, archive/restore and reconciliation.
- Planning includes category budgets, recurring commitments/income and savings goals.
- Understanding includes weekly/monthly/yearly reports and controlled import/export surfaces.
- Complete versioned archive lives at `/settings/backup`, separate from scoped/report export. Hosted restore remains unexecuted and belongs to RRB-02.
- Repository/static, unit/domain, database, browser, provider read-back, production runtime, physical-device and owner/legal evidence are separate layers and cannot silently prove one another.

## 3. Acquisition and reconciliation truth

### Direct CSV boundary — #434 / PR #435

Authenticated Direct CSV persists import batches/candidates/provenance evidence and commits selected rows through one batch-atomic approval boundary. If one selected financial approval fails, the financial batch rolls back rather than leaving a partial ledger commit. Candidate/import evidence may remain for review/recovery.

The acquisition model carries source row index, optional stable `source_external_id`, versioned fingerprint, parser/mapping versions, match status/reason/confidence, transfer evidence, rule evidence and approval linkage.

### Later source evidence for an existing fact — #436 / PR #437

Authenticated Inbox planning preserves this precedence: already approved → exact external source ID → canonical fingerprint evidence → transfer suspicion → conservative reviewed existing-ledger fallback → validity → would-create.

The reviewed fallback is deliberately narrow: same owner, income/expense kind, account, date and exact signed amount; one-entry, live, non-generated, unprovenanced fact only. One eligible fact becomes `existing_transaction_match`; multiple become `existing_transaction_ambiguous` with no arbitrary target.

`attach_inbox_candidate_to_existing_transaction()` writes source provenance + candidate approval linkage without changing the existing transaction's kind, date, note, account, category, amount, review state or reconciliation state. User corrections therefore outrank later imported evidence in this boundary.

### Deleted exact-source reimport precedence — #438 / PR #439

When this snapshot is on `main`, exact-source deletion precedence is explicit rather than hidden inside generic duplicate handling:

- live canonical transaction + same stable source ID stays a hard `source_external_id_match` duplicate;
- soft-deleted canonical transaction + same fingerprint/version becomes `source_external_id_deleted_match`, requiring explicit review before restoring the same ledger fact;
- same deleted source ID with changed/missing canonical fingerprint evidence becomes `source_external_id_deleted_changed` and cannot restore or use the heuristic separate-transaction override;
- planning never restores anything;
- reviewed restore clears only `financial_transactions.deleted_at`, preserves ledger/reconciliation values and canonical provenance, resolves the repeat candidate, reuses the same transaction ID and relies on the existing `transaction_restored` financial audit path;
- replay of the same resolved candidate is mutation-idempotent; another tenant cannot inspect or restore the target.

This does **not** define source-update semantics. Pending→cleared, provider corrections, changed amount/date/description under one stable source ID and one-to-many observation history remain the next acquisition-lifecycle problem.

## 4. Current execution state

The master product program remains #432. #435, #437 and #439 form the bounded P1 acquisition-foundation sequence: atomic source ingestion → reviewed later-source attachment → explicit deleted-source lifecycle.

After #439, the next dependency is **source-update precedence**, not provider integration: model how a stable source event evolves, whether observations require a one-to-many history table, and how provider corrections/pending→cleared interact with user edits without silent ledger overwrite.

Only after identity/update lifecycle is explicit should another real acquisition source path be migrated through the neutral candidate/provenance/reconciliation boundary.

Independent release/device/provider lanes remain open in parallel where their required authority/evidence exists.

## 5. Current capability inventory

| Capability | Current-main truth once this snapshot lands |
|---|---|
| Core ledger | multiple accounts; income, expense, transfers; edit; soft delete/recovery |
| Accounts | balances, identity, register/history, create/edit/archive/restore and reconciliation |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Acquisition | persisted batches/candidates/provenance; exact source/fingerprint matching; atomic Direct CSV approval; reviewed later-source attachment; explicit deleted-source restore precedence |
| Ownership | versioned archive/export/validation/restore contract; hosted restore proof still open |
| Runtime modes | explicit demo/browser-local and authenticated/Supabase-RLS modes |
| Experience | responsive light/dark web UI; Inbox exposes reviewed source/reconciliation decisions without claiming provider sync |
| Release proof | RRB-01/RRB-07 closed; RRB-08 physical proof open; RRB-04/05/06/09 and RRB-02/03 remain |
| Public beta | not approved |

Code, migrations and tests outrank this table on implementation detail.

## 6. Release/trust state

Release Readiness Audit v1 (#388) remains the canonical release audit.

Closed: RRB-01 authenticated mixed-ledger financial truth through #391; RRB-07 MoneyFlow-owned Accessible Authentication browser proof through #394.

Open/external: RRB-02 hosted restore; RRB-03 destructive recent-auth provider edges; RRB-04 provider/Auth/firewall read-back plus #40/#174; RRB-05 operator-controlled contact proof; RRB-06 competent Vietnam personal-data legal/privacy operational review; RRB-08 current real-phone proof; RRB-09 current production deployment/provider identity.

Controlled closed beta remains blocked until P1 release gates clear and no unresolved P0 exists. Public beta additionally requires controlled-beta evidence and explicit owner PBT-AC15 go/no-go.

## 7. Security and delivery truth

- `docs/configuration.md` owns environment/provider-setting contracts.
- `docs/deployment.md` owns branch/deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes/gates; `docs/engineering/AGENT_OPERATING_MODEL.md` owns permissions/execution states.
- `scripts/classify-ci-changes.mjs`, migration identity and project-knowledge checks are executable governance contracts; do not weaken them to make a PR pass.
- Draft PR success is not full verification evidence when heavy shards skip.
- Exact-head evidence is required after the final branch mutation; a green older SHA never proves a newer head.
- Financial/schema/RLS/import/reconciliation work is Class 3 and requires its bounded packet plus risk-selected database/security/browser evidence.
- Production/provider writes remain separately authorized even when repository implementation is ready.

Recent acquisition delivery provenance: #433 → merged `a35d6f96960e889cf988d9d37d4320a8f674cd85`; #435 → merged `38ae8f8694554d8d69508f86bcc66b2bdfe68b95`; #437 final head `83957701cf38647729d35956d6b5af132641a5dd` passed CI #2758, CodeQL #1819 and Secret #1819 before merge as `1ae4c765af9789a6a7e34179a1d3a2733eb436fe`.

## 8. Reconciled issue status

Completed input: #434/#435 Direct CSV atomic acquisition; #436/#437 reviewed later-source reconciliation.

Current P1 child at snapshot authoring: #438, delivered by PR #439 and authoritative only once merged to `main`.

Master #432 remains open as the product-development program. #403 performance and #426 simplification remain held/reconcile work, not the default acquisition dependency. PR #431 remains a conflicting pre-#432 direction candidate and must not be merged blindly.

RRB release gates remain separate and are not auto-resolved by acquisition work.

## 9. Open pull-request memory

At snapshot authoring, PR #439 is the active delivery PR for #438. While unmerged it is candidate evidence; once merged, this paragraph is provenance of the handoff rather than a claim that the PR is still open.

PR-specific verification/failure history belongs in `docs/research/pr-memory/YYYY/QN/PR-439.md`. Do not load all PR-memory records unless named provenance is needed.

No open pull request may be treated as current product authority merely because it is mergeable or partially green.

## 10. True gaps after this audit

Product/acquisition gaps:

1. source-update observation precedence: pending→cleared/provider corrections/changed stable-ID evidence;
2. decide whether repeated source observations require one-to-many observation history instead of one canonical provenance row;
3. migrate the next real acquisition source only after the neutral lifecycle above is proven;
4. provider connectivity remains unselected until current official contract/consent/economics evidence supports a bounded adapter.

Release/trust gaps remain RRB-02/03/04/05/06/08/09 at their existing evidence/authority boundaries.

## 11. Next allowed action

After #439 is merged and lifecycle closeout confirms `main`, start a bounded #432 P1 **source-update precedence** packet by rereading current code/tests/migrations first. Specify stable-ID observation history, pending→cleared, provider correction vs user correction, replay/idempotency, audit/provenance and no-silent-overwrite invariants before implementing schema/runtime changes.

Do not jump directly to bank/e-wallet/NAPAS integration. Do not choose a provider without current official contract/economics evidence. Do not perform provider/production writes without separate authorization.

Owner/external actions remain independent: real physical phone → RRB-08; provider read access → RRB-04/RRB-09 and #40/#174; operator-controlled contact evidence → RRB-05; competent legal/privacy review → RRB-06; disposable authorized hosted target → RRB-02; explicit owner/provider authorization → RRB-03.

## 12. Superseded-status register

- “manual-first is the long-term MoneyFlow product law” is superseded by merged #432; manual is a current fallback/capability, not the intended primary long-term workflow.
- “Direct CSV authenticated commit loops ordinary transaction creation” is superseded by #435.
- “later imported evidence cannot reconcile to an existing unprovenanced user fact” is superseded by #437.
- “deleted exact-source reimport is indistinguishable from an ordinary live exact-ID duplicate” is superseded once #439 lands on `main`.
- “RRB-08 repository preparation is pending” is superseded by the merged runbook; physical observation itself remains open.
- “RRB-07 is a current proof gap” is superseded by #394.
- “RRB-01 is a current proof gap” is superseded by #391.
- “Release Readiness Audit v1 is pending” is superseded by #388.
- The seven-day self-use gate remains withdrawn without replacement.
