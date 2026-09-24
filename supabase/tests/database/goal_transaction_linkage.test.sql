-- Goal ↔ transaction linkage (annotation only):
-- a nullable goal tag on income/expense rows, validated through the write
-- RPCs. The tag never changes kind, amount, balances or goal progress.
-- Sentinel contract: p_goal_id_is_set=false preserves, true+null clears,
-- true+uuid sets. New/change assignment requires an own, non-archived goal;
-- keeping an existing archived tag and clearing it stay allowed.
-- FK is ON DELETE RESTRICT so a referenced goal cannot be hard-deleted.

begin;
select plan(15);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  'authenticated', 'authenticated', 'goal-linkage-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Goal Linkage A"}'::jsonb,
  now(), now(), '', '', false, false
), (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '88888888-8888-4888-8888-888888888882'::uuid,
  'authenticated', 'authenticated', 'goal-linkage-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Goal Linkage B"}'::jsonb,
  now(), now(), '', '', false, false
);

-- Goals exist before the authenticated role is assumed: upsert_savings_goal
-- requires auth.uid(), so fixtures are direct inserts here (default role).
insert into public.savings_goals (id, user_id, name, target_minor, is_archived)
values
  ('88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'Goal A active', 1000000, false),
  ('88888888-0000-4000-8000-0000000000a2'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'Goal A second', 2000000, false),
  ('88888888-0000-4000-8000-0000000000a3'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'Goal A archived', 3000000, true),
  ('88888888-0000-4000-8000-0000000000b1'::uuid,
   '88888888-8888-4888-8888-888888888882'::uuid, 'Goal B', 4000000, false);

-- A reconciled entry for the guard-exemption assertions, written as the
-- default role before RLS applies.
insert into public.financial_transactions (
  id, user_id, kind, note, occurred_on, idempotency_key
) values (
  '88888888-0000-4000-8000-0000000000f1'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  'expense', 'Reconciled row', '2026-09-20', gen_random_uuid()
);
insert into public.accounts (id, user_id, name, kind, currency_code)
values (
  '88888888-0000-4000-8000-0000000000c1'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  'Guard account', 'cash', 'VND'
);
insert into public.transaction_entries (
  transaction_id, user_id, account_id, amount_minor, reconciliation_state
) values (
  '88888888-0000-4000-8000-0000000000f1'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  '88888888-0000-4000-8000-0000000000c1'::uuid,
  -5000, 'pending'
);
with recon as (
  insert into public.account_reconciliations (
    user_id, account_id, statement_date, statement_balance_minor, status,
    completed_at, calculated_balance_minor, pending_account_leg_count,
    cleared_account_leg_count, reconciled_account_leg_count
  ) values (
    '88888888-8888-4888-8888-888888888881'::uuid,
    '88888888-0000-4000-8000-0000000000c1'::uuid,
    '2026-09-20'::date, -5000::bigint, 'completed',
    now(), -5000::bigint, 0::bigint, 0::bigint, 1::bigint
  )
  returning id
)
update public.transaction_entries
set reconciliation_state = 'reconciled',
    cleared_at = now(),
    reconciliation_id = (select id from recon)
where transaction_id = '88888888-0000-4000-8000-0000000000f1'::uuid
  and user_id = '88888888-8888-4888-8888-888888888881'::uuid;

set local request.jwt.claims =
  '{"sub":"88888888-8888-4888-8888-888888888881","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.gl_account',
  (select id::text
   from public.accounts
   where user_id = '88888888-8888-4888-8888-888888888881'
     and is_archived = false
   order by created_at, id
   limit 1),
  true
);
select set_config(
  'moneyflow_test.gl_category',
  (select id::text
   from public.categories
   where user_id = '88888888-8888-4888-8888-888888888881'
     and kind = 'expense'
   order by created_at, id
   limit 1),
  true
);

