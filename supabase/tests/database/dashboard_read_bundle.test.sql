begin;
select plan(12);

select has_function(
  'public',
  'get_dashboard_bundle',
  array['date', 'date', 'integer'],
  'dashboard read bundle RPC exists'
);

select ok(
  not (
    select function_record.prosecdef
    from pg_proc as function_record
    join pg_namespace as namespace
      on namespace.oid = function_record.pronamespace
    where namespace.nspname = 'public'
      and function_record.proname = 'get_dashboard_bundle'
      and pg_get_function_identity_arguments(function_record.oid) =
        'p_today date, p_transaction_start date, p_recent_limit integer'
  ),
  'dashboard bundle remains security invoker'
);

select ok(
  (
    select function_record.proconfig @> array['search_path=""']::text[]
    from pg_proc as function_record
    join pg_namespace as namespace
      on namespace.oid = function_record.pronamespace
    where namespace.nspname = 'public'
      and function_record.proname = 'get_dashboard_bundle'
      and pg_get_function_identity_arguments(function_record.oid) =
        'p_today date, p_transaction_start date, p_recent_limit integer'
  ),
  'dashboard bundle pins an empty search path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_dashboard_bundle(date,date,integer)',
    'EXECUTE'
  ),
  'anon cannot execute dashboard bundle'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_dashboard_bundle(date,date,integer)',
    'EXECUTE'
  ),
  'authenticated can execute dashboard bundle'
);

create temporary table dashboard_test_context (
  key text primary key,
  id uuid not null
) on commit drop;
create temporary table dashboard_test_result (
  bundle jsonb not null
) on commit drop;

grant select, insert on dashboard_test_context to authenticated;
grant select, insert on dashboard_test_result to authenticated;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000da01',
  'authenticated',
  'authenticated',
  'dashboard-a@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Dashboard A"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000db01',
  'authenticated',
  'authenticated',
  'dashboard-b@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Dashboard B"}'::jsonb
);

insert into dashboard_test_context values
  ('a_account', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000da01'
    order by created_at limit 1
  )),
  ('a_expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000da01'
      and kind = 'expense'
    order by created_at limit 1
  )),
  ('b_account', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000db01'
    order by created_at limit 1
  )),
  ('b_expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000db01'
      and kind = 'expense'
    order by created_at limit 1
  ));

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-00000000da01',
  true
);

insert into dashboard_test_context values (
  'a_named_account',
  public.create_financial_account('Only A account', 'bank', 0, 'VND')
);
insert into dashboard_test_context values (
  'a_transaction',
  public.create_money_transaction(
    (select id from dashboard_test_context where key = 'a_account'),
    (select id from dashboard_test_context where key = 'a_expense_category'),
    'expense',
    1000,
    current_date,
    'Only A transaction',
    '00000000-0000-4000-8000-00000000da11'
  )
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-00000000db01',
  true
);

insert into dashboard_test_context values (
  'b_named_account',
  public.create_financial_account('Only B account', 'bank', 0, 'VND')
);
insert into dashboard_test_context values (
  'b_transaction',
  public.create_money_transaction(
    (select id from dashboard_test_context where key = 'b_account'),
    (select id from dashboard_test_context where key = 'b_expense_category'),
    'expense',
    2000,
    current_date,
    'Only B transaction',
    '00000000-0000-4000-8000-00000000db11'
  )
);

select throws_ok(
  $$select public.get_dashboard_bundle(current_date, current_date - 46, 5)$$,
  'P0001',
  'invalid_dashboard_transaction_range',
  'dashboard bundle rejects an unbounded history range'
);

select throws_ok(
  $$select public.get_dashboard_bundle(current_date, current_date - 7, 21)$$,
  'P0001',
  'invalid_dashboard_recent_limit',
  'dashboard bundle rejects an excessive recent-row limit'
);

insert into dashboard_test_result
select public.get_dashboard_bundle(current_date, current_date - 7, 5);

select ok(
  (select bundle from dashboard_test_result) ?& array[
    'transactions',
    'accounts',
    'categories',
    'balances',
    'budgets',
    'commitments',
    'income_templates',
    'goals',
    'pending_inbox_count'
  ],
  'dashboard bundle returns every required section'
);

select ok(
  not exists (
    select 1
    from jsonb_array_elements(
      (select bundle -> 'transactions' from dashboard_test_result)
    ) as transaction_row
    where transaction_row ->> 'note' = 'Only A transaction'
  ),
  'user B bundle excludes user A transactions'
);

select ok(
  exists (
    select 1
    from jsonb_array_elements(
      (select bundle -> 'transactions' from dashboard_test_result)
    ) as transaction_row
    where transaction_row ->> 'note' = 'Only B transaction'
  ),
  'user B bundle includes user B transactions'
);

select ok(
  not exists (
    select 1
    from jsonb_array_elements(
      (select bundle -> 'accounts' from dashboard_test_result)
    ) as account_row
    where account_row ->> 'name' = 'Only A account'
  ),
  'user B bundle excludes user A accounts'
);

select ok(
  exists (
    select 1
    from jsonb_array_elements(
      (select bundle -> 'accounts' from dashboard_test_result)
    ) as account_row
    where account_row ->> 'name' = 'Only B account'
  ),
  'user B bundle includes user B accounts'
);

select * from finish();
rollback;
