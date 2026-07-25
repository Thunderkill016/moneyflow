begin;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'ce23be97-8f54-40f1-91df-c709a4db2a58'::uuid,
  'authenticated', 'authenticated', 'archived-category-guards@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Archived Category Guards"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.recurring_commitments (
  id, user_id, name, amount_minor, due_day, account_id, category_id
)
select
  'c658bd8c-bc5b-44cf-9d9b-9432ea55f31e'::uuid,
  'ce23be97-8f54-40f1-91df-c709a4db2a58'::uuid,
  'Existing commitment',
  100000::bigint,
  25,
  account_record.id,
  category_record.id
from lateral (
  select id from public.accounts
  where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58'
  limit 1
) account_record
cross join lateral (
  select id from public.categories
  where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58' and kind = 'expense'
  order by name
  limit 1
) category_record;

insert into public.recurring_income_templates (
  id, user_id, name, amount_minor, due_day, account_id, category_id
)
select
  '2bde68a7-3c96-4aa2-b34d-d446e3c91fa9'::uuid,
  'ce23be97-8f54-40f1-91df-c709a4db2a58'::uuid,
  'Existing income',
  200000::bigint,
  25,
  account_record.id,
  category_record.id
from lateral (
  select id from public.accounts
  where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58'
  limit 1
) account_record
cross join lateral (
  select id from public.categories
  where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58' and kind = 'income'
  order by name
  limit 1
) category_record;

update public.categories
set is_archived = true
where id in (
  select category_id from public.recurring_commitments
  where id = 'c658bd8c-bc5b-44cf-9d9b-9432ea55f31e'::uuid
  union all
  select category_id from public.recurring_income_templates
  where id = '2bde68a7-3c96-4aa2-b34d-d446e3c91fa9'::uuid
);

set local request.jwt.claims = '{"sub":"ce23be97-8f54-40f1-91df-c709a4db2a58","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$
    select public.upsert_monthly_budget(
      (select category_id from public.recurring_commitments where id = 'c658bd8c-bc5b-44cf-9d9b-9432ea55f31e'::uuid),
      date_trunc('month', current_date)::date,
      1000000::bigint
    )
  $$,
  'P0001',
  'category_archived',
  'budget RPC rejects an archived expense category'
);

select throws_ok(
  $$
    select public.upsert_recurring_commitment(
      null,
      'New commitment',
      100000::bigint,
      25,
      (select id from public.accounts where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58' limit 1),
      (select category_id from public.recurring_commitments where id = 'c658bd8c-bc5b-44cf-9d9b-9432ea55f31e'::uuid)
    )
  $$,
  'P0001',
  'category_archived',
  'commitment RPC rejects an archived expense category'
);

select throws_ok(
  $$
    select public.pay_recurring_commitment(
      'c658bd8c-bc5b-44cf-9d9b-9432ea55f31e'::uuid,
      date_trunc('month', current_date)::date,
      current_date,
      'bed3e5f0-a8ff-421d-b566-7ae1f15c5aef'::uuid
    )
  $$,
  'P0001',
  'category_archived',
  'recurring payment cannot create a transaction on an archived category'
);

select throws_ok(
  $$
    select public.upsert_recurring_income_template(
      null,
      'New income template',
      200000::bigint,
      25,
      (select id from public.accounts where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58' limit 1),
      (select category_id from public.recurring_income_templates where id = '2bde68a7-3c96-4aa2-b34d-d446e3c91fa9'::uuid)
    )
  $$,
  'P0001',
  'category_archived',
  'income template RPC rejects an archived income category'
);

select throws_ok(
  $$
    select public.record_recurring_income_template(
      '2bde68a7-3c96-4aa2-b34d-d446e3c91fa9'::uuid,
      date_trunc('month', current_date)::date,
      current_date,
      'a03955a8-23af-4dcb-82e1-a77d6131f58e'::uuid
    )
  $$,
  'P0001',
  'category_archived',
  'recurring income cannot create a transaction on an archived category'
);

select is(
  (select count(*)::integer from public.monthly_budgets where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58'),
  0,
  'rejected archived category creates no budget'
);

select is(
  (select count(*)::integer from public.financial_transactions where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58'),
  0,
  'rejected recurring operations create no transaction'
);

select is(
  (
    (select count(*) from public.commitment_occurrences where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58') +
    (select count(*) from public.income_template_occurrences where user_id = 'ce23be97-8f54-40f1-91df-c709a4db2a58')
  )::integer,
  0,
  'rejected recurring operations create no occurrence'
);

reset role;
select * from finish();
rollback;
