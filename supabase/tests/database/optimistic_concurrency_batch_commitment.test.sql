-- Optimistic concurrency on upsert_recurring_commitment:
-- supplied+stale expected_updated_at must fail closed on the update branch,
-- the real value must pass, and null keeps legacy last-write-wins behavior.

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
  '99999999-9999-4999-8999-999999999992'::uuid,
  'authenticated', 'authenticated', 'optimistic-concurrency-commitment@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Optimistic Concurrency Commitment"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.accounts (user_id, name, kind, initial_balance_minor)
values ('99999999-9999-4999-8999-999999999992'::uuid, 'OC account', 'cash', 1000000);
insert into public.categories (user_id, name, kind)
values ('99999999-9999-4999-8999-999999999992'::uuid, 'OC rent', 'expense');

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999992","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.occ_account',
  (select id::text
   from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999992'::uuid and name = 'OC account'),
  true
);
select set_config(
  'moneyflow_test.occ_category',
  (select id::text
   from public.categories
   where user_id = '99999999-9999-4999-8999-999999999992'::uuid and name = 'Ăn uống' and kind = 'expense'),
  true
);
-- Seed the commitment via the legacy path, then capture its version.
select set_config(
  'moneyflow_test.occ_commitment',
  public.upsert_recurring_commitment(
    null,
    'Base commitment',
    1000000,
    15,
    current_setting('moneyflow_test.occ_account')::uuid,
    current_setting('moneyflow_test.occ_category')::uuid
  )::text,
  true
);
select set_config(
  'moneyflow_test.occ_updated_at',
  (select updated_at::text
   from public.recurring_commitments
   where id = current_setting('moneyflow_test.occ_commitment')::uuid),
  true
);

-- 1: a mismatched precondition fails closed before touching the row.
select throws_ok(
  format(
    'select public.upsert_recurring_commitment(%L::uuid, ''stale name'', 1000000, 15, %L::uuid, %L::uuid, ''2000-01-01T00:00:00Z''::timestamptz)',
    current_setting('moneyflow_test.occ_commitment'),
    current_setting('moneyflow_test.occ_account'),
    current_setting('moneyflow_test.occ_category')
  ),
  'stale_write',
  'a stale expected_updated_at is rejected'
);

-- 2: the rejected write must not have landed.
select is(
  (select name
   from public.recurring_commitments
   where id = current_setting('moneyflow_test.occ_commitment')::uuid),
  'Base commitment',
  'stale write left the commitment row untouched'
);

-- 3: the matching precondition succeeds.
select is(
  public.upsert_recurring_commitment(
    current_setting('moneyflow_test.occ_commitment')::uuid,
    'Fresh commitment',
    1200000,
    20,
    current_setting('moneyflow_test.occ_account')::uuid,
    current_setting('moneyflow_test.occ_category')::uuid,
    current_setting('moneyflow_test.occ_updated_at')::timestamptz
  ),
  current_setting('moneyflow_test.occ_commitment')::uuid,
  'a matching expected_updated_at updates normally'
);

-- 4: the matching write landed.
select is(
  (select name
   from public.recurring_commitments
   where id = current_setting('moneyflow_test.occ_commitment')::uuid),
  'Fresh commitment',
  'the matching write updated the commitment row'
);

-- 5: null precondition keeps the legacy last-write-wins path.
select is(
  public.upsert_recurring_commitment(
    current_setting('moneyflow_test.occ_commitment')::uuid,
    'No precondition',
    1200000,
    20,
    current_setting('moneyflow_test.occ_account')::uuid,
    current_setting('moneyflow_test.occ_category')::uuid
  ),
  current_setting('moneyflow_test.occ_commitment')::uuid,
  'omitting expected_updated_at preserves the legacy write path'
);

-- 6: an unknown id still raises the original not-found error.
select throws_ok(
  format(
    'select public.upsert_recurring_commitment(%L::uuid, ''Ghost'', 1000000, 15, %L::uuid, %L::uuid)',
    gen_random_uuid(),
    current_setting('moneyflow_test.occ_account'),
    current_setting('moneyflow_test.occ_category')
  ),
  'commitment_not_found',
  'an unknown commitment id still raises commitment_not_found'
);

select * from finish();
rollback;
