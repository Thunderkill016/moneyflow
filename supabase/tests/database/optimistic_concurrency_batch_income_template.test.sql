-- Optimistic concurrency on upsert_recurring_income_template:
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
  '99999999-9999-4999-8999-999999999994'::uuid,
  'authenticated', 'authenticated', 'optimistic-concurrency-income@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Optimistic Concurrency Income Template"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.accounts (user_id, name, kind, initial_balance_minor)
values ('99999999-9999-4999-8999-999999999994'::uuid, 'OC account', 'cash', 1000000);
insert into public.categories (user_id, name, kind)
values ('99999999-9999-4999-8999-999999999994'::uuid, 'OC salary', 'income');

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999994","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.oci_account',
  (select id::text
   from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999994'::uuid and name = 'OC account'),
  true
);
select set_config(
  'moneyflow_test.oci_category',
  (select id::text
   from public.categories
   where user_id = '99999999-9999-4999-8999-999999999994'::uuid and name = 'Lương' and kind = 'income'),
  true
);
-- Seed the template via the legacy path, then capture its version.
select set_config(
  'moneyflow_test.oci_template',
  public.upsert_recurring_income_template(
    null,
    'Base template',
    20000000,
    5,
    current_setting('moneyflow_test.oci_account')::uuid,
    current_setting('moneyflow_test.oci_category')::uuid
  )::text,
  true
);
select set_config(
  'moneyflow_test.oci_updated_at',
  (select updated_at::text
   from public.recurring_income_templates
   where id = current_setting('moneyflow_test.oci_template')::uuid),
  true
);

-- 1: a mismatched precondition fails closed before touching the row.
select throws_ok(
  format(
    'select public.upsert_recurring_income_template(%L::uuid, ''stale name'', 20000000, 5, %L::uuid, %L::uuid, ''2000-01-01T00:00:00Z''::timestamptz)',
    current_setting('moneyflow_test.oci_template'),
    current_setting('moneyflow_test.oci_account'),
    current_setting('moneyflow_test.oci_category')
  ),
  'stale_write',
  'a stale expected_updated_at is rejected'
);

-- 2: the rejected write must not have landed.
select is(
  (select name
   from public.recurring_income_templates
   where id = current_setting('moneyflow_test.oci_template')::uuid),
  'Base template',
  'stale write left the template row untouched'
);

-- 3: the matching precondition succeeds.
select is(
  public.upsert_recurring_income_template(
    current_setting('moneyflow_test.oci_template')::uuid,
    'Fresh template',
    22000000,
    10,
    current_setting('moneyflow_test.oci_account')::uuid,
    current_setting('moneyflow_test.oci_category')::uuid,
    current_setting('moneyflow_test.oci_updated_at')::timestamptz
  ),
  current_setting('moneyflow_test.oci_template')::uuid,
  'a matching expected_updated_at updates normally'
);

-- 4: the matching write landed.
select is(
  (select name
   from public.recurring_income_templates
   where id = current_setting('moneyflow_test.oci_template')::uuid),
  'Fresh template',
  'the matching write updated the template row'
);

-- 5: null precondition keeps the legacy last-write-wins path.
select is(
  public.upsert_recurring_income_template(
    current_setting('moneyflow_test.oci_template')::uuid,
    'No precondition',
    22000000,
    10,
    current_setting('moneyflow_test.oci_account')::uuid,
    current_setting('moneyflow_test.oci_category')::uuid
  ),
  current_setting('moneyflow_test.oci_template')::uuid,
  'omitting expected_updated_at preserves the legacy write path'
);

-- 6: an unknown id still raises the original not-found error.
select throws_ok(
  format(
    'select public.upsert_recurring_income_template(%L::uuid, ''Ghost'', 20000000, 5, %L::uuid, %L::uuid)',
    gen_random_uuid(),
    current_setting('moneyflow_test.oci_account'),
    current_setting('moneyflow_test.oci_category')
  ),
  'income_template_not_found',
  'an unknown template id still raises income_template_not_found'
);

select * from finish();
rollback;