-- 1: create with a valid goal tags the row.
select set_config(
  'moneyflow_test.gl_tx',
  public.create_money_transaction(
    current_setting('moneyflow_test.gl_account')::uuid,
    current_setting('moneyflow_test.gl_category')::uuid,
    'expense'::public.transaction_kind,
    50000,
    '2026-09-24'::date,
    'Tagged row',
    gen_random_uuid(),
    '',
    '88888888-0000-4000-8000-0000000000a1'::uuid
  )::text,
  true
);
select is(
  (select goal_id::text
   from public.financial_transactions
   where id = current_setting('moneyflow_test.gl_tx')::uuid),
  '88888888-0000-4000-8000-0000000000a1',
  'create_money_transaction stores the goal tag'
);

-- 2: new assignment to an archived goal is rejected.
select throws_ok(
  format(
    'select public.create_money_transaction(%L::uuid, %L::uuid, ''expense'', 50000, ''2026-09-24''::date, ''x'', gen_random_uuid(), '''', %L::uuid)',
    current_setting('moneyflow_test.gl_account'),
    current_setting('moneyflow_test.gl_category'),
    '88888888-0000-4000-8000-0000000000a3'
  ),
  'goal_not_found_or_archived',
  'create rejects an archived goal'
);

-- 3: another tenant's goal is invisible to validation.
select throws_ok(
  format(
    'select public.create_money_transaction(%L::uuid, %L::uuid, ''expense'', 50000, ''2026-09-24''::date, ''x'', gen_random_uuid(), '''', %L::uuid)',
    current_setting('moneyflow_test.gl_account'),
    current_setting('moneyflow_test.gl_category'),
    '88888888-0000-4000-8000-0000000000b1'
  ),
  'goal_not_found_or_archived',
  'create rejects a goal owned by another user'
);

-- 4: update with is_set=true + uuid changes the tag.
select is(
  public.update_money_transaction(
    current_setting('moneyflow_test.gl_tx')::uuid,
    current_setting('moneyflow_test.gl_account')::uuid,
    current_setting('moneyflow_test.gl_category')::uuid,
    'expense'::public.transaction_kind,
    50000,
    '2026-09-24'::date,
    'Tagged row',
    '',
    null,
    '88888888-0000-4000-8000-0000000000a2'::uuid,
    true
  ),
  current_setting('moneyflow_test.gl_tx')::uuid,
  'update sets a different goal'
);
select is(
  (select goal_id::text
   from public.financial_transactions
   where id = current_setting('moneyflow_test.gl_tx')::uuid),
  '88888888-0000-4000-8000-0000000000a2',
  'the new tag landed'
);

-- 5: omitted sentinel preserves the tag (legacy callers never erase it).
select public.update_money_transaction(
  current_setting('moneyflow_test.gl_tx')::uuid,
  current_setting('moneyflow_test.gl_account')::uuid,
  current_setting('moneyflow_test.gl_category')::uuid,
  'expense'::public.transaction_kind,
  51000,
  '2026-09-24'::date,
  'Preserving edit',
  ''
);
select is(
  (select goal_id::text
   from public.financial_transactions
   where id = current_setting('moneyflow_test.gl_tx')::uuid),
  '88888888-0000-4000-8000-0000000000a2',
  'omitted p_goal_id_is_set preserves the tag'
);

-- 6: is_set=true + null clears the tag.
select public.update_money_transaction(
  current_setting('moneyflow_test.gl_tx')::uuid,
  current_setting('moneyflow_test.gl_account')::uuid,
  current_setting('moneyflow_test.gl_category')::uuid,
  'expense'::public.transaction_kind,
  51000,
  '2026-09-24'::date,
  'Clearing edit',
  '',
  null,
  null,
  true
);
select is(
  (select goal_id is null
   from public.financial_transactions
   where id = current_setting('moneyflow_test.gl_tx')::uuid),
  true,
  'is_set=true + null clears the tag'
);

