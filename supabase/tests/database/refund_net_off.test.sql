-- D15 refund net-off (20261016220000): is_refund on
-- financial_transactions, its feed/deleted-feed projection, the
-- create/update write contract, and budget netting.

begin;
select plan(18);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid,
  'authenticated', 'authenticated', 'refund-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Refund A"}'::jsonb,
  now(), now(), '', '', false, false
), (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '77777777-7777-4777-8777-777777777772'::uuid,
  'authenticated', 'authenticated', 'refund-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Refund B"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.accounts (id, user_id, name, kind, currency_code)
values (
  '77777777-0000-4000-8000-0000000000a1'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid,
  'Refund wallet', 'cash', 'VND'
);
insert into public.categories (id, user_id, name, kind)
values
  ('77777777-0000-4000-8000-0000000000c1'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'Food', 'expense'),
  ('77777777-0000-4000-8000-0000000000c2'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'Salary', 'income');

-- r1: refund income row (money back on Food). n1: plain expense. d1:
-- tombstoned refund (deleted-feed projection). b1: another tenant's row.
-- e5: plain income on Food (flagged mid-test). e6: plain income on the
-- Salary income category (flag-attempt target).
insert into public.financial_transactions
  (id, user_id, kind, note, occurred_on, deleted_at, is_refund)
values
  ('77777777-0000-4000-8000-0000000000e1'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'income', 'r1 refund',
   '2026-10-14', null, true),
  ('77777777-0000-4000-8000-0000000000e2'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'expense', 'n1 expense',
   '2026-10-14', null, false),
  ('77777777-0000-4000-8000-0000000000e3'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'income', 'd1 refund',
   '2026-10-14', now(), true),
  ('77777777-0000-4000-8000-0000000000e4'::uuid,
   '77777777-7777-4777-8777-777777777772'::uuid, 'income', 'b1 refund',
   '2026-10-14', null, true),
  ('77777777-0000-4000-8000-0000000000e5'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'income', 'plain income',
   '2026-10-14', null, false),
  ('77777777-0000-4000-8000-0000000000e6'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'income',
   'income cat row', '2026-10-14', null, false);
insert into public.transaction_entries
  (transaction_id, user_id, account_id, category_id, amount_minor)
values
  ('77777777-0000-4000-8000-0000000000e1'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, 30000),
  ('77777777-0000-4000-8000-0000000000e2'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, -100000),
  ('77777777-0000-4000-8000-0000000000e3'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, 15000),
  ('77777777-0000-4000-8000-0000000000e5'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, 50000),
  ('77777777-0000-4000-8000-0000000000e6'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c2'::uuid, 50000);

-- CHECK pin verified as the setup role — authenticated holds no INSERT
-- grant on the ledger tables at all (writes are RPC-only), so the
-- direct-write probe belongs here, before `set local role`.
select throws_ok(
  $$insert into public.financial_transactions
    (user_id, kind, note, is_refund)
    values ('77777777-7777-4777-8777-777777777771', 'expense', 'bad', true)$$,
  'new row for relation "financial_transactions" violates check constraint "financial_transactions_refund_is_income"',
  'CHECK refuses is_refund on an expense row'
);

set local request.jwt.claims =
  '{"sub":"77777777-7777-4777-8777-777777777771","role":"authenticated"}';
set local role authenticated;

-- 1: the column exists, is NOT NULL and defaults to false.
select is(
  (select is_nullable || '|' || coalesce(column_default, '')
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'financial_transactions'
     and column_name = 'is_refund'),
  'NO|false',
  'is_refund is NOT NULL default false'
);

-- 3: feeds project the flag.
select is(
  (select is_refund from public.transaction_feed
   where id = '77777777-0000-4000-8000-0000000000e1'::uuid),
  true,
  'transaction_feed exposes is_refund'
);
select is(
  (select is_refund from public.deleted_transaction_feed
   where id = '77777777-0000-4000-8000-0000000000e3'::uuid),
  true,
  'deleted_transaction_feed exposes is_refund'
);

-- 4: create with is_refund + expense category lands and feeds back.
-- Separate statements: a same-statement subselect may evaluate before
-- the volatile create runs — ordering, not the contract, was the flake.
select ok(
  public.create_money_transaction(
    '77777777-0000-4000-8000-0000000000a1'::uuid,
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    'income', 20000, '2026-10-14', 'refund via rpc',
    '77777777-1111-4111-8111-111111111111'::uuid, '', null, true)
    is not null,
  'refund create lands and returns the new row id'
);
select is(
  (select is_refund from public.transaction_feed
   where id = (
     select id from public.financial_transactions
     where idempotency_key = '77777777-1111-4111-8111-111111111111'::uuid
   )),
  true,
  'created refund row shows in the feed flagged'
);

-- Same idempotency key, flipped flag: is_refund rides the intent
-- object, so the replay fails closed instead of returning the row.
select throws_ok(
  $$select public.create_money_transaction(
    '77777777-0000-4000-8000-0000000000a1'::uuid,
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    'income', 20000, '2026-10-14', 'refund via rpc',
    '77777777-1111-4111-8111-111111111111'::uuid, '', null, false)$$,
  'idempotency_intent_mismatch',
  'same key with a flipped refund flag fails closed'
);

-- 5: create rejects the two non-refund shapes.
select throws_ok(
  format(
    'select public.create_money_transaction(%L, %L, ''expense'', 1000, ''2026-10-14'', ''x'', gen_random_uuid(), '''', null, true)',
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c1'),
  'refund_requires_income_kind',
  'is_refund on an expense create is refused'
);
select throws_ok(
  format(
    'select public.create_money_transaction(%L, %L, ''income'', 1000, ''2026-10-14'', ''x'', gen_random_uuid(), '''', null, true)',
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c2'),
  'refund_requires_expense_category',
  'is_refund with an income category is refused'
);
-- …and the reverse direction still holds: flag off with an expense
-- category on an income row is the ordinary mismatch.
select throws_ok(
  format(
    'select public.create_money_transaction(%L, %L, ''income'', 1000, ''2026-10-14'', ''x'', gen_random_uuid(), '''', null, false)',
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c1'),
  'category_kind_mismatch',
  'unflagged income + expense category still mismatches'
);

-- 6: update flags an existing income row on when its category is the
-- expense one it reimburses (e5 already carries Food).
select public.update_money_transaction(
  '77777777-0000-4000-8000-0000000000e5'::uuid,
  '77777777-0000-4000-8000-0000000000a1'::uuid,
  '77777777-0000-4000-8000-0000000000c1'::uuid,
  'income', 50000, '2026-10-14', 'now refund', '', null, null, false,
  null, true);
select is(
  (select is_refund || '|' || note from public.financial_transactions
   where id = '77777777-0000-4000-8000-0000000000e5'::uuid),
  'true|now refund',
  'update flags the row while fields update'
);

-- 7: null preserves the flag on later edits.
select public.update_money_transaction(
  '77777777-0000-4000-8000-0000000000e5'::uuid,
  '77777777-0000-4000-8000-0000000000a1'::uuid,
  '77777777-0000-4000-8000-0000000000c1'::uuid,
  'income', 60000, '2026-10-14', 'amount bump', '', null, null, false,
  null, null);
select is(
  (select is_refund from public.financial_transactions
   where id = '77777777-0000-4000-8000-0000000000e5'::uuid),
  true,
  'null p_is_refund preserves the stored flag'
);

-- 8: flagging while the category is income-kind is refused — the flag
-- change rides the same validation pass, not a second silent rule.
select throws_ok(
  format(
    'select public.update_money_transaction(%L, %L, %L, ''income'', 50000, ''2026-10-14'', ''x'', '''', null, null, false, null, true)',
    '77777777-0000-4000-8000-0000000000e6',
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c2'),
  'refund_requires_expense_category',
  'flagging a row that still carries an income category is refused'
);
-- Unflagging restores the ordinary rule: e5 (refund, expense category)
-- back to plain income must now fail the kind match — the category is
-- no longer valid for an unflagged income row.
select throws_ok(
  format(
    'select public.update_money_transaction(%L, %L, %L, ''income'', 60000, ''2026-10-14'', ''x'', '''', null, null, false, null, false)',
    '77777777-0000-4000-8000-0000000000e5',
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c1'),
  'category_kind_mismatch',
  'unflagging under an expense category re-runs the ordinary match'
);

-- 9: tenant isolation — user B cannot flag user A's row.
set local request.jwt.claims =
  '{"sub":"77777777-7777-4777-8777-777777777772","role":"authenticated"}';
select throws_ok(
  format(
    'select public.update_money_transaction(%L, %L, %L, ''income'', 50000, ''2026-10-14'', ''x'', '''', null, null, false, null, true)',
    '77777777-0000-4000-8000-0000000000e5',
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c1'),
  'transaction_not_found',
  'cross-tenant flag write is refused'
);
set local request.jwt.claims = '';

-- 10: anonymous callers are rejected before any row work.
select throws_ok(
  format(
    'select public.update_money_transaction(%L, %L, %L, ''income'', 50000, ''2026-10-14'', ''x'', '''', null, null, false, null, true)',
    '77777777-0000-4000-8000-0000000000e5',
    '77777777-0000-4000-8000-0000000000a1',
    '77777777-0000-4000-8000-0000000000c1'),
  'authentication_required',
  'anonymous write is refused'
);

-- 11: budget_progress nets the refunds inside the category spend.
-- Food rows in October: e2 expense +100000; refunds e1 +30000,
-- rpc-created +20000, e5 +60000 (amount bumped) → spent =
-- 100000 − 110000 = −10000 (a negative net spend is honest).
reset role;
insert into public.monthly_budgets
  (user_id, category_id, month_start, limit_minor)
values (
  '77777777-7777-4777-8777-777777777771'::uuid,
  '77777777-0000-4000-8000-0000000000c1'::uuid, '2026-10-01', 200000);
set local request.jwt.claims =
  '{"sub":"77777777-7777-4777-8777-777777777771","role":"authenticated"}';
set local role authenticated;
select is(
  (select spent_minor from public.budget_progress
   where category_id = '77777777-0000-4000-8000-0000000000c1'::uuid
     and month_start = '2026-10-01'),
  -10000::bigint,
  'budget spend nets refunds (100k expense − 110k refunds = −10k)'
);
-- …and it equals the netting contract recomputed independently (the
-- assertion above pins the number; this one pins the rule).
select is(
  (select spent_minor from public.budget_progress
   where category_id = '77777777-0000-4000-8000-0000000000c1'::uuid
     and month_start = '2026-10-01'),
  (select coalesce(sum(
     case
       when ft.kind = 'expense' and e.amount_minor < 0 then -e.amount_minor
       when ft.is_refund then -e.amount_minor
       else 0
     end), 0)::bigint
   from public.transaction_entries e
   join public.financial_transactions ft
     on ft.id = e.transaction_id and ft.user_id = e.user_id
   where e.user_id = '77777777-7777-4777-8777-777777777771'::uuid
     and e.category_id = '77777777-0000-4000-8000-0000000000c1'::uuid
     and (ft.kind = 'expense' or ft.is_refund)
     and ft.deleted_at is null
     and ft.occurred_on >= '2026-10-01'
     and ft.occurred_on < '2026-11-01'),
  'budget spend equals the netting contract recomputed independently'
);

select * from finish();
rollback;
