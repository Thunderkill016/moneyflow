# Demo-ledger migration — consented carry-over into a new account

**Status:** specified
**Execution state:** specified
**Active role:** human_owner (open questions) → then implementer
**Permission scope:** read_only — no branch_write until owner resolves open questions
**Owner:** agent (Devin) — owner review required before implementation
**Issue/PR:** none yet
**Last updated:** 2026-09-23

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

A demo user who registers keeps the option to carry their browser-local ledger
into the new authenticated account: on first authenticated landing, an explicit
consent dialog offers to route their real demo transactions through the
existing Inbox candidate → provenance → review → ledger path. Declining leaves
the local data untouched; accepting never posts ledger facts without review.

## Repository reconnaissance

### Current behavior

- Demo mode stores a mutable ledger in `localStorage` (`moneyflow-demo-transactions-v1`,
  tombstones, inbox candidates, import batches/drafts, rules `moneyflow-rules-v2`,
  income templates/occurrences, commitment occurrences, reconciliation sessions,
  dismissal markers). Inventory: `src/lib/delete-account.ts:37-55`.
- `register` (`src/app/(auth)/actions.ts`) → Supabase `signUp` → `handle_new_user`
  trigger seeds profile + one cash account + 11 default categories
  (`supabase/migrations/20260714000100_initial_financial_schema.sql:105-138`).
  No demo storage is read anywhere in the auth path.
