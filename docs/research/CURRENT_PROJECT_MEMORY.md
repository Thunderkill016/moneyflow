# MoneyFlow — current project memory

**Status:** M0 is closed; MON-61 and MON-62 are completed. PR #553 carries the MON-63 selector projection; it is candidate authority before owner merge and executable only after merged authority resolves on fresh main.
**Last reconciled:** 2026-09-09
**Selector base:** `main@05323e2cb45609a85b3e7e3f2a4af94679149c31`, where `PLAN_AUTHORITY.current` is `null`.
**Last explicitly verified production runtime baseline:** `05323e2cb45609a85b3e7e3f2a4af94679149c31` (PR #552), Vercel READY; `/api/health` returned 200 with that commit and post-deploy runtime-error check found no errors.
**Authority projection carried by PR #553:** `docs/plans/active/mon-63-mapping-presets-batch-retry-review.md`, `selectedByPr: 553`.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger and progressively lower maintenance effort.

MON-62 is merged, deployed and tracker-complete. PR #553 is the bounded selector for MON-63 — mapping presets, batch history and retry/review UX. On the selector base, authority is `null`; #553 projects MON-63 and activates it only if owner-merged and fresh-main authority resolution succeeds.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, source coverage, provider semantics or financial intent are never guessed by authoritative adapter paths.
- Source/provider evidence is not automatically a posted fact.
- All accepted acquisition paths converge on candidate/provenance/matching/approval/ledger/reconciliation authority.
- Corrections remain explicit/recoverable where required.
- Full archive/restore remains separate from scoped/report export.

## 3. Acquisition and reconciliation truth

Merged contracts provide exact-source matching, replay idempotency, source lifecycle, changed/predecessor observation, deleted/reimport precedence and tenant/source scoping.

PR #552 adds a pure/versioned source-adapter contract, strict source identity/date/amount evidence, non-truncating persistence, Excel 1900/1904 evidence handling and lifecycle/parser/mapping provenance through draft → preview → client → server → insert → reload.

Generic CSV/XLSX/PDF and Direct CSV remain compatibility paths. Current main already ships a **v1 device-local Direct CSV remembered mapping** keyed by normalized header shape. The UI requires the user to explicitly apply it and reminds them to verify the dry-run. That capability is structural convenience only; it is not source/bank semantic authority.

VCB/ACB/VietinBank bank-specific auto-map remains disabled because exact current consumer layouts and stable transaction identity are unproven.

## 4. MON-62 completion and production evidence

PR #552 exact handoff passed CI, CodeQL, Secret History, database, browser and cross-device gates. Owner squash-merged it as `05323e2cb45609a85b3e7e3f2a4af94679149c31`; production deployment and exact health/runtime-error checks were verified. MON-62 is Done and its closeout left selector-base authority `null`.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | accounts; income/expense; balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | provenance/source-lineage; generic CSV/XLSX/PDF; Direct CSV and Share Target; provenance-safe adapter foundation; device-local Direct CSV remembered mapping; target-bank auto-map disabled |
| Import operations | batch metadata/history exists; local states `parsed | committed | cancelled`; raw file content not retained after parse |
| Review | exception-first Ready/Needs-attention plus duplicate/transfer/reconciliation contracts |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Executable authority | selector base `null`; #553 projects MON-63, active only after owner merge + fresh-main resolution |

## 6. Research/evidence boundary

External references support bounded workflow principles only:

- Actual Budget supports stable imported IDs, fallback reconciliation, dry-run and added/updated/errors outcomes.
- YNAB documents explicit field mapping, inflow/outflow swap and remembered settings in account context.
- YNAB matching/approval docs support lower-friction matched review and bulk actions.

These do not prove Vietnamese bank layouts, identity or MoneyFlow storage/mutation choices. Equal headers are not source or semantic evidence. No evidence justifies raw-statement server retention or a background queue merely for MON-63.

## 7. Security and production-schema truth

Production Supabase remains healthy. Existing SECURITY DEFINER RPCs are privileged mutation surfaces with ownership/tenant contracts. MON-63 must first inventory current import-batch persistence and existing transactional RPC patterns before adding schema/RPC.

Any new server-persisted preset or recovery state must be tenant-isolated and tested. Provider credentials, live bank sync, production DB/Auth/provider mutation and real customer statement use remain outside selector scope.

## 8. Reconciled issue status

- #432/#433: merged master product program; active strategy authority.
- M0 security/runtime/release-integrity: completed.
- #523 / MON-61: completed.
- MON-62 / PR #552: merged, production-verified and Done.
- MON-50: broader M1 Vietnam Acquisition Depth remains active.
- MON-63: Todo/High at selector base; #553 is its explicit authority transition vehicle.
- PR #553: Class-0 selector for a Class-3 packet; no runtime implementation in selector.
- Open MON-63 runtime implementation PR: none.

## 9. Open pull-request memory

### PR #553 — MON-63 selector projection

PR #553 starts from exact post-#552 `main@05323e2cb45609a85b3e7e3f2a4af94679149c31` and contains only planning/authority changes.

Independent selector evaluation established:

- structural header equality is not financial semantic authority;
- selector-base truth and post-merge authority projection must be represented separately so memory stays merge-stable;
- required project-knowledge headings remain executable contracts;
- runtime implementation base must be fresh main after selector merge, never the pre-merge selector SHA;
- fresh-main reconnaissance found the v1 Direct CSV mapping preset is already live and actively used, so MON-63 must generalize/harden that current capability rather than describe it as a stale-branch-only prototype.

The main retry/recovery gap remains the two-step preview→Inbox path: candidate creation can succeed before batch metadata completion, making blind retry unsafe.

No runtime, schema, provider or production behavior changes are part of #553.

## 10. True gaps after this audit

1. Generalize/harden the live device-local Direct CSV preset into deterministic, versioned, privacy-safe eligibility without inferring semantic equivalence from headers.
2. State-aware, idempotent recovery when candidate creation and batch completion do not finish together.
3. User-meaningful batch outcome/provenance on existing history without raw statement/source-ID leakage.
4. Cross-device truth when server batch metadata exists but browser-local preview material does not.
5. Measurement of repeated mapping/review interventions and retry outcomes.
6. Exact current VCB/ACB/VietinBank export layouts and stable identity semantics remain evidence gaps.
7. Owner merge of #553 plus fresh-main authority resolution before runtime implementation.

## 11. Next allowed action

If #553 is unmerged: latest exact head must pass required checks, remain mergeable with resolved threads, then only explicit owner merge may activate MON-63.

After owner merge: re-read fresh `main`, run `npm run plan:resolve` and `npm run agent:doctor -- --json`, record the exact post-selector-merge SHA, then begin bounded Class-3 implementation on a focused non-main branch.

Do not treat selector merge as production/provider authorization.

## 12. Superseded-status register

- PR #552 is unmerged or unverified in production — **false**.
- MON-62 remains selected after #552 — **false**; selector base is `null`.
- MON-63 is automatically executable because MON-62 is Done — **false**.
- Direct CSV mapping preset exists only on a stale branch — **false**; current main ships and actively uses a device-local v1 remembered-mapping seam.
- Equal normalized headers prove equal financial semantics or provider identity — **false**.
- MON-63 needs a brand-new batch-history subsystem — **false**; enrich current history.
- Blind retry after preview→Inbox uncertainty is safe — **false**.
- Mapping presets may key on filename, row contents or guessed bank identity — **false**.
- VCB/ACB/VietinBank presets or auto-map are enabled — **false**.
- Raw statements must be stored server-side for resume — **false**.
- A background queue is required — **false until measured evidence proves it**.
- MON-63 authorizes live bank sync/provider credentials — **false**.
