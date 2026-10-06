-- Optimistic concurrency on upsert_savings_goal:
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
  '99999999-9999-4999-8999-999999999993'::uuid,
  'authenticated', 'authenticated', 'optimistic-concurrency-goal@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Optimistic Concurrency Goal"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999993","role":"authenticated"}';
set local role authenticated;

-- Seed the goal via the legacy path, then capture its version.
select set_config(
  'moneyflow_test.ocg_goal',
  public.upsert_savings_goal(
    null,
    'Base goal',
    10000000,
    '2027-01-01'::date
  )::text,
  true
);
select set_config(
  'moneyflow_test.ocg_updated_at',
  (select updated_at::text
   from public.savings_goals
   where id = current_setting('moneyflow_test.ocg_goal')::uuid),
  true
);

-- 1: a mismatched precondition fails closed before touching the row.
select throws_ok(
  format(
    'select public.upsert_savings_goal(%L::uuid, ''stale name'', 10000000, ''2027-01-01''::date, ''2000-01-01T00:00:00Z''::timestamptz)',
    current_setting('moneyflow_test.ocg_goal')
  ),
  'stale_write',
  'a stale expected_updated_at is rejected'
);

-- 2: the rejected write must not have landed.
select is(
  (select name
   from public.savings_goals
   where id = current_setting('moneyflow_test.ocg_goal')::uuid),
  'Base goal',
  'stale write left the goal row untouched'
);

-- 3: the matching precondition succeeds.
select is(
  public.upsert_savings_goal(
    current_setting('moneyflow_test.ocg_goal')::uuid,
    'Fresh goal',
    12000000,
    '2027-06-01'::date,
    current_setting('moneyflow_test.ocg_updated_at')::timestamptz
  ),
  current_setting('moneyflow_test.ocg_goal')::uuid,
  'a matching expected_updated_at updates normally'
);

-- 4: the matching write landed.
select is(
  (select name
   from public.savings_goals
   where id = current_setting('moneyflow_test.ocg_goal')::uuid),
  'Fresh goal',
  'the matching write updated the goal row'
);

-- 5: null precondition keeps the legacy last-write-wins path.
select is(
  public.upsert_savings_goal(
    current_setting('moneyflow_test.ocg_goal')::uuid,
    'No precondition',
    12000000,
    '2027-06-01'::date
  ),
  current_setting('moneyflow_test.ocg_goal')::uuid,
  'omitting expected_updated_at preserves the legacy write path'
);

-- 6: an unknown id still raises the original not-found error.
select throws_ok(
  format(
    'select public.upsert_savings_goal(%L::uuid, ''Ghost'', 10000000, ''2027-01-01''::date)',
    gen_random_uuid()
  ),
  'goal_not_found_or_target_below_allocated',
  'an unknown goal id still raises goal_not_found_or_target_below_allocated'
);

select * from finish();
rollback;
