begin;
select plan(13);

select has_view(
  'public',
  'account_reconciliation_entry_feed',
  'reconciliation companion entry feed exists'
);
select has_column('public', 'account_reconciliation_entry_feed', 'entry_id', 'feed exposes representative entry ID');
select has_column('public', 'account_reconciliation_entry_feed', 'user_id', 'feed keeps tenant ownership');
select has_column('public', 'account_reconciliation_entry_feed', 'transaction_id', 'feed exposes transaction identity');
select has_column('public', 'account_reconciliation_entry_feed', 'account_id', 'feed is account scoped');
select has_column('public', 'account_reconciliation_entry_feed', 'reconciliation_state', 'feed exposes account-leg state');
select has_column('public', 'account_reconciliation_entry_feed', 'entry_count', 'feed exposes physical split row count');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '61616161-6161-4616-8616-616161616161'::uuid,
  'authenticated', 'authenticated', 'reconciliation-workspace-a@example.invalid',
  crypt('discarded-test-password-a', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation Workspace A"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '62626262-6262-4626-8626-626262626262'::uuid,
  'authenticated', 'authenticated', 'reconciliation-workspace-b@example.invalid',
  crypt('discarded-test-password-b', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation Workspace B"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims =
  '{"sub":"61616161-6161-4616-8616-616161616161","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.workspace_account',
  (select id::text
   from public.accounts
   where user_id = '61616161-6161-4616-8616-616161616161'
   order by created_at, id
   limit 1),
  true
);
select set_config(
  'moneyflow_test.workspace_category_one',
  (select id::text
   from public.categories
   where user_id = '61616161-6161-4616-8616-616161616161'
     and kind = 'expense'
   order by created_at, id
   limit 1),
  true
);
select set_config(
  'moneyflow_test.workspace_category_two',
  (select id::text
   from public.categories
   where user_id = '61616161-6161-4616-8616-616161616161'
     and kind = 'expense'
     and id <> current_setting('moneyflow_test.workspace_category_one')::uuid
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
        '2026-08-01'::date,
        'Workspace grouped split',
        '61000000-0000-4000-8000-000000000001'::uuid
      )
    $sql$,
    current_setting('moneyflow_test.workspace_account'),
    current_setting('moneyflow_test.workspace_category_one'),
    current_setting('moneyflow_test.workspace_category_two')
  ),
  'split fixture can be created for the companion feed'
);
select set_config(
  'moneyflow_test.workspace_transaction',
  (select id::text
   from public.financial_transactions
   where user_id = '61616161-6161-4616-8616-616161616161'
     and idempotency_key = '61000000-0000-4000-8000-000000000001'::uuid),
  true
);
select set_config(
  'moneyflow_test.workspace_entry',
  (select entry_id::text
   from public.account_reconciliation_entry_feed
   where transaction_id = current_setting('moneyflow_test.workspace_transaction')::uuid
     and account_id = current_setting('moneyflow_test.workspace_account')::uuid),
  true
);

select is(
  (select count(*)::integer
   from public.account_reconciliation_entry_feed
   where transaction_id = current_setting('moneyflow_test.workspace_transaction')::uuid
     and account_id = current_setting('moneyflow_test.workspace_account')::uuid),
  1,
  'split transaction renders as one logical account-leg row'
);
select is(
  (select entry_count
   from public.account_reconciliation_entry_feed
   where transaction_id = current_setting('moneyflow_test.workspace_transaction')::uuid
     and account_id = current_setting('moneyflow_test.workspace_account')::uuid),
  2::bigint,
  'logical row reports both physical split entries'
);
select lives_ok(
  format(
    $sql$
      select public.set_account_entry_reconciliation_state(%L::uuid, 'cleared')
    $sql$,
    current_setting('moneyflow_test.workspace_entry')
  ),
  'representative entry ID can clear the logical account leg'
);
select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.workspace_transaction')::uuid
     and reconciliation_state = 'cleared'),
  2,
  'representative entry mutation clears every split row atomically'
);

reset role;
set local request.jwt.claims =
  '{"sub":"62626262-6262-4626-8626-626262626262","role":"authenticated"}';
set local role authenticated;
select is(
  (select count(*)::integer
   from public.account_reconciliation_entry_feed
   where transaction_id = current_setting('moneyflow_test.workspace_transaction')::uuid),
  0,
  'security-invoker feed hides another tenant account legs'
);

select * from finish();
rollback;
