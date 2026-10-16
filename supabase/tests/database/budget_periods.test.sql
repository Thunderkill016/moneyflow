-- D12 budget_periods (20261016190000): period_kind on monthly_budgets,
-- the per-kind anchor checks, the 5-argument upsert_monthly_budget, and
-- the period-aware budget_progress window.
--
-- Date facts asserted below (verified on the civil calendar):
--   2026-10-12 is a Monday; its week runs 10-12..10-18.
--   2026-10-13 is a Tuesday — a non-Monday weekly anchor must fail.
--   2026-11-30 is a Monday; its week straddles into December — proves a
--   weekly window is not clipped at a month boundary.
--   2026-06-01 is BOTH a Monday and a first-of-month — the same anchor
--   date can host a monthly and a weekly row for one category.

begin;
select plan(17);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid,
  'authenticated', 'authenticated', 'periods-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Period A"}'::jsonb,
  now(), now(), '', '', false, false
), (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '77777777-7777-4777-8777-777777777772'::uuid,
  'authenticated', 'authenticated', 'periods-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Period B"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.accounts (id, user_id, name, kind, currency_code)
values (
  '77777777-0000-4000-8000-0000000000a1'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid,
  'Period wallet', 'cash', 'VND'
);
insert into public.categories (id, user_id, name, kind)
values (
  '77777777-0000-4000-8000-0000000000c1'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid, 'Food', 'expense'
), (
  '77777777-0000-4000-8000-0000000000c2'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid, 'Coffee', 'expense'
), (
  '77777777-0000-4000-8000-0000000000c3'::uuid,
  '77777777-7777-4777-8777-777777777771'::uuid, 'Salary', 'income'
);

-- Ledger rows around the weekly window 2026-10-12..10-18 for c1:
--   w1 expense food      100000 on 10-12  (Monday — in)
--   w2 expense food       50000 on 10-18  (Sunday — in)
--   w3 expense food       30000 on 10-19  (next Monday — out)
--   w4 expense food       25000 on 10-11  (prior Sunday — out)
--   w5 split expense      80000 on 10-14  (food leg 60000 + coffee 20000)
--   w6 income salary    5000000 on 10-13  (income — never spend)
--   w7 transfer           10000 on 10-13  (transfer — never spend)
--   w8 expense food       40000 on 10-13  (soft-deleted — never counts)
--   w9 expense food       15000 on 12-04  (inside the 11-30 weekly window)
insert into public.financial_transactions
  (id, user_id, kind, note, occurred_on, deleted_at)
values
  ('77777777-0000-4000-8000-0000000000e1'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'expense', 'w1', '2026-10-12', null),
  ('77777777-0000-4000-8000-0000000000e2'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'expense', 'w2', '2026-10-18', null),
  ('77777777-0000-4000-8000-0000000000e3'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'expense', 'w3', '2026-10-19', null),
  ('77777777-0000-4000-8000-0000000000e4'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'expense', 'w4', '2026-10-11', null),
  ('77777777-0000-4000-8000-0000000000e5'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'expense', 'w5 split', '2026-10-14', null),
  ('77777777-0000-4000-8000-0000000000e6'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'income', 'w6', '2026-10-13', null),
  ('77777777-0000-4000-8000-0000000000e7'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'transfer', 'w7', '2026-10-13', null),
  ('77777777-0000-4000-8000-0000000000e8'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'expense', 'w8 deleted', '2026-10-13', now()),
  ('77777777-0000-4000-8000-0000000000e9'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid, 'expense', 'w9', '2026-12-04', null);
insert into public.transaction_entries
  (transaction_id, user_id, account_id, category_id, amount_minor)
values
  ('77777777-0000-4000-8000-0000000000e1'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, -100000),
  ('77777777-0000-4000-8000-0000000000e2'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, -50000),
  ('77777777-0000-4000-8000-0000000000e3'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, -30000),
  ('77777777-0000-4000-8000-0000000000e4'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, -25000),
  ('77777777-0000-4000-8000-0000000000e5'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, -60000),
  ('77777777-0000-4000-8000-0000000000e5'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c2'::uuid, -20000),
  ('77777777-0000-4000-8000-0000000000e6'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c3'::uuid, 5000000),
  ('77777777-0000-4000-8000-0000000000e7'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid, null, -10000),
  ('77777777-0000-4000-8000-0000000000e7'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid, null, 10000),
  ('77777777-0000-4000-8000-0000000000e8'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, -40000),
  ('77777777-0000-4000-8000-0000000000e9'::uuid,
   '77777777-7777-4777-8777-777777777771'::uuid,
   '77777777-0000-4000-8000-0000000000a1'::uuid,
   '77777777-0000-4000-8000-0000000000c1'::uuid, -15000);

-- Tenant B's own category + weekly budget — the read-isolation target.
insert into public.categories (id, user_id, name, kind)
values (
  '77777777-0000-4000-8000-0000000000c4'::uuid,
  '77777777-7777-4777-8777-777777777772'::uuid, 'B food', 'expense'
);
insert into public.monthly_budgets
  (user_id, category_id, month_start, limit_minor, period_kind)
values (
  '77777777-7777-4777-8777-777777777772'::uuid,
  '77777777-0000-4000-8000-0000000000c4'::uuid,
  '2026-10-12', 700000, 'weekly'
);

set local request.jwt.claims =
  '{"sub":"77777777-7777-4777-8777-777777777771","role":"authenticated"}';
set local role authenticated;

-- 1: a weekly upsert stores the period kind and the Monday anchor.
select set_config(
  'moneyflow_test.week_budget',
  public.upsert_monthly_budget(
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    '2026-10-12'::date, 500000, null, 'weekly'
  )::text,
  true
);
select is(
  (select period_kind || '|' || month_start::text || '|' || limit_minor::text
   from public.monthly_budgets
   where id = current_setting('moneyflow_test.week_budget')::uuid),
  'weekly|2026-10-12|500000',
  'weekly upsert stores period_kind and the Monday anchor'
);

-- 2: the weekly progress window sums only the 7 days [Mon, next Mon):
-- w1 100k + w2 50k + the 60k food leg of w5 = 210k; w3 (next Monday),
-- w4 (prior Sunday), w6 income, w7 transfer and w8 deleted never count.
select is(
  (select spent_minor from public.budget_progress
   where id = current_setting('moneyflow_test.week_budget')::uuid),
  210000::bigint,
  'weekly spent counts expense legs inside [anchor, anchor+7) only'
);

-- 3: the view exposes the period kind.
select is(
  (select period_kind from public.budget_progress
   where id = current_setting('moneyflow_test.week_budget')::uuid),
  'weekly',
  'budget_progress emits period_kind'
);

-- 4: a week that crosses a month boundary counts both sides — the
-- 2026-11-30 budget sees w9's December-day expense.
select set_config(
  'moneyflow_test.xmonth_budget',
  public.upsert_monthly_budget(
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    '2026-11-30'::date, 300000, null, 'weekly'
  )::text,
  true
);
select is(
  (select spent_minor from public.budget_progress
   where id = current_setting('moneyflow_test.xmonth_budget')::uuid),
  15000::bigint,
  'a week straddling a month boundary counts its full 7 days'
);

-- 5: a monthly row for the same category keeps its calendar-month
-- window — every October food expense counts: w1 100k + w4 25k (still
-- October even though outside the week) + w2 50k + w3 30k + the 60k leg
-- of w5 = 265k; income/transfer/deleted stay out and w9 is December.
select set_config(
  'moneyflow_test.month_budget',
  public.upsert_monthly_budget(
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    '2026-10-01'::date, 2000000
  )::text,
  true
);
select is(
  (select period_kind || '|' || spent_minor::text
   from public.budget_progress
   where id = current_setting('moneyflow_test.month_budget')::uuid),
  'monthly|265000',
  'monthly rows keep the calendar-month window and default period_kind'
);

-- 6-7: anchor validation is per period kind.
select throws_ok(
  'select public.upsert_monthly_budget(
     ''77777777-0000-4000-8000-0000000000c1''::uuid,
     ''2026-10-13''::date, 1000, null, ''weekly'')',
  'invalid_budget_week',
  'a non-Monday weekly anchor is rejected'
);
select throws_ok(
  'select public.upsert_monthly_budget(
     ''77777777-0000-4000-8000-0000000000c1''::uuid,
     ''2026-10-01''::date, 1000, null, ''daily'')',
  'invalid_budget_period',
  'an unknown period kind is rejected'
);
select throws_ok(
  'select public.upsert_monthly_budget(
     ''77777777-0000-4000-8000-0000000000c1''::uuid,
     ''2026-10-02''::date, 1000)',
  'invalid_budget_month',
  'a non-first monthly anchor is still rejected'
);

