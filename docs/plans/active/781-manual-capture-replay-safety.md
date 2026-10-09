# #781 — Manual capture replay safety

**Status:** implementing · **Owner instruction:** “làm đi” (2026-10-09) · **Class:** 3 financial correctness
**Issue/PR:** #781 / draft #782 · **Permission:** branch_write only; no production data, provider, deploy, or merge action

## Authority and scope

Follow `AGENTS.md`, `docs/product/CANON.md`, `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`, and the existing one-ledger financial invariants. Improve Ghi's retry behavior; do not introduce background sync or bank integration.

## Proven defect

`add-transaction-dialog.tsx` held the idempotency key only in memory. A failed-save draft persisted amounts and mapping but omitted the key. Closing a tab after a successful database commit with a lost response could cause a later restore to re-submit the same intended transaction under a fresh UUID. The create RPC's select-then-insert could also produce a unique violation under same-key concurrency, and it returned an existing row without comparing original create parameters.

## Intended change

1. Persist the key **before** submitting the request, preserve it through failed-draft restoration, clear it only after success; editing a submitted draft starts a new intent.
2. Serialize same-key creates via a transaction-scoped advisory lock; save immutable `creation_intent` JSONB; replay only an exactly matching original intent. Old rows with unknown original intent deliberately fail closed.
3. Provide actionable UI copy for mismatch/unknown intent and add unit/contract and pgTAP regression cases.
4. Keep provider-paired migration files plus manifest synchronized. Preserve RLS, account entries, backup/archive and finance semantics.

## Required review evidence / outstanding risks

- Fresh Supabase reset/pgTAP; embedded PostgreSQL migration replay; TypeScript/Next build; UI test/CI.
- **Concurrent independent connections** using same user/key, including one rejected changed payload.
- **Lost response after commit** and remount/retry across a fresh browser context.
- Archive producer and restore round trip: new optional `creation_intent` field must not break an older archive and retry after archive restore must fail safely if original intent is unavailable.
- Verify source-neutral masking/retention of request payload (note/payee duplicated in JSONB) and ownership/RLS invariants.
- Do not merge or deploy without owner review and evidence for remaining risks.

## Delivery status

Draft PR #782 opened. Tests pending CI. No production write and no provider changes.

## Repository reconnaissance

- Capture path: `src/components/add-transaction-dialog.tsx`, `src/lib/unsent-draft.ts`, `src/app/actions/transactions.ts`.
- Transaction RPC current definition: `db/neon/migrations/20260924120000_transaction_goal_linkage.sql`.
- Database verification: `supabase/tests/database` and the Neon-generated migration manifest.

## Research

PostgreSQL transaction-scoped advisory locks serialize attempts on a user/key pair. An immutable creation-intent record is needed to compare replays even after legitimate edits to the transaction. Request identity must survive an ambiguous response; a unique index alone cannot distinguish a changed payload.

## Specification

An unchanged submitted request with the same key returns the original transaction ID. A changed request sharing the key fails explicitly; legacy rows without a recorded original intent fail closed. The browser persists the submitted key before sending and restores it without generating another key for the same draft. No production writes or provider changes.

## Implementation plan

1. Add the draft and RPC changes on the isolated branch.
2. Add paired provider migrations and their identity/manifest records.
3. Add unit and pgTAP regressions and check a truly concurrent test with two connections.
4. Run exact-head CI, reconcile findings, and seek owner review before merge.

## Tasks

| Task | State |
|---|---|
| Branch implementation, provider migration parity | done |
| Draft restoration and static contract tests | done |
| pgTAP first/replay/mismatch cases | authored; CI pending |
| Browser ambiguous-commit and two-connection concurrency | outstanding |
| Owner-reviewed merge/deploy | not authorized |

## Evaluation

Acceptance requires a single persisted transaction and account leg after repeated identical attempts, mismatched intent rejection without mutation, restored draft idempotency identity across remount, and no archived-data or RLS regression. CI/test evidence must attach to the exact head. Do not claim complete until independent concurrency and lost-ACK scenarios are proven.