-- 7: update assigning an archived goal is rejected.
select throws_ok(
  format(
    'select public.update_money_transaction(%L::uuid, %L::uuid, %L::uuid, ''expense'', 51000, ''2026-09-24''::date, ''x'', '''', null, %L::uuid, true)',
    current_setting('moneyflow_test.gl_tx'),
    current_setting('moneyflow_test.gl_account'),
    current_setting('moneyflow_test.gl_category'),
    '88888888-0000-4000-8000-0000000000a3'
  ),
  'goal_not_found_or_archived',
  'update rejects a new archived-goal assignment'
);

-- 8: update assigning another tenant's goal is rejected.
select throws_ok(
  format(
    'select public.update_money_transaction(%L::uuid, %L::uuid, %L::uuid, ''expense'', 51000, ''2026-09-24''::date, ''x'', '''', null, %L::uuid, true)',
    current_setting('moneyflow_test.gl_tx'),
    current_setting('moneyflow_test.gl_account'),
    current_setting('moneyflow_test.gl_category'),
    '88888888-0000-4000-8000-0000000000b1'
  ),
  'goal_not_found_or_archived',
  'update rejects another tenant''s goal'
);

-- 9-10: a row already tagged with a now-archived goal keeps the tag on
-- unrelated edits (is_set=false) and on an identical explicit value.
update public.financial_transactions
set goal_id = '88888888-0000-4000-8000-0000000000a3'::uuid
where id = current_setting('moneyflow_test.gl_tx')::uuid;

select lives_ok(
  format(
    'select public.update_money_transaction(%L::uuid, %L::uuid, %L::uuid, ''expense'', 52000, ''2026-09-24''::date, ''keep archived'', '''')',
    current_setting('moneyflow_test.gl_tx'),
    current_setting('moneyflow_test.gl_account'),
    current_setting('moneyflow_test.gl_category')
  ),
  'unrelated edit keeps an archived goal tag'
);
select is(
  (select goal_id::text
   from public.financial_transactions
   where id = current_setting('moneyflow_test.gl_tx')::uuid),
  '88888888-0000-4000-8000-0000000000a3',
  'the archived tag survived'
);

-- 11: an identical explicit value is also allowed (no revalidation needed).
select lives_ok(
  format(
    'select public.update_money_transaction(%L::uuid, %L::uuid, %L::uuid, ''expense'', 52000, ''2026-09-24''::date, ''same goal'', '''', null, %L::uuid, true)',
    current_setting('moneyflow_test.gl_tx'),
    current_setting('moneyflow_test.gl_account'),
    current_setting('moneyflow_test.gl_category'),
    '88888888-0000-4000-8000-0000000000a3'
  ),
  're-submitting the same archived goal is a no-op'
);

-- 12: the composite FK is ON DELETE RESTRICT — the goal fixture has no
-- allocations, so only the transaction reference can block the delete.
select throws_ok(
  'delete from public.savings_goals where id = ''88888888-0000-4000-8000-0000000000a3''::uuid',
  null,
  'deleting a referenced goal is restricted'
);

-- 13-14: reconciled rows accept a goal-only edit (annotation, not
-- reconciliation truth) but still reject a real-field edit.
select lives_ok(
  format(
    'select public.update_money_transaction(%L::uuid, %L::uuid, %L::uuid, ''expense'', 5000, ''2026-09-20''::date, ''Reconciled row'', '''', null, %L::uuid, true)',
    '88888888-0000-4000-8000-0000000000f1',
    '88888888-0000-4000-8000-0000000000c1',
    current_setting('moneyflow_test.gl_category'),
    '88888888-0000-4000-8000-0000000000a1'
  ),
  'goal tag on a reconciled transaction is allowed'
);
select throws_ok(
  format(
    'select public.update_money_transaction(%L::uuid, %L::uuid, %L::uuid, ''expense'', 5000, ''2026-09-20''::date, ''tamper'', '''')',
    '88888888-0000-4000-8000-0000000000f1',
    '88888888-0000-4000-8000-0000000000c1',
    current_setting('moneyflow_test.gl_category')
  ),
  'transaction_reconciled',
  'a real-field edit on a reconciled transaction is still blocked'
);

-- 15: the feed exposes goal_id + goal_name for display — including the
-- name of an archived goal still referenced by history.
select is(
  (select goal_id::text || '|' || coalesce(goal_name, '')
   from public.transaction_feed
   where id = current_setting('moneyflow_test.gl_tx')::uuid),
  '88888888-0000-4000-8000-0000000000a3|Goal A archived',
  'transaction_feed exposes goal_id and goal_name'
);

select * from finish();
rollback;
