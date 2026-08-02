begin;
select plan(13);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '55555555-5555-4555-8555-555555555555'::uuid,
  'authenticated', 'authenticated', 'reconciliation-split@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation Split"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer
   from public.accounts
   where user_id = '55555555-5555-4555-8555-555555555555'),
  1,
  'split fixture receives one default account'
);

set local request.jwt.claims =
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.split_reconciliation_account',
  (select id::text
   from public.accounts
   where user_id = '55555555-5555-4555-8555-555555555555'
   order by created_at, id
   limit 1),
  true
);

select set_config(
  'moneyflow_test.split_reconciliation_category_one',
  (select id::text
   from public.categories
   where user_id = '55555555-5555-4555-8555-555555555555'
     and kind = 'expense'
   order by created_at, id
   limit 1),
  true
);

select set_config(
  'moneyflow_test.split_reconciliation_category_two',
  (select id::text
   from public.categories
   where user_id = '55555555-5555-4555-8555-555555555555'
     and kind = 'expense'
     and id <> current_setting(
       'moneyflow_test.split_reconciliation_category_one'
     )::uuid
   order by created_at, id
   limit 1),
  true
);

select lives_ok(
  format(
    $sql$
      select public.create_split_expense(
        %L::uuid,
        jsonb_build_array(
          jsonb_build_object('category_id', %L, 'amount_minor', 12000),
          jsonb_build_object('category_id', %L, 'amount_minor', 8000)
        ),
        '2026-07-20'::date,
        'Split reconciliation fixture',
        '50000000-0000-4000-8000-000000000001'::uuid
      )
    $sql$,
    current_setting('moneyflow_test.split_reconciliation_account'),
    current_setting('moneyflow_test.split_reconciliation_category_one'),
    current_setting('moneyflow_test.split_reconciliation_category_two')
  ),
  'split expense fixture can be created'
);

select set_config(
  'moneyflow_test.split_reconciliation_transaction',
  (select id::text
   from public.financial_transactions
   where user_id = '55555555-5555-4555-8555-555555555555'
     and idempotency_key = '50000000-0000-4000-8000-000000000001'::uuid),
  true
);

select set_config(
  'moneyflow_test.split_reconciliation_entry',
  (select id::text
   from public.transaction_entries
   where transaction_id = current_setting(
     'moneyflow_test.split_reconciliation_transaction'
   )::uuid
   order by id
   limit 1),
  true
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = current_setting(
     'moneyflow_test.split_reconciliation_transaction'
   )::uuid
     and reconciliation_state = 'pending'),
  2,
  'both split lines begin pending'
);

select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.split_reconciliation_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'clearing one split line clears its account leg'
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = current_setting(
     'moneyflow_test.split_reconciliation_transaction'
   )::uuid
     and reconciliation_state = 'cleared'),
  2,
  'all sibling split lines move to cleared together'
);

select is(
  (select count(distinct cleared_at)::integer
   from public.transaction_entries
   where transaction_id = current_setting(
     'moneyflow_test.split_reconciliation_transaction'
   )::uuid),
  1,
  'the account leg shares one cleared timestamp'
);

select set_config(
  'moneyflow_test.split_reconciliation_session',
  public.start_account_reconciliation(
    current_setting('moneyflow_test.split_reconciliation_account')::uuid,
    '2026-07-31'::date,
    -20000
  )::text,
  true
);

select is(
  (select count(*)::integer
   from public.account_reconciliations
   where id = current_setting(
     'moneyflow_test.split_reconciliation_session'
   )::uuid
     and status = 'open'),
  1,
  'split account reconciliation opens'
);

select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.split_reconciliation_session'
   )::uuid),
  -20000::bigint,
  'cleared balance includes every split allocation'
);

select is(
  (select cleared_account_leg_count
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.split_reconciliation_session'
   )::uuid),
  1::bigint,
  'summary counts the split transaction as one account leg'
);

select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.split_reconciliation_session')::uuid
  ),
  true,
  'the zero-difference split account leg reconciles'
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = current_setting(
     'moneyflow_test.split_reconciliation_transaction'
   )::uuid
     and reconciliation_state = 'reconciled'),
  2,
  'all split lines become reconciled together'
);

select is(
  (select count(distinct reconciliation_id)::integer
   from public.transaction_entries
   where transaction_id = current_setting(
     'moneyflow_test.split_reconciliation_transaction'
   )::uuid),
  1,
  'all split lines share the same reconciliation session'
);

select throws_ok(
  format(
    $sql$
      select public.set_account_entry_reconciliation_state(
        %L::uuid,
        'pending'::public.entry_reconciliation_state
      )
    $sql$,
    current_setting('moneyflow_test.split_reconciliation_entry')
  ),
  'P0001',
  'entry_reconciled',
  'a reconciled split account leg cannot be manually downgraded'
);

select * from finish();
rollback;
