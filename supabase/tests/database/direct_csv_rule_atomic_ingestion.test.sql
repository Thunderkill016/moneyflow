begin;
select plan(9);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '46300000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'direct-rule-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Direct rule owner"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"46300000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

create temporary table direct_rule_ref (
  id uuid not null,
  category_id uuid not null,
  fallback_category_id uuid not null,
  account_id uuid not null
) on commit drop;

insert into direct_rule_ref (id, category_id, fallback_category_id, account_id)
select
  '46330000-0000-4000-8000-000000000001'::uuid,
  (select id from public.categories
   where user_id = '46300000-0000-4000-8000-000000000001'::uuid
     and kind = 'expense' and is_archived = false
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = '46300000-0000-4000-8000-000000000001'::uuid
     and kind = 'expense' and is_archived = false
   order by created_at desc, id desc limit 1),
  (select id from public.accounts
   where user_id = '46300000-0000-4000-8000-000000000001'::uuid
   order by created_at, id limit 1);

insert into public.inbox_rules (
  id, user_id, priority, enabled, match_field, contains_text, category_id, merchant_name
)
select
  id,
  '46300000-0000-4000-8000-000000000001'::uuid,
  1, true, 'merchant', 'highlands', category_id, 'Highlands Coffee'
from direct_rule_ref;

select has_function(
  'public',
  'prepare_direct_csv_candidates_with_rules',
  array['jsonb', 'jsonb'],
  'Direct CSV rule-aware candidate preparation RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.prepare_direct_csv_candidates_with_rules(jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated may prepare own Direct CSV candidates'
);

select lives_ok(
  $$
    select public.prepare_direct_csv_candidates_with_rules(
      jsonb_build_object(
        'id', '46310000-0000-4000-8000-000000000001',
        'file_name', 'direct-rules.csv',
        'warning_count', 0,
        'skipped_rows', 0,
        'map_confidence', 1,
        'headers', '["date","description","amount"]'::jsonb,
        'column_map', '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb
      ),
      jsonb_build_array(jsonb_build_object(
        'id', '46320000-0000-4000-8000-000000000001',
        'row_index', 1,
        'kind', 'expense',
        'amount_minor', 45000,
        'merchant', 'HIGHLANDS Q1',
        'note', 'HIGHLANDS Q1',
        'occurred_on', '2026-08-25',
        'confidence', 'high',
        'category_id', (select fallback_category_id::text from direct_rule_ref),
        'account_id', (select account_id::text from direct_rule_ref),
        'raw_snippet', '25/08/2026,HIGHLANDS Q1,-45000',
        'applied_rule_id', (select id::text from direct_rule_ref),
        'applied_rule_version', 1
      ))
    )
  $$,
  'matching explicit rule prepares one pending candidate'
);

select is(
  (select category_id from public.inbox_candidates
   where id = '46320000-0000-4000-8000-000000000001'::uuid),
  (select category_id from direct_rule_ref),
  'server rule validation owns the resulting category rather than client fallback'
);

select is(
  (select merchant from public.inbox_candidates
   where id = '46320000-0000-4000-8000-000000000001'::uuid),
  'Highlands Coffee',
  'server rule validation owns the normalized merchant'
);

select is(
  (select applied_rule_version from public.inbox_candidates
   where id = '46320000-0000-4000-8000-000000000001'::uuid),
  1,
  'candidate retains the exact applied rule revision'
);

select throws_ok(
  $$
    select public.prepare_direct_csv_candidates_with_rules(
      jsonb_build_object(
        'id', '46310000-0000-4000-8000-000000000002',
        'file_name', 'stale-rule.csv',
        'warning_count', 0,
        'skipped_rows', 0,
        'map_confidence', 1,
        'headers', '["date","description","amount"]'::jsonb,
        'column_map', '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb
      ),
      jsonb_build_array(jsonb_build_object(
        'id', '46320000-0000-4000-8000-000000000002',
        'row_index', 1,
        'kind', 'expense',
        'amount_minor', 45000,
        'merchant', 'HIGHLANDS stale',
        'note', '',
        'occurred_on', '2026-08-25',
        'confidence', 'high',
        'category_id', (select category_id::text from direct_rule_ref),
        'account_id', (select account_id::text from direct_rule_ref),
        'raw_snippet', 'HIGHLANDS stale',
        'applied_rule_id', (select id::text from direct_rule_ref),
        'applied_rule_version', 2
      ))
    )
  $$,
  'rule_not_available',
  'stale rule revision rejects source preparation'
);

select is(
  (select count(*)::integer from public.import_batches
   where id = '46310000-0000-4000-8000-000000000002'::uuid),
  0,
  'stale rule leaves no partial Direct CSV batch'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where idempotency_key::text like '463%'),
  0,
  'source preparation never creates a financial transaction'
);

select * from finish();
rollback;
