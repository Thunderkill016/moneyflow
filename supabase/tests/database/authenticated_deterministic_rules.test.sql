begin;
select plan(24);

select has_table('public', 'inbox_rules', 'authenticated rules table exists');
select has_column('public', 'inbox_rules', 'version', 'rules retain a monotonic version');
select has_column('public', 'inbox_rules', 'stage', 'rules expose an explicit stage');
select has_column('public', 'inbox_candidates', 'applied_rule_id', 'candidate retains applied rule identity');
select has_column('public', 'inbox_candidates', 'applied_rule_version', 'candidate retains applied rule version');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '26400000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'rules-owner@example.invalid',
  crypt('discarded-rules-password-a', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Rules Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '26400000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'rules-other@example.invalid',
  crypt('discarded-rules-password-b', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Rules Other"}'::jsonb,
  now(), now(), '', '', false, false
);

-- Capture both fixtures before RLS hides the other tenant's categories.
select set_config(
  'moneyflow_test.rules_category_a',
  (select id::text from public.categories
   where user_id = '26400000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  true
);
select set_config(
  'moneyflow_test.rules_category_b',
  (select id::text from public.categories
   where user_id = '26400000-0000-4000-8000-000000000002'
     and kind = 'expense'
   order by created_at, id limit 1),
  true
);

set local request.jwt.claims =
  '{"sub":"26400000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  format(
    $sql$
      insert into public.inbox_rules (
        id, user_id, stage, priority, enabled, match_field,
        contains_text, category_id, merchant_name
      ) values (
        '26410000-0000-4000-8000-000000000001'::uuid,
        '26400000-0000-4000-8000-000000000001'::uuid,
        'candidate', 1, true, 'any', 'HIGHLANDS', %L::uuid,
        'Highlands Coffee'
      )
    $sql$,
    current_setting('moneyflow_test.rules_category_a')
  ),
  'owner can create a deterministic candidate rule'
);

select is(
  (select count(*)::integer from public.inbox_rules),
  1,
  'owner sees the owned rule through RLS'
);

select is(
  (select version from public.inbox_rules
   where id = '26410000-0000-4000-8000-000000000001'::uuid),
  1,
  'new rule starts at version one'
);

update public.inbox_rules
set enabled = false
where id = '26410000-0000-4000-8000-000000000001'::uuid;
select is(
  (select version from public.inbox_rules
   where id = '26410000-0000-4000-8000-000000000001'::uuid),
  2,
  'meaningful update increments the rule version'
);

update public.inbox_rules
set enabled = true
where id = '26410000-0000-4000-8000-000000000001'::uuid;

insert into public.inbox_rules (
  id, user_id, stage, priority, enabled, match_field,
  contains_text, category_id
) values (
  '26410000-0000-4000-8000-000000000002'::uuid,
  '26400000-0000-4000-8000-000000000001'::uuid,
  'candidate', 2, true, 'merchant', 'GRAB',
  current_setting('moneyflow_test.rules_category_a')::uuid
);

select throws_ok(
  $$
    select public.replace_inbox_rule_priorities(array[
      '26410000-0000-4000-8000-000000000001'::uuid
    ])
  $$,
  'P0001',
  'incomplete_rule_order',
  'partial reorder cannot create an ambiguous tenant rule order'
);

select lives_ok(
  $$
    select public.replace_inbox_rule_priorities(array[
      '26410000-0000-4000-8000-000000000002'::uuid,
      '26410000-0000-4000-8000-000000000001'::uuid
    ])
  $$,
  'owner can reorder the complete owned rule set atomically'
);

select is(
  (select priority from public.inbox_rules
   where id = '26410000-0000-4000-8000-000000000002'::uuid),
  1,
  'reorder assigns the first requested priority'
);
select is(
  (select priority from public.inbox_rules
   where id = '26410000-0000-4000-8000-000000000001'::uuid),
  2,
  'reorder assigns the second requested priority'
);
select is(
  (select version from public.inbox_rules
   where id = '26410000-0000-4000-8000-000000000001'::uuid),
  4,
  'priority change is included in version provenance'
);

select throws_ok(
  format(
    $sql$
      insert into public.inbox_rules (
        user_id, stage, priority, enabled, match_field,
        contains_text, category_id
      ) values (
        '26400000-0000-4000-8000-000000000001'::uuid,
        'candidate', 3, true, 'any', 'FORGED', %L::uuid
      )
    $sql$,
    current_setting('moneyflow_test.rules_category_b')
  ),
  'P0001',
  'rule_category_not_available',
  'rule cannot target another tenant category'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, raw_snippet
) values (
  '26420000-0000-4000-8000-000000000001'::uuid,
  '26400000-0000-4000-8000-000000000001'::uuid,
  'expense', 45000, 'HIGHLANDS 45K', 'Cafe sáng', '2026-08-03',
  'paste', 'medium', 'pending', 'HIGHLANDS 45k'
), (
  '26420000-0000-4000-8000-000000000002'::uuid,
  '26400000-0000-4000-8000-000000000001'::uuid,
  'expense', 12000, 'OTHER SHOP', '', '2026-08-03',
  'paste', 'low', 'pending', 'OTHER SHOP 12k'
);

select lives_ok(
  $$
    select * from public.apply_inbox_rule_to_candidate(
      '26420000-0000-4000-8000-000000000001'::uuid,
      '26410000-0000-4000-8000-000000000001'::uuid,
      4
    )
  $$,
  'matching current rule can normalize a pending candidate'
);

select is(
  (select applied_rule_id from public.inbox_candidates
   where id = '26420000-0000-4000-8000-000000000001'::uuid),
  '26410000-0000-4000-8000-000000000001'::uuid,
  'candidate retains applied rule identity'
);
select is(
  (select applied_rule_version from public.inbox_candidates
   where id = '26420000-0000-4000-8000-000000000001'::uuid),
  4,
  'candidate retains the exact applied revision'
);
select is(
  (select merchant from public.inbox_candidates
   where id = '26420000-0000-4000-8000-000000000001'::uuid),
  'Highlands Coffee',
  'rule writes only normalized merchant data'
);
select is(
  (select raw_snippet from public.inbox_candidates
   where id = '26420000-0000-4000-8000-000000000001'::uuid),
  'HIGHLANDS 45k',
  'rule never mutates immutable raw source text'
);

select throws_ok(
  $$
    select * from public.apply_inbox_rule_to_candidate(
      '26420000-0000-4000-8000-000000000002'::uuid,
      '26410000-0000-4000-8000-000000000001'::uuid,
      4
    )
  $$,
  'P0001',
  'rule_no_longer_matches',
  'server rejects a preview that no longer matches current candidate data'
);

select throws_ok(
  $$
    select * from public.apply_inbox_rule_to_candidate(
      '26420000-0000-4000-8000-000000000002'::uuid,
      '26410000-0000-4000-8000-000000000001'::uuid,
      3
    )
  $$,
  'P0001',
  'rule_not_available',
  'server rejects stale rule-version evidence'
);

reset role;
set local request.jwt.claims =
  '{"sub":"26400000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer from public.inbox_rules),
  0,
  'other tenant cannot read owner rules'
);

select throws_ok(
  $$
    select * from public.apply_inbox_rule_to_candidate(
      '26420000-0000-4000-8000-000000000001'::uuid,
      '26410000-0000-4000-8000-000000000001'::uuid,
      4
    )
  $$,
  'P0001',
  'candidate_not_found',
  'other tenant cannot apply a rule to the owner candidate'
);

select * from finish();
rollback;
