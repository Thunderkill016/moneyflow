-- Optimistic concurrency on update_money_transaction:
-- supplied+stale expected_updated_at must fail closed, the real value must
-- pass, and null keeps legacy last-write-wins behavior.

begin;
select plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '99999999-9999-4999-8999-999999999998'::uuid,
  'authenticated', 'authenticated', 'optimistic-concurrency@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Optimistic Concurrency"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999998","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.oc_account',
  (select id::text
   from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999998'
   order by created_at, id
   limit 1),
  true
);
select set_config(
  'moneyflow_test.oc_category',
  (select id::text
   from public.categories
   where user_id = '99999999-9999-4999-8999-999999999998'
     and kind = 'expense'
   order by created_at, id
   limit 1),
  true
);
select set_config(
  'moneyflow_test.oc_transaction',
  public.create_money_transaction(
    current_setting('moneyflow_test.oc_account')::uuid,
    current_setting('moneyflow_test.oc_category')::uuid,
    'expense'::public.transaction_kind,
    50000,
    '2026-09-23'::date,
    'Base row',
    gen_random_uuid(),
    ''
  )::text,
  true
);
select set_config(
  'moneyflow_test.oc_updated_at',
  (select updated_at::text
   from public.financial_transactions
   where id = current_setting('moneyflow_test.oc_transaction')::uuid),
  true
);

-- 1: a mismatched precondition fails closed before touching the row.
select throws_ok(
  format(
    'select public.update_money_transaction(%L::uuid, %L::uuid, %L::uuid, ''expense'', 60000, ''2026-09-23''::date, ''stale edit'', '''', ''2000-01-01T00:00:00Z''::timestamptz)',
    current_setting('moneyflow_test.oc_transaction'),
    current_setting('moneyflow_test.oc_account'),
    current_setting('moneyflow_test.oc_category')
  ),
  'stale_write',
  'a stale expected_updated_at is rejected'
);

-- 2: the rejected write must not have landed.
select is(
  (select note
   from public.financial_transactions
   where id = current_setting('moneyflow_test.oc_transaction')::uuid),
  'Base row',
  'stale write left the row untouched'
);

-- 3: the matching precondition succeeds.
select is(
  public.update_money_transaction(
    current_setting('moneyflow_test.oc_transaction')::uuid,
    current_setting('moneyflow_test.oc_account')::uuid,
    current_setting('moneyflow_test.oc_category')::uuid,
    'expense'::public.transaction_kind,
    60000,
    '2026-09-23'::date,
    'Fresh edit',
    '',
    current_setting('moneyflow_test.oc_updated_at')::timestamptz
  ),
  current_setting('moneyflow_test.oc_transaction')::uuid,
  'a matching expected_updated_at updates normally'
);

-- 4: null precondition keeps the legacy last-write-wins path.
select is(
  public.update_money_transaction(
    current_setting('moneyflow_test.oc_transaction')::uuid,
    current_setting('moneyflow_test.oc_account')::uuid,
    current_setting('moneyflow_test.oc_category')::uuid,
    'expense'::public.transaction_kind,
    70000,
    '2026-09-23'::date,
    'No precondition',
    ''
  ),
  current_setting('moneyflow_test.oc_transaction')::uuid,
  'omitting expected_updated_at preserves the legacy write path'
);

-- 5: the feed exposes the version the client read.
select ok(
  (select updated_at is not null
   from public.transaction_feed
   where id = current_setting('moneyflow_test.oc_transaction')::uuid),
  'transaction_feed exposes updated_at'
);

select * from finish();
rollback;
