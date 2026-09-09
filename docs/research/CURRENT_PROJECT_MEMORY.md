# MoneyFlow — current project memory

**Status:** M0, MON-61, MON-62 and MON-63 are completed. The PR #556 closeout projection leaves `PLAN_AUTHORITY.current` as `null`; no follow-on executable slice is selected.
**Last reconciled:** 2026-09-09
**Last verified production runtime baseline:** `63c239aefca9b5629561808c17948e3aea39bf3e` (PR #555), Vercel READY; `/api/health` returned 200 for that exact commit. PR #556 is test/docs/lifecycle closeout only and introduces no runtime or provider mutation.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md` remains the long-term strategy authority.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger and progressively lower maintenance effort.

MON-63 is complete through implementation PRs #554 and #555 plus closeout PR #556. Its closeout archives the packet and returns executable authority to `null`. No backlog item, open PR, Plate task or chat instruction becomes executable work until a fresh selector changes `PLAN_AUTHORITY.json`.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo mode remains explicit browser-local state.
- Missing balances, dates, source coverage, provider semantics or financial intent are never guessed by authoritative paths.
- Source/provider evidence is not automatically a posted ledger fact.
- All accepted acquisition paths converge on candidate/provenance/matching/approval/ledger/reconciliation authority.
- Corrections remain explicit and recoverable where required.
- Full archive/restore remains separate from scoped/report export.

## 3. Acquisition and reconciliation truth

MON-62 established versioned source adapters, strict source identity/date/amount evidence, non-truncating persistence, Excel date-system evidence and lifecycle/parser/mapping provenance.

MON-63 then hardened the import-maintenance loop:

- Direct CSV remembered mappings are versioned and eligibility is bound to parser/mapping semantics rather than header shape alone.
- Remembered mapping remains an explicit user action followed by dry-run/review.
- Manual mapping changes invalidate `preset_applied` evidence and return the batch to `mapping_reviewed`.
- Authenticated preview→Inbox commit is atomic/replay-safe for the same batch intent; exact replay does not create a second candidate set.
- Reusing a batch key with changed canonical financial intent fails closed.
- Import history exposes safe outcome/provenance/retry/mapping evidence without raw statement contents.
- Cross-device history does not claim a browser-local draft is resumable when that draft is absent.
- Import maintenance counters are tenant-owned operational metadata, not tamper-proof telemetry and not financial truth.

VCB/ACB/VietinBank bank-specific auto-map remains disabled because exact current layouts and stable transaction identity are not proven.

## 4. MON-63 completion evidence

PR #554 implemented atomic import retry, versioned preset eligibility, truthful history/recovery and tenant-isolated database contracts. Exact-head CI included fresh Supabase reset/pgTAP, static quality, build, browser/e2e, CodeQL and secret-history evidence before owner squash merge.

PR #555 added privacy-safe first-party maintenance counters and durable mapping evidence on existing `import_batches`, with tenant isolation and app-first schema fallback. It was owner squash-merged as `63c239aefca9b5629561808c17948e3aea39bf3e` and that exact commit was verified READY in production with `/api/health` 200.

PR #556 added the missing affected browser proof: remember a Direct CSV mapping, re-upload, explicitly apply it, then manually change a mapping and verify review evidence returns from remembered preset to manual review. Exact head `cdbdef637f8c4dcc7ff46eb4d03348fe99402eab` passed CI #3450, CodeQL #2472 and Secret History #2472 before lifecycle closeout projection.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | accounts; income/expense; balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | generic CSV/XLSX/PDF; Direct CSV and Share Target; provenance-safe source adapters; versioned explicit remembered mapping; target-bank auto-map disabled |
| Import integrity | atomic/replay-safe authenticated batch commit; changed-intent fail-closed; no raw-statement retention |
| Import operations | truthful batch history, mapping/retry evidence and no-false-resume cross-device state |
| Review | existing exception-first Ready/Needs-attention semantics and explicit approval authority |
| Measurement | tenant-owned operational counters for import maintenance/replay; no raw financial payloads |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Executable authority | `null` after PR #556 closeout; follow-on work unselected |

## 6. Research/evidence boundary

External product references remain workflow evidence only. Actual Budget supports stable imported IDs and reconciliation patterns; YNAB documents explicit file mapping, remembered settings and approval/matching patterns. These do not prove Vietnamese bank layouts, provider identity or MoneyFlow storage/mutation choices.

Equal headers do not prove equal financial semantics. No evidence justifies raw-statement server retention or a background queue for the completed MON-63 scope.

## 7. Security and production-schema truth

New MON-63 database state stays under tenant ownership/RLS. Replay-safe mutation uses a bounded database transaction and row lock rather than a service-role bypass or background queue.

Operational counters and mapping evidence are user-owned metadata. They are privacy-minimized and non-authoritative; a same-tenant user can own/change their own metadata, so it must not be described as tamper-proof audit evidence.

Provider credentials, live bank sync, production provider mutation and real-customer statement ingestion remain outside MON-63 authorization.

## 8. Reconciled issue status

- #432/#433: merged master Vietnam long-term product program; master authority remains active.
- M0 security/runtime/release-integrity: completed.
- #523 / MON-61: completed.
- MON-62 / PR #552: completed and production-verified.
- MON-63 / PRs #553–#556: completed; #556 is the lifecycle closeout vehicle.
- #554 and #555: merged implementation increments.
- No current executable packet is selected after #556 merge.
- Backlog/issues/Plate remain planning evidence only until selected by a fresh authority PR.

## 9. Open pull-request memory

### PR #556 — MON-63 affected-flow evidence and closeout

PR #556 starts from post-#555 `main@63c239aefca9b5629561808c17948e3aea39bf3e`.

Its affected-flow browser test proves the remembered-mapping convenience remains explicit and reversible: applying a saved mapping surfaces remembered evidence, while a manual mapping edit restores manual-review evidence.

The same PR archives MON-63, changes `PLAN_AUTHORITY.current` from the MON-63 packet to `null`, updates this snapshot and records lifecycle completion. It selects no follow-on work.

After owner merge, this section is provenance only; PR #556 is not a second executable authority.

## 10. True gaps after this audit

1. Real-world maintenance improvement still needs cohort evidence over time; the new counters provide raw operational evidence but not a proven retention or time-saved claim.
2. Exact VCB/ACB/VietinBank export layouts and stable transaction identity remain evidence gaps for bank-specific automation.
3. Live bank/Open API connectivity still requires provider research, contracts, operational controls and explicit owner authorization.
4. Public-beta provider/physical-device evidence remains separate from MON-63 completion.
5. Daily-path simplification and other backlog improvements remain unselected until a fresh selector establishes authority.

## 11. Next allowed action

Read fresh `main`, run `npm run plan:resolve`, then `npm run agent:doctor -- --json` in a fully materialized repository/toolchain environment.

With `PLAN_AUTHORITY.current = null`, do not infer the next executable slice from issue priority, Plate, open PRs, newest documents or chat history. Select any follow-on work through a fresh authority transition from merged main.

Do not treat MON-63 completion as authorization for provider sync, AI mutation, raw-statement retention or bank-specific guessing.

## 12. Superseded-status register

- MON-63 remains an implementing/current slice after PR #556 — **false** after owner merge.
- PR #553 is still only a candidate selector — **false**; it was merged and activated MON-63.
- Direct CSV remembered mapping is only a v1 header-shape helper — **false**; MON-63 hardened it with versioned semantic eligibility while preserving explicit apply/review.
- Header equality proves equal source semantics — **false**.
- Blind retry after an uncertain preview→Inbox response is safe — **false**; replay is state-aware and intent-bound.
- Exact replay may create another candidate set — **false**.
- Import history may promise resume when another device lacks the local draft — **false**.
- Mapping/retry counters are tamper-proof audit telemetry — **false**; they are tenant-owned operational metadata.
- VCB/ACB/VietinBank auto-map is enabled — **false**.
- Raw statements are retained server-side for resume — **false**.
- A background queue is required for the completed MON-63 design — **false**.
- MON-63 authorizes live bank sync/provider credentials — **false**.
- Plate or backlog priority is executable authority — **false**.
