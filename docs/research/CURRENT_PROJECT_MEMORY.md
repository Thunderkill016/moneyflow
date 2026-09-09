# MoneyFlow — current project memory

**Status:** M0 is closed; M1 Phase A / MON-61 and MON-62 are completed. PR #553 is a Draft selector candidate for MON-63; it is not executable authority until owner merge resolves on fresh main.
**Last reconciled:** 2026-09-09
**Repository baseline:** `main@05323e2cb45609a85b3e7e3f2a4af94679149c31` after owner-merged PR #552.
**Last explicitly verified production runtime baseline:** `05323e2cb45609a85b3e7e3f2a4af94679149c31` (PR #552), Vercel production READY; `/api/health` returned 200 with the exact full commit and the post-deploy runtime-error check found no errors.
**Merged executable authority:** `PLAN_AUTHORITY.current: null`.
**Candidate authority in PR #553:** MON-63 packet `docs/plans/active/mon-63-mapping-presets-batch-retry-review.md`, `selectedByPr: 553`. This remains candidate evidence until owner merge.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger and progressively lower maintenance effort.

MON-62 — provenance-safe source-adapter foundation — is merged, deployed and tracker-complete. It established strict adapter identity/date/amount evidence and preserved source lifecycle/provenance through the existing Inbox path without creating a second financial truth.

The next recommended bounded slice is MON-63 — mapping presets, batch history and retry/review UX. Draft selector PR #553 proposes that transition. Until #553 is owner-merged, merged repository authority remains `null` and no MON-63 runtime implementation is authorized.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, source coverage, provider semantics or financial intent are never guessed by authoritative adapter paths.
- Source/provider evidence is not automatically a posted fact.
- All accepted acquisition paths converge on candidate/provenance/matching/approval/ledger/reconciliation authority.
- Corrections remain explicit/recoverable where the product contract requires them.
- Full archive/restore remains separate from scoped/report export.

## 3. Acquisition and reconciliation truth

Merged database contracts provide exact-source matching, replay idempotency, source lifecycle, changed-source/predecessor observation, deleted/reimport precedence and tenant/source scoping.

Merged PR #552 adds:

- pure/versioned source-adapter contract;
- confirmed source-stable identity with explicit institution/account namespace;
- non-truncating identity persistence;
- strict adapter date handling with explicit Excel 1900/1904 evidence and no current-date fallback;
- strict positive-integer VND plus explicit debit/credit direction;
- XLS/XLSX evidence path that preserves raw numeric/format/epoch evidence and rejects plaintext/ODS fallback while retaining real BIFF8 XLS;
- lifecycle/predecessor/parser/mapping provenance preserved through draft → preview → client → server → insert → reload.

Generic CSV/XLSX/PDF and Direct CSV remain compatibility paths; VCB/ACB/VietinBank bank-specific auto-map remains disabled because exact current consumer export layouts and stable transaction identity are still unproven.

## 4. MON-62 completion and production evidence

PR #552 exact owner-handoff head `ac972eaccb27033c7698fae364c4d67f81eac46c` passed clean CI #3382, CodeQL #2406 and Secret history #2406. Required gates included policy, lint/typecheck, full unit/static-RLS, fresh local DB reset + pgTAP, archive producer/restore round trips, production build, authenticated browser smoke, cross-device UI audit and aggregate E2E.

Owner squash-merged #552 as `05323e2cb45609a85b3e7e3f2a4af94679149c31`. Vercel production deployed that exact commit in READY state; `/api/health` returned 200 with the exact commit and the post-deploy runtime-error query found no errors.

MON-62 is Done in Linear. The merged closeout archives its packet and leaves `PLAN_AUTHORITY.current: null`.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | provenance/source-lineage; generic CSV/XLSX/PDF; Direct CSV and Share Target; provenance-safe adapter foundation; target-bank auto-map still disabled |
| Import operations | batch metadata/history exists; current local batch states are `parsed | committed | cancelled`; raw file content is not retained after parse |
| Review | existing exception-first Ready/Needs-attention semantics plus duplicate/transfer/reconciliation contracts |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Executable authority | merged `null`; PR #553 is a Draft MON-63 selector candidate only |

## 6. Research/evidence boundary

Current external references inform bounded acquisition UX rather than provider claims:

- Actual Budget import/API uses a stable imported ID first, fallback reconciliation otherwise, supports dry-run and reports added/updated/errors. This supports idempotent outcome/recovery concepts, not Actual's storage/provider architecture.
- YNAB file import documentation (August 2026) supports explicit field mapping and remembered settings in a known account context. This supports user-controlled mapping-preset principles, not automatic bank-layout inference.
- YNAB approval/matching documentation supports bulk actions and lower-friction review for matched transactions. MoneyFlow keeps its own existing readiness classifier and explicit approval authority.

No source proves exact current VCB/ACB/VietinBank consumer headers/layout, stable transaction identity, status, timezone or fee semantics. No evidence justifies server-side raw-statement retention or a background queue merely to implement MON-63.

## 7. Security and production-schema truth

Production Supabase remains healthy. Existing SECURITY DEFINER RPCs are intentional privileged mutation surfaces and require ownership/tenant contracts; no broad production rewrite is justified by advisor warnings alone.

PR #552 changed no migration/RLS policy/financial RPC. MON-63 must inventory current authenticated import-batch persistence before deciding whether schema/RPC changes are required. Any new user-owned preset or durable recovery state must be tenant-isolated and tested.

Provider credentials, live bank sync, production DB/Auth/provider mutation and real customer statement use remain outside MON-63 selector scope.

## 8. Reconciled issue status

- #432/#433: merged master product program; active strategy authority.
- M0 security/runtime/release-integrity slices: completed.
- #523 / MON-61: completed.
- MON-62 / PR #552: merged, production-verified and Done.
- MON-50: broader M1 — Vietnam Acquisition Depth program remains active.
- MON-63: Todo/High; no longer materially blocked by completed MON-62, but still unselected on merged main.
- PR #553: Draft Class-0 authority selector candidate for the Class-3 MON-63 packet.
- Open runtime implementation PR for MON-63: none.

## 9. Open pull-request memory

### PR #553 — MON-63 selector candidate

PR #553 starts from exact post-#552 `main@05323e2cb45609a85b3e7e3f2a4af94679149c31`.

It proposes only planning/authority changes:

- add the MON-63 active packet;
- set candidate manifest authority to that packet with `selectedByPr: 553`;
- reconcile this current memory from pre-merge #552 wording to post-merge/deployed truth;
- record PR #553 selector provenance.

The proposed packet extends existing history/review/import seams rather than rebuilding them. It treats the current two-step preview→Inbox commit as the main retry/recovery risk: candidate creation can succeed before batch-commit metadata update fails, so implementation must become idempotent or state-reconciling rather than expose a blind retry.

No runtime, schema, provider or production behavior changes are part of selector PR #553.

## 10. True gaps after this audit

1. Durable, deterministic mapping-preset eligibility/versioning that does not guess a bank/source layout.
2. State-aware, idempotent recovery when preview→Inbox candidate creation and batch metadata completion do not finish together.
3. User-meaningful batch outcome/provenance on the existing history surface without raw statement/source-ID leakage.
4. Cross-device truth when authenticated batch metadata exists but the browser-local preview draft does not.
5. Measurement of repeated mapping/review interventions and retry outcomes.
6. Exact current VCB/ACB/VietinBank consumer export layouts and stable identity semantics remain external evidence gaps.
7. Owner merge of selector PR #553 before any MON-63 runtime implementation.

## 11. Next allowed action

Complete exact-head selector verification for PR #553, confirm Draft lifecycle/mergeability/review state, and hand it to the owner for an explicit merge decision.

Do not implement MON-63 before owner merge of #553 plus fresh-main `npm run plan:resolve` and `npm run agent:doctor -- --json`. Do not merge #553 without explicit owner instruction.

## 12. Superseded-status register

- PR #552 is still unmerged or unverified in production — **false**; it merged as `05323e2...` and exact production deployment/health were verified.
- `PLAN_AUTHORITY.current` still selects MON-62 — **false**; merged main is `null`.
- MON-63 is automatically executable because MON-62 is Done — **false**; a fresh selector must owner-merge first.
- MON-63 needs a brand-new batch-history subsystem — **false**; batch/history metadata already exists and should be enriched.
- Blind client retry after preview→Inbox uncertainty is safe — **false**; candidate creation may have succeeded before batch metadata update failed.
- Mapping presets may be keyed by filename, row contents or guessed bank identity — **false**.
- VCB/ACB/VietinBank presets or auto-map are enabled — **false**.
- Raw statements must be stored server-side to support MON-63 — **false**; that boundary is not justified.
- A background queue is required for ordinary import retry — **false until measured evidence proves it**.
- MON-63 authorizes live bank sync/provider credentials — **false**.