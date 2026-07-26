begin;
select plan(26);

-- Two real auth identities exercise the signup triggers, RLS policies, views,
-- SECURITY DEFINER finance RPCs, and the server-only deletion primitive.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  'authenticated', 'authenticated', 'tenant-a@example.invalid',
  crypt('discarded-test-password-a', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Tenant A"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'authenticated', 'authenticated', 'tenant-b@example.invalid',
  crypt('discarded-test-password-b', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Tenant B"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer from public.accounts
   where user_id = '11111111-1111-4111-8111-111111111111'),
  1,
  'tenant A receives one default account'
);

select is(
  (select count(*)::integer from public.accounts
   where user_id = '22222222-2222-4222-8222-222222222222'),
  1,
  'tenant B receives one default account'
);

set local request.jwt.claims =
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.tenant_a_account',
  (select id::text from public.accounts order by created_at, id limit 1),
  true
);

select set_config(
  'moneyflow_test.tenant_a_category',
  (select id::text from public.categories
   where kind = 'expense'
   order by created_at, id
   limit 1),
  true
);

select set_config(
  'moneyflow_test.tenant_a_transaction',
  public.create_money_transaction(
    current_setting('moneyflow_test.tenant_a_account')::uuid,
    current_setting('moneyflow_test.tenant_a_category')::uuid,
    'expense'::public.transaction_kind,
    125000::bigint,
    current_date,
    'Tenant isolation fixture',
    'aaaaaaaa-0000-4000-8000-000000000001'::uuid
  )::text,
  true
);

select public.upsert_monthly_budget(
  current_setting('moneyflow_test.tenant_a_category')::uuid,
  date_trunc('month', current_date)::date,
  500000::bigint
);

reset role;
set local request.jwt.claims =
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer from public.accounts
   where id = current_setting('moneyflow_test.tenant_a_account')::uuid),
  0,
  'tenant B cannot read tenant A account'
);

select is(
  (select count(*)::integer from public.categories
   where id = current_setting('moneyflow_test.tenant_a_category')::uuid),
  0,
  'tenant B cannot read tenant A category'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where id = current_setting('moneyflow_test.tenant_a_transaction')::uuid),
  0,
  'tenant B cannot read tenant A transaction'
);

