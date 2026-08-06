# MoneyFlow UI-system Phase 8 — secondary and safety flows

**Status:** active
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `31fc4e852623ee503ee85a728f4be52d1c874d1b`
**Branch:** `feat/ui-phase-8-secondary-safety`
**Pull request:** pending
**Last updated:** 2026-08-06

The owner instructed **`làm đi`** after Phase 8 reconnaissance and product comparison. This authorizes bounded specification correction, product-code work, tests and a focused pull request on the Phase 8 branch. It does not authorize merge, provider writes, production-data access, a new report builder, nested categories, new automation semantics, bank sync, a full backup/restore product or database changes not separately justified by the packet.

## Outcome

Reports, Categories, Inbox review, Rules, Imports and Settings/data-rights surfaces use locally owned presentation contracts and state the current product truth precisely. Financial and data-destructive actions expose review, correction, retry and partial-failure states. Timeline remains a Phase 5-owned read-only ledger projection and receives verification only.

## Repository reconnaissance

At authorization:

- Phase 7 was squash-merged as `31fc4e852623ee503ee85a728f4be52d1c874d1b`, while `CURRENT_PROJECT_MEMORY.md` still described it as candidate-only.
- Reports already supported month/quarter/year/custom ranges, repaired/clamped ranges, period comparison, transfer exclusion, category/trend views and CSV links. Most presentation still depended on global `reports-*`, `report-*`, `positive`, `negative` and `font-mono` classes.
- Categories supported create, rename, hide and restore. The domain carried `icon` and `color`, but the dialog did not allow the user to choose them and cards did not consistently render the stored identity. Hide still used `window.confirm`.
- Inbox already separated candidates from ledger entries, provided individual and bulk review, duplicate/transfer hints, confidence, low-confidence opt-in and keyboard workflows.
- Authenticated candidates already expose `approved_transaction_id` and `approved_at` storage columns, but the current page writes the ledger before persisting the approved candidate state. A ledger success followed by candidate-state failure can leave a retry-sensitive partial-success state.
- Rules are deterministic and preview-only; they normalize candidates but do not auto-post to the ledger. The editor and list still depend on broad global classes.
- Import history supports local demo and authenticated server batches, preview, metadata deletion and a direct-import advanced path. Copy incorrectly mixes server-synced behavior with a `local-first` claim.
- Timeline is already locally owned by Phase 5 components and primitives; Phase 8 must not migrate it again.
- Settings/export/privacy/delete-account surfaces have substantial behavior but still depend on global `privacy-*`, `settings-*` and `panel` families.
- Export currently covers transactions and Inbox candidates. It is a transaction/Inbox export, not a complete restorable MoneyFlow archive.
- The parser-improvement toggle currently stores only a browser preference; this phase must not imply that data is being submitted or processed remotely.
- Account deletion correctly performs authenticated server deletion before local cleanup and requires typed `XÓA`, but UI evidence must expose cleanup verification and partial local/server failure clearly.
- Issue #72 still tracks validation/error states, destructive confirmations, Inbox/import review, settings coverage and physical-device acceptance.

Preserved invariants:

- VND and supported currencies remain integer minor units;
- transfer remains excluded from income/expense reports;
- Inbox candidates remain plans for review until explicit ledger posting;
- low-confidence candidates are never bulk-posted without explicit opt-in;
- rules never auto-post to the ledger in this phase;
- deleting import metadata/drafts does not delete approved ledger transactions;
- category hide remains reversible and preserves historical transactions;
- Timeline remains reviewed-only and read-only;
- export claims remain limited to the records actually included;
- account deletion remains server-first for authenticated users so backend failure does not destroy the only local copy;
- no unproven privacy, anonymization, backup/restore or safe-to-spend claim is introduced.

## Research and comparison

