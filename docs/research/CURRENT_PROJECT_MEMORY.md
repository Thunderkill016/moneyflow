# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority when read from `main`
**Last reconciled:** 2026-08-22
**Current main baseline:** `6123d263c60fba98bd67b5c935a7179477ad7fcb` (PR #441 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs. The owner-facing queue is `docs/plans/active/README.md`.

## 1. Current decision

MoneyFlow is a functional Vietnamese personal-finance product and is **not public-beta ready**.

Merged #432 is the master product-direction authority: safely acquirable digital transactions should not require retyping, while one user-owned ledger remains financial truth. Manual entry stays first-class for cash, missing/off-system evidence and corrections.

Dependency order is source/evidence → candidates/provenance → normalization/dedup/matching → trustworthy ledger facts → reconciliation/correction → understanding/review → connected planning → automation → selective read-only providers → wealth/together/optional intelligence when validated.

Source adapters create evidence/candidates, not arbitrary balances or silently rewritten ledger facts. Exact source identity is stronger than heuristic similarity; different-ID lineage is never inferred from fuzzy similarity alone.

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

### #440 / PR #441 — changed live source observations

Merged as `6123d263c60fba98bd67b5c935a7179477ad7fcb` after final head `237aac8d771dd5f8ba57db5fa44d7309ce571245` passed CI #2792, CodeQL #1851 and Secret history #1851 with no final-head retry.

Current behavior:

- unchanged live same-ID evidence remains hard `source_external_id_match`;
- changed/unknown live evidence under that same stable source ID becomes hard `source_external_id_changed`;
- reviewed **“Ghi nhận cập nhật nguồn”** links the newer observation to the same transaction without changing transaction/entry/reconciliation/canonical-provenance values;
- `inbox_candidates` are reused as durable source-observation history for this boundary;
- authenticated browser callers cannot fabricate approved observation evidence through direct INSERT or UPDATE;
- heuristic duplicate override cannot bypass hard exact-source identity;
- no provider/native/different-ID predecessor lifecycle or automatic source-driven clearing/reconciliation was introduced.

## 4. Current execution state

Master #432 remains active. Merged P1 sequence is #435 atomic source ingestion → #437 later-source attachment → #439 deleted-source restore precedence → #441 changed same-ID observation preservation.

Issue #443 on `chore/443-plan-authority-resolution` is the current **candidate governance slice**, not shipped behavior. It exists because post-#441 main still carried a stale board/memory state and agents had no machine check that resolved master-plan supersession before selecting `NEXT`.

#443 proposes `docs/plans/PLAN_AUTHORITY.json` plus a fail-closed resolver integrated into standard doctor/knowledge entrypoints. Until it merges, that mechanism is candidate evidence only.

Issue/branch #442 for explicit provider-supplied predecessor/replacement identity and source lifecycle already exists but is paused behind #443. After #443 merges, #442 must rebase/re-read current main and continue only if the resolved authority still selects #432 P1.

## 5. Current capability inventory

| Capability | Current main truth |
|---|---|
| Core ledger | multiple accounts; income, expense, transfers; edit; soft delete/recovery |
| Accounts | balances, register/history, create/edit/archive/restore and reconciliation |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Acquisition | persisted batches/candidates/provenance; exact source/fingerprint matching; atomic Direct CSV approval; reviewed later-source attachment; deleted-source restore precedence; reviewed changed same-ID observation preservation |
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
- Financial/schema/RLS/import/reconciliation changes are Class 3 and need bounded packets plus risk-selected database/security/browser evidence.
- Production/provider writes remain separately authorized.

Recent acquisition merge provenance: #433 → `a35d6f96…`; #435 → `38ae8f86…`; #437 → `1ae4c765…`; #439 → `d5324c47…`; #441 → `6123d263…`.

## 8. Reconciled issue status

Completed P1 inputs: #434/#435, #436/#437, #438/#439 and #440/#441. Master #432 remains the product-development program.

Current agent-executable candidate: #443 governance repair. #442 is the next acquisition candidate but must not proceed until #443 is merged/re-resolved against current main.

#403 performance and #426 simplification remain held/reconcile work rather than the current acquisition dependency. PR #431 remains an unmerged conflicting pre-#432 candidate and is not authority.

RRB release gates remain separate and are not auto-resolved by product/governance work.

## 9. Open pull-request memory

#443 has no merged authority yet; its PR-specific verification/failure history must live in exactly one `docs/research/pr-memory/YYYY/QN/PR-<number>.md` record once the PR exists.

#442 branch work is also unmerged candidate evidence and must not be restated as shipped behavior.

Open PRs are candidate evidence even when newer, mergeable or partially green. A final branch mutation invalidates older-head verification evidence.

## 10. True gaps after this audit

Delivery-governance gap: current main does not yet mechanically resolve plan supersession/board freshness before task selection; #443 is the candidate fix.

Acquisition gaps after merged #441:

1. explicit provider-supplied predecessor/replacement identity and pending→posted/removed/modified source lifecycle across different IDs (#442 candidate);
2. define when source lifecycle may affect clearing/completeness/reconciliation without overwriting user truth;
3. migrate the next real acquisition source through the neutral contract;
4. provider connectivity remains unselected until current official contract/consent/economics evidence supports a bounded adapter.

Release/trust gaps remain RRB-02/03/04/05/06/08/09 at their existing evidence/authority boundaries.

## 11. Next allowed action

Finish bounded #443 governance repair: make authority discovery fail closed, reconcile post-#441 active state, exercise exact-head policy/static/database/browser/security gates selected for this repository-policy change, then return owner merge decision.

Do not continue #442 implementation until #443 has merged and a fresh main read resolves #432 P1 as the current next acquisition boundary. Do not jump to bank/e-wallet/NAPAS integration or perform provider/production writes.

Owner/external lanes remain independent: real phone → RRB-08; provider read access → RRB-04/RRB-09 and #40/#174; contact proof → RRB-05; legal/privacy review → RRB-06; disposable hosted target → RRB-02; explicit owner/provider authorization → RRB-03.

## 12. Superseded-status register

- “manual-first is the long-term MoneyFlow product law” is superseded by merged #432/#433.
- `docs/plans/PRODUCT_DEVELOPMENT_PLAN.md` from #420 is predecessor history, not the master plan after #433.
- “Direct CSV authenticated commit loops ordinary transaction creation” is superseded by #435.
- “later imported evidence cannot reconcile to an existing unprovenanced user fact” is superseded by #437.
- “deleted exact-source reimport is indistinguishable from an ordinary live exact-ID duplicate” is superseded by #439.
- “changed evidence under a live stable source ID is indistinguishable from unchanged replay” is superseded by #441.
- “#440 is current NOW/candidate work” is superseded by #441 merge; #443 is the current candidate governance slice and #442 is paused next work.
- RRB-07 and RRB-01 are no longer proof gaps; Release Readiness Audit v1 is no longer pending.
- The seven-day self-use gate remains withdrawn without replacement.
