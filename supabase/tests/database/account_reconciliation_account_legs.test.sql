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
  '99999999-9999-4999-8999-999999999999'::uuid,
  'authenticated', 'authenticated', 'reconciliation-legs@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation Legs"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer
   from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999999'),
  1,
  'account-leg fixture receives one default account'
);

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.legs_source_account',
  (select id::text
   from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999999'
   order by created_at, id
   limit 1),
  true
);

select lives_ok(
  $$
    select public.create_financial_account(
      'Reconciliation destination',
      'savings'::public.account_kind,
      0,
      'VND'
    )
  $$,
  'destination account can be created'
);
select set_config(
  'moneyflow_test.legs_destination_account',
  (select id::text
   from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999999'
     and name = 'Reconciliation destination'),
  true
);
select set_config(
  'moneyflow_test.legs_expense_category_one',
  (select id::text
   from public.categories
   where user_id = '99999999-9999-4999-8999-999999999999'
     and kind = 'expense'
   order by created_at, id
   limit 1),
  true
);
select set_config(
  'moneyflow_test.legs_expense_category_two',
  (select id::text
   from public.categories
   where user_id = '99999999-9999-4999-8999-999999999999'
     and kind = 'expense'
     and id <> current_setting('moneyflow_test.legs_expense_category_one')::uuid
   order by created_at, id
   limit 1),
  true
);

select lives_ok(
  format(
    $sql$
      select public.create_account_transfer(
        %L::uuid,
        %L::uuid,
        10000,
        '2026-07-20'::date,
        'Independent transfer legs',
        '90000000-0000-4000-8000-000000000001'::uuid
      )
    $sql$,
    current_setting('moneyflow_test.legs_source_account'),
    current_setting('moneyflow_test.legs_destination_account')
  ),
  'transfer fixture can be created'
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
        '2026-07-21'::date,
        'Atomic split account leg',
        '90000000-0000-4000-8000-000000000002'::uuid
      )
    $sql$,
    current_setting('moneyflow_test.legs_source_account'),
    current_setting('moneyflow_test.legs_expense_category_one'),
    current_setting('moneyflow_test.legs_expense_category_two')
  ),
  'split fixture can be created'
);

select set_config(
  'moneyflow_test.legs_transfer_transaction',
  (select id::text
   from public.financial_transactions
   where user_id = '99999999-9999-4999-8999-999999999999'
     and idempotency_key = '90000000-0000-4000-8000-000000000001'::uuid),
  true
);
select set_config(
  'moneyflow_test.legs_split_transaction',
  (select id::text
   from public.financial_transactions
   where user_id = '99999999-9999-4999-8999-999999999999'
     and idempotency_key = '90000000-0000-4000-8000-000000000002'::uuid),
  true
);
select set_config(
  'moneyflow_test.legs_transfer_source_entry',
  (select id::text
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.legs_transfer_transaction')::uuid
     and account_id = current_setting('moneyflow_test.legs_source_account')::uuid),
  true
);
select set_config(
  'moneyflow_test.legs_transfer_destination_entry',
  (select id::text
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.legs_transfer_transaction')::uuid
     and account_id = current_setting('moneyflow_test.legs_destination_account')::uuid),
  true
);
select set_config(
  'moneyflow_test.legs_split_entry',
  (select id::text
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.legs_split_transaction')::uuid
   order by id
   limit 1),
  true
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.legs_transfer_transaction')::uuid),
  2,
  'transfer has exactly two account legs'
);
select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.legs_transfer_source_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'source transfer leg can be cleared'
);
select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting('moneyflow_test.legs_transfer_destination_entry')::uuid),
  'pending'::public.entry_reconciliation_state,
  'destination transfer leg remains pending'
);
select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.legs_split_transaction')::uuid
     and reconciliation_state = 'pending'),
  2,
  'both split allocations begin pending'
);
select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.legs_split_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'clearing one split allocation clears its logical account leg'
);
select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.legs_split_transaction')::uuid
     and reconciliation_state = 'cleared'),
  2,
  'all split allocations clear together'
);
select is(
  (select count(distinct cleared_at)::integer
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.legs_split_transaction')::uuid),
  1,
  'split account leg shares one cleared timestamp'
);

select set_config(
  'moneyflow_test.legs_source_session',
  public.start_account_reconciliation(
    current_setting('moneyflow_test.legs_source_account')::uuid,
    '2026-07-31'::date,
    -30000
  )::text,
  true
);
select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting('moneyflow_test.legs_source_session')::uuid),
  -30000::bigint,
  'source statement includes transfer source and every split allocation'
);
select is(
  (select cleared_account_leg_count
   from public.account_reconciliation_summaries
   where id = current_setting('moneyflow_test.legs_source_session')::uuid),
  2::bigint,
  'split allocations count as one account leg beside the transfer leg'
);
select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.legs_source_session')::uuid
  ),
  true,
  'source account statement completes'
);
select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting('moneyflow_test.legs_transfer_source_entry')::uuid),
  'reconciled'::public.entry_reconciliation_state,
  'source transfer leg becomes reconciled'
);
select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting('moneyflow_test.legs_transfer_destination_entry')::uuid),
  'pending'::public.entry_reconciliation_state,
  'destination transfer leg remains independent after source completion'
);
select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.legs_split_transaction')::uuid
     and reconciliation_state = 'reconciled'),
  2,
  'all split allocations reconcile together'
);

select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.legs_transfer_destination_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'destination transfer leg can clear independently later'
);
select set_config(
  'moneyflow_test.legs_destination_session',
  public.start_account_reconciliation(
    current_setting('moneyflow_test.legs_destination_account')::uuid,
    '2026-07-31'::date,
    10000
  )::text,
  true
);
select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting('moneyflow_test.legs_destination_session')::uuid),
  10000::bigint,
  'destination statement sees only its positive transfer leg'
);
select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.legs_destination_session')::uuid
  ),
  true,
  'destination account statement completes independently'
);
select isnt(
  (select reconciliation_id
   from public.transaction_entries
   where id = current_setting('moneyflow_test.legs_transfer_source_entry')::uuid),
  (select reconciliation_id
   from public.transaction_entries
   where id = current_setting('moneyflow_test.legs_transfer_destination_entry')::uuid),
  'transfer source and destination legs belong to different statement sessions'
);

select * from finish();
rollback;
