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
  '66666666-6666-4666-8666-666666666666'::uuid,
  'authenticated', 'authenticated', 'reconciliation-correction@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation Correction"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer
   from public.accounts
   where user_id = '66666666-6666-4666-8666-666666666666'),
  1,
  'correction fixture receives one default account'
);

set local request.jwt.claims =
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.correction_account',
  (select id::text
   from public.accounts
   where user_id = '66666666-6666-4666-8666-666666666666'
   order by created_at, id
   limit 1),
  true
);

select set_config(
  'moneyflow_test.correction_category',
  (select id::text
   from public.categories
   where user_id = '66666666-6666-4666-8666-666666666666'
     and kind = 'income'
   order by created_at, id
   limit 1),
  true
);

select lives_ok(
  format(
    $sql$
      select public.create_money_transaction(
        %L::uuid,
        %L::uuid,
        'income'::public.transaction_kind,
        100000,
        '2026-07-10'::date,
        'Correction fixture',
        '60000000-0000-4000-8000-000000000001'::uuid
      )
    $sql$,
    current_setting('moneyflow_test.correction_account'),
    current_setting('moneyflow_test.correction_category')
  ),
  'correction transaction can be created'
);

select set_config(
  'moneyflow_test.correction_transaction',
  (select id::text
   from public.financial_transactions
   where user_id = '66666666-6666-4666-8666-666666666666'
     and idempotency_key = '60000000-0000-4000-8000-000000000001'::uuid),
  true
);

select set_config(
  'moneyflow_test.correction_entry',
  (select id::text
   from public.transaction_entries
   where transaction_id = current_setting(
     'moneyflow_test.correction_transaction'
   )::uuid),
  true
);

select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.correction_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'fixture can be cleared before an amount correction'
);

select is(
  public.update_money_transaction(
    current_setting('moneyflow_test.correction_transaction')::uuid,
    current_setting('moneyflow_test.correction_account')::uuid,
    current_setting('moneyflow_test.correction_category')::uuid,
    'income'::public.transaction_kind,
    90000,
    '2026-07-10'::date,
    'Corrected amount'
  ),
  current_setting('moneyflow_test.correction_transaction')::uuid,
  'amount correction succeeds while the entry is only cleared'
);

select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting('moneyflow_test.correction_entry')::uuid),
  'pending'::public.entry_reconciliation_state,
  'amount correction resets cleared state to pending'
);

select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.correction_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'fixture can be cleared again before a date correction'
);

select is(
  public.update_money_transaction(
    current_setting('moneyflow_test.correction_transaction')::uuid,
    current_setting('moneyflow_test.correction_account')::uuid,
    current_setting('moneyflow_test.correction_category')::uuid,
    'income'::public.transaction_kind,
    90000,
    '2026-07-11'::date,
    'Corrected date'
  ),
  current_setting('moneyflow_test.correction_transaction')::uuid,
  'date correction succeeds while the entry is only cleared'
);

select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting('moneyflow_test.correction_entry')::uuid),
  'pending'::public.entry_reconciliation_state,
  'date correction resets cleared state to pending'
);

select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.correction_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'fixture can be cleared before deletion'
);

select is(
  public.soft_delete_money_transaction(
    current_setting('moneyflow_test.correction_transaction')::uuid
  ),
  true,
  'a merely cleared transaction can be soft-deleted'
);

select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting('moneyflow_test.correction_entry')::uuid),
  'pending'::public.entry_reconciliation_state,
  'soft delete resets cleared state to pending'
);

select is(
  public.restore_money_transaction(
    current_setting('moneyflow_test.correction_transaction')::uuid
  ),
  true,
  'the soft-deleted correction fixture can be restored'
);

select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting('moneyflow_test.correction_entry')::uuid),
  'pending'::public.entry_reconciliation_state,
  'restore does not silently re-clear a corrected transaction'
);

select * from finish();
rollback;
