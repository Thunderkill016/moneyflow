-- Optimistic concurrency on upsert_monthly_budget:
-- supplied+stale expected_updated_at must fail closed on the update branch,
-- the real value must pass, null keeps legacy last-write-wins, and a pure
-- insert with a precondition proceeds (no row to be stale against).

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
  '99999999-9999-4999-8999-999999999991'::uuid,
  'authenticated', 'authenticated', 'optimistic-concurrency-budget@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Optimistic Concurrency Budget"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.categories (user_id, name, kind)
values
  ('99999999-9999-4999-8999-999999999991'::uuid, 'OC food', 'expense'),
  ('99999999-9999-4999-8999-999999999991'::uuid, 'OC transport', 'expense');

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999991","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.ocb_category',
  (select id::text
   from public.categories
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     and name = 'OC food'),
  true
);
select set_config(
  'moneyflow_test.ocb_category2',
  (select id::text
   from public.categories
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     and name = 'OC transport'),
  true
);
-- Seed the budget row via the legacy path, then capture its version.
select set_config(
  'moneyflow_test.ocb_budget',
  public.upsert_monthly_budget(
    current_setting('moneyflow_test.ocb_category')::uuid,
    '2026-10-01'::date,
    500000
  )::text,
  true
);
select set_config(
  'moneyflow_test.ocb_updated_at',
  (select updated_at::text
   from public.monthly_budgets
   where id = current_setting('moneyflow_test.ocb_budget')::uuid),
  true
);

-- 1: a mismatched precondition fails closed on the update branch.
select throws_ok(
  format(
    'select public.upsert_monthly_budget(%L::uuid, ''2026-10-01''::date, 600000, ''2000-01-01T00:00:00Z''::timestamptz)',
    current_setting('moneyflow_test.ocb_category')
  ),
  'stale_write',
  'a stale expected_updated_at is rejected'
);

-- 2: the rejected write must not have landed.
select is(
  (select limit_minor
   from public.monthly_budgets
   where id = current_setting('moneyflow_test.ocb_budget')::uuid),
  500000::bigint,
  'stale write left the budget row untouched'
);

-- 3: the matching precondition succeeds on the update branch.
select is(
  public.upsert_monthly_budget(
    current_setting('moneyflow_test.ocb_category')::uuid,
    '2026-10-01'::date,
    600000,
    current_setting('moneyflow_test.ocb_updated_at')::timestamptz
  ),
  current_setting('moneyflow_test.ocb_budget')::uuid,
  'a matching expected_updated_at updates normally'
);

-- 4: the matching write landed.
select is(
  (select limit_minor
   from public.monthly_budgets
   where id = current_setting('moneyflow_test.ocb_budget')::uuid),
  600000::bigint,
  'the matching write updated the budget limit'
);

-- 5: a precondition on the pure insert path proceeds — there is no existing
-- row to be stale against.
-- NOTE: the upsert and the verification must be separate statements. A
-- volatile function call inside the same SELECT shares the statement snapshot,
-- so the outer query cannot see the row the function just wrote.
select set_config(
  'moneyflow_test.ocb_budget2',
  public.upsert_monthly_budget(
    current_setting('moneyflow_test.ocb_category2')::uuid,
    '2026-10-01'::date,
    250000,
    '2000-01-01T00:00:00Z'::timestamptz
  )::text,
  true
);
select is(
  (select limit_minor
   from public.monthly_budgets
   where id = current_setting('moneyflow_test.ocb_budget2')::uuid),
  250000::bigint,
  'a precondition with no existing row inserts normally'
);

-- 6: null precondition keeps the legacy last-write-wins path.
-- (Same statement-snapshot note as test 5: upsert first, verify after.)
select set_config(
  'moneyflow_test.ocb_budget3',
  public.upsert_monthly_budget(
    current_setting('moneyflow_test.ocb_category')::uuid,
    '2026-10-01'::date,
    700000
  )::text,
  true
);
select is(
  (select limit_minor
   from public.monthly_budgets
   where id = current_setting('moneyflow_test.ocb_budget3')::uuid),
  700000::bigint,
  'omitting expected_updated_at preserves the legacy write path'
);

select * from finish();
rollback;
