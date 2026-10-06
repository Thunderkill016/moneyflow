# Optimistic concurrency for the 5 remaining update RPCs

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer (subagent, parent orchestrator)
**Permission scope:** branch_write
**Owner:** Hoàng (owner approval given 2026-10-06: finish the batch left open after round 2)
**Issue/PR:** none (Class 3 continuation of round-2 work; no PR created — branch only)
**Last updated:** 2026-10-06

## Outcome

Two tabs/devices editing the same account, budget, recurring commitment, savings
goal or recurring income template currently overwrite each other silently
(last-write-wins). After this change, each of the 5 update RPCs accepts an
optional `p_expected_updated_at` precondition: when the caller supplies the
version it read and the row has since changed, the RPC fails closed with
`stale_write` (no write lands) and the UI surfaces
"Dữ liệu đã được thay đổi ở nơi khác, hãy tải lại và thử lại." Callers that
omit the precondition keep the legacy last-write-wins path.

## Repository reconnaissance

### Current behavior

- 5 RPCs are last-write-wins: `update_financial_account`
  (supabase/migrations/20260926120000_account_identity.sql, signature
  `(uuid, text, account_kind, bigint, text, text)`),
  `upsert_monthly_budget` (20260714000400, `(uuid, date, bigint)`),
  `upsert_recurring_commitment` (20260714000500, `(uuid, text, bigint, integer, uuid, uuid)`),
  `upsert_savings_goal` (20260714000600, `(uuid, text, bigint, date)`),
  `upsert_recurring_income_template` (20260725012129, `(uuid, text, bigint, integer, uuid, uuid)`).
