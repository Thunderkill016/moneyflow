# MoneyFlow — current project memory

**Status:** M0 is closed; M1 Phase A #523 / MON-61 is closed; MON-62 is the active Class 3 executable slice selected by merged PR #550. Implementation PR #552 is draft/candidate evidence until exact-head acceptance and owner merge.
**Last reconciled:** 2026-09-06
**Repository baseline:** `main@388549f99a288d99249e26f4116539e6705cb3ff` after selector PR #550 and research-handoff cleanup PR #551.
**Last explicitly verified production runtime baseline:** `0bf9335c748aeddfdd988aa458298d2edc8ae437` (PR #546). Later selector/docs/dependency work is not production-deployment evidence.
**Current authority on merged main:** `docs/plans/active/mon-62-source-adapters-provenance-dedupe.md`, selected by PR #550.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product centered on one trustworthy user-owned ledger. M0 Release Integrity and M1 Phase A bank-export evidence work are complete. GitHub #523 is closed and Linear MON-61 is Done.

PR #550 merged and activated **MON-62 — source adapters, mappings and provenance-safe dedupe**. Git-history-backed plan resolution in CI confirms the master and MON-62 current packet are active. MON-63 remains Todo/unselected and must not be selected by the MON-62 completion PR.

PR #552 is the implementation vehicle for MON-62. It started from exact `main@388549f99a288d99249e26f4116539e6705cb3ff`; it is draft while implementation evaluation, exact-head gates and lifecycle convergence remain incomplete. Merge remains owner-only.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories, provider semantics or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Source/provider evidence is not automatically a posted fact.
- Parsers/adapters never become a second financial mutation authority; all sources converge on candidate/provenance/matching/approval/ledger/reconciliation ownership.
- Full archive/restore is separate from scoped/report export.

## 3. Acquisition and reconciliation truth

Merged repository/database contracts already include provenance, exact-source matching, source lifecycle, replacement/predecessor observations, Direct CSV atomic/rule-aware ingestion and Inbox approval ownership.

Completed #523 / MON-61 established conservative Vietnam bank-export evidence:

- first-party material confirms an Excel artifact family in scoped Vietcombank, ACB and VietinBank flows;
- exact exported consumer headers/layout, date/timezone, currency/direction, status/fee representation and provider-stable transaction identity remain unproven;
- row indexes, UI/display references, export-local IDs, generated hashes and MoneyFlow preview fingerprints are not stable source identity;
- all VCB/ACB/VietinBank bank-specific auto-map flags remain disabled.

MON-62 reuses existing schema. No new migration is needed merely to preserve source external ID, lifecycle, predecessor, parser/mapping evidence or existing matching semantics.

## 4. MON-62 implementation truth in PR #552

PR #552 currently implements candidate changes only; none are merged runtime truth yet.

- adds a pure source-adapter contract with explicit institution/account identity scope;
- canonical source identity includes the proven namespace and fails closed when evidence is incomplete or unsafe;
- source identity is never truncated at the 200-character persistence boundary;
- adapter-only date normalization requires explicit date format and Excel 1900/1904 system, rejects Excel serial 60 and fractional datetime ambiguity, and never reads the current clock;
- adapter-only amount normalization requires safe positive integer VND, absolute-value semantics and explicit debit/credit direction;
- generic CSV/XLSX date fallback remains unchanged and generic imports do not invent stable identity;
- a pure adapter→draft bridge preserves accepted source evidence without adding mutation authority;
- draft → preview projection → client facade → server schema → insert → reload preserves current ID/lifecycle/predecessor/parser/mapping evidence;
- raw provider references now require explicit identity scope before becoming a canonical source ID;
- Direct CSV remains generic and no bank/provider network access or credentials are introduced.

A deeper implementation finding is now guarded: previous provenance insertion shortened `sourceExternalId` and predecessor values with `.slice(0, 200)`. Because truncation can alias two distinct identities, PR #552 changes identity persistence to omit invalid/overlong evidence rather than shorten it.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | merged provenance/source-lineage, generic CSV/XLSX/PDF, Direct CSV and Share Target flows; MON-62 adapter foundation is candidate in PR #552 |
| Review | exception-first review plus duplicate/transfer/reconciliation contracts |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Executable authority | MON-62 active via merged PR #550; MON-63 unselected |

## 6. Research/evidence boundary

External architecture references support MON-62 design but do not prove target-bank export fields:

- OFX 2.2 describes duplicate-detection identity as account-scoped and not globally unique across institutions.
- UK Open Banking v4 describes an optional transaction ID unique and immutable within the servicing institution.
- Plaid Core Exchange 6.3 describes persistent account-scoped transaction IDs and distinct pending/posted IDs connected by reference lineage.
- SheetJS documents spreadsheet serial dates, 1900/1904 date systems, the preserved 1900 leap-year bug, fractional time values and timezone interpretation limits.

These sources justify explicit namespace and fail-closed date handling only. They do not enable VCB/ACB/VietinBank auto-map or prove a consumer-export stable transaction ID.

## 7. Security and production-schema truth

M0 production schema remains the verified 56/56 migration baseline with the expected authenticated SECURITY DEFINER surface and the owner-accepted Supabase Free-plan leaked-password-protection limitation.

M1 Phase A PR #546 exact head passed CI #3323, CodeQL #2353 and Secret history #2353 without retry; its production Vercel deployment was READY for runtime commit `0bf9335c748aeddfdd988aa458298d2edc8ae437`, and `/api/health` returned 200 during verification.

PR #550 merged the MON-62 selector as `10ecf726dce426d6e03a020c6424fae43f202199`. Docs/research replay PR #551 then passed clean exact-head gates and merged as `388549f99a288d99249e26f4116539e6705cb3ff`. PRs #549 and #512 are closed as superseded.

PR #552 performs no migration, production database/Auth/provider/bank/customer-data write or production deployment.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536/#539/#540/#544: M0 security/runtime/database/lifecycle slice completed.
- #523 / MON-61: completed and closed/Done.
- MON-50: broader M1 — Vietnam Acquisition Depth program remains active.
- MON-62: active repository slice via merged #550; implementation is PR #552 draft.
- MON-63: Todo/High, blocked by MON-62 and unselected.
- PR #549: closed superseded by #551.
- PR #512: closed superseded by #551.

## 9. Open pull-request memory

### PR #552 — MON-62 implementation

PR #552 is a Class 3 runtime/data-integrity PR from exact base `main@388549f99a288d99249e26f4116539e6705cb3ff`. It contains the source-adapter foundation, strict adapter validation, identity hardening, evidence-aware import plumbing and counterexample tests described above.

The first CI run on implementation head `ddb9ac0af7ddecd0010dd01260ba9269ebe3d78f` confirmed plan authority resolves MON-62 active and migration identity remains unchanged, but Project Knowledge failed because this snapshot file was absent from the PR diff. That head is not acceptance evidence. PR #552 now reconciles this file on a new head; all required acceptance must be clean on the final exact head without retry-only substitution.

## 10. True gaps after this audit

1. Exact VCB/ACB/VietinBank consumer export headers/layout versions and exact Excel extensions.
2. Provider-stable transaction identity plus proven institution/account namespace for those exports.
3. Exact exported date/timezone, currency/direction, status and fee semantics.
4. Clean exact-head CI/static/unit/build/browser/security acceptance for PR #552.
5. Independent final-diff evaluation against replay, collision, changed-observation, predecessor, removed-source and no-ID counterexamples.
6. Same-PR MON-62 lifecycle convergence after acceptance.

## 11. Next allowed action

Continue PR #552 verification on its newest head. Fix first-pass findings by changing the head rather than treating a retry as acceptance. If runtime evidence conflicts with the selected packet, regress to specification rather than widening scope silently.

After implementation and counterexample evaluation are clean, PR #552 must archive the MON-62 packet, set `PLAN_AUTHORITY.current` to `null`, update this memory to the completed truth, leave MON-63 unselected, then reach owner merge handoff. No production/provider write is implied.

## 12. Superseded-status register

- `PLAN_AUTHORITY.current` is null on merged main — **false**; MON-62 is active via PR #550 until same-PR implementation closeout merges.
- PR #550 is still an unmerged selector candidate — **false**; it merged and activated MON-62.
- PR #549 or #512 remains an open research-maintenance boundary — **false**; both are closed after #551 merged.
- Existing provenance requires a new schema just to preserve lifecycle/predecessor evidence — **false**; current migrations already contain those primitives.
- A raw provider transaction reference is globally safe source identity — **false**; namespace scope must be proven and encoded.
- Truncating an overlong stable source ID is safe — **false**; truncation can alias identities, so PR #552 fails closed instead.
- A MoneyFlow account UUID is automatically a safe source namespace — **false**; mutable mapping is not source evidence.
- Missing adapter dates may use today's date if marked uncertain — **false**; adapter mode fails closed.
- Generic CSV/XLSX behavior was globally changed to strict-date mode by PR #552 — **false**; strictness is adapter-only.
- VCB/ACB/VietinBank Excel evidence proves exact headers/stable IDs or enables auto-map — **false**.
- PR #552 adds live bank sync, provider credentials or a new ledger mutation route — **false**.
- Supabase leaked-password protection was remediated in M0 — **false**; it remains an owner-accepted Free-plan limitation.
