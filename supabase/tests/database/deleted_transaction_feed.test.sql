begin;
select plan(36);

-- deleted_transaction_feed: the trash surface's read model. It must show a
-- tenant only their own soft-deleted rows, exclude active rows, carry the
-- transaction_feed projection verbatim plus deleted_at, and stay unreadable
-- to anon. Soft-delete guards (recurring, reconciled) keep those rows out of
-- the trash entirely.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000',
  '33300000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'trash-owner@example.invalid',
  crypt('discarded', gen_salt('bf')), now(), '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Trash Owner"}', now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  '33300000-0000-4000-8000-000000000002',
  'authenticated', 'authenticated', 'trash-other@example.invalid',
  crypt('discarded', gen_salt('bf')), now(), '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Trash Other"}', now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"33300000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

create temporary table trash_ids (
  key text primary key,
  id uuid not null
) on commit drop;

insert into trash_ids (key, id)
select 'account', id from public.accounts
  where user_id = auth.uid() order by created_at, id limit 1;
insert into trash_ids (key, id)
select 'expense_cat', id from public.categories
  where user_id = auth.uid() and kind = 'expense'
  order by created_at, id limit 1;
insert into trash_ids (key, id)
select 'income_cat', id from public.categories
  where user_id = auth.uid() and kind = 'income'
  order by created_at, id limit 1;

select lives_ok(
  $$ insert into trash_ids
     select 'account_2', public.create_financial_account(
       'Trash savings', 'savings'::public.account_kind, 0, 'VND') $$,
  'creates a second account for the transfer fixture'
);

select lives_ok(
  $$ insert into trash_ids
     select 'expense-1', public.create_money_transaction(
       (select id from trash_ids where key = 'account'),
       (select id from trash_ids where key = 'expense_cat'),
       'expense', 63000, current_date, 'Trash expense one',
       '33310000-0000-4000-8000-000000000001', 'Quán Sáng') $$,
  'creates first expense fixture with a payee'
);

select lives_ok(
  $$ insert into trash_ids
     select 'expense-2', public.create_money_transaction(
       (select id from trash_ids where key = 'account'),
       (select id from trash_ids where key = 'expense_cat'),
       'expense', 22000, current_date, 'Trash expense two',
       '33310000-0000-4000-8000-000000000002') $$,
  'creates second expense fixture (stays active)'
);

select lives_ok(
  $$ insert into trash_ids
     select 'income', public.create_money_transaction(
       (select id from trash_ids where key = 'account'),
       (select id from trash_ids where key = 'income_cat'),
       'income', 33000, current_date, 'Trash income',
       '33310000-0000-4000-8000-000000000003') $$,
  'creates income fixture'
);

select lives_ok(
  $$ insert into trash_ids
     select 'transfer', public.create_account_transfer(
       (select id from trash_ids where key = 'account'),
       (select id from trash_ids where key = 'account_2'),
       44000, current_date, 'Trash transfer',
       '33310000-0000-4000-8000-000000000004') $$,
  'creates transfer fixture'
);

select lives_ok(
  $$ insert into trash_ids
     select 'commitment', public.upsert_recurring_commitment(
       null, 'Trash recurring', 55000, 5,
       (select id from trash_ids where key = 'account'),
       (select id from trash_ids where key = 'expense_cat')) $$,
  'creates recurring commitment fixture'
);

select lives_ok(
  $$ insert into trash_ids
     select 'recurring', public.pay_recurring_commitment(
       (select id from trash_ids where key = 'commitment'),
       date_trunc('month', current_date)::date,
       current_date,
       '33310000-0000-4000-8000-000000000006') $$,
  'creates recurring payment fixture'
);

select is(
  public.soft_delete_money_transaction(
    (select id from trash_ids where key = 'expense-1')),
  true,
  'soft delete removes the first expense'
);

select is(
  public.soft_delete_money_transaction(
    (select id from trash_ids where key = 'income')),
  true,
  'soft delete removes the income row'
);

select is(
  public.soft_delete_money_transaction(
    (select id from trash_ids where key = 'transfer')),
  true,
  'soft delete removes the transfer row'
);

select throws_ok(
  $$ select public.soft_delete_money_transaction(
       (select id from trash_ids where key = 'recurring')) $$,
  'recurring_payment_locked',
  'recurring payment rows cannot enter the trash'
);

-- Backdate deleted_at so the ordering assertion is deterministic (now() is
-- fixed inside a transaction, so all three deletes share one timestamp).
set local role postgres;
update public.financial_transactions
set deleted_at = now() - interval '2 hours'
where id = (select id from trash_ids where key = 'expense-1');
update public.financial_transactions
set deleted_at = now() - interval '1 hour'
where id = (select id from trash_ids where key = 'income');
set local request.jwt.claims = '{"sub":"33300000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer from public.deleted_transaction_feed),
  3,
  'deleted feed shows exactly the three tombstoned rows'
);

select is(
  (select count(*)::integer from public.deleted_transaction_feed
   where deleted_at is null),
  0,
  'every deleted feed row carries its tombstone timestamp'
);

select is(
  (select payee from public.deleted_transaction_feed
   where id = (select id from trash_ids where key = 'expense-1')),
  'Quán Sáng',
  'deleted feed mirrors the payee projection'
);

select is(
  (select note from public.deleted_transaction_feed
   where id = (select id from trash_ids where key = 'income')),
  'Trash income',
  'deleted feed mirrors the note projection'
);

