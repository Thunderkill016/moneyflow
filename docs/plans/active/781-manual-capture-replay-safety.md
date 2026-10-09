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
