begin;
select plan(58);

-- One permanent contract for candidate review + ledger posting. The candidate
-- row is the idempotency anchor; all assertions run against the real RPCs.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'authenticated', 'authenticated', 'inbox-approval-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Inbox Approval A"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d52'::uuid,
  'authenticated', 'authenticated', 'inbox-approval-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Inbox Approval B"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.accounts (
  id, user_id, name, kind, currency_code, initial_balance_minor
) values
(
  '517b40d0-ae5b-4976-810b-bd785d87a001'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'Disposable candidate account', 'cash', 'VND', 0
),
(
  '517b40d0-ae5b-4976-810b-bd785d87a002'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'Transfer destination', 'savings', 'VND', 0
),
(
  '517b40d0-ae5b-4976-810b-bd785d87a003'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'USD destination', 'bank', 'USD', 0
);

insert into public.categories (
  id, user_id, name, kind, is_default
) values (
  '517b40d0-ae5b-4976-810b-bd785d87d001'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'Disposable candidate category', 'expense', false
);

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map
) values (
  '517b40d0-ae5b-4976-810b-bd785d87b001'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'approval-test.csv', 'csv', 'committed', 1, 0, 0, 1,
  '[]'::jsonb, '{}'::jsonb
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, possible_duplicate, import_batch_id, account_id,
  category_id
) values
(
  '517b40d0-ae5b-4976-810b-bd785d87c001'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 45000, 'Original cafe', '', current_date, 'manual',
  'high', 'pending', false, null, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c002'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'transfer', 50000, 'Original transfer', '', current_date, 'manual',
  'high', 'pending', false, null, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c003'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 1000, 'Invalid account', '', current_date, 'manual',
  'high', 'pending', false, null, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c004'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 1000, 'Rejected candidate', '', current_date, 'manual',
  'high', 'rejected', false, null, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c005'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d52'::uuid,
  'expense', 1000, 'Other tenant', '', current_date, 'manual',
  'high', 'pending', false, null, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c006'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 1000, 'Batch link', '', current_date, 'csv',
  'high', 'pending', false,
  '517b40d0-ae5b-4976-810b-bd785d87b001'::uuid, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c007'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 1000, 'Account link', '', current_date, 'manual',
  'high', 'pending', false, null,
  '517b40d0-ae5b-4976-810b-bd785d87a001'::uuid, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c008'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 1000, 'Category link', '', current_date, 'manual',
  'high', 'pending', false, null, null,
  '517b40d0-ae5b-4976-810b-bd785d87d001'::uuid
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c009'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 1000, 'Invalid amount', '', current_date, 'manual',
  'high', 'pending', false, null, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c010'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 1000, 'Invalid category', '', current_date, 'manual',
  'high', 'pending', false, null, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c011'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'transfer', 1000, 'Invalid currency', '', current_date, 'manual',
  'high', 'pending', false, null, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c012'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 1000, 'Invalid date', '', current_date, 'manual',
  'high', 'pending', false, null, null, null
),
(
  '517b40d0-ae5b-4976-810b-bd785d87c013'::uuid,
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'expense', 1000, 'Invalid note', '', current_date, 'manual',
  'high', 'pending', false, null, null, null
);

select has_function(
  'public',
  'approve_inbox_candidate',
  array[
    'uuid', 'transaction_kind', 'bigint', 'text', 'text', 'date', 'uuid',
    'uuid', 'uuid', 'boolean'
  ],
  'atomic Inbox approval RPC exists'
);

select col_type_is(
  'public', 'inbox_candidates', 'financial_transaction_id', 'uuid',
  'candidate transaction link uses uuid'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inbox_candidates'::regclass
      and conname = 'inbox_candidates_financial_transaction_owner_fkey'
  ),
  'candidate transaction link has a tenant composite foreign key'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'inbox_candidates'
      and indexname = 'inbox_candidates_user_financial_transaction_uidx'
  ),
  'one financial transaction can link to at most one candidate'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.approve_inbox_candidate(uuid,public.transaction_kind,bigint,text,text,date,uuid,uuid,uuid,boolean)',
    'EXECUTE'
  ),
  'authenticated can execute atomic approval'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.approve_inbox_candidate(uuid,public.transaction_kind,bigint,text,text,date,uuid,uuid,uuid,boolean)',
    'EXECUTE'
  ),
  'anon cannot execute atomic approval'
);

