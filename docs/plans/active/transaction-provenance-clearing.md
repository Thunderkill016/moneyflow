# Transaction provenance and account clearing

**Status:** implementing  
**Owner:** ChatGPT  
**Issue/PR:** pending  
**Last updated:** 2026-08-01

## Outcome

Each ledger transaction exposes where it came from, and each account-side ledger entry can be marked as matched against the user's real account record. A transfer can be matched independently on its source and destination accounts. MoneyFlow does not claim that an account is fully reconciled until a later statement-balance workflow exists.

## Repository reconnaissance

### Current behavior

- `financial_transactions` stores kind, note, date, idempotency and timestamps, but no provenance.
- `transaction_entries` owns account-specific money movement, but has no cleared/matched timestamp.
- `transaction_feed` aggregates entries into one UI row and currently exposes neither provenance nor account-side status.
- `/transactions` can filter by account but cannot show or update whether that account-side entry has been matched.
- `/timeline` calls all rows “đã duyệt” although no persisted reviewed/cleared state exists.
- The live Supabase schema, RPC definitions and view were inspected through read-only catalog queries on 2026-08-01.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/sample-data.ts` | Current transaction contract and demo fixtures | Split production transaction metadata from fixture-only data while preserving imports |
| `src/server/finance.ts` | Feed validation and mapping | Extend the existing owner; do not parse metadata in UI |
| `src/app/actions/transactions.ts` | Authenticated mutation owner | Add one owner-safe clearing action/RPC call |
| `src/hooks/use-transactions.ts` | Demo/auth parity | Add account-specific clear/un-clear mutation in both modes |
| `src/components/transactions-page.tsx` | Ledger filters and row actions | Surface provenance and account-context clearing without a new page |
| `supabase/migrations/` | Ledger schema/RPC/view authority | Add provenance to transaction, clearing to entry, and secure RPC |
| `supabase/tests/database/` | Database/RLS evidence | Add account-side, transfer and cross-tenant assertions |

### Existing tests and constraints

- Related unit tests: finance feed parsing, transaction list/windowing, transaction store and source-contract suites.
- Database/RLS tests: finance invariants, cross-tenant RPC tests and security-definer contracts.
- Browser tests: expense path, transactions filters and cross-device audit.
- Product/architecture rules: integer VND; transfers remain atomic/net-zero; identity derives from `auth.uid()`; no direct browser writes; demo/auth behavior remains aligned.

### Similar implementation and recent history

- PR #54 established database-level ledger invariant tests.
- PR #153 made transfer mutation ownership explicit and preserved demo/auth parity.
- PR #151 recorded that production transaction contract ownership should be separated when this domain is next changed.
- PR #177 requires bounded source selection, applicability and adoption evidence.

### Open questions

- [x] Does clearing belong on a transaction or entry? Entry, because transfers have two account sides that may settle independently.
- [x] Is a cleared flag equivalent to complete reconciliation? No. Complete reconciliation additionally requires a statement balance/date and a zero difference.
- [x] Should existing rows be marked cleared automatically? No. Backfill provenance only; clearing starts unknown/unmatched.

## Research

### Research scope and source selection

- Decision question: how should MoneyFlow represent transaction provenance and statement matching without pretending to implement full accounting reconciliation?
- Reference map consulted: `docs/research/REPOSITORY_REFERENCE_MAP.md` and `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Source budget: three focused primary sources.
- Expected decision: correct ownership level, user vocabulary, and database security/migration constraints.

### Questions researched

1. What distinction should exist between pending/cleared and fully reconciled?
2. How should imported/source identity remain stable for future deduplication?
3. Where should tenant enforcement and mutation logic live in Supabase/Postgres?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Actual Budget reconciliation documentation | Product primary documentation | 2026-08-01 | Cleared means matched to an account statement; reconciliation compares cleared total to a statement balance and then locks transactions | MoneyFlow is not adopting Actual's lock workflow or envelope model in this slice |
| Actual Budget API reference | Product/API primary documentation | 2026-08-01 | Source/import identifiers support deduplication; cleared is separate from import processing and dry-run behavior | MoneyFlow is not implementing bank sync or import matching here |
| Supabase RLS and migration documentation | Platform primary documentation | 2026-08-01 | Public-schema data needs RLS; security-definer functions require careful grants/search path; schema changes belong in migrations | MoneyFlow keeps its existing RPC-only mutation boundary and CI replay process |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Transaction-level `is_reconciled` | Small schema/UI change | Incorrect for transfers; overstates full reconciliation | Rejected |
| Entry-level `cleared_at` plus transaction provenance | Correct account ownership; supports transfer sides independently | Requires feed aggregation and account context in UI | Selected |
| Full reconciliation sessions now | Complete statement workflow | Larger UX/schema scope before cleared-state foundation exists | Deferred |
| Event-sourced audit log | Rich history | Unnecessary architecture and operational complexity | Rejected |

### Research decision

Store stable provenance on `financial_transactions` and account-side matching on `transaction_entries`. Expose `cleared_account_ids` through the existing aggregate feed. The transactions surface only allows changing clearing when one account is selected, so a transfer side is never ambiguous. Use Vietnamese copy “Đã khớp sao kê” / “Chưa khớp”; reserve “Đối soát hoàn tất” for a future statement-balance session.

Patterns intentionally not copied: Actual's locked state, auto-created reconciliation adjustment transactions, bank sync, import rules, event sourcing and Firefly-scale accounting scope.

### Adoption review

Not applicable. No dependency, provider, service, framework or architecture pattern is added.

## Specification

### Problem

Users cannot tell whether a transaction was entered manually, generated by transfer/split/recurring logic, or whether the money movement for a selected account has been matched against the actual account record. The current “đã duyệt” timeline wording implies a state that is not persisted.

