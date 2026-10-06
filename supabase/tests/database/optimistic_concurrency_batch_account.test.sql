-- Optimistic concurrency on update_financial_account:
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
  '99999999-9999-4999-8999-999999999990'::uuid,
  'authenticated', 'authenticated', 'optimistic-concurrency-account@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Optimistic Concurrency Account"}'::jsonb,
  now(), now(), '', '', false, false
);

-- Insert as the privileged test role: `authenticated` has no INSERT grant on
-- accounts (user rows arrive via the security-definer handle_new_user
-- trigger), so this must run before `set local role authenticated`.
insert into public.accounts (user_id, name, kind, initial_balance_minor)
values ('99999999-9999-4999-8999-999999999990'::uuid, 'OC account', 'cash', 1000000);

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999990","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.oca_account',
  (select id::text
   from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999990'::uuid
     and name = 'OC account'),
  true
);
select set_config(
  'moneyflow_test.oca_updated_at',
  (select updated_at::text
   from public.accounts
   where id = current_setting('moneyflow_test.oca_account')::uuid),
  true
);

-- 1: a mismatched precondition fails closed before touching the row.
select throws_ok(
  format(
    'select public.update_financial_account(%L::uuid, ''stale name'', ''cash''::public.account_kind, 1000000, null, null, ''2000-01-01T00:00:00Z''::timestamptz)',
    current_setting('moneyflow_test.oca_account')
  ),
  'stale_write',
  'a stale expected_updated_at is rejected'
);

-- 2: the rejected write must not have landed.
select is(
  (select name
   from public.accounts
   where id = current_setting('moneyflow_test.oca_account')::uuid),
  'OC account',
  'stale write left the account row untouched'
);

-- 3: the matching precondition succeeds.
select is(
  public.update_financial_account(
    current_setting('moneyflow_test.oca_account')::uuid,
    'Fresh account',
    'cash'::public.account_kind,
    2000000,
    null,
    null,
    current_setting('moneyflow_test.oca_updated_at')::timestamptz
  ),
  true,
  'a matching expected_updated_at updates normally'
);

-- 4: the matching write landed.
select is(
  (select name
   from public.accounts
   where id = current_setting('moneyflow_test.oca_account')::uuid),
  'Fresh account',
  'the matching write updated the account row'
);

-- 5: null precondition keeps the legacy last-write-wins path.
select is(
  public.update_financial_account(
    current_setting('moneyflow_test.oca_account')::uuid,
    'No precondition',
    'cash'::public.account_kind,
    3000000,
    null,
    null
  ),
  true,
  'omitting expected_updated_at preserves the legacy write path'
);

-- 6: a missing row still returns false (not-found behavior preserved).
select is(
  public.update_financial_account(
    gen_random_uuid(),
    'Ghost',
    'cash'::public.account_kind,
    1000,
    null,
    null
  ),
  false,
  'a missing account still returns false'
);

select * from finish();
rollback;