select is(
  (select count(*)::integer from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.tenant_a_transaction')::uuid),
  0,
  'tenant B cannot read tenant A ledger entries'
);

select is(
  (select count(*)::integer from public.transaction_feed
   where id = current_setting('moneyflow_test.tenant_a_transaction')::uuid),
  0,
  'tenant B cannot read tenant A transaction feed row'
);

select is(
  (select count(*)::integer from public.account_balances
   where account_id = current_setting('moneyflow_test.tenant_a_account')::uuid),
  0,
  'tenant B cannot read tenant A account balance'
);

select is(
  (select count(*)::integer from public.monthly_budgets
   where category_id = current_setting('moneyflow_test.tenant_a_category')::uuid),
  0,
  'tenant B cannot read tenant A monthly budget'
);

select is(
  (select count(*)::integer from public.budget_progress
   where category_id = current_setting('moneyflow_test.tenant_a_category')::uuid),
  0,
  'tenant B cannot read tenant A budget progress'
);

select is(
  public.soft_delete_money_transaction(
    current_setting('moneyflow_test.tenant_a_transaction')::uuid
  ),
  false,
  'tenant B cannot soft-delete tenant A transaction'
);

select throws_ok(
  $$
    select public.create_money_transaction(
      current_setting('moneyflow_test.tenant_a_account')::uuid,
      current_setting('moneyflow_test.tenant_a_category')::uuid,
      'expense'::public.transaction_kind,
      1000::bigint,
      current_date,
      'Cross-tenant attempt',
      'bbbbbbbb-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'P0001',
  'account_not_found',
  'tenant B cannot create a transaction against tenant A account'
);

select throws_ok(
  $$
    select public.upsert_monthly_budget(
      current_setting('moneyflow_test.tenant_a_category')::uuid,
      date_trunc('month', current_date)::date,
      900000::bigint
    )
  $$,
  'P0001',
  'category_not_found',
  'tenant B cannot change tenant A budget'
);

select throws_ok(
  $$
    select public.create_account_transfer(
      (select id from public.accounts order by created_at, id limit 1),
      current_setting('moneyflow_test.tenant_a_account')::uuid,
      1000::bigint,
      current_date,
      'Cross-tenant transfer attempt',
      'bbbbbbbb-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'P0001',
  'account_not_found',
  'tenant B cannot transfer money into tenant A account'
);

reset role;

select is(
  (select count(*)::integer from public.financial_transactions
   where id = current_setting('moneyflow_test.tenant_a_transaction')::uuid
     and user_id = '11111111-1111-4111-8111-111111111111'
     and deleted_at is null),
  1,
  'tenant B mutation attempts leave tenant A transaction active'
);

select is(
  (select limit_minor from public.monthly_budgets
   where user_id = '11111111-1111-4111-8111-111111111111'
     and category_id = current_setting('moneyflow_test.tenant_a_category')::uuid
     and month_start = date_trunc('month', current_date)::date),
  500000::bigint,
  'tenant B mutation attempts leave tenant A budget unchanged'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.purge_user_tenant_data(uuid)',
    'EXECUTE'
  ),
  'service_role can execute the tenant purge function'
);

select is(
  has_function_privilege(
    'anon',
    'public.purge_user_tenant_data(uuid)',
    'EXECUTE'
  ),
  false,
  'anon cannot execute the tenant purge function'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.purge_user_tenant_data(uuid)',
    'EXECUTE'
  ),
  false,
  'authenticated users cannot execute the tenant purge function'
);

set local role service_role;
select set_config(
  'moneyflow_test.purged_rows',
  public.purge_user_tenant_data(
    '11111111-1111-4111-8111-111111111111'::uuid
  )::text,
  true
);
reset role;

select ok(
  current_setting('moneyflow_test.purged_rows')::bigint > 0,
  'service_role atomically purges tenant A data'
);

select is(
  (
    (select count(*) from public.profiles
     where id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.accounts
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.categories
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.financial_transactions
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.transaction_entries
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.monthly_budgets
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.recurring_commitments
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.commitment_occurrences
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.recurring_income_templates
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.income_template_occurrences
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.savings_goals
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.savings_goal_allocations
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.import_batches
       where user_id = '11111111-1111-4111-8111-111111111111')
    + (select count(*) from public.inbox_candidates
       where user_id = '11111111-1111-4111-8111-111111111111')
  )::integer,
  0,
  'atomic purge leaves no tenant A row in any persisted tenant table'
);

select ok(
  (select count(*) from public.accounts
   where user_id = '22222222-2222-4222-8222-222222222222') > 0,
  'purging tenant A preserves tenant B accounts'
);

select ok(
  (select count(*) from public.categories
   where user_id = '22222222-2222-4222-8222-222222222222') > 0,
  'purging tenant A preserves tenant B categories'
);

select is(
  (select count(*)::integer from auth.users
   where id = '11111111-1111-4111-8111-111111111111'),
  1,
  'tenant purge does not delete the Auth identity itself'
);

set local role service_role;
select set_config(
  'moneyflow_test.purge_retry_rows',
  public.purge_user_tenant_data(
    '11111111-1111-4111-8111-111111111111'::uuid
  )::text,
  true
);
reset role;

select is(
  current_setting('moneyflow_test.purge_retry_rows')::bigint,
  0::bigint,
  'tenant purge is idempotent after all tenant rows are gone'
);

select is(
  (select count(*)::integer from public.profiles
   where id = '22222222-2222-4222-8222-222222222222'),
  1,
  'tenant B profile remains after tenant A purge retries'
);

select * from finish();
rollback;