-- 9: a weekly replay on the same conflict target updates in place —
-- same id, new limit (the budget row IS the per-period write).
select is(
  public.upsert_monthly_budget(
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    '2026-10-12'::date, 750000, null, 'weekly'
  )::text,
  current_setting('moneyflow_test.week_budget'),
  'same (category, weekly, anchor) upserts in place'
);
select is(
  (select limit_minor from public.monthly_budgets
   where id = current_setting('moneyflow_test.week_budget')::uuid),
  750000::bigint,
  'the replayed upsert wrote the new limit'
);

-- 11: the monthly + weekly coexistence — same category, same anchor
-- date 2026-06-01 (a Monday and a first-of-month), two rows.
select ok(
  public.upsert_monthly_budget(
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    '2026-06-01'::date, 100000, null, 'weekly'
  ) is not null,
  'a weekly row may share a first-of-month Monday anchor'
);
select ok(
  public.upsert_monthly_budget(
    '77777777-0000-4000-8000-0000000000c1'::uuid,
    '2026-06-01'::date, 400000, null, 'monthly'
  ) is not null,
  'a monthly row may share that anchor too — period_kind distinguishes them'
);

-- 13: the stale guard reads the (category, period, anchor) row — a wrong
-- version on the weekly row fails closed.
select throws_ok(
  format(
    'select public.upsert_monthly_budget(
       ''77777777-0000-4000-8000-0000000000c1''::uuid,
       ''2026-10-12''::date, 600000, %L::timestamptz, ''weekly'')',
    '2001-01-01T00:00:00Z'
  ),
  'stale_write',
  'a stale expected_updated_at on the weekly row fails closed'
);

