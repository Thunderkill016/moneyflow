# MoneyFlow UI-system Phase 8 — secondary and safety flows

**Status:** active
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `31fc4e852623ee503ee85a728f4be52d1c874d1b`
**Branch:** `feat/ui-phase-8-secondary-safety`
**Pull request:** #309
**Last updated:** 2026-08-06

The owner instructed **`làm đi`** after Phase 8 reconnaissance and product comparison. This authorizes bounded specification correction, product-code work, tests and a focused pull request on the Phase 8 branch. It does not authorize merge, provider writes, production-data access, a new report builder, nested categories, new automation semantics, bank sync, a full backup/restore product or unreviewed database changes.

## Outcome

Reports, Categories, Inbox review, Rules, Imports and Settings/data-rights surfaces use locally owned presentation contracts and state current product behavior precisely. Financial and data-destructive actions expose review, correction, retry and partial-failure states. Timeline remains the Phase 5-owned reviewed-only ledger projection and receives regression verification rather than reimplementation.

## Repository reconnaissance

At authorization:

- Phase 7 had merged as `31fc4e852623ee503ee85a728f4be52d1c874d1b`, while project memory still described it as candidate-only.
- Reports already supported month/quarter/year/custom ranges, repaired/clamped windows, same-length period comparison, transfer exclusion, category/trend views and CSV links.
- Categories already supported create, rename, hide and restore, but icon/color identity was not user-editable and hide still used browser confirmation.
- Inbox already separated candidates from ledger entries and provided individual/bulk review, confidence, low-confidence opt-in, duplicate/transfer hints and keyboard workflows.
- Rules were deterministic, ordered and preview-only; they did not auto-post transactions.
- Import history, preview and direct CSV dry-run already existed, but storage/deletion wording and final destructive review were inconsistent.
- Timeline was already locally owned by Phase 5.
- Export covered transactions and Inbox candidates, not a complete restorable account archive.
- Parser-improvement preference stored a boolean despite no remote processing pipeline.
- Account deletion already required typed `XÓA` and performed server deletion before local cleanup, but cleanup query state had no visible receipt.
- Issue #72 still tracks validation/error states, destructive confirmations, Inbox/import review, settings coverage and physical-device acceptance.

Preserved invariants:

- money remains integer minor units;
- transfers remain excluded from report income/expense;
- candidates remain review proposals until explicit approval;
- low-confidence candidates never bulk-post without explicit opt-in;
- rules never auto-post in this phase;
- deleting import metadata/drafts never deletes approved ledger transactions;
- category hide remains reversible and preserves history;
- Timeline remains read-only and reviewed-only;
- export claims remain limited to included records;
- authenticated account deletion remains server-first;
- no unproven privacy, anonymization, backup/restore or financial-guidance claim is introduced.

## Research and comparison

