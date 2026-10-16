-- debts + apply_debt_repayment (20261016120000): direction-derived ledger
-- kind, remaining/state transitions, overpay guard, idempotent replay and
-- intent pinning, tenant isolation, soft delete.

begin;
select plan(21);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid,
  'authenticated', 'authenticated', 'debts-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Debt A"}'::jsonb,
  now(), now(), '', '', false, false
), (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '77777777-7777-4777-8777-777777777772'::uuid,
  'authenticated', 'authenticated', 'debts-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Debt B"}'::jsonb,
  now(), now(), '', '', false, false
);

-- Fixtures before the authenticated role is assumed (same pattern as the
-- other RPC tests): one account, one expense + one income category.
insert into public.accounts (id, user_id, name, kind, currency_code)
values (
  '77777777-0000-4000-8000-0000000000a1'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid,
  'Debt wallet', 'cash', 'VND'
);
insert into public.categories (id, user_id, name, kind)
values (
  '77777777-0000-4000-8000-0000000000c1'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid, 'Debt expense', 'expense'
), (
  '77777777-0000-4000-8000-0000000000c2'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid, 'Debt income', 'income'
);
insert into public.debts (id, user_id, counterparty, direction, principal_minor, remaining_minor)
values (
  '77777777-0000-4000-8000-0000000000b1'::uuid,
  '77777777-7777-4777-8777-777777777772'::uuid,
  'Borrower B', 'receivable', 500000, 500000
);

set local request.jwt.claims =
  '{"sub":"77777777-7777-4777-8777-777777777771","role":"authenticated"}';
set local role authenticated;

-- 1-2: create stores remaining = principal and defaults open.
select set_config(
  'moneyflow_test.debt_owe',
  public.create_debt(
    'payable'::public.debt_direction, 'Anh Hai', 2000000,
    '2026-12-01'::date, 'mượn trả lương'
  )::text,
  true
);
select is(
  (select direction::text || '|' || remaining_minor::text || '|' || state::text
   from public.debts
   where id = current_setting('moneyflow_test.debt_owe')::uuid),
  'payable|2000000|open',
  'create_debt stores direction, remaining = principal, state open'
);
select is(
  (select counterparty || '|' || due_date::text || '|' || note
   from public.debts
   where id = current_setting('moneyflow_test.debt_owe')::uuid),
  'Anh Hai|2026-12-01|mượn trả lương',
  'counterparty is trimmed and due_date/note land'
);

-- 3-4: validation bounds.
select throws_ok(
  'select public.create_debt(''payable'', ''  '', 1000)',
  'invalid_counterparty',
  'blank counterparty is rejected'
);
select throws_ok(
  'select public.create_debt(''receivable'', ''A'', 0)',
  'amount_must_be_positive',
  'zero principal is rejected'
);

