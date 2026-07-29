# MoneyFlow authenticated SECURITY DEFINER RPC audit

**Plan:** MF SAFE-UX / SAFE-T1  
**Master issue:** #134  
**Audit date:** 2026-07-29  
**Live Supabase project:** MoneyFlow

## Decision summary

Supabase Security Advisor reports 23 `authenticated_security_definer_function_executable` warnings. The warning means a signed-in browser user can call a privileged function; it does not by itself prove tenant escape or unauthorized mutation.

The live catalog and function definitions were checked before this record was written. All 23 reviewed functions currently satisfy the common boundary:

- `PUBLIC` execute: revoked;
- `anon` execute: revoked;
- `authenticated` execute: granted intentionally;
- identity derived from `auth.uid()`;
- explicit `authentication_required` rejection;
- `search_path` locked to the empty path;
- user-owned input IDs are constrained by `user_id = auth.uid()` or `user_id = v_user_id`, while create-only operations stamp `v_user_id` onto new rows;
- existing pgTAP/runtime suites cover cross-tenant ID reuse and the financial invariants for transaction, transfer, split, recurring, budget, goal, archive, delete and restore operations.

**Current decision:** retain all 23 as `SECURITY DEFINER`. No DDL change is justified merely to suppress generic Advisor warnings. The accompanying pgTAP file makes the common privilege/authentication contract permanent and forces review if the inventory changes.

## Function matrix

| # | Function | Browser call intentional | Ownership/invariant form | Decision |
|---:|---|---|---|---|
| 1 | `adjust_savings_goal(uuid,bigint)` | yes | authenticated owner goal; scoped allocation mutation; advisory lock | retain definer |
| 2 | `create_account_transfer(uuid,uuid,bigint,date,text,uuid)` | yes | both account IDs owned by caller; transfer net-zero and idempotency | retain definer |
| 3 | `create_financial_account(text,account_kind,bigint,text)` | yes | create-only; new account stamped with caller ID | retain definer |
| 4 | `create_money_transaction(uuid,uuid,transaction_kind,bigint,date,text,uuid)` | yes | account/category ownership; integer VND and idempotency | retain definer |
| 5 | `create_split_expense(uuid,jsonb,date,text,uuid)` | yes | account/category ownership; split total and idempotency | retain definer |
| 6 | `delete_monthly_budget(uuid)` | yes | delete predicate includes `user_id = auth.uid()` | retain definer |
| 7 | `pay_recurring_commitment(uuid,date,date,uuid)` | yes | owner commitment/account/category; occurrence lock and idempotency | retain definer |
| 8 | `record_recurring_income_template(uuid,date,date,uuid)` | yes | owner template/account/category; occurrence lock and idempotency | retain definer |
| 9 | `restore_money_transaction(uuid)` | yes | update predicate includes caller ownership and deleted state | retain definer |
| 10 | `set_financial_account_archived(uuid,boolean)` | yes | account ownership predicate and archive invariants | retain definer |
| 11 | `set_recurring_commitment_archived(uuid,boolean)` | yes | update predicate includes `user_id = auth.uid()` | retain definer |
| 12 | `set_recurring_income_template_archived(uuid,boolean)` | yes | update predicate includes `user_id = auth.uid()` | retain definer |
| 13 | `set_savings_goal_archived(uuid,boolean)` | yes | caller ownership; cannot archive allocated goal | retain definer |
| 14 | `soft_delete_money_transaction(uuid)` | yes | caller ownership; recurring-generated transactions remain locked | retain definer |
| 15 | `undo_recurring_commitment_payment(uuid,date)` | yes | owner occurrence delete and owner transaction soft-delete | retain definer |
| 16 | `undo_recurring_income_template_receipt(uuid,date)` | yes | owner occurrence delete and owner transaction soft-delete | retain definer |
| 17 | `update_account_transfer(uuid,uuid,uuid,bigint,date,text)` | yes | transaction/source/destination ownership; transfer net-zero | retain definer |
| 18 | `update_financial_account(uuid,text,account_kind,bigint)` | yes | update predicate and dependent calculations caller-scoped | retain definer |
| 19 | `update_money_transaction(uuid,uuid,uuid,transaction_kind,bigint,date,text)` | yes | transaction/account/category ownership and ledger invariants | retain definer |
| 20 | `upsert_monthly_budget(uuid,date,bigint)` | yes | expense category ownership; caller-stamped upsert key | retain definer |
| 21 | `upsert_recurring_commitment(uuid,text,bigint,integer,uuid,uuid)` | yes | owner IDs for update/account/category; caller-stamped create | retain definer |
| 22 | `upsert_recurring_income_template(uuid,text,bigint,integer,uuid,uuid)` | yes | owner IDs for update/account/category; caller-stamped create | retain definer |
| 23 | `upsert_savings_goal(uuid,text,bigint,date)` | yes | owner goal update or caller-stamped create | retain definer |

## Permanent verification

`supabase/tests/database/security_definer_contract.test.sql` asserts:

1. the reviewed inventory remains exactly 23 functions;
2. no function is callable by `anon`;
3. no function is callable by `PUBLIC`;
4. all reviewed calls remain intentionally granted to `authenticated`;
5. every function locks `search_path`;
6. every function derives identity from `auth.uid()`;
7. every function explicitly rejects unauthenticated execution.

Function-specific ownership, cross-tenant and financial-invariant behavior remains covered by the existing database suite. If a future RPC is added or a privilege changes, the inventory assertion fails and requires a new audit row rather than silently expanding the privileged API.

## Leaked-password protection

The separate `auth_leaked_password_protection` warning remains open as a managed Auth configuration constraint. It is not reproducible as SQL DDL and must not be approximated with weaker application-side code.

Status for SAFE-08:

- enable in Supabase Auth when the project plan exposes the setting;
- otherwise record `plan-blocked` with #40 as authority;
- do not represent the warning as fixed until the live Advisor no longer reports it.

## Residual risk

- `SECURITY DEFINER` remains high-impact code and must continue to receive per-function ownership tests when modified.
- The generic Advisor warning will remain visible for intentionally browser-callable definer RPCs.
- This accepted warning does not waive review of future functions, new input IDs, dynamic SQL, search-path changes or grant changes.
