begin;
select plan(17);

-- Payee (merchant/entity) as a first-class ledger field: carried through every
-- transaction-writing RPC, exposed by transaction_feed, editable on reconciled
-- rows, and never invented for existing rows.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '19200000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'payee-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Payee Owner"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"19200000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

create temporary table payee_ids (
  key text primary key,
  id uuid not null
) on commit drop;

insert into payee_ids (key, id)
select 'expense_category', id from public.categories
  where user_id = '19200000-0000-4000-8000-000000000001' and kind = 'expense'
  order by created_at, id limit 1;
insert into payee_ids (key, id)
select 'income_category', id from public.categories
  where user_id = '19200000-0000-4000-8000-000000000001' and kind = 'income'
  order by created_at, id limit 1;
insert into payee_ids (key, id)
select 'account', id from public.accounts
  where user_id = '19200000-0000-4000-8000-000000000001'
  order by created_at, id limit 1;

-- 1. create_money_transaction stores the payee.
select lives_ok(
  $$
    insert into payee_ids (key, id)
    select 'tx_paid', public.create_money_transaction(
      (select id from payee_ids where key = 'account'),
      (select id from payee_ids where key = 'expense_category'),
      'expense'::public.transaction_kind,
      63000::bigint,
      '2026-07-14'::date,
      'Cơm trưa',
      '19230000-0000-4000-8000-000000000001'::uuid,
      'Lunch Shop'
    )
  $$,
  'create_money_transaction accepts a payee'
);

select is(
  (select payee from public.financial_transactions
   where id = (select id from payee_ids where key = 'tx_paid')),
  'Lunch Shop',
  'payee is stored on the ledger row'
);

select is(
  (select payee from public.transaction_feed
   where id = (select id from payee_ids where key = 'tx_paid')),
  'Lunch Shop',
  'transaction_feed exposes payee'
);

-- 2. No payee supplied -> '' (never invented).
select lives_ok(
  $$
    insert into payee_ids (key, id)
    select 'tx_plain', public.create_money_transaction(
      (select id from payee_ids where key = 'account'),
      (select id from payee_ids where key = 'expense_category'),
      'expense'::public.transaction_kind,
      20000::bigint,
      '2026-07-14'::date,
      'Xăng xe',
      '19230000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'create_money_transaction without payee still works'
);

select is(
  (select payee from public.financial_transactions
   where id = (select id from payee_ids where key = 'tx_plain')),
  '',
  'missing payee stays empty string, not invented'
);

-- 3. Length is bounded like merchant.
select throws_ok(
  $$
    select public.create_money_transaction(
      (select id from payee_ids where key = 'account'),
      (select id from payee_ids where key = 'expense_category'),
      'expense'::public.transaction_kind,
      20000::bigint,
      '2026-07-14'::date,
      'Xăng xe',
      '19230000-0000-4000-8000-000000000003'::uuid,
      repeat('x', 201)
    )
  $$,
  'P0001',
  'payee_too_long',
  'create_money_transaction rejects payee over 200 chars'
);

-- 4. update_money_transaction rewrites and clears payee.
select lives_ok(
  $$
    select public.update_money_transaction(
      (select id from payee_ids where key = 'tx_paid'),
      (select id from payee_ids where key = 'account'),
      (select id from payee_ids where key = 'expense_category'),
      'expense'::public.transaction_kind,
      63000::bigint,
      '2026-07-14'::date,
      'Cơm trưa',
      'Lunch Shop Q1'
    )
  $$,
  'update_money_transaction accepts a payee'
);

select is(
  (select payee from public.financial_transactions
   where id = (select id from payee_ids where key = 'tx_paid')),
  'Lunch Shop Q1',
  'update_money_transaction rewrites payee'
);

select lives_ok(
  $$
    select public.update_money_transaction(
      (select id from payee_ids where key = 'tx_paid'),
      (select id from payee_ids where key = 'account'),
      (select id from payee_ids where key = 'expense_category'),
      'expense'::public.transaction_kind,
      63000::bigint,
      '2026-07-14'::date,
      'Cơm trưa',
      ''
    )
  $$,
  'update_money_transaction can clear payee'
);

select is(
  (select payee from public.financial_transactions
   where id = (select id from payee_ids where key = 'tx_paid')),
  '',
  'cleared payee returns to empty string'
);

-- 5. Inbox approval: candidate merchant becomes payee when p_payee is omitted
--    (batch path); an explicit p_payee (the reviewed merchant) wins.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, parser_version, mapping_version
) values (
  '19220000-0000-4000-8000-000000000001'::uuid,
  '19200000-0000-4000-8000-000000000001'::uuid,
  'expense',
  45000,
  'Phở 24',
  '',
  '2026-07-15',
  'paste',
  'high',
  'pending',
  (select id from payee_ids where key = 'expense_category'),
  null,
  (select id from payee_ids where key = 'account'),
  null,
  'Pho 24 -45000',
  'paste@1.0',
  1
);

