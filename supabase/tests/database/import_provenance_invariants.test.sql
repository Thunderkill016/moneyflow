begin;
select plan(38);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '18200000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'import-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Import Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '18200000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'import-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Import Other"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"18200000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$
    select public.create_financial_account(
      'Import destination',
      'savings'::public.account_kind,
      0::bigint,
      'VND'
    )
  $$,
  'owner can create a second VND account for transfer approval'
);

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map, parser_version,
  mapping_version
) values (
  '18210000-0000-4000-8000-000000000001'::uuid,
  '18200000-0000-4000-8000-000000000001'::uuid,
  'statement.csv',
  'csv',
  'committed',
  8,
  0,
  0,
  1,
  '["date","description","amount"]'::jsonb,
  '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb,
  'csv_import@2.0',
  2
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, source_external_id,
  parser_version, mapping_version
) values (
  '18220000-0000-4000-8000-000000000001'::uuid,
  '18200000-0000-4000-8000-000000000001'::uuid,
  'expense',
  63000,
  'Lunch Shop',
  'Cơm trưa',
  '2026-07-14',
  'csv',
  'high',
  'pending',
  (select id from public.categories
   where user_id = '18200000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '18200000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '18200000-0000-4000-8000-000000000001'
     and name <> 'Import destination'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '18200000-0000-4000-8000-000000000001'
     and name <> 'Import destination'
   order by created_at, id limit 1),
  '14/07 Lunch Shop -63000',
  '18210000-0000-4000-8000-000000000001'::uuid,
  2,
  'bank-row-001',
  'csv_import@2.0',
  2
);

select is(
  public.plan_inbox_candidate('18220000-0000-4000-8000-000000000001'::uuid) ->> 'status',
  'would_create',
  'first imported candidate would create a transaction'
);

select is(
  public.plan_inbox_candidate('18220000-0000-4000-8000-000000000001'::uuid) ->> 'reason',
  'no_server_match',
  'first imported candidate has no server duplicate reason'
);

create temporary table import_test_ids (
  key text primary key,
  id uuid not null
) on commit drop;

select lives_ok(
  $$
    insert into import_test_ids (key, id)
    select 'first', public.approve_inbox_candidate(
      '18220000-0000-4000-8000-000000000001'::uuid,
      'expense'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18200000-0000-4000-8000-000000000001'
         and name <> 'Import destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '18200000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      null,
      63000,
      '2026-07-14',
      'Cơm trưa',
      '18230000-0000-4000-8000-000000000001'::uuid,
      false
    )
  $$,
  'atomic approval creates the first imported expense'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '18200000-0000-4000-8000-000000000001'
     and idempotency_key = '18230000-0000-4000-8000-000000000001'::uuid),
  1,
  'atomic approval creates exactly one financial transaction'
);

select is(
  (select count(*)::integer from public.transaction_entries
   where user_id = '18200000-0000-4000-8000-000000000001'
     and transaction_id = (select id from import_test_ids where key = 'first')),
  1,
  'money approval creates exactly one ledger entry'
);

select is(
  (select status::text from public.inbox_candidates
   where id = '18220000-0000-4000-8000-000000000001'::uuid),
  'approved',
  'candidate is approved in the same operation'
);

select is(
  (select approved_transaction_id from public.inbox_candidates
   where id = '18220000-0000-4000-8000-000000000001'::uuid),
  (select id from import_test_ids where key = 'first'),
  'candidate links to the exact created transaction'
);

select ok(
  (select approved_at is not null from public.inbox_candidates
   where id = '18220000-0000-4000-8000-000000000001'::uuid),
  'candidate records an approval timestamp'
);

select is(
  (select count(*)::integer from public.transaction_import_provenance
   where transaction_id = (select id from import_test_ids where key = 'first')),
  1,
  'approval creates exactly one provenance snapshot'
);

select is(
  (select source_row_index from public.transaction_import_provenance
   where transaction_id = (select id from import_test_ids where key = 'first')),
  2,
  'provenance retains the source row index'
);

select is(
  (select original_description from public.transaction_import_provenance
   where transaction_id = (select id from import_test_ids where key = 'first')),
  '14/07 Lunch Shop -63000',
  'provenance retains the bounded original description'
);

select is(
  (select parser_version from public.transaction_import_provenance
   where transaction_id = (select id from import_test_ids where key = 'first')),
  'csv_import@2.0',
  'provenance retains parser version'
);

select is(
  (select mapping_version from public.transaction_import_provenance
   where transaction_id = (select id from import_test_ids where key = 'first')),
  2,
  'provenance retains mapping version'
);

select is(
  public.approve_inbox_candidate(
    '18220000-0000-4000-8000-000000000001'::uuid,
    'expense'::public.transaction_kind,
    (select id from public.accounts
     where user_id = '18200000-0000-4000-8000-000000000001'
       and name <> 'Import destination'
     order by created_at, id limit 1),
    (select id from public.categories
     where user_id = '18200000-0000-4000-8000-000000000001'
       and kind = 'expense'
     order by created_at, id limit 1),
    null,
    63000,
    '2026-07-14',
    'Retry text is ignored because the candidate is linked',
    '18230000-0000-4000-8000-000000000099'::uuid,
    false
  ),
  (select id from import_test_ids where key = 'first'),
  'repeated approval returns the existing linked transaction'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '18200000-0000-4000-8000-000000000001'),
  1,
  'repeated approval creates no second transaction'
);

