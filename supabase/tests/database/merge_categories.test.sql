-- D14 merge_categories (20261016210000): all referencing rows move to the
-- target, unique-key collisions keep the target's row and drop the source
-- duplicate, the source ends archived (never deleted), and the guard rails
-- (kind mismatch / archived target / default source / tenant / anon) hold.

begin;
select plan(15);

-- The inbox_rules validate trigger reads auth.uid() even under the
-- superuser fixture role — set the claim before ANY seeding so rule
-- inserts pass the tenant check; `set local role` still gates the RPC
-- section below.
set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999991","role":"authenticated"}';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '99999999-9999-4999-8999-999999999991'::uuid,
  'authenticated', 'authenticated', 'merge-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Merge A"}'::jsonb,
  now(), now(), '', '', false, false
), (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '99999999-9999-4999-8999-999999999992'::uuid,
  'authenticated', 'authenticated', 'merge-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Merge B"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.accounts (id, user_id, name, kind, currency_code)
values (
  '99999999-0000-4000-8000-0000000000a1'::uuid,
  '99999999-9999-4999-8999-999999999991'::uuid,
  'Merge wallet', 'cash', 'VND'
);

-- src: the custom expense category being folded away.
-- tgt: its target. inc: an income category (kind-mismatch target).
-- def: a seeded-style default (locked source). arch: archived (dead target).
-- (Names dodge the seeded pack — on_auth_user_created inserts
-- 'Ăn uống'/'Lương'/… for every new auth.users row.)
insert into public.categories (id, user_id, name, kind, is_default, is_archived)
values
  ('99999999-0000-4000-8000-0000000000c1'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'CF nguồn', 'expense', false, false),
  ('99999999-0000-4000-8000-0000000000c2'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'CF đích', 'expense', false, false),
  ('99999999-0000-4000-8000-0000000000c3'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'CF thu', 'income', false, false),
  ('99999999-0000-4000-8000-0000000000c4'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'CF mặc định', 'expense', true, false),
  ('99999999-0000-4000-8000-0000000000c5'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'CF ẩn', 'expense', false, true);

-- Referencing rows on the SOURCE: one ledger entry, one October budget,
-- one recurring commitment, one income template, one inbox rule, one
-- pending candidate, one event-budget pair. The TARGET also carries an
-- October budget and a pair on the same event — both are the collisions
-- the merge must drop (target wins).
insert into public.financial_transactions
  (id, user_id, kind, note, occurred_on, updated_at)
values
  ('99999999-0000-4000-8000-0000000000e1'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'expense', 'tx on src', '2026-10-14',
   '2026-10-10 00:00:00+00'::timestamptz);
insert into public.transaction_entries
  (transaction_id, user_id, account_id, category_id, amount_minor)
values
  ('99999999-0000-4000-8000-0000000000e1'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid,
   '99999999-0000-4000-8000-0000000000a1'::uuid,
   '99999999-0000-4000-8000-0000000000c1'::uuid, -25000);
insert into public.monthly_budgets (id, user_id, category_id, month_start, limit_minor, period_kind)
values
  ('99999999-0000-4000-8000-0000000000b1'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid,
   '99999999-0000-4000-8000-0000000000c1'::uuid, '2026-10-01', 500000, 'monthly'),
  ('99999999-0000-4000-8000-0000000000b2'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid,
   '99999999-0000-4000-8000-0000000000c1'::uuid, '2026-10-12', 200000, 'weekly'),
  ('99999999-0000-4000-8000-0000000000b3'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid,
   '99999999-0000-4000-8000-0000000000c2'::uuid, '2026-10-01', 2000000, 'monthly');
insert into public.recurring_commitments
  (id, user_id, name, amount_minor, due_day, account_id, category_id)
values
  ('99999999-0000-4000-8000-0000000000d9'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'Nạp cà phê', 100000, 5,
   '99999999-0000-4000-8000-0000000000a1'::uuid,
   '99999999-0000-4000-8000-0000000000c1'::uuid);
insert into public.recurring_income_templates
  (id, user_id, name, amount_minor, due_day, account_id, category_id)
values
  ('99999999-0000-4000-8000-0000000000aa'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'Freelance', 5000000, 1,
   '99999999-0000-4000-8000-0000000000a1'::uuid,
   '99999999-0000-4000-8000-0000000000c1'::uuid);
insert into public.inbox_rules
  (user_id, priority, enabled, match_field, contains_text, category_id)
values
  ('99999999-9999-4999-8999-999999999991'::uuid, 1, true, 'merchant',
   'HIGHLANDS', '99999999-0000-4000-8000-0000000000c1'::uuid);
insert into public.inbox_candidates
  (user_id, source, kind, amount_minor, merchant, occurred_on, confidence, category_id)
values
  ('99999999-9999-4999-8999-999999999991'::uuid, 'manual', 'expense', 30000,
   'HIGHLANDS', '2026-10-14', 'high',
   '99999999-0000-4000-8000-0000000000c1'::uuid);
insert into public.event_budgets
  (id, user_id, name, start_date, end_date, limit_minor, idempotency_key, creation_intent)
values
  ('99999999-0000-4000-8000-0000000000eb'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'Tết', '2027-01-15', '2027-02-20',
   5000000, '99999999-0000-4000-8000-000000000099'::uuid,
   '{"name":"Tết"}'::jsonb);
insert into public.event_budget_categories
  (event_budget_id, user_id, category_id)
values
  ('99999999-0000-4000-8000-0000000000eb'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid,
   '99999999-0000-4000-8000-0000000000c1'::uuid),
  ('99999999-0000-4000-8000-0000000000eb'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid,
   '99999999-0000-4000-8000-0000000000c2'::uuid);

set local role authenticated;

-- 1: the merge returns per-table moved/dropped counts — entries 1,
-- budgets 1 moved + 1 dropped (tgt's October monthly wins), event lines
-- 0 moved + 1 dropped (pair already existed), commitments/templates/
-- rules/candidates 1 each.
-- jsonb reorders keys (by length then name), so compare the flattened
-- key=value list rather than the raw document.
select is(
  (select string_agg(k || '=' || (s.r ->> k), ',' order by k)
   from (select public.merge_categories(
       '99999999-0000-4000-8000-0000000000c1'::uuid,
       '99999999-0000-4000-8000-0000000000c2'::uuid) as r) s,
        jsonb_object_keys(s.r) k),
  'budgets=1,budgets_dropped=1,candidates=1,commitments=1,entries=1,event_lines=0,event_lines_dropped=1,income_templates=1,rules=1,source=99999999-0000-4000-8000-0000000000c1,target=99999999-0000-4000-8000-0000000000c2',
  'merge returns the full moved/dropped ledger'
);

-- 2: the ledger entry now points at the target.
select is(
  (select category_id from public.transaction_entries
   where transaction_id = '99999999-0000-4000-8000-0000000000e1'::uuid),
  '99999999-0000-4000-8000-0000000000c2'::uuid,
  'ledger entry reassigned to the target'
);

-- 3: target's October budget kept its own 2.000.000 limit; the source's
-- 500.000 row is gone — collision policy is target-wins, not sum.
select is(
  (select limit_minor from public.monthly_budgets
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     and category_id = '99999999-0000-4000-8000-0000000000c2'::uuid
     and month_start = '2026-10-01'),
  2000000::bigint,
  'target budget limit wins the collision'
);
select is(
  (select count(*)::integer from public.monthly_budgets
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     and category_id = '99999999-0000-4000-8000-0000000000c1'::uuid),
  0,
  'no budget row still points at the source'
);

-- 4: the weekly (non-colliding) source budget moved over.
select is(
  (select period_kind || '|' || month_start::text from public.monthly_budgets
   where id = '99999999-0000-4000-8000-0000000000b2'::uuid),
  'weekly|2026-10-12',
  'non-colliding weekly budget moved to the target'
);

-- 5: the event has exactly the target's pair left.
select is(
  (select category_id::text from public.event_budget_categories
   where event_budget_id = '99999999-0000-4000-8000-0000000000eb'::uuid),
  '99999999-0000-4000-8000-0000000000c2',
  'event pair collision resolved to the target only'
);

-- 6: commitments, templates, rules and candidates followed.
select is(
  (select count(*)::integer from (
     select category_id from public.recurring_commitments
      where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     union all
     select category_id from public.recurring_income_templates
      where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     union all
     select category_id from public.inbox_rules
      where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     union all
     select category_id from public.inbox_candidates
      where user_id = '99999999-9999-4999-8999-999999999991'::uuid) all_refs
   where category_id = '99999999-0000-4000-8000-0000000000c2'::uuid),
  4,
  'commitments, templates, rules and candidates moved'
);

-- 7: source is archived, not deleted — its name stays reserved.
select is(
  (select is_archived from public.categories
   where id = '99999999-0000-4000-8000-0000000000c1'::uuid),
  true,
  'source ends archived, never deleted'
);

-- 8: same-source merge is refused.
select throws_ok(
  'select public.merge_categories(''99999999-0000-4000-8000-0000000000c2'', ''99999999-0000-4000-8000-0000000000c2'')',
  'same_category',
  'merging a category into itself is refused'
);

-- 9: cross-kind merge is refused.
insert into public.categories (id, user_id, name, kind)
values ('99999999-0000-4000-8000-0000000000c6'::uuid,
        '99999999-9999-4999-8999-999999999991'::uuid, 'CF sau', 'expense');
select throws_ok(
  'select public.merge_categories(''99999999-0000-4000-8000-0000000000c6'', ''99999999-0000-4000-8000-0000000000c3'')',
  'category_kind_mismatch',
  'expense cannot merge into income'
);

-- 10: merging INTO an archived category is refused.
select throws_ok(
  'select public.merge_categories(''99999999-0000-4000-8000-0000000000c6'', ''99999999-0000-4000-8000-0000000000c5'')',
  'category_archived',
  'archived target is refused'
);

-- 11: a default (seeded pack) source is locked.
select throws_ok(
  'select public.merge_categories(''99999999-0000-4000-8000-0000000000c4'', ''99999999-0000-4000-8000-0000000000c2'')',
  'default_category_locked',
  'default source cannot merge away'
);

-- 12: missing rows fail closed.
select throws_ok(
  'select public.merge_categories(''99999999-0000-4000-8000-0000000000c6'', gen_random_uuid())',
  'category_not_found',
  'missing target is refused'
);

-- 13: tenant isolation — user B cannot merge user A's rows.
set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999992","role":"authenticated"}';
select throws_ok(
  'select public.merge_categories(''99999999-0000-4000-8000-0000000000c6'', ''99999999-0000-4000-8000-0000000000c2'')',
  'category_not_found',
  'cross-tenant merge is refused'
);
set local request.jwt.claims = '';

-- 14: anonymous callers are rejected before any row work.
select throws_ok(
  'select public.merge_categories(gen_random_uuid(), gen_random_uuid())',
  'authentication_required',
  'anonymous merge is refused'
);

select * from finish();
rollback;
