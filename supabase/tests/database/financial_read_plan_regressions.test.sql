begin;
select plan(10);

create or replace function pg_temp.explain_json(p_sql text)
returns jsonb
language plpgsql
as $$
declare
  v_plan jsonb;
begin
  execute 'explain (format json, costs false) ' || p_sql into v_plan;
  return v_plan;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '26820000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'plan-owner@example.invalid',
  crypt('discarded-plan-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Plan Owner"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims =
  '{"sub":"26820000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.financial_transactions (
  id,
  user_id,
  kind,
  note,
  occurred_on,
  idempotency_key,
  created_at,
  updated_at
)
select
  md5('plan-transaction-' || fixture)::uuid,
  '26820000-0000-4000-8000-000000000001'::uuid,
  'expense'::public.transaction_kind,
  'performance-plan-fixture',
  current_date - (fixture % 730)::integer,
  md5('plan-idempotency-' || fixture)::uuid,
  now() - make_interval(secs => fixture),
  now() - make_interval(secs => fixture)
from generate_series(1, 4000) fixture;

insert into public.transaction_entries (
  id,
  transaction_id,
  user_id,
  account_id,
  category_id,
  amount_minor
)
select
  md5('plan-entry-' || row_number() over (order by transaction_record.id))::uuid,
  transaction_record.id,
  transaction_record.user_id,
  (select id from public.accounts
   where user_id = transaction_record.user_id
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = transaction_record.user_id
     and kind = 'expense'
   order by created_at, id limit 1),
  -100::bigint
from public.financial_transactions transaction_record
where transaction_record.user_id =
  '26820000-0000-4000-8000-000000000001'::uuid
  and transaction_record.note = 'performance-plan-fixture';

set local role authenticated;
select public.upsert_monthly_budget(
  (select id from public.categories
   where user_id = '26820000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  month_value::date,
  100000::bigint
)
from generate_series(
  date '1980-01-01',
  date '2029-12-01',
  interval '1 month'
) month_value;
reset role;

analyze public.financial_transactions;
analyze public.transaction_entries;
analyze public.monthly_budgets;

select is(
  (select count(*)::integer
   from public.financial_transactions
   where user_id = '26820000-0000-4000-8000-000000000001'
     and note = 'performance-plan-fixture'),
  4000,
  'plan fixture contains a realistic multi-year transaction history'
);
select is(
  (select count(*)::integer
   from public.monthly_budgets
   where user_id = '26820000-0000-4000-8000-000000000001'),
  600,
  'plan fixture contains a long monthly budget history'
);

create temporary table captured_financial_plans (
  name text primary key,
  plan jsonb not null
) on commit drop;

insert into captured_financial_plans (name, plan)
values
(
  'dashboard_feed',
  pg_temp.explain_json(format(
    $query$
      select id
      from public.transaction_feed
      where user_id = %L::uuid
        and occurred_on >= current_date - 45
      order by occurred_on desc, created_at desc, id desc
      limit 20
    $query$,
    '26820000-0000-4000-8000-000000000001'
  ))
),
(
  'report_feed',
  pg_temp.explain_json(format(
    $query$
      select id
      from public.transaction_feed
      where user_id = %L::uuid
        and occurred_on between current_date - 90 and current_date
      order by occurred_on desc, created_at desc, id desc
    $query$,
    '26820000-0000-4000-8000-000000000001'
  ))
),
(
  'budget_month',
  pg_temp.explain_json(format(
    $query$
      select id
      from public.monthly_budgets
      where user_id = %L::uuid
        and month_start = date_trunc('month', current_date)::date
      order by category_id
    $query$,
    '26820000-0000-4000-8000-000000000001'
  ))
);

select ok(
  (select plan::text like '%transactions_user_date_idx%'
   from captured_financial_plans where name = 'dashboard_feed'),
  'bounded dashboard feed uses the tenant/date transaction index'
);
select ok(
  (select plan::text like '%transactions_user_date_idx%'
   from captured_financial_plans where name = 'report_feed'),
  'bounded report feed uses the tenant/date transaction index'
);
select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'monthly_budgets'
      and position('(user_id, month_start' in indexdef) > 0
  ),
  'monthly budgets have a tenant/month leading index'
);
select ok(
  (select plan::text not like '%"Node Type": "Seq Scan", "Relation Name": "monthly_budgets"%'
   from captured_financial_plans where name = 'budget_month'),
  'single-month budget read avoids a sequential scan of budget history'
);
select ok(
  (select plan::text like '%Index%'
   from captured_financial_plans where name = 'budget_month'),
  'single-month budget read is index-aware'
);

select ok(
  position(
    'feed.user_id = v_user_id'
    in pg_get_functiondef(
      'public.get_dashboard_bundle(date,date,integer)'::regprocedure
    )
  ) > 0,
  'dashboard bundle keeps explicit tenant predicates inside PostgreSQL'
);
select ok(
  position(
    'p_transaction_start < p_today - 45'
    in pg_get_functiondef(
      'public.get_dashboard_bundle(date,date,integer)'::regprocedure
    )
  ) > 0,
  'dashboard bundle rejects unbounded transaction ranges'
);
select ok(
  position(
    'p_recent_limit > 20'
    in pg_get_functiondef(
      'public.get_dashboard_bundle(date,date,integer)'::regprocedure
    )
  ) > 0,
  'dashboard bundle retains a bounded recent-row limit'
);

select ok(
  not exists (
    select 1
    from captured_financial_plans
    where plan::text like '%Actual Total Time%'
  ),
  'plan regressions use stable shape evidence instead of machine timing'
);

select * from finish();
rollback;