- From then on `useTransactions` branches demo↔authenticated and the two never
  meet (`src/hooks/use-transactions.ts` ~505-560). Demo data is not deleted —
  it is unreachable from the authenticated UI.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/hooks/client-inbox-core.ts:45-133` | Existing local→server Inbox migration with marker + empty-server guard | Reuse the marker/guard *pattern*; do NOT reuse `moneyflow-inbox-server-migrated-v1` as ledger-migration evidence |
| `src/server/inbox.ts:169-221`, `src/lib/inbox/inbox-map.ts:45-55,373-383` | `migrateLocalInboxAction`, `prepareCandidateForServer`, `cand-demo-*` fixture exclusion | Reuse candidate pipeline + fixture exclusion |
| `src/lib/transaction-store.ts:7,71-86` | Demo ledger store; `sample-*` fixture ids vs `crypto.randomUUID()` user rows | Add read-only snapshot + classifier |
| `src/server/accounts.ts:42-48`, `src/lib/demo/transaction-fixtures.ts:9-25` | Demo account/category ids are non-UUID strings synthesized server-side | Mapping layer by name+kind to the new tenant's seeded entities |
| `supabase/migrations/20260812010000_restore_user_archive.sql:598-615` | Bootstrap-only eligibility = exactly the post-signup state | Model for empty-target guard |
| `src/app/actions/inbox.ts:61-70`, `supabase/migrations/20260725012037_import_batches_and_inbox_candidates.sql:4-12` | `inbox_candidate_source` enum has no `demo` value | Either batch-level label + `source:'manual'` (truthful: rows were hand-entered) or `alter type … add value 'demo'` — owner question |
| `src/components/export-settings-page.tsx:47-70`, `src/lib/export-data.ts` | Demo-mode scoped export exists | Stage-1 disclosure references it; not the migration path |

### Existing tests and constraints

- `e2e/auth/inbox-ownership.mobile.auth.spec.ts` — the auth-boundary e2e pattern to extend for consent/decline.
- pgTAP suites cover RPC invariants; candidate ingest has static-RLS + unit coverage.
- Transfers/splits are first-class ledger objects; CSV-style ingest corrupts them
  (`src/lib/inbox/parse-csv.ts:351-365` — verified limitation).

### Similar implementation and recent history

- `migrateLocalInboxAction` is the consentless precedent scoped to Inbox candidates only.
- `restore_user_archive` is the bootstrap-only-tenant precedent.
- Trash surface packet (`trash-surface.md`) is the lifecycle model this packet follows.

### Open questions — owner must resolve before implementation

- [ ] **Product intent:** is demo a deliberate throwaway sandbox or a real trial
      ledger? (Competitors: YNAB/Money Lover keep data via same-account trials;
      Actual offers explicit export; none have a local demo ledger like ours.)
- [ ] **Provenance label:** `alter type inbox_candidate_source add value 'demo'`
      (schema change, most honest) vs. batch label `moneyflow-demo` +
      `source:'manual'` (no migration; defensible — rows were hand-entered)?
- [ ] **Transfers/splits:** extend the candidate schema with a destination leg,
      or route transfers through the direct-replay RPCs under the same consent?
      They must not be flattened into income/expense.
- [ ] **Non-ledger data** (rules `moneyflow-rules-v2`, income templates,
      paid-markers): in scope, or accepted loss with honest copy? Rules are
      arguably the second-most-valuable accumulation.
- [ ] **Fixture rows** (`sample-*`, `cand-demo-*`, `demo-account-*`): recommend
      excluding — they are product content, not user facts. Confirm.

## Research

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Actual Budget docs (install, backup/import) | vendor docs | 2026-09-23 | Web demo is browser-local; preservation = user-initiated export/import | No demo→account migration exists there either |
| YNAB pricing/trial + cancellation help | vendor docs | 2026-09-23 | Trial is a real account; data survives conversion via same-account continuity | No anonymous sandbox — nothing comparable to migrate |
| Firefly III README + API docs | OSS docs | 2026-09-23 | Public demo site is a shared read-mostly showcase | Demo cannot become a personal account at all |
| Money Lover trial-expiry support docs | vendor docs | 2026-09-23 | Trial expiry keeps the same account's data | Same-account model, no sandbox import |

Honest synthesis: no competitor offers anonymous-local → authenticated migration
because none have MoneyFlow's architecture. Actual normalizes explicit
export/import; YNAB/Money Lover set the user expectation that upgrading keeps
data. Our demo is more capable than these demos, so the abandonment cost is
higher — a genuine gap, not industry-standard behavior.

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| A. Consented candidate-first import | Canon-compliant review-first; reuses provenance pipeline; smallest true fix | Candidate schema may need transfer leg; mapping layer needed | **Recommended** (pending owner answers) |
| B. Demo archive producer → `restore_user_archive` | Preserves everything incl. planning state | Heterogeneous demo state must materialize into `ARCHIVE_TABLE_INVENTORY`; multi-week slice | Deferred to later milestone |
| C. Disclosure only (Stage 1) | Ships now; honest scope | Does not preserve data | **Shipping separately** as `fix/demo-data-continuity-disclosure` |

### Research decision

Candidate-first (Option A) is the smallest coherent slice that actually
preserves data while honoring the one-pipeline law (every source converges on
candidate → provenance → review → ledger). Rejected: silent auto-import
(consent violation), CSV re-import (corrupts transfers/splits), archive
producer (right shape, wrong size for the immediate harm).

### Adoption review

Not applicable — no new dependency, provider or pattern; reuses Inbox
candidate pipeline and existing RPCs.

## Specification

### Problem

A demo user who accumulates weeks of ledger data and then registers loses
silent access to it: the rows stay in localStorage but the authenticated UI
never reads them. No error, no warning, no path.

### User stories

- As a demo user who just registered, I see an explicit choice to bring my demo
  transactions into the new account, so that weeks of capture are not abandoned.
- As the same user, I can review imported rows in the Inbox before they post,
  so that nothing enters my ledger unchecked.
- As the same user, I can decline and know my demo data stays untouched on this
  device, so that I remain in control.

### Acceptance criteria

- [ ] First authenticated landing with a non-empty non-fixture demo ledger shows
      exactly one consent prompt; declining writes a marker and never asks again.
- [ ] Consent maps demo rows to candidates with truthful provenance and lands
      them pending-review in `/inbox` — zero rows post to the ledger unreviewed.
- [ ] Transfers and splits are preserved as such or excluded with disclosed
      scope — never flattened into income/expense.
- [ ] `sample-*`/`cand-demo-*`/`demo-account-*` fixture content never migrates.
- [ ] The prompt is idempotent across sessions and safe if interrupted.
- [ ] Demo localStorage is never cleared automatically; cleanup is a separate
      explicit offer after successful import.

### Required states

- Loading: detection runs client-side on mount; no spinner-blocking UI.
- Empty: no prompt when the demo ledger is fixture-only or absent.
- Populated: dialog states exact scope ("N giao dịch; không gồm ngân sách,
  mục tiêu, khoản định kỳ" per final scope decision).
- Validation/error: import failure leaves localStorage intact and the prompt
  retryable; partial completion reports per-row outcomes.
- Recovery/undo: imported rows are ordinary pending candidates — the normal
  Inbox discard path is the undo.
- Long data / large VND: counts and sums use integer minor units.
- Mobile/tablet/desktop: dialog fits the existing modal conventions.
- Accessibility: keyboard-reachable consent/decline; announced scope.

### Financial and security constraints

- Provenance must be truthful — no `csv`/`paste`/`agent` source labels on
  demo-origin rows.
- Candidate-first only; no direct ledger posting without a review step.
- Empty/bootstrap-only guard mirrors `restore_user_archive` eligibility.
- Ownership/RLS: all writes go through existing `auth.uid()`-scoped RPCs/actions.

### Out of scope

- Migrating rules, income templates, paid-markers (unless the owner expands
  scope when answering the open questions).
- A demo archive producer / `restore_user_archive` reuse (Option B).
- Any silent or automatic migration.
- Multi-device demo sync — demo is device-local by design.

## Implementation plan

_To be filled after the owner resolves the five open questions. Indicative
touch list is in the research report: `transaction-store.ts` snapshot/classifier,
`inbox-map.ts` demo-row mapper, provenance labeling, consent UI on first
authenticated landing, marker store, mapping/RLS/e2e tests._

## Risk assessment

Class 3: crosses the auth boundary, writes tenant data, touches financial
semantics (transfer/split fidelity) and possibly schema (`inbox_candidate_source`
enum). Requires RLS/ownership tests, mapping unit tests, e2e consent/decline,
rollback plan (candidates are discardable; nothing posts directly).