| Source | Authority/type | Applied decision |
|---|---|---|
| [Actual Budget importing transactions](https://actualbudget.org/docs/transactions/importing/) | official product documentation | imported IDs, matching and duplicate avoidance show that approval/import retries need an explicit idempotency identity rather than visual confirmation alone |
| [Actual Budget rules](https://actualbudget.org/docs/budgeting/rules/) | official product documentation | rule order and conflict behavior must be visible; MoneyFlow keeps a smaller candidate-only rule model in this phase |
| [YNAB approving and matching transactions](https://support.ynab.com/en_us/approving-and-matching-transactions-a-guide-ByYNZaQ1i) | official product documentation | approval, rejection and matching are explicit review actions; MoneyFlow preserves review-first import rather than direct silent posting |
| [W3C WCAG 2.2 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI | stored financial-data mutations need reversal, checking or review/confirmation and clear correction paths |
| [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | OWASP security guidance | destructive account-data actions need an explicit sensitive-operation boundary; no weak client-only re-authentication claim is added without provider-backed verification |

Decision:

- migrate existing domain behavior behind local owners instead of broadening product scope;
- make Reports filter/export semantics match the resolved range and records actually exported;
- make category identity explicit while keeping the current flat model;
- preserve Inbox review-first behavior and make partial-success/retry states explicit;
- keep Rules candidate-only and expose ordering/conflict semantics;
- correct import storage/deletion copy and demote direct-to-ledger import to an advanced path;
- describe transaction/Inbox export accurately and do not call it a complete backup;
- disable unsupported parser-sharing consent rather than recording consent for a nonexistent processing path;
- preserve server-first account deletion and surface cleanup-verification outcomes;
- treat a new atomic approval RPC/schema or provider-backed recent-auth flow as a separate Class 3 change if current contracts cannot satisfy the required evidence without database/provider work.

## Specification

```text
Secondary/safety routes
  -> SecondaryWorkspace shell
       -> header + breadcrumb + actions
       -> summary / section / cards
       -> shared Alert, Button, LinkButton, Dialog, EmptyState, MoneyValue
       -> route-specific report/category/review/import/settings state
```

Truth contracts:

- **Report export:** exports the resolved report/transaction range; it is not a complete account backup.
- **Category identity:** icon/color support recognition; kind, active/hidden state and consequences are also stated in text.
- **Inbox candidate:** imported or captured proposal awaiting review; it is not a ledger transaction.
- **Inbox approval:** explicit action that may create a real ledger transaction; retries must not silently duplicate a prior success.
- **Import metadata:** batch/provenance/draft records; deleting them does not delete already-approved ledger transactions.
- **Rules:** deterministic candidate normalization evaluated in priority order; no ledger posting.
- **Transaction/Inbox export:** downloadable CSV/JSON subset generated on the device; no restore guarantee.
- **Parser improvement:** unavailable until a separately specified processing path exists; no consent is recorded for an inactive capability.
- **Account deletion:** irreversible authenticated server-account/data deletion followed by best-effort local cleanup; partial verification is shown rather than hidden.

Stable evidence slots:

- `secondary-workspace`, `secondary-header`, `secondary-summary`, `secondary-section`, `secondary-review`;
- `reports-workspace`, `report-periods`, `report-metrics`, `report-trend`, `report-categories`;
- `categories-workspace`, `category-list`, `category-card`, `category-review`;
- `inbox-workspace`, `inbox-candidate-list`, `inbox-review`, `inbox-bulk-review`;
- `rules-workspace`, `rules-preview`, `rules-list`;
- `imports-workspace`, `import-batch-list`, `import-delete-review`;
- `settings-workspace`, `settings-section`, `export-summary`, `privacy-capability-status`, `delete-account-review`.

## Implementation plan

1. Reconcile Phase 7 merged truth and correct the parent Phase 8 interpretation.
2. Establish shared secondary/safety workspace, header, section, summary and review owners.
3. Migrate Reports presentation while preserving range repair, comparison, transfer exclusion and export links.
4. Migrate Categories, render stored identity, replace hide confirmation and preserve reversible history.
5. Migrate Inbox shell/review states; add explicit retry-safe partial-success handling and domain evidence.
6. Migrate Rules and expose order/conflict/preview semantics without expanding automation.
7. Migrate Imports, replace raw deletion confirmation and correct browser/server/direct-import language.
8. Verify Timeline as the existing Phase 5 owner without reimplementation.
9. Migrate Settings hub, transaction/Inbox export, privacy and account deletion presentation.
10. Disable inactive parser-sharing consent and expose exact capability status.
11. Add source/domain/browser contracts for validation, destructive review, partial failure, large VND, long Vietnamese and dark/phone states.
12. Reconcile issue #72 with exact remaining physical-device and provider limitations.
13. Remove active secondary-flow consumers of retired global selectors only after route replacement and zero-consumer proof.
14. Run exact-head policy, static, unit, build, browser, cross-device and security gates.
15. Stop for explicit owner merge decision.

## Tasks

| ID | Task | Status |
|---|---|---|
| P8-T1 packet and P7 truth reconciliation | implementing |
| P8-T2 shared secondary/safety owners | todo |
| P8-T3 Reports migration | todo |
| P8-T4 Categories migration | todo |
| P8-T5 Inbox review/integrity migration | todo |
| P8-T6 Rules and Imports migration | todo |
| P8-T7 Timeline regression verification | todo |
| P8-T8 Settings/export/privacy/delete migration | todo |
| P8-T9 issue #72 reconciliation | todo |
| P8-T10 active global-selector retirement | todo |
| P8-T11 full verification matrix | todo |
| P8-T12 owner approval and merge | blocked pending explicit owner decision |

## Evaluation

Evaluation findings must be fixed in the owning boundary rather than hidden or allowlisted. A successful ledger post followed by failed candidate persistence is not equivalent to a failed approval and must not invite a blind retry. A browser preference is not evidence of remote privacy processing. A transaction/Inbox file is not a complete restorable account archive. Timeline is already Phase 5-owned and is verification-only here.

## Verification plan

- policy, project knowledge, CSS ownership, architecture, lint and typecheck;
- complete unit/static RLS suite;
- production build;
- focused report range/export, category lifecycle, Inbox review, rule order, import deletion and account-deletion tests;
- browser coverage for custom ranges, full large-VND values, category hide/restore, individual/bulk Inbox review, low-confidence opt-in, retry/partial success, rule preview/order, import deletion, export scope and destructive deletion confirmation;
- Chromium/WebKit phone, tablet, desktop, light/dark, 200% text and keyboard matrix when selected;
- CodeQL and secret-history scan;
- database checks only if the diff unexpectedly crosses a database boundary.

## Explicitly out of scope

- report builder, user-defined dashboard widgets or arbitrary pivots;
- nested category groups, category merge, tag system or historical recategorization migration;
- bank sync, automatic matching or direct-import identity beyond current product contracts;
- regex/amount/account rule expansion, smart splits or retroactive rule application;
- rules that automatically post transactions;
- a complete versioned backup/restore product unless separately specified;
- remote parser-training submission, anonymization pipeline or consent processing;
- provider-backed password/OAuth re-authentication changes without a separate security packet;
- schema, migration, RPC, RLS or provider changes not explicitly justified by discovered evidence;
- merge, production deployment approval or Phase 9 work.

## Merge and deployment boundary

Merge remains an owner decision. A merge to `main` is expected to trigger the connected Vercel production deployment automatically; the agent must not describe that as “no deployment”. Green checks and ready-for-review state are not merge authorization.