-- 5-7: a payable repayment posts a real EXPENSE on the chosen account and
-- decrements remaining atomically.
select set_config(
  'moneyflow_test.repay_tx',
  public.apply_debt_repayment(
    current_setting('moneyflow_test.debt_owe')::uuid,
    '77777777-0000-4000-8000-0000000000a1'::uuid,
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    500000,
    '2026-10-16'::date,
    'trả một phần',
    '11111111-2222-4333-8444-555555555551'::uuid
  )::text,
  true
);
select is(
  (select kind::text || '|' || payee || '|' || occurred_on::text
   from public.financial_transactions
   where id = current_setting('moneyflow_test.repay_tx')::uuid),
  'expense|Anh Hai|2026-10-16',
  'payable repayment posts an expense carrying the counterparty as payee'
);
select is(
  (select amount_minor
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.repay_tx')::uuid),
  -500000::bigint,
  'the expense entry is negative on the paying account'
);
select is(
  (select remaining_minor
   from public.debts
   where id = current_setting('moneyflow_test.debt_owe')::uuid),
  1500000::bigint,
  'remaining decremented atomically'
);

-- 8: overpaying the open remaining refuses, nothing is written.
select throws_ok(
  format(
    'select public.apply_debt_repayment(%L::uuid, %L::uuid, %L::uuid, 1600000, ''2026-10-16''::date, '''', gen_random_uuid())',
    current_setting('moneyflow_test.debt_owe'),
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c1'
  ),
  'repayment_exceeds_remaining',
  'repayment above remaining is rejected'
);

-- 9: an income category cannot pay a payable debt (kind is direction-derived).
select throws_ok(
  format(
    'select public.apply_debt_repayment(%L::uuid, %L::uuid, %L::uuid, 100000, ''2026-10-16''::date, '''', gen_random_uuid())',
    current_setting('moneyflow_test.debt_owe'),
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c2'
  ),
  'category_kind_mismatch',
  'income category on a payable repayment is rejected'
);

-- 10-12: replaying the same idempotency key returns the same transaction;
-- a different amount under the same key fails closed on the stored intent.
select is(
  public.apply_debt_repayment(
    current_setting('moneyflow_test.debt_owe')::uuid,
    '77777777-0000-4000-8000-0000000000a1'::uuid,
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    500000,
    '2026-10-16'::date,
    'trả một phần',
    '11111111-2222-4333-8444-555555555551'::uuid
  )::text,
  current_setting('moneyflow_test.repay_tx'),
  'replayed key returns the original transaction'
);
select throws_ok(
  format(
    'select public.apply_debt_repayment(%L::uuid, %L::uuid, %L::uuid, 700000, ''2026-10-16''::date, ''trả một phần'', ''11111111-2222-4333-8444-555555555551''::uuid)',
    current_setting('moneyflow_test.debt_owe'),
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c1'
  ),
  'idempotency_intent_mismatch',
  'same key with a different amount fails closed'
);
select is(
  (select remaining_minor
   from public.debts
   where id = current_setting('moneyflow_test.debt_owe')::uuid),
  1500000::bigint,
  'a replayed key never double-decrements'
);

-- 13-14: paying the exact remainder settles the debt.
select lives_ok(
  format(
    'select public.apply_debt_repayment(%L::uuid, %L::uuid, %L::uuid, 1500000, ''2026-10-16''::date, ''trả hết'', gen_random_uuid())',
    current_setting('moneyflow_test.debt_owe'),
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c1'
  ),
  'final repayment lands'
);
select is(
  (select state::text || '|' || remaining_minor::text
   from public.debts
   where id = current_setting('moneyflow_test.debt_owe')::uuid),
  'settled|0',
  'reaching zero marks the debt settled'
);

-- 15: a settled debt refuses further repayments.
select throws_ok(
  format(
    'select public.apply_debt_repayment(%L::uuid, %L::uuid, %L::uuid, 100000, ''2026-10-16''::date, '''', gen_random_uuid())',
    current_setting('moneyflow_test.debt_owe'),
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c1'
  ),
  'debt_not_open',
  'repayment on a settled debt is rejected'
);

-- 16-17: a receivable collection posts a real INCOME.
select set_config(
  'moneyflow_test.debt_lent',
  public.create_debt(
    'receivable'::public.debt_direction, 'Em Lan', 300000
  )::text,
  true
);
select set_config(
  'moneyflow_test.collect_tx',
  public.apply_debt_repayment(
    current_setting('moneyflow_test.debt_lent')::uuid,
    '77777777-0000-4000-8000-0000000000a1'::uuid,
    '77777777-0000-4000-8000-0000000000c2'::uuid,
    300000,
    '2026-10-16'::date,
    '',
    '11111111-2222-4333-8444-555555555552'::uuid
  )::text,
  true
);
select is(
  (select kind::text
   from public.financial_transactions
   where id = current_setting('moneyflow_test.collect_tx')::uuid),
  'income',
  'receivable collection posts an income'
);
select is(
  (select amount_minor
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.collect_tx')::uuid),
  300000::bigint,
  'the income entry is positive on the receiving account'
);

-- 18-19: tenant isolation — B's debt is invisible to A, and A cannot repay it.
select is(
  (select count(*)::integer
   from public.debts
   where id = '77777777-0000-4000-8000-0000000000b1'::uuid),
  0,
  'RLS hides another tenant''s debt row'
);
select throws_ok(
  format(
    'select public.apply_debt_repayment(%L::uuid, %L::uuid, %L::uuid, 100000, ''2026-10-16''::date, '''', gen_random_uuid())',
    '77777777-0000-4000-8000-0000000000b1',
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c2'
  ),
  'debt_not_found',
  'repaying another tenant''s debt fails as not found'
);

-- 20-21: soft delete tombstones the row
select set_config(
  'moneyflow_test.debt_del',
  public.create_debt(
    'payable'::public.debt_direction, 'Chị Tư', 100000
  )::text,
  true
);
select is(
  public.soft_delete_debt(current_setting('moneyflow_test.debt_del')::uuid),
  true,
  'soft_delete_debt reports the delete'
);
select is(
  (select deleted_at is not null
   from public.debts
   where id = current_setting('moneyflow_test.debt_del')::uuid),
  true,
  'the row is tombstoned, not removed'
);

select * from finish();
rollback;