select is(
  (select amount_minor from public.deleted_transaction_feed
   where id = (select id from trash_ids where key = 'transfer')),
  44000::bigint,
  'deleted feed mirrors the transfer amount projection'
);

select is(
  (select category_name from public.deleted_transaction_feed
   where id = (select id from trash_ids where key = 'transfer')),
  null::text,
  'transfer rows carry no category (mapped to Chuyển tiền in TS)'
);

select is(
  (select count(*)::integer from public.deleted_transaction_feed
   where id = (select id from trash_ids where key = 'expense-2')),
  0,
  'active rows are excluded from the deleted feed'
);

select is(
  (select count(*)::integer from public.deleted_transaction_feed
   where id = (select id from trash_ids where key = 'recurring')),
  0,
  'the locked recurring row never reaches the trash feed'
);

select is(
  (select count(*)::integer from public.transaction_feed
   where id = (select id from trash_ids where key = 'expense-1')),
  0,
  'transaction_feed still hides the deleted row'
);

select is(
  (select array_agg(id::text) from public.deleted_transaction_feed),
  array[
    (select id::text from trash_ids where key = 'transfer'),
    (select id::text from trash_ids where key = 'income'),
    (select id::text from trash_ids where key = 'expense-1')
  ],
  'deleted feed returns newest-deleted first'
);

select ok(
  (select coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']::text[]
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = 'deleted_transaction_feed'
     and c.relkind = 'v'),
  'deleted feed executes with caller security'
);

select ok(
  has_table_privilege('authenticated', 'public.deleted_transaction_feed', 'SELECT'),
  'authenticated can read the deleted feed'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'financial_transactions'
      and indexname = 'financial_transactions_user_deleted_idx'
  ),
  'partial index on deleted rows exists'
);

-- Tenant isolation: B sees none of A's tombstones, then only its own.
set local request.jwt.claims = '{"sub":"33300000-0000-4000-8000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::integer from public.deleted_transaction_feed),
  0,
  'tenant B cannot see tenant A deleted rows'
);

select lives_ok(
  $$ insert into trash_ids
     select 'b-tx', public.create_money_transaction(
       (select id from public.accounts where user_id = auth.uid()
        order by created_at, id limit 1),
       (select id from public.categories where user_id = auth.uid()
        and kind = 'expense' order by created_at, id limit 1),
       'expense', 9000, current_date, 'Tenant B row',
       '33310000-0000-4000-8000-000000000005') $$,
  'tenant B creates its own row'
);

select is(
  public.soft_delete_money_transaction(
    (select id from trash_ids where key = 'b-tx')),
  true,
  'tenant B soft-deletes its own row'
);

select is(
  (select count(*)::integer from public.deleted_transaction_feed),
  1,
  'tenant B sees only its own deleted rows'
);

select is(
  (select id::text from public.deleted_transaction_feed),
  (select id::text from trash_ids where key = 'b-tx'),
  'the only row tenant B sees is its own'
);

-- anon must not read tombstones at all.
set local role anon;

select throws_ok(
  $$ select count(*) from public.deleted_transaction_feed $$,
  '42501',
  null,
  'anon cannot read the deleted feed'
);

-- Restore removes the tombstone and returns the row to the live feed.
set local request.jwt.claims = '{"sub":"33300000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  public.restore_money_transaction(
    (select id from trash_ids where key = 'expense-1')),
  true,
  'restore clears the tombstone'
);

select is(
  (select count(*)::integer from public.deleted_transaction_feed
   where id = (select id from trash_ids where key = 'expense-1')),
  0,
  'restored row leaves the deleted feed'
);

select is(
  (select count(*)::integer from public.transaction_feed
   where id = (select id from trash_ids where key = 'expense-1')),
  1,
  'restored row rejoins the live feed'
);

-- Cleared entries fall back to pending when a row is deleted — the trash copy
-- must never promise cleared state survives a delete+restore round trip.
set local role postgres;
update public.transaction_entries
set reconciliation_state = 'cleared', cleared_at = now()
where transaction_id = (select id from trash_ids where key = 'expense-2')
  and user_id = '33300000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"33300000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  public.soft_delete_money_transaction(
    (select id from trash_ids where key = 'expense-2')),
  true,
  'cleared row can still be deleted'
);

select is(
  (select reconciliation_state::text from public.transaction_entries
   where transaction_id = (select id from trash_ids where key = 'expense-2')
     and user_id = auth.uid()),
  'pending',
  'deleting a cleared row resets its entries to pending'
);

-- Reconciled rows can never reach the trash: the guard blocks the deleted_at
-- update outright.
set local role postgres;
with recon as (
  insert into public.account_reconciliations (
    user_id, account_id, statement_date, statement_balance_minor, status,
    completed_at, calculated_balance_minor, pending_account_leg_count,
    cleared_account_leg_count, reconciled_account_leg_count
  ) values (
    '33300000-0000-4000-8000-000000000001',
    (select id from trash_ids where key = 'account'),
    current_date, -63000::bigint, 'completed',
    now(), -63000::bigint, 0::bigint, 0::bigint, 1::bigint
  )
  returning id
)
update public.transaction_entries
set reconciliation_state = 'reconciled',
    cleared_at = now(),
    reconciliation_id = (select id from recon)
where transaction_id = (select id from trash_ids where key = 'expense-1')
  and user_id = '33300000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"33300000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$ select public.soft_delete_money_transaction(
       (select id from trash_ids where key = 'expense-1')) $$,
  'transaction_reconciled',
  'reconciled rows cannot be deleted, so they never appear in the trash'
);

select * from finish();
rollback;