### User stories

- As a user, I can see the source of each transaction so I understand why it exists.
- As a user filtering one account, I can mark that account-side entry as matched or unmatched.
- As a user reviewing a transfer, I can match the source and destination sides independently by filtering each account.
- As a reviewer, I can verify that another tenant cannot read or mutate clearing state.

### Acceptance criteria

- [ ] Every feed row has a validated provenance kind.
- [ ] Existing transactions are backfilled deterministically without being marked cleared.
- [ ] New manual, transfer, split and recurring transactions receive the correct provenance in the database.
- [ ] A secure RPC toggles only the current user's matching entry for the specified transaction/account.
- [ ] Transfer sides can be cleared independently and transfer amount/balance invariants remain unchanged.
- [ ] Demo mode persists equivalent provenance and account-side clearing metadata.
- [ ] `/transactions` can initialize an account filter from the URL, filter by clearing state and toggle the selected account-side state.
- [ ] `/timeline` no longer claims all transactions are reviewed when no such state exists.
- [ ] Full migration replay, pgTAP, static checks, build and browser flows pass.

### Required states

- Loading: clearing action disables row actions and retains current row.
- Empty: clearing filter has a calm no-results state through the existing filter-empty UI.
- Populated: source label and account-side matching state are visible in the row subtitle.
- Validation/error: missing/foreign transaction or account returns a calm generic failure; no tenant existence leak.
- Recovery/undo: the same control can set matched state back to unmatched.
- Long data / large VND: metadata does not alter amount calculation or wrapping rules.
- Mobile/tablet/desktop: controls remain usable at the existing row breakpoints and 44px target contract.
- Accessibility: button labels name the transaction and selected account; state is text, not color only.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: `auth.uid()` inside a fixed-search-path SECURITY DEFINER RPC; execute only for `authenticated`; no direct UPDATE grants.

### Out of scope

- Statement balance/date reconciliation sessions or locking.
- Adjustment transactions.
- Bank sync, OCR, import staging or duplicate matching.
- Full audit/event history.
- Editing provenance from the client.

## Implementation plan

### Architecture fit

Provenance belongs to the transaction aggregate; clearing belongs to the account-side ledger entry. Database functions remain the mutation authority, `transaction_feed` remains the read model, `server/finance.ts` remains the parser/mapper, and `useTransactions` owns demo/auth parity. The existing transactions page provides account context, avoiding a new route or service.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| New transaction contract module | Own source/status labels and pure helpers | Stop expanding fixture data as production authority |
| `sample-data.ts` and demo builders | Add provenance and cleared account IDs | Demo parity and compatibility |
| Migration | Add columns, backfill, update creator RPCs/view, add toggle RPC/grants | Persist correct ownership and source |
| Transaction actions/hook | Add authenticated and demo toggle | One mutation path per mode |
| Transactions route/page | Initialize account/clearing filters; show state/action | User-visible vertical slice |
| Unit and pgTAP tests | Lock mapping, helper and tenant/transfer behavior | Evidence at domain/database layers |

### Data and migration impact

- Schema/migration: `financial_transactions.source_kind/source_reference`; `transaction_entries.cleared_at`; updated `transaction_feed`; new toggle RPC.
- Backfill: recurring links first, transfer/split detection next, otherwise manual; all `cleared_at` remain null.
- Compatibility: new feed columns are additive; existing amounts/IDs stay unchanged.
- Rollback: revert application and migration in a new forward migration; clearing metadata can be dropped without changing ledger values.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Transfer marked globally when only one bank side settled | Store and mutate per entry/account; two-sided pgTAP test |
| Split entries create duplicate cleared account IDs | Aggregate distinct account IDs |
| Client forges source | Creator RPCs assign source internally; no source input accepted |
| Foreign account/transaction leaks existence | Single owner-scoped update and generic false/error result |
| Existing recurring rows mislabeled | Backfill checks occurrence links before generic kind/split rules |
| Timeline still misstates trust | Replace “đã duyệt” copy in same PR |

### Verification plan

- Static: knowledge, architecture, CSS ownership, lint and typecheck.
- Unit/domain: provenance labels/state helpers, feed mapping, demo clear toggle.
- Database: fresh reset, source backfill/creation, entry clearing, independent transfer sides, cross-tenant denial and grants.
- Browser flow: add transaction, select account, toggle matched/unmatched, reload persistence.
- Responsive/visual: transaction row control at phone/desktop and text zoom.
- Production/manual: after merge/deploy, use a disposable account and verify source/status persistence without real financial data.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add transaction metadata contract and tests | none | unit tests | implementing |
| T2 | Add migration/RPC/view and pgTAP coverage | T1 | fresh reset + pgTAP | todo |
| T3 | Extend server actions and demo/auth hook parity | T1–T2 | unit/integration tests | todo |
| T4 | Add account-context filters, labels and toggle UI | T3 | browser/responsive evidence | todo |
| T5 | Run exact-head CI and evaluate final scope | T1–T4 | CI + PR | todo |

Rules:

- One task should produce a reviewable result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.
- Research is complete when it supports a decision, not when every related repository has been read.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Provenance persisted and mapped | pending | pending |
| Account-side clearing correct | pending | pending |
| Transfer sides independent | pending | pending |
| Tenant boundary enforced | pending | pending |
| Demo/auth parity | pending | pending |
| UI/account context usable | pending | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending final review.
- Important source limitations remain respected: no lock/session/bank-sync claims.
- New tool/dependency/pattern passed the adoption review, or not applicable: not applicable.

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- UI/UX/accessibility: pending.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- This slice records entry clearing but does not prove an account statement balance matches.

## Delivery record

- Branch: `agent/transaction-provenance-clearing`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: after merge and verification