select ok(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.inbox_candidates'::regclass
      and conname = 'inbox_candidates_import_batch_id_user_id_fkey'
  ) like '%ON DELETE SET NULL (import_batch_id)%',
  'import batch deletion clears only the optional reference'
);

select ok(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.inbox_candidates'::regclass
      and conname = 'inbox_candidates_account_id_user_id_fkey'
  ) like '%ON DELETE SET NULL (account_id)%',
  'account deletion clears only the optional reference'
);

select ok(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.inbox_candidates'::regclass
      and conname = 'inbox_candidates_category_id_user_id_fkey'
  ) like '%ON DELETE SET NULL (category_id)%',
  'category deletion clears only the optional reference'
);

set local request.jwt.claims =
  '{"sub":"517b40d0-ae5b-4976-810b-bd785d873d51","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c001'::uuid,
      'expense'::public.transaction_kind,
      45000::bigint,
      'Edited cafe',
      'Cafe',
      current_date,
      (select id from public.accounts
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and name = 'Tiền mặt'),
      (select id from public.categories
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and kind = 'expense'
       order by created_at, id limit 1),
      null::uuid,
      false
    )
  $$,
  'expense candidate approval succeeds'
);

select is(
  (select status::text from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c001'),
  'approved',
  'expense candidate becomes approved'
);

select ok(
  (select financial_transaction_id is not null
   from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c001'),
  'expense candidate stores its transaction link'
);

select is(
  (select count(*)::integer
   from public.financial_transactions transaction_record
   join public.inbox_candidates candidate
     on candidate.financial_transaction_id = transaction_record.id
    and candidate.user_id = transaction_record.user_id
   where candidate.id = '517b40d0-ae5b-4976-810b-bd785d87c001'),
  1,
  'expense approval creates exactly one linked transaction'
);

select is(
  (select transaction_record.kind::text
   from public.financial_transactions transaction_record
   join public.inbox_candidates candidate
     on candidate.financial_transaction_id = transaction_record.id
   where candidate.id = '517b40d0-ae5b-4976-810b-bd785d87c001'),
  'expense',
  'linked expense transaction has the reviewed kind'
);

select is(
  (select count(*)::integer
   from public.transaction_entries entry
   where entry.transaction_id = (
     select financial_transaction_id from public.inbox_candidates
     where id = '517b40d0-ae5b-4976-810b-bd785d87c001'
   )),
  1,
  'expense approval creates one ledger entry'
);

select is(
  (select amount_minor
   from public.transaction_entries
   where transaction_id = (
     select financial_transaction_id from public.inbox_candidates
     where id = '517b40d0-ae5b-4976-810b-bd785d87c001'
   )),
  (-45000)::bigint,
  'expense approval preserves the negative ledger sign'
);

select is(
  (select merchant from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c001'),
  'Edited cafe',
  'candidate stores reviewed merchant'
);

select is(
  (select note from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c001'),
  'Cafe',
  'candidate stores the posted note'
);

select is(
  public.approve_inbox_candidate(
    '517b40d0-ae5b-4976-810b-bd785d87c001'::uuid,
    'expense'::public.transaction_kind,
    999999::bigint,
    'Retry must not edit',
    'Retry must not edit',
    current_date,
    '00000000-0000-0000-0000-000000000099'::uuid,
    null::uuid,
    null::uuid,
    true
  ),
  (select financial_transaction_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c001'),
  'retry returns the original linked transaction'
);

select is(
  (select merchant from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c001'),
  'Edited cafe',
  'retry does not mutate the reviewed candidate'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'),
  1,
  'expense retry creates no second transaction'
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = (
     select financial_transaction_id from public.inbox_candidates
     where id = '517b40d0-ae5b-4976-810b-bd785d87c001'
   )),
  1,
  'expense retry creates no extra ledger entry'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c003'::uuid,
      'expense'::public.transaction_kind,
      1000::bigint,
      'Invalid account',
      'Invalid account',
      current_date,
      '00000000-0000-0000-0000-000000000099'::uuid,
      (select id from public.categories
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and kind = 'expense'
       order by created_at, id limit 1),
      null::uuid,
      false
    )
  $$,
  'P0001',
  'account_not_found',
  'invalid account rejects the whole approval'
);

select is(
  (select status::text from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c003'),
  'pending',
  'failed account validation leaves candidate pending'
);

select is(
  (select financial_transaction_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c003'),
  null::uuid,
  'failed account validation leaves candidate unlinked'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'),
  1,
  'failed account validation creates no transaction'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c004'::uuid,
      'expense'::public.transaction_kind,
      1000::bigint,
      'Rejected',
      'Rejected',
      current_date,
      (select id from public.accounts
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and kind = 'expense'
       order by created_at, id limit 1),
      null::uuid,
      false
    )
  $$,
  'P0001',
  'candidate_already_reviewed',
  'rejected candidate cannot create a transaction'
);

select is(
  (select financial_transaction_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c004'),
  null::uuid,
  'rejected candidate remains unlinked'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c005'::uuid,
      'expense'::public.transaction_kind,
      1000::bigint,
      'Other tenant',
      'Other tenant',
      current_date,
      (select id from public.accounts
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and kind = 'expense'
       order by created_at, id limit 1),
      null::uuid,
      false
    )
  $$,
  'P0001',
  'candidate_not_found',
  'tenant A cannot approve tenant B candidate'
);

reset role;

select is(
  (select status::text from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c005'),
  'pending',
  'cross-tenant attempt leaves tenant B candidate pending'
);

set local role authenticated;

select lives_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c002'::uuid,
      'transfer'::public.transaction_kind,
      50000::bigint,
      'Savings transfer',
      'Savings transfer',
      current_date,
      (select id from public.accounts
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and name = 'Tiền mặt'),
      null::uuid,
      '517b40d0-ae5b-4976-810b-bd785d87a002'::uuid,
      false
    )
  $$,
  'transfer candidate approval succeeds'
);

select is(
  (select status::text from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c002'),
  'approved',
  'transfer candidate becomes approved'
);

select is(
  (select kind::text from public.financial_transactions
   where id = (
     select financial_transaction_id from public.inbox_candidates
     where id = '517b40d0-ae5b-4976-810b-bd785d87c002'
   )),
  'transfer',
  'transfer candidate links a transfer transaction'
);

select is(
  (select count(*)::integer from public.transaction_entries
   where transaction_id = (
     select financial_transaction_id from public.inbox_candidates
     where id = '517b40d0-ae5b-4976-810b-bd785d87c002'
   )),
  2,
  'transfer approval creates exactly two entries'
);

select is(
  (select sum(amount_minor)::bigint from public.transaction_entries
   where transaction_id = (
     select financial_transaction_id from public.inbox_candidates
     where id = '517b40d0-ae5b-4976-810b-bd785d87c002'
   )),
  0::bigint,
  'transfer approval entries sum to zero'
);

select is(
  (select count(*)::integer from public.transaction_entries
   where transaction_id = (
     select financial_transaction_id from public.inbox_candidates
     where id = '517b40d0-ae5b-4976-810b-bd785d87c002'
   )
     and category_id is not null),
  0,
  'transfer approval never assigns a category'
);

select is(
  public.approve_inbox_candidate(
    '517b40d0-ae5b-4976-810b-bd785d87c002'::uuid,
    'transfer'::public.transaction_kind,
    1::bigint,
    'Retry',
    'Retry',
    current_date,
    '00000000-0000-0000-0000-000000000099'::uuid,
    null::uuid,
    '00000000-0000-0000-0000-000000000098'::uuid,
    true
  ),
  (select financial_transaction_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c002'),
  'transfer retry returns the original transaction'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'),
  2,
  'successful approvals create exactly two user transactions'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c009'::uuid,
      'expense'::public.transaction_kind,
      (-1)::bigint,
      'Invalid amount',
      'Invalid amount',
      current_date,
      (select id from public.accounts
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and kind = 'expense'
       order by created_at, id limit 1),
      null::uuid,
      false
    )
  $$,
  'P0001',
  'amount_must_be_positive',
  'invalid amount rolls back approval'
);

select is(
  (select status::text || ':' || coalesce(financial_transaction_id::text, 'null')
   from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c009'),
  'pending:null',
  'invalid amount leaves candidate unchanged'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c010'::uuid,
      'expense'::public.transaction_kind,
      1000::bigint,
      'Invalid category',
      'Invalid category',
      current_date,
      (select id from public.accounts
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and kind = 'income'
       order by created_at, id limit 1),
      null::uuid,
      false
    )
  $$,
  'P0001',
  'category_kind_mismatch',
  'wrong category kind rolls back approval'
);

select is(
  (select status::text || ':' || coalesce(financial_transaction_id::text, 'null')
   from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c010'),
  'pending:null',
  'wrong category kind leaves candidate unchanged'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c011'::uuid,
      'transfer'::public.transaction_kind,
      1000::bigint,
      'Invalid currency',
      'Invalid currency',
      current_date,
      (select id from public.accounts
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and name = 'Tiền mặt'),
      null::uuid,
      '517b40d0-ae5b-4976-810b-bd785d87a003'::uuid,
      false
    )
  $$,
  'P0001',
  'currency_mismatch',
  'cross-currency transfer rolls back approval'
);

select is(
  (select status::text || ':' || coalesce(financial_transaction_id::text, 'null')
   from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c011'),
  'pending:null',
  'currency mismatch leaves candidate unchanged'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c012'::uuid,
      'expense'::public.transaction_kind,
      1000::bigint,
      'Invalid date',
      'Invalid date',
      null::date,
      (select id from public.accounts
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and kind = 'expense'
       order by created_at, id limit 1),
      null::uuid,
      false
    )
  $$,
  'P0001',
  'invalid_date',
  'invalid date rolls back approval'
);

select is(
  (select status::text || ':' || coalesce(financial_transaction_id::text, 'null')
   from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c012'),
  'pending:null',
  'invalid date leaves candidate unchanged'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '517b40d0-ae5b-4976-810b-bd785d87c013'::uuid,
      'expense'::public.transaction_kind,
      1000::bigint,
      'Invalid note',
      repeat('x', 501),
      current_date,
      (select id from public.accounts
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'
         and kind = 'expense'
       order by created_at, id limit 1),
      null::uuid,
      false
    )
  $$,
  'P0001',
  'note_too_long',
  'oversized note rolls back approval'
);

select is(
  (select status::text || ':' || coalesce(financial_transaction_id::text, 'null')
   from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c013'),
  'pending:null',
  'oversized note leaves candidate unchanged'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '517b40d0-ae5b-4976-810b-bd785d873d51'),
  2,
  'all rejected approval attempts leave the ledger unchanged'
);

select lives_ok(
  $$
    delete from public.import_batches
    where id = '517b40d0-ae5b-4976-810b-bd785d87b001'
  $$,
  'deleting an import batch with candidates succeeds'
);

select is(
  (select import_batch_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c006'),
  null::uuid,
  'import batch deletion clears the candidate batch reference'
);

select is(
  (select user_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c006'),
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'import batch deletion preserves candidate ownership'
);

select lives_ok(
  $$
    delete from public.accounts
    where id = '517b40d0-ae5b-4976-810b-bd785d87a001'
  $$,
  'deleting an optional candidate account succeeds'
);

select is(
  (select account_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c007'),
  null::uuid,
  'account deletion clears the candidate account reference'
);

select is(
  (select user_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c007'),
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'account deletion preserves candidate ownership'
);

select lives_ok(
  $$
    delete from public.categories
    where id = '517b40d0-ae5b-4976-810b-bd785d87d001'
  $$,
  'deleting an optional candidate category succeeds'
);

select is(
  (select category_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c008'),
  null::uuid,
  'category deletion clears the candidate category reference'
);

select is(
  (select user_id from public.inbox_candidates
   where id = '517b40d0-ae5b-4976-810b-bd785d87c008'),
  '517b40d0-ae5b-4976-810b-bd785d873d51'::uuid,
  'category deletion preserves candidate ownership'
);

reset role;
select * from finish();
rollback;
