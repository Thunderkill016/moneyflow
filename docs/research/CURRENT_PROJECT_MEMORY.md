# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority
**Last reconciled:** 2026-08-21
**Current main baseline:** `1ae4c765af9789a6a7e34179a1d3a2733eb436fe` (PR #437 merged)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs. The owner-facing execution queue is `docs/plans/active/README.md`.

## 1. Current decision

MoneyFlow is a functional Vietnamese personal-finance product and is **not public-beta ready**.

The merged #432 program is the current product-direction authority. The long-term product is a low-maintenance, provider-independent PFM: safely acquirable digital transactions should not require retyping, while the ledger remains the single financial source of truth. Manual entry remains a fallback for cash, missing evidence and corrections rather than the intended primary long-term workflow.

Product dependency order is:

> trusted ledger → acquisition + reconciliation → understanding → planning → automation → selective connectivity → wealth → together → optional intelligence

Source adapters may create normalized evidence/candidates, not arbitrary balances or silently rewritten ledger facts. Human review remains the boundary for weak matches. Exact source identity is stronger than heuristic similarity. False merges are worse than visible duplicates.

Release readiness is a separate lane from product development:

- public beta: **BLOCKED**;
- controlled closed beta: **BLOCKED on P1 release gates RRB-04, RRB-05, RRB-06 and RRB-09**;
- RRB-08 still requires current owner-observed physical-phone evidence; browser/emulation/CI cannot close it;
- RRB-02/RRB-03 remain later owner/provider proof-or-limitation decisions.

Product work never substitutes for provider read-back, production evidence, legal review, physical-device proof or owner go/no-go decisions.

## 2. Current runtime and financial truth

- `authenticated` uses Supabase Auth/PostgreSQL with RLS; `demo` is explicit browser-local exploration.
- Missing credentials never select demo implicitly.
- VND is integer đồng.
- Transfers are balanced account movements and are neutral to income/expense/net.
- Authenticated ledger data is server-owned; demo state is browser-local.
- Ledger facts support edit plus recoverable/soft-delete behavior where the product contract requires it.
- Accounts support balances, register/history, archive/restore and reconciliation.
- Planning currently includes category budgets, recurring commitments/income and savings goals.
- Understanding currently includes weekly/monthly/yearly reports and controlled import/export surfaces.
- Complete versioned archive lives at `/settings/backup`, separate from scoped/report export. Hosted restore remains unexecuted and belongs to RRB-02.
- Evidence layers remain separate: repository/static, unit/domain, database, browser, provider read-back, production runtime, physical device and owner/legal decision cannot silently prove one another.

## 3. Acquisition and reconciliation truth on current main

### #434 / PR #435 — Direct CSV boundary

Merged as `38ae8f8694554d8d69508f86bcc66b2bdfe68b95`.

Authenticated Direct CSV no longer loops ordinary transaction creation row-by-row. It persists import batches/candidates/provenance evidence and commits selected rows through one batch-atomic approval boundary. If one selected financial approval fails, the financial batch rolls back rather than leaving a partial ledger commit. Candidate/import evidence may remain for review/recovery.

The persisted acquisition model already carries source identity and provenance fields including source row index, optional stable `source_external_id`, versioned fingerprint, parser/mapping versions, match status/reason/confidence, transfer evidence, rule evidence and approval linkage.

### #436 / PR #437 — later source evidence for an existing fact

Merged as `1ae4c765af9789a6a7e34179a1d3a2733eb436fe` after exact head `83957701cf38647729d35956d6b5af132641a5dd` passed CI #2758, CodeQL #1819 and Secret history #1819.

Current authenticated Inbox planning now preserves this precedence:

1. candidate already approved;
2. exact source external ID;
3. canonical fingerprint duplicate evidence;
4. transfer suspicion;
5. conservative reviewed fallback to an existing unprovenanced money fact;
6. account/category validity;
7. would-create.

The reviewed existing-ledger fallback is intentionally narrow: same owner, income/expense kind, account, date and exact signed amount; one-entry, non-deleted, non-generated, unprovenanced fact only. One eligible fact becomes `existing_transaction_match`; multiple eligible facts become `existing_transaction_ambiguous` with no arbitrary target.

`attach_inbox_candidate_to_existing_transaction()` writes source provenance + candidate approval linkage to the reviewed existing transaction without modifying its kind, date, note, account, category, amount, review state or reconciliation state. User corrections therefore outrank later imported evidence in this boundary.

Exact source-ID duplicates remain hard duplicates and do not expose the heuristic separate-transaction override. Transfer suspicion outranks the weaker existing-ledger fallback.

Important limitation: reviewed attachment is **not** an automatic-link primitive. The target row is locked and the narrow match is recomputed, but the current implementation is deliberately human-reviewed; future automatic attachment requires a stronger concurrency/idempotency contract.

### Current provenance limitation

`transaction_import_provenance` currently has one canonical provenance row per financial transaction. Multi-observation/provider-update history is not yet modeled as a one-to-many source-observation ledger. Do not smuggle pending→cleared/provider-correction semantics into unrelated work.

## 4. Current execution state

The master program remains #432.

Current agent slice on branch `feat/438-deleted-reimport-precedence` is **candidate work, not shipped runtime truth**:

- issue #438 owns explicit deleted exact-source-ID reimport precedence;
- planning must distinguish a live hard duplicate from a soft-deleted canonical transaction;
- no source observation may auto-restore a deleted ledger fact;
- an unchanged repeated observation may expose an explicit reviewed restore of the same transaction;
- a materially changed observation under the same stable source ID must remain blocked for a later source-update-precedence slice;
- #438 cannot claim shipped capability until merge.

After #438, the intended next P1 dependency is source-update precedence: pending→cleared/provider corrections and whether one-to-many source observations require a dedicated model. Only after identity/update lifecycle is explicit should the next real acquisition source path be migrated through the neutral candidate/provenance/reconciliation boundary.

Independent owner/device/provider lanes remain open in parallel where appropriate.

## 5. Release/trust state

Release Readiness Audit v1 (#388) remains the canonical release audit.

Closed evidence:

- RRB-01 — authenticated mixed-ledger financial truth closed through #391.
- RRB-07 — MoneyFlow-owned Accessible Authentication browser proof closed through #394.

Still open or externally gated:

- **RRB-02** — hosted restore proof or explicit limitation; needs disposable/authorized hosted target or owner decision.
- **RRB-03** — destructive recent-auth provider-edge proof or explicit limitation; owner/provider gated.
- **RRB-04** — provider/Auth/firewall read-back plus #40/#174 decisions; requires provider read access.
- **RRB-05** — operator control of published support/privacy contact is unproven.
- **RRB-06** — competent Vietnam personal-data legal/privacy operational review is not recorded.
- **RRB-08** — current physical-device proof remains open; merged runbook does not equal PASS. A real phone, selected release-candidate origin, device/OS/browser/mode and pass/fail/defect evidence are required.
- **RRB-09** — current production deployment/provider identity is not tied to the release candidate with current provider evidence.

Controlled closed beta remains blocked until P1 release gates clear and no unresolved P0 exists. Public beta additionally requires controlled-beta evidence and explicit owner PBT-AC15 go/no-go.

## 6. Presentation, performance and held work

- Fresh Blue remains shipped presentation.
- Browser/emulation evidence is not physical-device evidence.
- #403 performance remains open/held rather than the default current product slice. The canonical harness is useful measurement infrastructure, but prior work demonstrated no material cold-load performance win; do not restate measurement setup as a performance improvement.
- #426 simplification remains held pending reconciliation with #432. Evidence-backed friction reductions may be reused, but corrected false premises must not be revived.
- PR #431 remains a conflicting pre-#432 product-direction candidate and should not be merged blindly against the merged #432 authority.
- Provider integration, native mobile, Wealth, Together and AI mutation remain horizon work until their dependencies and bounded researched specifications exist.

## 7. Security and delivery truth

- `docs/configuration.md` owns environment/provider-setting contracts.
- `docs/deployment.md` owns branch/deployment workflow.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns risk classes/gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permissions/execution states.
- `scripts/classify-ci-changes.mjs` owns path-to-CI selection.
- `scripts/check-project-knowledge.mjs` and active-packet registry checks are executable governance contracts; do not weaken them to make a PR pass.
- Draft PR workflow success is not verification evidence when heavy shards skip.
- Exact-head evidence is required after the final branch mutation. A green check on an older SHA never proves a newer head.
- Financial/schema/RLS/import/reconciliation changes are Class 3 and require the full bounded packet plus risk-selected database/security/browser evidence.
- Production/provider writes remain separately authorized even if repository implementation is ready.

Recent verified acquisition delivery:

- #433 final head `ea89a15011a1d8ce8bad6605721cc6b4a4116de6` → CI #2728, CodeQL #1791, Secret #1791 → merged `a35d6f96960e889cf988d9d37d4320a8f674cd85`.
- #435 final head `7c1c5f4daa346415544aa2d474f0f3b18e3b87fd` → full Class 3 CI, CodeQL #1800, Secret #1800 → merged `38ae8f8694554d8d69508f86bcc66b2bdfe68b95`.
- #437 final head `83957701cf38647729d35956d6b5af132641a5dd` → CI #2758, CodeQL #1819, Secret #1819 → merged `1ae4c765af9789a6a7e34179a1d3a2733eb436fe`.

## 8. Current capability inventory

| Capability | Current main truth |
|---|---|
| Core ledger | multiple accounts; income, expense, transfers; edit; soft delete/recovery |
| Accounts | balances, identity, register/history, create/edit/archive/restore and reconciliation |
| Planning | category budgets, recurring commitments/income and savings goals |
| Understanding | weekly/monthly/yearly reports, controlled import and CSV export |
| Acquisition | persisted import batches/candidates/provenance; deterministic source/fingerprint matching; atomic Direct CSV approval; reviewed later-source attachment to an existing unprovenanced fact |
| Ownership | versioned archive/export/validation/restore contract; hosted restore proof still open |
| Runtime modes | explicit demo/browser-local and authenticated/Supabase-RLS modes |
| Experience | responsive light/dark web UI; current Inbox review exposes source/reconciliation decisions without claiming automatic provider sync |
| Release proof | RRB-01/RRB-07 closed; RRB-08 physical proof open; RRB-04/05/06/09 and RRB-02/03 remain |
| Public beta | not approved |

Code, migrations and tests outrank this table on implementation detail.

## 9. Next allowed action

Agent work follows `docs/plans/active/README.md` and the active child packet under #432. At this snapshot the candidate branch task is #438 deleted-source reimport precedence.

Owner/external actions remain independent:

- real physical phone → RRB-08;
- provider read access → RRB-04/RRB-09 and #40/#174 evidence;
- operator-controlled contact evidence → RRB-05;
- competent legal/privacy review → RRB-06;
- disposable authorized hosted target → RRB-02;
- explicit owner/provider authorization → RRB-03.

Do not auto-resolve owner/provider/legal/device gates. Do not describe branch-only #438 behavior as shipped until merge.

## 10. Superseded-status register

- “manual-first is the long-term MoneyFlow product law” is superseded by merged #432. Manual remains a current capability/fallback, not the intended primary long-term acquisition workflow.
- “Direct CSV authenticated commit loops ordinary transaction creation” is superseded by #435.
- “later imported evidence cannot reconcile to an existing unprovenanced user fact” is superseded by #437.
- “RRB-08 repository preparation is pending” is superseded by the merged runbook; physical observation itself remains open.
- “RRB-07 is a current proof gap” is superseded by #394.
- “RRB-01 is a current proof gap” is superseded by #391.
- “Release Readiness Audit v1 is pending” is superseded by #388.
- “the seven-day self-use gate is required” remains withdrawn without replacement.