| Source | Authority/type | Applied decision |
|---|---|---|
| [Actual Budget importing transactions](https://actualbudget.org/docs/transactions/importing/) | official product documentation | import/matching identity and duplicate avoidance require explicit retry identity and dry-run outcomes |
| [Actual Budget rules](https://actualbudget.org/docs/budgeting/rules/) | official product documentation | rule order and conflict behavior should be visible; MoneyFlow keeps its smaller candidate-only rule model |
| [YNAB approving and matching transactions](https://support.ynab.com/en_us/approving-and-matching-transactions-a-guide-ByYNZaQ1i) | official product documentation | approval/rejection/matching are explicit review actions; review-first remains the default path |
| [WCAG 2.2 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI | stored financial-data changes need checking, confirmation, reversal or correction paths |
| [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | OWASP security guidance | sensitive destructive actions need a real authentication boundary; client UI must not pretend to provide provider-backed recent re-auth |

Decision:

- migrate presentation ownership without broadening financial/domain scope;
- keep report formulas and resolved-range semantics;
- make category identity explicit while retaining a flat category model;
- preserve authenticated atomic Inbox approval and repair the actual demo/browser retry gap;
- keep Rules candidate-only and make priority/order explicit;
- keep parse → preview → Inbox → approval → ledger as the default import path;
- make direct CSV import an advanced dry-run/review path with no batch-undo claim;
- describe transaction/Inbox export accurately;
- disable inactive parser-sharing consent;
- preserve server-first deletion and show verified/unverified plus complete/partial cleanup outcomes;
- leave provider-backed recent re-auth and a full archive/restore product to separate owner-approved packets.

## Specification

```text
Secondary/safety routes
  -> SecondaryWorkspace
       -> SecondaryHeader / SecondarySummary / SecondarySection
       -> shared Button, LinkButton, Dialog, fields, Alert, EmptyState, MoneyValue
       -> route-specific report/category/review/import/settings state
       -> SecondaryReviewDialog for high-consequence actions
```

Truth contracts:

- **Report export:** exports the resolved report/transaction range; not a complete account backup.
- **Category identity:** icon/color aid recognition while kind and active/hidden state remain textual.
- **Inbox candidate:** proposal awaiting review; not a ledger transaction.
- **Authenticated approval:** existing atomic action remains the owner.
- **Demo approval:** candidate identity links the browser ledger row so a retry cannot silently duplicate a prior success.
- **Import metadata:** batch/provenance/draft records; deletion preserves Inbox candidates and approved ledger entries.
- **Rules:** deterministic candidate normalization evaluated in priority order; no ledger posting.
- **Transaction/Inbox export:** device-generated CSV/JSON subset with no restore guarantee.
- **Parser improvement:** unavailable; historical true values normalize to false and no inactive consent is stored.
- **Account deletion:** irreversible authenticated server deletion followed by best-effort local cleanup, with explicit receipt state.

Stable evidence slots:

- `secondary-workspace`, `secondary-header`, `secondary-summary`, `secondary-section`, `secondary-review`;
- `reports-workspace`, `report-periods`, `report-metrics`, `report-trend`, `report-categories`;
- `categories-workspace`, `category-list`, `category-card`, `category-review`;
- `inbox-workspace`, `inbox-candidate-list`, `inbox-review`, `inbox-bulk-review`;
- `rules-workspace`, `rules-preview`, `rules-list`;
- `imports-workspace`, `import-batch-list`, `import-delete-review`, `import-preview-*`, `direct-import-review`;
- `settings-workspace`, `settings-section`, `export-summary`, `privacy-capability-status`, `delete-account-review`;
- `account-deletion-receipt`.

## Implemented slices

- shared secondary/safety layout and review owners;
- Reports local ownership, MoneyValue migration, accessible trend data and truthful export copy;
- Categories local workspace/card/dialog, editable icon/color and hide review;
- Inbox local workspace/review/bulk confirmation and candidate-based demo retry identity;
- Rules local preview/editor/list and delete review;
- import history local ownership and metadata review;
- import preview commit/cancel reviews;
- direct CSV local dry-run and final ledger-write review;
- Settings hub, appearance and notification local ownership;
- transaction/Inbox export scope migration;
- privacy retention UI and inactive parser capability enforcement;
- account deletion local ownership, final review and noindex cleanup receipt;
- source/domain/browser Phase 8 contracts;
- project-memory reconciliation for P7 merged truth and P8 candidate state.

## Tasks

| ID | Task | Status |
|---|---|---|
| P8-T1 packet and P7 truth reconciliation | done |
| P8-T2 shared secondary/safety owners | done |
| P8-T3 Reports migration | done |
| P8-T4 Categories migration | done |
| P8-T5 Inbox review/integrity migration | done; evaluating exact head |
| P8-T6 Rules and Imports migration | done; evaluating exact head |
| P8-T7 Timeline regression verification | source contract done; browser evaluation pending |
| P8-T8 Settings/export/privacy/delete migration | done; evaluating exact head |
| P8-T9 issue #72 reconciliation | pending final evidence |
| P8-T10 active global-selector retirement | active consumers moved; broad definitions require zero-consumer proof |
| P8-T11 full verification matrix | evaluating |
| P8-T12 owner approval and merge | blocked pending explicit owner decision |

## Evaluation

Findings are fixed in the owning boundary rather than hidden or allowlisted:

1. The initial reconnaissance suspected authenticated approval could post the ledger before candidate persistence. Deeper repository inspection proved authenticated approval already uses the existing atomic action/RPC and server pre-check. No redundant schema/RPC change was introduced.
2. Demo approval did use an unrelated random transaction ID. The candidate ID now becomes the stable demo ledger identity; retry checks existing browser transactions before posting and can complete candidate state without duplication.
3. Reports already had the required range and comparison domain depth. P8 migrates ownership/accessibility instead of rewriting report math.
4. Timeline was already Phase 5-owned and is verified rather than migrated.
5. Import storage wording now distinguishes demo/browser storage, authenticated server batch/candidate storage and temporary browser drafts.
6. Direct CSV already had dry-run/dedupe/skip outcomes but lacked a separate final review; it now identifies create/skip counts, account/categories, Inbox bypass and absence of batch undo.
7. Parser improvement had no processing implementation. The unavailable capability is disabled, historical true values normalize to false and new saves cannot record true.
8. Account deletion cleanup parameters were previously invisible. `/account-deletion-result` now displays server verified/unverified and local complete/partial outcomes.
9. Provider-backed recent password/OAuth verification remains explicitly absent; P8 does not simulate it through a checkbox or typed text alone.

## Verification plan

- policy, project knowledge, CSS ownership, architecture, lint and typecheck;
- complete unit/static RLS suite;
- production build;
- focused report, category, Inbox retry, privacy, import and deletion source/domain tests;
- browser coverage for custom reports, category hide review, low-confidence individual/bulk Inbox review, Rules/Imports truth, export scope, parser capability, delete review/receipt and 320px geometry;
- Chromium/WebKit phone, tablet, desktop, light/dark, 200% text and keyboard matrix when selected;
- CodeQL and secret-history scan;
- database checks only if classifier unexpectedly detects a database boundary.

Intermediate stale checkpoint at draft head `f18693f97432cda320534a01373b840bd194aa12`:

- classifier CI #1872 / run `31092981166`: success;
- secret-history scan #988: success;
- expensive draft jobs were skipped by policy and are not evidence for the cumulative implementation.

## Explicitly out of scope

- report builder or arbitrary dashboard widgets/pivots;
- nested category groups, category merge, tags or historical recategorization migration;
- bank sync or automatic unreviewed matching;
- regex/amount/account rule expansion, smart splits or retroactive application;
- automatic rule posting;
- complete versioned backup/restore archive;
- remote parser-training submission/anonymization/consent processing;
- provider-backed password/OAuth recent re-auth;
- schema, migration, RPC, RLS or provider changes not explicitly justified by discovered evidence;
- merge, production deployment approval or Phase 9 work.

## Merge and deployment boundary

Merge remains an owner decision. A merge to `main` is expected to trigger the connected Vercel production deployment automatically; green checks and ready-for-review state are not merge authorization.
