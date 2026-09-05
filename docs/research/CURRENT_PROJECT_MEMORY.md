# MoneyFlow — current project memory

**Status:** M0 is closed and M1 Phase A #523 / MON-61 is closed. Fresh-main selector PR #550 proposes MON-62 as the next bounded M1 slice; until #550 is owner-merged, merged `main` still has no executable current packet.
**Last reconciled:** 2026-09-05
**Repository baseline:** `main@06c3a0cc804c3764e0b7e1a94b6c556009b2b46e` after dependency-maintenance PRs #526, #543 and #542.
**Last explicitly verified production runtime baseline:** `0bf9335c748aeddfdd988aa458298d2edc8ae437` (PR #546). Later documentation/dependency maintenance has not been used here as evidence of a production deployment.
**Current authority on merged main:** `PLAN_AUTHORITY.current: null`.
**Selector candidate:** PR #550 proposes `docs/plans/active/mon-62-source-adapters-provenance-dedupe.md`; candidate only until owner merge.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow remains a Vietnamese personal-finance product built around one trustworthy user-owned ledger. M0 Release Integrity and M1 Phase A bank-export evidence work are complete. GitHub #523 is closed completed and Linear MON-61 is Done.

The next dependency-ordered candidate is **Linear MON-62 — source adapters, mappings and provenance-safe dedupe**. PR #550 is the fresh-main Class 0 selector for that Class 3 packet. It starts from exact `main@06c3a0cc804c3764e0b7e1a94b6c556009b2b46e` and may change repository executable authority only if the owner merges it. Runtime implementation must not begin before that merge, fresh `npm run plan:resolve`, and `npm run agent:doctor -- --json`.

MON-63 remains Todo and unselected. The MON-62 implementation PR, if later completed, must converge authority back to `null` and must not select MON-63 in the same lifecycle closeout.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories, provider semantics or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Source/provider evidence is not automatically a posted fact.
- Full archive/restore is separate from scoped/report export.
- Parsers/adapters never become a second financial mutation authority; all sources converge on candidate/provenance/matching/approval/ledger/reconciliation ownership.

Dependency maintenance after #547 changed repository/tooling/runtime package versions but did not authorize a new financial/data capability. PR #526 upgraded GitHub Actions dependencies, #543 upgraded bounded npm minor/patch dependencies, and #542 upgraded React/react-dom to 19.2.8. #542 final exact head `65dd4006831ef603655b0890728532294805b588` passed CI #3353, CodeQL #2380 and Secret history #2380 without retry, including first-pass authenticated ownership browser smoke, before squash merge as `06c3a0cc804c3764e0b7e1a94b6c556009b2b46e`.

## 3. Acquisition and reconciliation truth

Production/repository contracts already include provenance, exact-source matching, source lifecycle, replacement/predecessor observations, Direct CSV atomic/rule-aware ingestion and existing Inbox approval ownership.

The completed #523 / MON-61 slice established conservative Vietnam bank-export evidence:

- first-party material confirms an **Excel artifact family** in scoped Vietcombank, ACB and VietinBank flows;
- exact `.xls` versus `.xlsx`, exported headers/layout, date/timezone, currency/direction, status/fee representation and provider-stable transaction identity remain unproven;
- `source_external_id` is eligible only when a non-empty reference is evidence-confirmed and source-stable;
- row indexes, UI/display references, export-local IDs, generated hashes and MoneyFlow preview fingerprints fail closed;
- all VCB/ACB/VietinBank bank-specific auto-map flags remain disabled.

### MON-62 seam audit from fresh main

Current code already contains the persistence primitives MON-62 needs, but evidence is lost before persistence:

- `src/lib/inbox/provenance.ts` models `sourceExternalId`, `sourceLifecycleState`, `sourcePredecessorExternalId`, parser/mapping versions and existing match evidence.
- `candidateProvenanceInsertPatch()` already persists lifecycle and predecessor fields.
- `src/lib/inbox/inbox-map.ts::prepareCandidateForServer()` currently preserves source row index, source external ID, parser version and mapping version but drops lifecycle/predecessor evidence.
- `src/hooks/client-inbox.ts::addCandidatesForClient()` projects the same reduced provenance set.
- `src/app/actions/inbox.ts::createCandidateSchema` accepts the reduced set and omits lifecycle/predecessor.
- `src/components/inbox/import-preview-page.tsx` reads generic `ParsedCsvRow[]` draft rows and calls `toCsvCandidateInputs()`, so richer adapter evidence would currently disappear before Inbox insertion.
- Direct CSV intentionally remains generic and must not be converted into a provider-specific bypass.

MON-62 therefore defaults to **no new schema**. Existing database provenance/source-lineage contracts should be reused unless implementation proves an accepted source identity scope cannot be represented safely and stably without collision, PII leakage or dependence on mutable MoneyFlow mapping.

## 4. Source identity and strict-date boundary for MON-62

External architecture references support a fail-closed source-identity design but do not prove target-bank export fields:

- OFX 2.2 defines FITID for duplicate detection as account-scoped and warns it is not unique across financial institutions; a global key can require FI + account + FITID.
- UK Open Banking v4 describes an optional transaction ID that is unique and immutable within the servicing institution.
- Plaid Core Exchange describes persistent account-scoped transaction IDs and separate pending/posted identities linked by predecessor/reference semantics.
- SheetJS documents spreadsheet date serials, number formats, 1900/1904 date-system issues and timezone interpretation limits.

Product consequence: source identity scope is explicit evidence, not an implementation convenience. Provider name alone is insufficient for an account-scoped ID. A mutable MoneyFlow account UUID is not automatically a valid source namespace. If the stable source namespace is incomplete or unsafe to persist, omit `sourceExternalId` and continue through existing matching/review behavior.

Adapter mode must also be strict about dates. The generic CSV parser currently has a fallback path that can produce the current date for a missing/unparseable date while marking uncertainty. MON-62 adapters must never inherit that fallback: missing or ambiguous required dates are invalid/reviewable, not silently replaced with today.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | provenance/source-lineage, generic CSV/XLSX/PDF surfaces, Direct CSV atomic/rule-aware ingestion, Share Target atomic/rule-aware ingestion; VCB/ACB/VietinBank Excel-family guidance exists but bank-specific auto-map does not |
| Review | exception-first review plus duplicate/transfer/reconciliation contracts |
| Ownership | versioned archive/export/validation/restore with source-lineage generation |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Executable authority | merged main remains `null`; PR #550 is the unmerged MON-62 selector candidate |

## 6. Security and delivery truth

M1 Phase A implementation PR #546 final exact head `44f281df135b43747af77e6efc7580b5db606333` passed CI #3323, CodeQL #2353 and Secret history #2353 without retry. Post-merge Vercel deployment `dpl_HWvZJNht8Yo1WzWi8NWCowbLnKBT` was READY for exact runtime commit `0bf9335c748aeddfdd988aa458298d2edc8ae437`; `/api/health` returned 200 with that commit and `no-store`, and no runtime errors were found in the checked one-hour window.

Docs-only PR #547 then reconciled durable memory and merged as `897807cb2ee3e21d53197810bfd418f44d37f9a3` after clean exact-head gates.

Maintenance cleanup on 2026-09-05 then merged:

- PR #526 → `dc188e8e72a1fe03f8d51866d4dac3321b6962e0` after CI #3342 / CodeQL #2369 / Secret #2369 success;
- PR #543 → `7c76767af4df397c64305d643441b6fb603c08dc` after CI #3347 / CodeQL #2374 / Secret #2374 success;
- PR #542 → `06c3a0cc804c3764e0b7e1a94b6c556009b2b46e` after CI #3353 / CodeQL #2380 / Secret #2380 success and first-pass authenticated ownership browser smoke.

Failed/stale heads from those PRs are not acceptance evidence. No production database/Auth/provider/bank/customer-data mutation was used for dependency cleanup.

## 7. Supabase security and production-schema truth

M0 production schema remains the verified 56/56 migration baseline with the expected authenticated SECURITY DEFINER surface and the owner-accepted Supabase Free-plan leaked-password-protection limitation. M1 Phase A and selector PR #550 do not modify this boundary.

## 8. Reconciled issue and tracker status

- #432/#433: merged master product program.
- #527/#528/#531/#538: performance slice completed.
- #536/#539/#540/#544: M0 security/runtime/database/lifecycle slice completed.
- #523 / MON-61: completed and closed/Done.
- MON-50: broader M1 — Vietnam Acquisition Depth program remains active.
- MON-62: Todo/High in Linear; dependency predecessor complete; PR #550 proposes it as the next repository current slice.
- MON-63: Todo/High; blocked by MON-62 and remains unselected.
- PR #549: docs-only fresh-main replacement for stale/conflicted #512; exact-head green but remains at a separate owner merge boundary and establishes no executable product authority.
- PR #512: stale historical research-handoff PR; close as superseded only after #549 actually merges.

## 9. Open pull-request memory

### PR #550 — MON-62 selector candidate

PR #550 is a Class 0 authority/planning PR from exact `main@06c3a0cc804c3764e0b7e1a94b6c556009b2b46e`. It adds `docs/plans/active/mon-62-source-adapters-provenance-dedupe.md` and proposes:

`PLAN_AUTHORITY.current → { path: "docs/plans/active/mon-62-source-adapters-provenance-dedupe.md", selectedByPr: 550 }`

This is candidate evidence until owner merge. It performs no runtime, schema, RLS, Auth, provider, bank, production-data or deployment write. Implementation remains forbidden until selector merge plus fresh plan resolution/doctor.

The packet requires a pure deterministic adapter/normalized-row contract, explicit `identityScope`, strict date/amount/direction validation, evidence-aware draft/preview transport, preservation of lifecycle/predecessor provenance, replay/collision/counterexample tests and existing Inbox/approval mutation ownership. VCB/ACB/VietinBank auto-map remains false.

### Other open maintenance/history PRs

PR #549 is docs-only and green but not executable authority. PR #512 remains stale/supersedable only after #549 merge. Neither authorizes MON-62 runtime work.

## 10. True gaps

1. Exact current VCB/ACB/VietinBank consumer export headers/layout versions and exact Excel extensions.
2. Provider-stable transaction identity and its namespace across repeated/overlapping exports.
3. Exact exported date/timezone, currency/direction, status and fee semantics.
4. Evidence-aware import draft/preview transport that preserves accepted source lifecycle/predecessor fields.
5. Explicit, collision-safe source identity canonicalization without mutable MoneyFlow mapping.
6. Strict adapter date handling that never substitutes the current date.
7. Owner merge of selector #550 before executable MON-62 implementation begins.

## 11. Next allowed action

Verify selector PR #550 at its exact head: project knowledge/policy contract, CodeQL and Secret history as selected by repository policy, with no retry-pass accepted. Confirm mergeability and review/thread state, then hand off for explicit owner merge.

Do **not** implement MON-62 runtime code, create schema/provider changes, enable bank-specific auto-map, access bank credentials, mutate production data or select MON-63 before #550 is owner-merged and fresh merged authority is resolved.

## 12. Superseded-status register

- `PLAN_AUTHORITY.current` is already MON-62 on merged main — **false**; merged main remains `null` until #550 is owner-merged.
- MON-62 is executable merely because MON-61 is Done — **false**; dependency order does not bypass selector authority.
- Existing provenance requires a new schema just to preserve lifecycle/predecessor evidence — **false**; current provenance types and insertion mapper already contain those primitives, while client/action/preview seams currently drop them.
- Provider name + raw transaction reference is always a globally safe source ID — **false**; identity scope may be institution- or account-scoped and must be proven.
- A MoneyFlow account UUID is automatically a safe source namespace — **false**; user mapping can be corrected and is not necessarily source evidence.
- Missing adapter dates may use today's date if marked uncertain — **false**; adapter mode must fail closed.
- VCB/ACB/VietinBank Excel evidence proves exact headers or stable transaction IDs — **false**.
- PR #550 enables bank-specific auto-map or live bank sync — **false**.
- PR #549 or stale #512 establishes current executable product authority — **false**.
- Supabase leaked-password protection was remediated in M0 — **false**; it remains an owner-accepted Free-plan limitation.
