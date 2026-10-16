-- event_budgets + create/update/soft-delete (20261016180000): scope
-- validation, range+kind-filtered spent math in event_budget_progress,
-- idempotent replay with intent pinning, stale-write update, tombstone,
-- tenant isolation.

begin;
select plan(24);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  'authenticated', 'authenticated', 'events-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Event A"}'::jsonb,
  now(), now(), '', '', false, false
), (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '88888888-8888-4888-8888-888888888882'::uuid,
  'authenticated', 'authenticated', 'events-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Event B"}'::jsonb,
  now(), now(), '', '', false, false
);

-- Fixtures before the authenticated role is assumed (same pattern as the
-- other RPC tests): one account, two expense + one income category, and
-- ledger rows inside and outside the event window.
insert into public.accounts (id, user_id, name, kind, currency_code)
values (
  '88888888-0000-4000-8000-0000000000a1'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  'Event wallet', 'cash', 'VND'
);
insert into public.categories (id, user_id, name, kind)
values (
  '88888888-0000-4000-8000-0000000000c1'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid, 'Food', 'expense'
), (
  '88888888-0000-4000-8000-0000000000c2'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid, 'Travel', 'expense'
), (
  '88888888-0000-4000-8000-0000000000c3'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid, 'Salary', 'income'
), (
  '88888888-0000-4000-8000-0000000000c4'::uuid,
  '88888888-8888-4888-8888-888888888882'::uuid, 'B food', 'expense'
);

-- Ledger rows for tenant A inside the event window 2027-02-05..2027-02-12:
--   t1 expense food      100000 on 02-06   (in range, in scope)
--   t2 expense travel     50000 on 02-06   (in range, out of scope)
--   t3 split expense      90000 on 02-07   (food leg 60000 + travel leg 30000)
--   t4 expense food       40000 on 02-13   (after end_date — never counts)
--   t5 income  salary   5000000 on 02-06   (income kind — never counts)
--   t6 transfer          70000 on 02-06   (transfer — never spend)
--   t7 expense food       25000 on 02-06   (soft-deleted — never counts)
insert into public.financial_transactions
  (id, user_id, kind, note, occurred_on, deleted_at)
values
  ('88888888-0000-4000-8000-0000000000e1'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'expense', 't1', '2027-02-06', null),
  ('88888888-0000-4000-8000-0000000000e2'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'expense', 't2', '2027-02-06', null),
  ('88888888-0000-4000-8000-0000000000e3'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'expense', 't3 split', '2027-02-07', null),
  ('88888888-0000-4000-8000-0000000000e4'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'expense', 't4', '2027-02-13', null),
  ('88888888-0000-4000-8000-0000000000e5'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'income', 't5', '2027-02-06', null),
  ('88888888-0000-4000-8000-0000000000e6'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'transfer', 't6', '2027-02-06', null),
  ('88888888-0000-4000-8000-0000000000e7'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'expense', 't7 deleted', '2027-02-06', now());
insert into public.transaction_entries
  (transaction_id, user_id, account_id, category_id, amount_minor)