select is(
  (select count(*)::integer from public.transaction_import_provenance
   where user_id = '18200000-0000-4000-8000-000000000001'),
  1,
  'repeated approval creates no second provenance snapshot'
);

set local request.jwt.claims = '{"sub":"18200000-0000-4000-8000-000000000002","role":"authenticated"}';

select throws_ok(
  $$ select public.plan_inbox_candidate('18220000-0000-4000-8000-000000000001'::uuid) $$,
  'candidate_not_found',
  'another tenant cannot plan the owner candidate'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '18220000-0000-4000-8000-000000000001'::uuid,
      'expense'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18200000-0000-4000-8000-000000000002'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '18200000-0000-4000-8000-000000000002'
         and kind = 'expense'
       order by created_at, id limit 1),
      null, 63000, '2026-07-14', 'cross tenant',
      '18230000-0000-4000-8000-000000000098'::uuid, false
    )
  $$,
  'candidate_not_found',
  'another tenant cannot approve the owner candidate'
);

select is(
  (select count(*)::integer from public.transaction_import_provenance),
  0,
  'provenance RLS hides another tenant rows'
);

set local request.jwt.claims = '{"sub":"18200000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, account_id, raw_snippet,
  import_batch_id, source_row_index, source_external_id, parser_version,
  mapping_version
) values (
  '18220000-0000-4000-8000-000000000002'::uuid,
  '18200000-0000-4000-8000-000000000001'::uuid,
  'expense', 99000, 'Different purchase', '', '2026-07-15', 'csv',
  'high', 'pending',
  (select id from public.categories
   where user_id = '18200000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '18200000-0000-4000-8000-000000000001'
     and name <> 'Import destination'
   order by created_at, id limit 1),
  '15/07 Different purchase -99000',
  '18210000-0000-4000-8000-000000000001'::uuid,
  3,
  'bank-row-001',
  'csv_import@2.0',
  2
);

select is(
  public.plan_inbox_candidate('18220000-0000-4000-8000-000000000002'::uuid) ->> 'status',
  'duplicate',
  'same source external ID is classified as duplicate'
);

select is(
  public.plan_inbox_candidate('18220000-0000-4000-8000-000000000002'::uuid) ->> 'reason',
  'source_external_id_match',
  'external-ID duplicate has an explicit reason'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '18220000-0000-4000-8000-000000000002'::uuid,
      'expense'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18200000-0000-4000-8000-000000000001'
         and name <> 'Import destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '18200000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      null, 99000, '2026-07-15', 'Different purchase',
      '18230000-0000-4000-8000-000000000002'::uuid, true
    )
  $$,
  'source_external_id_duplicate',
  'exact source external ID duplicate cannot be overridden'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where idempotency_key = '18230000-0000-4000-8000-000000000002'::uuid),
  0,
  'blocked external-ID duplicate creates no transaction'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, account_id, raw_snippet,
  import_batch_id, source_row_index, parser_version, mapping_version
) values (
  '18220000-0000-4000-8000-000000000003'::uuid,
  '18200000-0000-4000-8000-000000000001'::uuid,
  'expense', 63000, 'Lunch Shop', 'Cơm trưa', '2026-07-14', 'csv',
  'high', 'pending',
  (select id from public.categories
   where user_id = '18200000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '18200000-0000-4000-8000-000000000001'
     and name <> 'Import destination'
   order by created_at, id limit 1),
  '14/07 Lunch Shop -63000',
  '18210000-0000-4000-8000-000000000001'::uuid,
  4,
  'csv_import@2.0',
  2
);

select is(
  public.plan_inbox_candidate('18220000-0000-4000-8000-000000000003'::uuid) ->> 'status',
  'duplicate',
  'same versioned fingerprint is classified as heuristic duplicate'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '18220000-0000-4000-8000-000000000003'::uuid,
      'expense'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18200000-0000-4000-8000-000000000001'
         and name <> 'Import destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '18200000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      null, 63000, '2026-07-14', 'Cơm trưa',
      '18230000-0000-4000-8000-000000000003'::uuid, false
    )
  $$,
  'candidate_duplicate',
  'heuristic duplicate needs explicit review override'
);

select lives_ok(
  $$
    insert into import_test_ids (key, id)
    select 'heuristic-override', public.approve_inbox_candidate(
      '18220000-0000-4000-8000-000000000003'::uuid,
      'expense'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18200000-0000-4000-8000-000000000001'
         and name <> 'Import destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '18200000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      null, 63000, '2026-07-14', 'Cơm trưa',
      '18230000-0000-4000-8000-000000000003'::uuid, true
    )
  $$,
  'reviewed heuristic duplicate can be approved explicitly'
);