- All 5 backing tables have `updated_at timestamptz not null default now()`
  plus a `set_updated_at()` trigger; the three feed views
  (`recurring_commitment_feed`, `recurring_income_template_feed`,
  `budget_progress`) do **not** expose `updated_at`, and neither do the domain
  read models — so no caller currently has a version to forward.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/migrations/20260923160000…` / `20261006160000…` | Proven pattern (drop old signature, append `p_expected_updated_at timestamptz default null`, row lock + `is distinct from` check → `stale_write`) | copy the pattern verbatim |
| `src/app/actions/{accounts,budgets,commitments,goals,income-templates}.ts` | RPC call sites; zod schemas; stale_write → VN message mapping | change |
| `src/server/{accounts,budgets,commitments,goals,income-templates}.ts` | `map*Row` + zod row schemas; read queries select explicit columns | add `updated_at` to selects + row schemas + models |
| `src/lib/{accounts,planning/{budgets,commitments,goals,income-templates}}.ts` | `Save*Input` + domain models (`updatedAt?: string`, mirroring `Transaction.updatedAt`) | change |
| `src/components/{accounts/accounts-workspace,planning/{budgets,commitments,goals,income-templates}-page,onboarding-flow}.tsx` | Edit dialogs call save actions; each page holds `editing` state | attach `expectedUpdatedAt: editing?.updatedAt` in non-demo save path |
| `supabase/tests/database/schema_and_rls.test.sql` | `has_function` checks the 5 old signatures (lines ~69–81) | update to new signatures (lesson PR #769) |
| `docs/operations/multi-device-write-semantics.md` | "Current truth" doc still claims no RPC accepts a version precondition | update to record the new contract |

### Existing tests and constraints

- pgTAP: `optimistic_concurrency_update.test.sql`,
  `optimistic_concurrency_update_transfer.test.sql` — new `optimistic_concurrency_batch_*.test.sql`
  per RPC, 3 cases each (stale/matching/null). Lesson PR #769: cast `sum()` to
  bigint before `is()`. pgTAP needs local Supabase (Docker); VM has none → CI runs it.
- Unit: `src/lib/optimistic-concurrency-transfer-contract.test.ts` (precedent)
  and `src/lib/optimistic-transactions.test.ts` — add a batch contract test file
  asserting migrations/caller wiring per RPC.
- Financial invariants (VND integer, balanced transfers, RLS, soft-delete) are
  untouched: these RPCs only gain a precondition check before existing writes.

### Similar implementation and recent history

- PR #768 (round 2) added the pattern for `update_money_transaction`; PR #769
  added it for `update_account_transfer`. Both green in CI, verified on
  production. This batch copies them exactly.
- Known traps from PR #769: register migrations with
  `node scripts/check-migration-identity.mjs --write` (CI fails otherwise);
  update `schema_and_rls.test.sql` `has_function` signatures; pgTAP numeric cast.

### Open questions

None — design is fixed by the two precedents. One deliberate boundary:
`carryForwardBudgetsAction` (bulk copy of last month's limits) intentionally
omits the precondition — it only creates rows that do not yet exist this month,
so there is no stale version to guard.

## Research

Not required — purely internal/mechanical, pattern proven twice in-tree.

## Specification

For each of the 5 RPCs:

1. **Migration** (`supabase/migrations/20261006HHMMSS_<rpc>_expected_updated_at.sql`,
   next timestamp after 20261006160000):
   - `drop function if exists` with the exact old signature.
   - `create function` with the old params + `p_expected_updated_at timestamptz default null`.
   - Existing behavior identical; the version check is inserted **under the row
     lock (`for update`) before any write** (upsert paths: only on the update
     branch — when the id-conflict target exists):
     ```sql
     if p_expected_updated_at is not null
        and v_existing_updated_at is distinct from p_expected_updated_at then
       raise exception 'stale_write';
     end if;
     ```
   - `null` precondition → legacy last-write-wins (bulk tools, older clients).
   - Re-apply the same `revoke … from public, anon; grant execute … to authenticated;`.
   - `budget_progress`, `recurring_commitment_feed`,
     `recurring_income_template_feed`: `create or replace` to add the source
     table's `updated_at` column (no behavior change; views already
     `security_invoker`).
2. **Server action**: zod schema gains `expectedUpdatedAt: z.string().optional()`;
   RPC call forwards `p_expected_updated_at: value.expectedUpdatedAt ?? null`;
   `error?.message.includes("stale_write")` → `{ ok: false, message:
   "Dữ liệu đã được thay đổi ở nơi khác, hãy tải lại và thử lại." }`.
3. **Read path**: `updated_at` added to the explicit selects, zod row schemas,
   and `map*Row`; domain models gain `updatedAt?: string`; `Save*Input` gains
   `expectedUpdatedAt?: string`.
4. **Components**: non-demo save attaches `expectedUpdatedAt: editing?.updatedAt`
   (version read when the edit dialog opened). Demo path unchanged (single-device
   local store; `undefined` → legacy path).
5. **Tests**: pgTAP per RPC (stale → throws + row untouched; matching → updates;
   null → legacy path). Unit contract test file covering all 5 (migration text,
   caller wiring, message mapping). `schema_and_rls.test.sql` signature updates.

Out of scope: archive/delete RPCs, `adjust_savings_goal` (its own advisory lock +
for-update read already serializes; allocation conflicts are business-rule
rejections, not silent overwrites), direction changes, CI policy.

## Risks

| Risk | Mitigation |
|---|---|
| Signature drift (old overload left behind → ambiguous RPC) | `drop function if exists` exact old signature; contract test asserts single `create function` per migration; `has_function` checks updated |
| Forgetting baseline registration → CI fail | Run `check-migration-identity.mjs --write` immediately after adding migrations (checklist step) |
| pgTAP cannot run locally (no Docker) | CI runs `test:db`; pgTAP files written carefully against the two precedents; flagged in final report |
| VM RAM limits | Run unit/lint/typecheck sequentially; one E2E journey at the end only |
| Colliding with the other agent on `fix/auth-logout-race-2026-10-06` | Work strictly on `fix/rpc-concurrency-batch-2026-10-06`; no commits to that branch |

## Test plan

1. `npm run lint`, `npm run typecheck` — clean.
2. `npm run test` (unit) — pass, including new batch contract tests.
3. pgTAP: not runnable locally; CI `test:db` covers it.
4. One E2E journey (edit an entity in two tabs → second save shows the stale
   message) — VM RAM is weak; run once at the end.
5. `npm run check:knowledge`, `npm run test:ci-policy` if selected by policy.

## Implementation log

- Branch `fix/rpc-concurrency-batch-2026-10-06` created from
  `fix/qa-round3-2026-10-06` tip `f27f43b`.
