-- D13 report_exclusions (20261016200000): excluded_from_reports on
-- financial_transactions, its feed/deleted-feed projection, and the
-- set_transaction_report_exclusion write seam.

begin;
select plan(13);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  'authenticated', 'authenticated', 'excl-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Excl A"}'::jsonb,
  now(), now(), '', '', false, false
), (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '88888888-8888-4888-8888-888888888882'::uuid,
  'authenticated', 'authenticated', 'excl-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Excl B"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.accounts (id, user_id, name, kind, currency_code)
values (
  '88888888-0000-4000-8000-0000000000a1'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  'Excl wallet', 'cash', 'VND'
), (
  '88888888-0000-4000-8000-0000000000a2'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  'Excl wallet 2', 'cash', 'VND'
);
insert into public.categories (id, user_id, name, kind)
values (
  '88888888-0000-4000-8000-0000000000c1'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid, 'Food', 'expense'
);

-- e1: ordinary expense (flag target). t1: transfer (kind-locked).
-- d1: tombstoned expense (deleted-feed projection).
insert into public.financial_transactions
  (id, user_id, kind, note, occurred_on, deleted_at, updated_at)
values
  -- e1 seeds a fixed updated_at so the no-bump assertion below has a
  -- stable value to compare against.
  ('88888888-0000-4000-8000-0000000000e1'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'expense', 'e1', '2026-10-14',
   null, '2026-10-10 00:00:00+00'::timestamptz),
  ('88888888-0000-4000-8000-0000000000d1'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'transfer', 't1', '2026-10-14',
   null, '2026-10-10 00:00:00+00'::timestamptz),
  ('88888888-0000-4000-8000-0000000000d2'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid, 'expense', 'd1', '2026-10-14',
   now(), '2026-10-10 00:00:00+00'::timestamptz);
insert into public.transaction_entries
  (transaction_id, user_id, account_id, category_id, amount_minor)
values
  ('88888888-0000-4000-8000-0000000000e1'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-0000-4000-8000-0000000000c1'::uuid, -100000),
  ('88888888-0000-4000-8000-0000000000d1'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid, null, -50000),
  ('88888888-0000-4000-8000-0000000000d1'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a2'::uuid, null, 50000),
  ('88888888-0000-4000-8000-0000000000d2'::uuid,
   '88888888-8888-4888-8888-888888888881'::uuid,
   '88888888-0000-4000-8000-0000000000a1'::uuid,
   '88888888-0000-4000-8000-0000000000c1'::uuid, -70000);

set local request.jwt.claims =
  '{"sub":"88888888-8888-4888-8888-888888888881","role":"authenticated"}';
set local role authenticated;

-- 1: the column exists, is NOT NULL and defaults to false.
select is(
  (select is_nullable || '|' || coalesce(column_default, '')
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'financial_transactions'
     and column_name = 'excluded_from_reports'),
  'NO|false',
  'excluded_from_reports is NOT NULL default false'
);

-- 2: feed emits the flag for a live row.
select is(
  (select excluded_from_reports from public.transaction_feed
   where id = '88888888-0000-4000-8000-0000000000e1'::uuid),
  false,
  'transaction_feed exposes excluded_from_reports'
);

-- 3: the trash mirror answers the same column.
select is(
  (select excluded_from_reports from public.deleted_transaction_feed
   where id = '88888888-0000-4000-8000-0000000000d2'::uuid),
  false,
  'deleted_transaction_feed exposes excluded_from_reports'
);

-- 4: flag on through the row update seam — the edit-form write path.
select is(
  public.update_money_transaction(
    '88888888-0000-4000-8000-0000000000e1'::uuid,
    '88888888-0000-4000-8000-0000000000a1'::uuid,
    '88888888-0000-4000-8000-0000000000c1'::uuid,
    'expense', 100000, '2026-10-14', 'e1', '', null, null, false, true),
  '88888888-0000-4000-8000-0000000000e1'::uuid,
  'flag on via update_money_transaction returns the row id'
);
select is(
  (select excluded_from_reports from public.transaction_feed
   where id = '88888888-0000-4000-8000-0000000000e1'::uuid),
  true,
  'feed row reflects the flag'
);

-- 5: a later update that leaves the param at its null default must
-- preserve the flag — the token still rotates (updated_at is bumped by
-- transactions_set_updated_at on every write).
select public.update_money_transaction(
  '88888888-0000-4000-8000-0000000000e1'::uuid,
  '88888888-0000-4000-8000-0000000000a1'::uuid,
  '88888888-0000-4000-8000-0000000000c1'::uuid,
  'expense', 100000, '2026-10-14', 'e1 renamed', '', null, null, false, null);
select is(
  (select excluded_from_reports || '|' || note
   from public.financial_transactions
   where id = '88888888-0000-4000-8000-0000000000e1'::uuid),
  'true|e1 renamed',
  'null flag param preserves the stored value while fields update'
);
select isnt(
  (select updated_at::text from public.financial_transactions
   where id = '88888888-0000-4000-8000-0000000000e1'::uuid),
  '2026-10-10 00:00:00+00',
  'row updates still rotate the concurrency token'
);

-- 6: a stale expectation still fails closed.
select throws_ok(
  format(
    'select public.update_money_transaction(%L, %L, %L, ''expense'', 100000, ''2026-10-14'', ''x'', '''', %L::timestamptz, null, false, true)',
    '88888888-0000-4000-8000-0000000000e1',
    '88888888-0000-4000-8000-0000000000a1',
    '88888888-0000-4000-8000-0000000000c1',
    '2001-01-01 00:00:00+00'),
  'stale_write',
  'stale p_expected_updated_at is rejected'
);

-- 7: flag back off — toggling is not one-way.
select public.update_money_transaction(
  '88888888-0000-4000-8000-0000000000e1'::uuid,
  '88888888-0000-4000-8000-0000000000a1'::uuid,
  '88888888-0000-4000-8000-0000000000c1'::uuid,
  'expense', 100000, '2026-10-14', 'e1', '', null, null, false, false);
select is(
  (select excluded_from_reports from public.financial_transactions
   where id = '88888888-0000-4000-8000-0000000000e1'::uuid),
  false,
  'flag toggles back off'
);

-- 8: a reconciled row can still be flagged — the guard exempts the
-- report-scope flag (it is metadata, not a ledger fact). Mark e1's
-- entry reconciled, then flip the flag through an identical update.
-- (reconciliation_state has no authenticated write path — the mark is
-- seeded as the test role, then the update runs as the tenant again.)
reset role;
-- reconciled needs cleared_at + a reconciliation row (the shape check
-- and the (id,user_id,account_id) composite FK both demand it).
insert into public.account_reconciliations
  (id, user_id, account_id, statement_date, statement_balance_minor, status,
   completed_at, calculated_balance_minor, pending_account_leg_count,
   cleared_account_leg_count, reconciled_account_leg_count)
values (
  '88888888-0000-4000-8000-0000000000f1'::uuid,
  '88888888-8888-4888-8888-888888888881'::uuid,
  '88888888-0000-4000-8000-0000000000a1'::uuid,
  '2026-10-14', 0, 'completed', now(), 0, 0, 0, 1);
update public.transaction_entries
set reconciliation_state = 'reconciled',
    cleared_at = now(),
    reconciliation_id = '88888888-0000-4000-8000-0000000000f1'::uuid
where transaction_id = '88888888-0000-4000-8000-0000000000e1'::uuid;
set local role authenticated;
select lives_ok(
  format(
    'select public.update_money_transaction(%L, %L, %L, ''expense'', 100000, ''2026-10-14'', ''e1'', '''', null, null, false, true)',
    '88888888-0000-4000-8000-0000000000e1',
    '88888888-0000-4000-8000-0000000000a1',
    '88888888-0000-4000-8000-0000000000c1'),
  'reconciled row accepts a flag-only update'
);

-- 9: transfers are kind-locked — flagging one via the update seam hits
-- the existing transfer guard (a flag on a transfer would be dead UI).
select throws_ok(
  format(
    'select public.update_money_transaction(%L, %L, %L, ''expense'', 50000, ''2026-10-14'', ''t'', '''', null, null, false, true)',
    '88888888-0000-4000-8000-0000000000d1',
    '88888888-0000-4000-8000-0000000000a1',
    '88888888-0000-4000-8000-0000000000c1'),
  'transaction_kind_locked',
  'transfers stay locked — the flag never reaches them'
);

-- 10: tenant isolation — user B cannot flag user A's row.
set local request.jwt.claims =
  '{"sub":"88888888-8888-4888-8888-888888888882","role":"authenticated"}';
select throws_ok(
  format(
    'select public.update_money_transaction(%L, %L, %L, ''expense'', 100000, ''2026-10-14'', ''x'', '''', null, null, false, true)',
    '88888888-0000-4000-8000-0000000000e1',
    '88888888-0000-4000-8000-0000000000a1',
    '88888888-0000-4000-8000-0000000000c1'),
  'transaction_not_found',
  'cross-tenant flag write is refused'
);
set local request.jwt.claims = '';

-- 11: anonymous callers are rejected before any row work.
select throws_ok(
  format(
    'select public.update_money_transaction(%L, %L, %L, ''expense'', 100000, ''2026-10-14'', ''x'', '''', null, null, false, true)',
    '88888888-0000-4000-8000-0000000000e1',
    '88888888-0000-4000-8000-0000000000a1',
    '88888888-0000-4000-8000-0000000000c1'),
  'authentication_required',
  'anonymous write is refused'
);

select * from finish();
rollback;