select is(
  (select count(*)::integer
   from public.transaction_import_provenance
   where fingerprint = (
     select fingerprint from public.transaction_import_provenance
     where transaction_id = (select id from import_test_ids where key = 'first')
   )),
  2,
  'heuristic fingerprints are match evidence and are not unique'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, account_id, account_name, raw_snippet
) values
(
  '18220000-0000-4000-8000-000000000004'::uuid,
  '18200000-0000-4000-8000-000000000001'::uuid,
  'expense', 2000000, 'Transfer out', '', '2026-07-20', 'csv',
  'medium', 'pending',
  (select id from public.categories
   where user_id = '18200000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '18200000-0000-4000-8000-000000000001'
     and name <> 'Import destination'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '18200000-0000-4000-8000-000000000001'
     and name <> 'Import destination'
   order by created_at, id limit 1),
  'Transfer out 2000000'
),
(
  '18220000-0000-4000-8000-000000000005'::uuid,
  '18200000-0000-4000-8000-000000000001'::uuid,
  'income', 2000000, 'Transfer in', '', '2026-07-20', 'csv',
  'medium', 'pending',
  (select id from public.categories
   where user_id = '18200000-0000-4000-8000-000000000001'
     and kind = 'income'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '18200000-0000-4000-8000-000000000001'
     and name = 'Import destination'),
  'Import destination',
  'Transfer in 2000000'
);

select is(
  public.plan_inbox_candidate('18220000-0000-4000-8000-000000000004'::uuid) ->> 'status',
  'suspected_transfer',
  'opposite same-day same-amount candidate is a suspected transfer'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '18220000-0000-4000-8000-000000000004'::uuid,
      'expense'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18200000-0000-4000-8000-000000000001'
         and name <> 'Import destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '18200000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      null, 2000000, '2026-07-20', 'Transfer out',
      '18230000-0000-4000-8000-000000000004'::uuid, false
    )
  $$,
  'candidate_requires_transfer_review',
  'suspected transfer cannot be silently posted as expense'
);

select lives_ok(
  $$
    insert into import_test_ids (key, id)
    select 'transfer', public.approve_inbox_candidate(
      '18220000-0000-4000-8000-000000000004'::uuid,
      'transfer'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18200000-0000-4000-8000-000000000001'
         and name <> 'Import destination'
       order by created_at, id limit 1),
      null,
      (select id from public.accounts
       where user_id = '18200000-0000-4000-8000-000000000001'
         and name = 'Import destination'),
      2000000, '2026-07-20', 'Transfer reviewed',
      '18230000-0000-4000-8000-000000000004'::uuid, false
    )
  $$,
  'reviewed suspected transfer creates a transfer transaction'
);

select is(
  (select count(*)::integer from public.transaction_entries
   where transaction_id = (select id from import_test_ids where key = 'transfer')),
  2,
  'atomic transfer approval creates exactly two entries'
);

select is(
  (select sum(amount_minor)::bigint from public.transaction_entries
   where transaction_id = (select id from import_test_ids where key = 'transfer')),
  0::bigint,
  'atomic transfer approval entries balance to zero'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, raw_snippet
) values (
  '18220000-0000-4000-8000-000000000006'::uuid,
  '18200000-0000-4000-8000-000000000001'::uuid,
  'expense', 45000, 'Unmapped cafe', '', '2026-07-21', 'paste',
  'low', 'pending', 'Unmapped cafe 45000'
);

select is(
  public.plan_inbox_candidate('18220000-0000-4000-8000-000000000006'::uuid) ->> 'status',
  'invalid',
  'candidate without account/category is invalid before review resolution'
);

select is(
  public.plan_inbox_candidate('18220000-0000-4000-8000-000000000006'::uuid) ->> 'reason',
  'account_required',
  'invalid dry-run exposes the missing-account reason'
);

select lives_ok(
  $$
    insert into import_test_ids (key, id)
    select 'resolved', public.approve_inbox_candidate(
      '18220000-0000-4000-8000-000000000006'::uuid,
      'expense'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18200000-0000-4000-8000-000000000001'
         and name <> 'Import destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '18200000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      null, 45000, '2026-07-21', 'Unmapped cafe',
      '18230000-0000-4000-8000-000000000006'::uuid, false
    )
  $$,
  'review can resolve missing mapping inside atomic approval'
);

select is(
  (select match_status::text from public.transaction_import_provenance
   where transaction_id = (select id from import_test_ids where key = 'resolved')),
  'would_create',
  'resolved candidate provenance records the final create classification'
);

select is(
  (select match_reason from public.transaction_import_provenance
   where transaction_id = (select id from import_test_ids where key = 'resolved')),
  'resolved_during_review',
  'resolved candidate provenance explains the review resolution'
);

select is(
  (select approved_transaction_id from public.inbox_candidates
   where id = '18220000-0000-4000-8000-000000000006'::uuid),
  (select id from import_test_ids where key = 'resolved'),
  'resolved candidate is linked to the transaction atomically'
);

reset role;
select * from finish();
rollback;
