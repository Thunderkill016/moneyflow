# MoneyFlow — current project memory

**Status:** M0 is closed; M1 Phase A #523 / MON-61 is closed; MON-62 implementation and independent evaluation are complete in PR #552, with same-PR lifecycle convergence projecting executable authority back to `null`. PR #552 remains owner-controlled until merge.
**Last reconciled:** 2026-09-06
**Repository baseline:** PR #552 started from exact `main@388549f99a288d99249e26f4116539e6705cb3ff` and remained zero commits behind main through implementation acceptance.
**Last explicitly verified production runtime baseline:** `0bf9335c748aeddfdd988aa458298d2edc8ae437` (PR #546). PR #552 is not production-deployment evidence until owner merge and post-merge runtime verification.
**Authority projection in PR #552:** `PLAN_AUTHORITY.current: null`. While #552 is open this is candidate projection; after owner merge it becomes merged current authority.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger. M0 Release Integrity and M1 Phase A bank-export evidence are complete.

MON-62 — source adapters, mappings and provenance-safe dedupe — reached implementation acceptance in PR #552. The completing PR archives the MON-62 packet and returns executable authority to `null`; it does **not** select a follow-on packet.

MON-63 remains Todo/unselected. Any executable follow-on requires fresh-main resolution and an explicit new selection after #552 merges. Merge of #552 itself remains owner-only.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories, provider semantics or financial intent are never guessed by authoritative adapter paths.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Source/provider evidence is not automatically a posted fact.
- Parsers/adapters do not become a second financial mutation authority; all accepted sources converge on candidate/provenance/matching/approval/ledger/reconciliation ownership.
- Full archive/restore is separate from scoped/report export.

## 3. Acquisition and reconciliation truth

Merged database contracts already provide provenance, exact-source matching, source lifecycle, changed-source observation, replacement/predecessor observation, Direct CSV atomic/rule-aware ingestion and Inbox approval ownership.

The MON-62 diff uses those primitives rather than creating a new schema or dedupe truth:

- source-adapter identity requires confirmed source-stable evidence plus an explicit institution/account namespace;
- account-scoped identity requires a persistence-safe source account key; mutable MoneyFlow account mapping is not source identity evidence;
- canonical adapter identity is bounded and never truncated; unsafe/overlong values fail closed;
- lifecycle/predecessor evidence is preserved through draft → preview projection → client facade → server validation → insert → reload;
- orphan lifecycle/predecessor evidence is rejected or omitted rather than persisted without a valid current source ID;
- existing Inbox planning/approval remains the sole financial mutation path.

Completed #523 / MON-61 evidence remains conservative: Vietcombank, ACB and VietinBank have first-party Excel-family export evidence, but current exact consumer headers/layout, source-stable IDs and full date/currency/direction/status/fee semantics remain unproven. Their bank-specific auto-map flags remain disabled.

## 4. MON-62 implementation and acceptance evidence

PR #552 adds a pure, versioned source-adapter boundary and strict adapter normalization without changing generic CSV/XLSX fallback semantics.

Adapter date handling:

- requires explicit supported text format or typed Excel serial evidence;
- uses explicit 1900/1904 workbook date system;
- rejects missing/unknown date format, Excel serial 60 and fractional datetime ambiguity;
- never substitutes the current clock.

Adapter amount/direction handling:

- requires safe positive integer VND;
- requires explicit absolute-value semantics;
- requires debit or credit direction rather than inferring silently.

Strict Excel evidence handling now preserves raw numeric cell values, source number format, formula/display evidence and workbook date system. It rejects SheetJS plaintext fallback and non-XLS/XLSX ZIP spreadsheets such as ODS while retaining real BIFF8 XLS support. Generic `parseXlsxStatement()` remains backward-compatible.

Counterexample coverage includes cross-institution/account identity collisions, delimiter-shaped references, row reorder, no-ID fallback, ambiguous/missing dates, Excel 1900/1904 edge cases, invalid amount/direction evidence, lifecycle/predecessor preservation, overlong identity rejection, ODS rejection and BIFF8 acceptance.

Implementation acceptance head `fdaa12136a5c7fbe947a2b268d56aca030b0b47c` passed CI #3380 policy/static/type/unit/static-RLS/build/aggregate gates and the selected browser smoke without retry, plus CodeQL #2405 and Secret history #2405. The independent MON-62 evaluation is recorded in PR #552 conversation. Older failed or cancelled heads are not acceptance evidence.

The final lifecycle-closeout head must independently satisfy exact-head gates before PR #552 is handed to the owner. No retry-only success may substitute for a clean head.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | provenance/source-lineage; generic CSV/XLSX/PDF; Direct CSV and Share Target; provenance-safe source-adapter foundation in #552; target-bank auto-map still disabled |
| Review | exception-first review plus duplicate/transfer/reconciliation contracts |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Executable authority | `null` in #552 closeout projection; MON-63 unselected |

## 6. Research/evidence boundary

External references informed architecture, not provider claims:

- OFX 2.2 describes duplicate-detection identity as account-scoped and not globally unique across institutions.
- UK Open Banking v4 describes an optional transaction ID unique and immutable within the servicing institution.
- Plaid Core Exchange 6.3 describes persistent account-scoped transaction IDs and distinct pending/posted identities connected by lineage/reference semantics.
- Current SheetJS documentation confirms Excel date/number-format options, 1900/1904 metadata, ZIP/CFB internal-file exposure and aggressive format detection including CSV fallback; it also distinguishes XLSX, BIFF8 XLS and ODS output formats.

These sources justify fail-closed namespace/date/container handling only. They do not prove current Vietnamese consumer-bank export layouts or stable identifiers.

## 7. Security and production-schema truth

M0 production schema remains the verified 56/56 migration baseline with the expected authenticated SECURITY DEFINER surface and the owner-accepted Supabase Free-plan leaked-password-protection limitation.

PR #552 changes no migration, RLS policy or financial RPC. Its CI correctly classifies database reset/pgTAP as not required for the diff; unchanged merged pgTAP already covers exact-source replay, changed-source observation, predecessor replacement, removed-unmatched behavior and tenant/source scoping.

PR #552 performs no production database/Auth/provider/bank/customer-data write and uses no provider credentials or live bank sync. Post-merge production deployment/runtime verification remains separate evidence and must not be inferred from pre-merge CI.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536/#539/#540/#544: M0 security/runtime/database/lifecycle slice completed.
- #523 / MON-61: completed and closed/Done.
- MON-50: broader M1 — Vietnam Acquisition Depth program remains active.
- MON-62: implementation/evaluation complete in PR #552; Linear remains In Progress until owner merge/post-merge closeout evidence is reconciled.
- MON-63: Todo/High and unselected.
- PR #552: completing implementation PR; owner merge boundary after final exact-head closeout gates.

## 9. Open pull-request memory

### PR #552 — MON-62 completion vehicle

PR #552 started from exact `main@388549f99a288d99249e26f4116539e6705cb3ff`. It contains the adapter contract, identity hardening, strict normalization, XLS/XLSX evidence seam, provenance-aware draft/client/server plumbing, counterexample tests and same-PR lifecycle convergence.

Known non-acceptance history is preserved: an early head failed Project Knowledge because the current snapshot was absent; `bb403b40f2a1c945c8e1ba216d6039e4432a0db6` failed typecheck and a corrupt-XLSX evidence test; a later browser run was cancelled by a newer branch push. None counts as acceptance.

Implementation head `fdaa12136a5c7fbe947a2b268d56aca030b0b47c` is the clean pre-closeout evidence. The final owner handoff must use the later lifecycle-closeout head with its own clean exact-head checks and no unresolved review threads.

## 10. True gaps after this audit

1. Exact current VCB/ACB/VietinBank consumer export headers/layout versions and exact workbook variants.
2. Provider-stable transaction identity plus proven institution/account namespace for those exports.
3. Exact exported date/timezone, currency/direction, status and fee semantics.
4. Owner merge of PR #552 followed by production deployment/runtime verification before claiming production availability.
5. Fresh-main owner selection of any follow-on slice; MON-63 is not implicitly selected.

## 11. Next allowed action

Complete exact-head verification of the lifecycle-closeout head, confirm PR #552 remains mergeable with no blocking review/thread state, then mark it ready for explicit owner review/merge.

Do not merge #552 without owner instruction. Do not select or implement MON-63 from this PR. After owner merge, verify the actual production deployment/runtime before closing tracker truth as production-complete.

## 12. Superseded-status register

- `PLAN_AUTHORITY.current` remains MON-62 after #552 lifecycle convergence — **false**; the completing PR projects it to `null`.
- MON-63 is automatically selected when MON-62 completes — **false**.
- Raw provider transaction references are globally safe source identity — **false**; proven namespace scope is required.
- Row indexes, display references, export-local counters, generated hashes or MoneyFlow fingerprints are authoritative source IDs — **false**.
- Overlong stable source IDs may be truncated safely — **false**; truncation can alias identities and now fails closed.
- A MoneyFlow account UUID is automatically a source namespace — **false**.
- Adapter dates may use today when missing — **false**.
- Strict XLS/XLSX evidence may accept any ZIP spreadsheet SheetJS can parse — **false**; OOXML/BIFF structure is required and ODS is rejected.
- Generic CSV/XLSX behavior was globally converted to strict adapter semantics — **false**.
- VCB/ACB/VietinBank bank-specific auto-map is enabled — **false**.
- PR #552 adds live bank sync, provider credentials or a new ledger mutation route — **false**.
- Pre-merge CI proves production deployment — **false**.