-- 14: a non-expense category still cannot hold a budget of any period.
select throws_ok(
  'select public.upsert_monthly_budget(
     ''77777777-0000-4000-8000-0000000000c3''::uuid,
     ''2026-10-12''::date, 1000, null, ''weekly'')',
  'expense_category_required',
  'weekly budgets still require an expense category'
);

-- 15: tenant isolation — the view is security_invoker over RLS tables.
select is(
  (select count(*)::integer from public.budget_progress
   where id in (
     select id from public.monthly_budgets
     where user_id = '77777777-7777-4777-8777-777777777772'::uuid
   )),
  0,
  'tenant B budgets are invisible to tenant A'
);

-- 16: delete_monthly_budget removes a weekly row by id — same path.
select is(
  public.delete_monthly_budget(
    current_setting('moneyflow_test.xmonth_budget')::uuid
  ),
  true,
  'delete_monthly_budget removes a weekly budget row'
);

-- 17: the dashboard bundle's budgets slice is explicitly monthly-scoped —
-- the day a Monday lands on the 1st (2026-06-01), an unfiltered anchor
-- match would hand a weekly row to the "this month" dashboard.
select matches(
  pg_get_functiondef(
    'public.get_dashboard_bundle(date,date,integer)'::regprocedure
  ),
  'period_kind = ''monthly''',
  'get_dashboard_bundle scopes its budgets slice to monthly rows'
);

select * from finish();
rollback;