select lives_ok(
  $$
    insert into payee_ids (key, id)
    select 'tx_inbox_fallback', public.approve_inbox_candidate(
      '19220000-0000-4000-8000-000000000001'::uuid,
      'expense'::public.transaction_kind,
      (select id from payee_ids where key = 'account'),
      (select id from payee_ids where key = 'expense_category'),
      null,
      45000::bigint,
      '2026-07-15'::date,
      'Phở trưa',
      '19230000-0000-4000-8000-000000000004'::uuid,
      false
    )
  $$,
  'approve_inbox_candidate without p_payee still works'
);

select is(
  (select payee from public.financial_transactions
   where id = (select id from payee_ids where key = 'tx_inbox_fallback')),
  'Phở 24',
  'approval falls back to the persisted candidate merchant'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, parser_version, mapping_version
) values (
  '19220000-0000-4000-8000-000000000002'::uuid,
  '19200000-0000-4000-8000-000000000001'::uuid,
  'expense',
  80000,
  'GRAB*RIDE 8821',
  '',
  '2026-07-16',
  'paste',
  'high',
  'pending',
  (select id from payee_ids where key = 'expense_category'),
  null,
  (select id from payee_ids where key = 'account'),
  null,
  'GRAB*RIDE 8821 -80000',
  'paste@1.0',
  1
);

select lives_ok(
  $$
    insert into payee_ids (key, id)
    select 'tx_inbox_reviewed', public.approve_inbox_candidate(
      '19220000-0000-4000-8000-000000000002'::uuid,
      'expense'::public.transaction_kind,
      (select id from payee_ids where key = 'account'),
      (select id from payee_ids where key = 'expense_category'),
      null,
      80000::bigint,
      '2026-07-16'::date,
      'Đi làm',
      '19230000-0000-4000-8000-000000000005'::uuid,
      false,
      'Grab'
    )
  $$,
  'approve_inbox_candidate accepts the reviewed payee'
);

select is(
  (select payee from public.financial_transactions
   where id = (select id from payee_ids where key = 'tx_inbox_reviewed')),
  'Grab',
  'reviewed payee wins over the persisted merchant'
);

-- 6. Reconciled rows: payee is editable metadata, money fields stay locked.
reset role;

select lives_ok(
  $$
    update public.transaction_entries
    set reconciliation_state = 'reconciled'
    where transaction_id = (select id from payee_ids where key = 'tx_paid')
      and user_id = '19200000-0000-4000-8000-000000000001'
  $$,
  'mark the transaction entry reconciled'
);

select lives_ok(
  $$
    update public.financial_transactions
    set payee = 'Lunch Shop (đổi tên)'
    where id = (select id from payee_ids where key = 'tx_paid')
  $$,
  'payee edit on a reconciled transaction is allowed'
);

select throws_ok(
  $$
    update public.financial_transactions
    set note = 'Đổi ghi chú'
    where id = (select id from payee_ids where key = 'tx_paid')
  $$,
  'P0001',
  'transaction_reconciled',
  'reconciled guard still blocks financial-field edits'
);

select * from finish();
rollback;
