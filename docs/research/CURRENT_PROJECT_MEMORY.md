# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority when read from `main`
**Last reconciled:** 2026-08-21
**Current main baseline:** `d5324c473c2453869dc45dcd4cf5634ecbf97ea3` (PR #439 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs. The owner-facing queue is `docs/plans/active/README.md`.

## 1. Current decision

MoneyFlow is a functional Vietnamese personal-finance product and is **not public-beta ready**.

Merged #432 is the product-direction authority: safely acquirable digital transactions should not require retyping, while one user-owned ledger remains financial truth. Manual entry is a fallback for cash, missing evidence and corrections.

Dependency order:

> trusted ledger → acquisition + reconciliation → understanding → planning → automation → selective connectivity → wealth → together → optional intelligence

Source adapters create evidence/candidates, not arbitrary balances or silently rewritten ledger facts. Exact source identity is stronger than heuristic similarity; false merges are worse than visible duplicates.

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

### #434 / PR #435 — Direct CSV atomic acquisition

Authenticated Direct CSV persists import batches/candidates/provenance and commits selected rows through one batch-atomic approval boundary. A failed selected financial approval rolls back the financial batch rather than leaving a partial ledger commit.

The model carries source row index, optional stable `source_external_id`, versioned fingerprint, parser/mapping versions, match status/reason/confidence, transfer/rule evidence and approval linkage.

### #436 / PR #437 — later source evidence for an existing fact

Authenticated Inbox planning can conservatively find one reviewed existing unprovenanced money fact by owner/kind/account/date/exact amount. Reviewed attachment writes source provenance + candidate approval linkage without changing the existing transaction's kind, date, note, account, category, amount, review state or reconciliation state. User corrections therefore outrank later imported evidence.

### #438 / PR #439 — deleted exact-source reimport precedence

Merged as `d5324c473c2453869dc45dcd4cf5634ecbf97ea3` after final head `003841723e9dc8d5528fa7aaf82a969d261f0239` passed CI #2766, CodeQL #1826 and Secret history #1826.

Current behavior:

- live canonical transaction + same stable source ID remains hard `source_external_id_match`;
- soft-deleted canonical transaction + same fingerprint/version becomes `source_external_id_deleted_match` and requires explicit reviewed restore;
- deleted same-ID with changed/missing fingerprint becomes `source_external_id_deleted_changed` and cannot restore or use heuristic separate approval;
- planning never restores;
- reviewed restore clears only `financial_transactions.deleted_at`, preserves ledger/entries/reconciliation/canonical provenance, links the repeat candidate to the same transaction, and uses the existing `transaction_restored` audit path;
- replay is mutation-idempotent and tenant boundaries are enforced.

`transaction_import_provenance` still has one canonical row per transaction. `inbox_candidates` already stores each source observation and can link multiple reviewed candidates to one transaction through `approved_transaction_id`.

## 4. Current execution state

Master program #432 remains open. Merged P1 sequence is now: #435 atomic source ingestion → #437 reviewed later-source attachment → #439 explicit deleted-source lifecycle.

Issue #440 on branch `feat/440-source-observation-precedence` is the current **candidate** Class 3 slice. It is not shipped runtime truth. Its bounded job is to distinguish a live unchanged same-ID replay from changed same-ID source evidence, preserve that later observation without overwriting the ledger, and decide whether existing candidates are sufficient observation history.

Repository reconnaissance currently supports reusing `inbox_candidates` as observation history instead of adding a new table; that remains branch/spec evidence until implementation and merge.

Different-ID pending→posted/provider replacement identity, sync cursors and automatic ledger/reconciliation application remain deferred.

## 5. Current capability inventory

| Capability | Current main truth |
|---|---|
| Core ledger | multiple accounts; income, expense, transfers; edit; soft delete/recovery |
| Accounts | balances, register/history, create/edit/archive/restore and reconciliation |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Acquisition | persisted batches/candidates/provenance; exact source/fingerprint matching; atomic Direct CSV approval; reviewed later-source attachment; explicit deleted-source restore precedence |
| Ownership | versioned archive/export/validation/restore contract; hosted restore proof still open |
| Runtime modes | explicit demo/browser-local and authenticated/Supabase-RLS modes |
| Experience | responsive light/dark web UI; Inbox exposes reviewed source/reconciliation decisions without claiming provider sync |
| Release proof | RRB-01/RRB-07 closed; RRB-02/03/04/05/06/08/09 remain open or externally gated |
| Public beta | not approved |

Code, migrations and tests outrank this table on implementation detail.

## 6. Release/trust state

Release Readiness Audit v1 (#388) remains canonical.

Closed: RRB-01 authenticated mixed-ledger financial truth through #391; RRB-07 MoneyFlow-owned accessible-authentication browser proof through #394.

Open/external: RRB-02 hosted restore; RRB-03 destructive recent-auth provider edges; RRB-04 provider/Auth/firewall read-back plus #40/#174; RRB-05 operator-controlled contact proof; RRB-06 competent Vietnam personal-data legal/privacy review; RRB-08 current real-phone proof; RRB-09 current production deployment/provider identity.

Controlled closed beta remains blocked until release entry gates clear and no unresolved P0 exists. Public beta also requires controlled-beta evidence and explicit owner PBT-AC15 go/no-go.

## 7. Security and delivery truth

- `docs/configuration.md` owns environment/provider settings; `docs/deployment.md` owns deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes/gates; `docs/engineering/AGENT_OPERATING_MODEL.md` owns permission scopes and handoffs.
- CI classification, migration identity and project-knowledge checks are executable governance contracts; do not weaken them to make a PR pass.
- Draft PR success is not full evidence when heavy shards skip; exact-head evidence is required after the final branch mutation.
- Financial/schema/RLS/import/reconciliation changes are Class 3 and need the bounded packet plus risk-selected database/security/browser evidence.
- Production/provider writes remain separately authorized.

Recent acquisition merge provenance: #433 → `a35d6f96…`; #435 → `38ae8f86…`; #437 → `1ae4c765…`; #439 → `d5324c47…`.

## 8. Reconciled issue status

Completed P1 inputs: #434/#435, #436/#437 and #438/#439.

Current P1 child: #440, candidate until its PR merges. Master #432 remains the product-development program.

#403 performance and #426 simplification remain held/reconcile work rather than the current acquisition dependency. PR #431 remains a conflicting pre-#432 direction candidate and must not be merged blindly.

RRB release gates remain separate and are not auto-resolved by acquisition work.

## 9. Open pull-request memory

There is no merged authority from #440 yet. Its future PR-specific verification/failure history must live in exactly one `docs/research/pr-memory/YYYY/QN/PR-<number>.md` record.

Open PRs are candidate evidence even when mergeable or partially green. A final branch mutation invalidates older-head verification evidence.

## 10. True gaps after this audit

Product/acquisition gaps:

1. live same-ID changed-source observation precedence and durable observation evidence (#440);
2. explicit provider-supplied predecessor/replacement identity and pending→posted/removed/modified lifecycle across different IDs;
3. only then migrate the next real acquisition source through the neutral contract;
4. provider connectivity remains unselected until current official contract/consent/economics evidence supports a bounded adapter.

Release/trust gaps remain RRB-02/03/04/05/06/08/09 at their existing evidence/authority boundaries.

## 11. Next allowed action

Execute bounded #440 on its focused branch: tests first, then changed same-ID planning, observation-only reviewed resolution, evidence-durability guard, server/UI review path and exact-head Class 3 verification.

Do not jump to bank/e-wallet/NAPAS integration, infer different-ID lineage heuristically, or perform provider/production writes.

Owner/external lanes remain independent: real phone → RRB-08; provider read access → RRB-04/RRB-09 and #40/#174; contact proof → RRB-05; legal/privacy review → RRB-06; disposable hosted target → RRB-02; explicit owner/provider authorization → RRB-03.

## 12. Superseded-status register

- “manual-first is the long-term MoneyFlow product law” is superseded by merged #432.
- “Direct CSV authenticated commit loops ordinary transaction creation” is superseded by #435.
- “later imported evidence cannot reconcile to an existing unprovenanced user fact” is superseded by #437.
- “deleted exact-source reimport is indistinguishable from an ordinary live exact-ID duplicate” is superseded by #439.
- “#438 is current NOW work” is superseded by its completed #439 merge; #440 is the current candidate slice.
- “RRB-08 repository preparation is pending” is superseded by its merged runbook; physical observation remains open.
- RRB-07 and RRB-01 are no longer proof gaps; Release Readiness Audit v1 is no longer pending.
- The seven-day self-use gate remains withdrawn without replacement.