values
  ('88888888-0000-4000-8000-0000000000e1'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-0000-4000-8000-0000000000c1'::uuid, -100000),
  ('88888888-0000-4000-8000-0000000000e2'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-0000-4000-8000-0000000000c2'::uuid, -50000),
  ('88888888-0000-4000-8000-0000000000e3'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-0000-4000-8000-0000000000c1'::uuid, -60000),
  ('88888888-0000-4000-8000-0000000000e3'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-0000-4000-8000-0000000000c2'::uuid, -30000),
  ('88888888-0000-4000-8000-0000000000e4'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-0000-4000-8000-0000000000c1'::uuid, -40000),
  ('88888888-0000-4000-8000-0000000000e5'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-0000-4000-8000-0000000000c3'::uuid, 5000000),
  ('88888888-0000-4000-8000-0000000000e6'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid, null, -70000),
  ('88888888-0000-4000-8000-0000000000e6'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid, null, 70000),
  ('88888888-0000-4000-8000-0000000000e7'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-0000-4000-8000-0000000000c1'::uuid, -25000);

-- One event owned by tenant B — isolation checks read/attack it.
insert into public.event_budgets
  (id, user_id, name, start_date, end_date, limit_minor, idempotency_key, creation_intent)
values (
  '88888888-0000-4000-8000-0000000000b1'::uuid,
  '88888888-8888-4888-8888-888888888882'::uuid,
  'B event', '2027-02-05', '2027-02-12', 500000,
  'bbbbbbbb-0000-4000-8000-000000000001'::uuid, '{}'::jsonb
);

set local request.jwt.claims =
  '{"sub":"88888888-8888-4888-8888-888888888881","role":"authenticated"}';
set local role authenticated;

-- 1-2: create stores the fields and the scope set; progress reads spend.
select set_config(
  'moneyflow_test.event_food',
  public.create_event_budget(
    'Tết 2027', '2027-02-05'::date, '2027-02-12'::date, 500000,
    array['88888888-0000-4000-8000-0000000000c1']::uuid[],
    '11111111-2222-4333-8444-555555555561'::uuid
  )::text,
  true
);
select is(
  (select name || '|' || start_date::text || '|' || end_date::text || '|' || limit_minor::text
   from public.event_budgets
   where id = current_setting('moneyflow_test.event_food')::uuid),
  'Tết 2027|2027-02-05|2027-02-12|500000',
  'create_event_budget stores name, inclusive range and limit'
);

-- 3: the scoped progress counts only in-range in-scope expense legs:
-- t1 (100k food) + the 60k food leg of the split t3. t2 is out of
-- scope, t4 out of range, t5/t6 never spend, t7 deleted.
select is(
  (select spent_minor from public.event_budget_progress
   where id = current_setting('moneyflow_test.event_food')::uuid),
  160000::bigint,
  'scoped spent counts only in-range in-scope expense legs'
);

-- 4: the scope set round-trips through the view.
select is(
  (select category_ids::text from public.event_budget_progress
   where id = current_setting('moneyflow_test.event_food')::uuid),
  '{88888888-0000-4000-8000-0000000000c1}',
  'the view emits the scope as a uuid array'
);

-- 5-7: an unscoped event counts every expense leg in range
-- (t1 100k + t2 50k + t3 90k = 240k), still excluding income/transfer,
-- out-of-range and tombstoned rows.
select set_config(
  'moneyflow_test.event_all',
  public.create_event_budget(
    'Du lịch Đà Lạt', '2027-02-05'::date, '2027-02-12'::date, 1000000
  )::text,
  true
);
select is(
  (select spent_minor from public.event_budget_progress
   where id = current_setting('moneyflow_test.event_all')::uuid),
  240000::bigint,
  'unscoped spent sums every expense leg in range'
);
select is(
  (select category_ids::text from public.event_budget_progress
   where id = current_setting('moneyflow_test.event_all')::uuid),
  '{}',
  'an unscoped event reads as the empty scope array'
);

-- 8-10: validation bounds.
select throws_ok(
  'select public.create_event_budget(''  '', ''2027-02-05''::date, ''2027-02-12''::date, 1000)',
  'invalid_event_name',
  'blank name is rejected'
);
select throws_ok(
  'select public.create_event_budget(''X'', ''2027-02-12''::date, ''2027-02-05''::date, 1000)',
  'event_end_before_start',
  'end before start is rejected'
);
select throws_ok(
  'select public.create_event_budget(''X'', ''2027-02-05''::date, ''2027-02-12''::date, 0)',
  'amount_must_be_positive',
  'zero limit is rejected'
);

-- 11-13: scope must be owned + expense kind + de-duplicated.
select throws_ok(
  format(
    'select public.create_event_budget(''X'', ''2027-02-05''::date, ''2027-02-12''::date, 1000, array[%L]::uuid[])',
    '88888888-0000-4000-8000-0000000000c4'
  ),
  'category_not_found',
  'another tenant''s category cannot scope the event'
);
select throws_ok(
  format(
    'select public.create_event_budget(''X'', ''2027-02-05''::date, ''2027-02-12''::date, 1000, array[%L]::uuid[])',
    '88888888-0000-4000-8000-0000000000c3'
  ),
  'expense_category_required',
  'an income category cannot scope the event'
);
select throws_ok(
  format(
    'select public.create_event_budget(''X'', ''2027-02-05''::date, ''2027-02-12''::date, 1000, array[%1$L,%1$L]::uuid[])',
    '88888888-0000-4000-8000-0000000000c1'
  ),
  'invalid_category_scope',
  'a duplicated scope id is rejected'
);

-- 14-16: replaying the same key returns the same event; a different
-- payload under the key fails closed on the stored intent.
select is(
  public.create_event_budget(
    'Tết 2027', '2027-02-05'::date, '2027-02-12'::date, 500000,
    array['88888888-0000-4000-8000-0000000000c1']::uuid[],
    '11111111-2222-4333-8444-555555555561'::uuid
  )::text,
  current_setting('moneyflow_test.event_food'),
  'replayed key returns the original event'
);
select throws_ok(
  'select public.create_event_budget(''Tết 2027'', ''2027-02-05''::date, ''2027-02-12''::date, 900000, ''{}''::uuid[], ''11111111-2222-4333-8444-555555555561''::uuid)',
  'idempotency_intent_mismatch',
  'same key with a different payload fails closed'
);
select is(
  (select count(*)::integer from public.event_budgets
   where name = 'Tết 2027'),
  1,
  'a replayed key never duplicates the event'
);

-- 17-19: update rewrites fields + the scope set atomically; a stale
-- expectation fails closed before anything writes.
select is(
  (select updated_at::text from public.event_budgets
   where id = current_setting('moneyflow_test.event_all')::uuid) is not null,
  true,
  'updated_at exists for the stale-write token'
);
select throws_ok(
  format(
    'select public.update_event_budget(%L::uuid, ''Du lịch'', ''2027-02-05''::date, ''2027-02-12''::date, 2000000, ''{}''::uuid[], ''2000-01-01''::timestamptz)',
    current_setting('moneyflow_test.event_all')
  ),
  'stale_write',
  'a stale expected_updated_at is rejected'
);
select is(
  public.update_event_budget(
    current_setting('moneyflow_test.event_all')::uuid,
    'Du lịch Đà Lạt 3N2Đ', '2027-02-05'::date, '2027-02-14'::date, 2000000,
    array['88888888-0000-4000-8000-0000000000c1',
          '88888888-0000-4000-8000-0000000000c2']::uuid[],
    null
  ),
  true,
  'update_event_budget rewrites the row'
);

-- 20: the widened range (02-14) now includes t4 (40k food after the old
-- end) and the scope covers both categories — 100+50+60+30+40 = 280k.
select is(
  (select spent_minor from public.event_budget_progress
   where id = current_setting('moneyflow_test.event_all')::uuid),
  280000::bigint,
  'the updated range+scope recomputes honestly'
);

-- 21: the update replaced the scope set atomically ({c1} → {c1,c2}).
select is(
  (select category_ids @> array[
     '88888888-0000-4000-8000-0000000000c1'::uuid,
     '88888888-0000-4000-8000-0000000000c2'::uuid]
         and cardinality(category_ids) = 2
   from public.event_budget_progress
   where id = current_setting('moneyflow_test.event_all')::uuid),
  true,
  'update replaced the scope set atomically'
);

-- 22-23: tenant isolation — B's event is invisible to A, and A cannot
-- edit it.
select is(
  (select count(*)::integer
   from public.event_budgets
   where id = '88888888-0000-4000-8000-0000000000b1'::uuid),
  0,
  'RLS hides another tenant''s event row'
);
select throws_ok(
  format(
    'select public.update_event_budget(%L::uuid, ''Hijack'', ''2027-02-05''::date, ''2027-02-12''::date, 1)',
    '88888888-0000-4000-8000-0000000000b1'
  ),
  'event_not_found',
  'editing another tenant''s event fails as not found'
);

-- 22-24: soft delete tombstones the row and the view drops it — the
-- base row stays (recoverable tombstone, never a hard erase).
select is(
  public.soft_delete_event_budget(
    current_setting('moneyflow_test.event_food')::uuid
  ),
  true,
  'soft_delete_event_budget reports the delete'
);
select is(
  (select deleted_at is not null
   from public.event_budgets
   where id = current_setting('moneyflow_test.event_food')::uuid),
  true,
  'the row is tombstoned, not removed'
);
select is(
  (select count(*)::integer from public.event_budget_progress
   where id = current_setting('moneyflow_test.event_food')::uuid),
  0,
  'a tombstoned event leaves the progress view'
);

select * from finish();
rollback;
