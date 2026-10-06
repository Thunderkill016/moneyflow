-- Optimistic concurrency on update_account_transfer:
-- supplied+stale expected_updated_at must fail closed, the real value must
-- pass, and null keeps legacy last-write-wins behavior.

begin;
select plan(6);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '99999999-9999-4999-8999-999999999997'::uuid,
  'authenticated', 'authenticated', 'optimistic-concurrency-transfer@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Optimistic Concurrency Transfer"}'::jsonb,
  now(), now(), '', '', false, false
);

-- Insert as the privileged test role: `authenticated` has no INSERT grant on
-- accounts (user rows arrive via the security-definer handle_new_user
-- trigger), so this must run before `set local role authenticated`.
insert into public.accounts (user_id, name, kind, initial_balance_minor)
values
  ('99999999-9999-4999-8999-999999999997'::uuid, 'OC source', 'cash', 1000000),
  ('99999999-9999-4999-8999-999999999997'::uuid, 'OC destination', 'cash', 0);

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999997","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.oct_source',
  (select id::text
   from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999997'::uuid
     and name = 'OC source'),
  true
);
select set_config(
  'moneyflow_test.oct_destination',
  (select id::text
   from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999997'::uuid
     and name = 'OC destination'),
  true
);
select set_config(
  'moneyflow_test.oct_transaction',
  public.create_account_transfer(
    current_setting('moneyflow_test.oct_source')::uuid,
    current_setting('moneyflow_test.oct_destination')::uuid,
    50000,
    '2026-10-06'::date,
    'Base transfer',
    gen_random_uuid()
  )::text,
  true
);
select set_config(
  'moneyflow_test.oct_updated_at',
  (select updated_at::text
   from public.financial_transactions
   where id = current_setting('moneyflow_test.oct_transaction')::uuid),
  true
);

-- 1: a mismatched precondition fails closed before touching the row.
select throws_ok(
  format(
    'select public.update_account_transfer(%L::uuid, %L::uuid, %L::uuid, 60000, ''2026-10-06''::date, ''stale edit'', ''2000-01-01T00:00:00Z''::timestamptz)',
    current_setting('moneyflow_test.oct_transaction'),
    current_setting('moneyflow_test.oct_source'),
    current_setting('moneyflow_test.oct_destination')
  ),
  'stale_write',
  'a stale expected_updated_at is rejected'
);

-- 2: the rejected write must not have landed.
select is(
  (select note
   from public.financial_transactions
   where id = current_setting('moneyflow_test.oct_transaction')::uuid),
  'Base transfer',
  'stale write left the transfer row untouched'
);

-- 3: the entries stay balanced after the rejected write.
-- (sum() returns numeric; cast to bigint for pgTAP's is() overload.)
select is(
  (select sum(amount_minor)
   from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.oct_transaction')::uuid)::bigint,
  0::bigint,
  'stale write left the transfer entries balanced'
);

-- 4: the matching precondition succeeds.
select is(
  public.update_account_transfer(
    current_setting('moneyflow_test.oct_transaction')::uuid,
    current_setting('moneyflow_test.oct_source')::uuid,
    current_setting('moneyflow_test.oct_destination')::uuid,
    60000,
    '2026-10-06'::date,
    'Fresh transfer edit',
    current_setting('moneyflow_test.oct_updated_at')::timestamptz
  ),
  current_setting('moneyflow_test.oct_transaction')::uuid,
  'a matching expected_updated_at updates normally'
);

-- 5: the matching write landed with the balanced entries intact.
select is(
  (select note
   from public.financial_transactions
   where id = current_setting('moneyflow_test.oct_transaction')::uuid),
  'Fresh transfer edit',
  'the matching write updated the transfer row'
);

-- 6: null precondition keeps the legacy last-write-wins path.
select is(
  public.update_account_transfer(
    current_setting('moneyflow_test.oct_transaction')::uuid,
    current_setting('moneyflow_test.oct_source')::uuid,
    current_setting('moneyflow_test.oct_destination')::uuid,
    70000,
    '2026-10-06'::date,
    'No precondition'
  ),
  current_setting('moneyflow_test.oct_transaction')::uuid,
  'omitting expected_updated_at preserves the legacy write path'
);

select * from finish();
rollback;
