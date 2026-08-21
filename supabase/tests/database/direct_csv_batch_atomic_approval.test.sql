begin;
select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '43400000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'direct-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Direct Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '43400000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'direct-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Direct Other"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"43400000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map, parser_version,
  mapping_version
) values (
  '43410000-0000-4000-8000-000000000001'::uuid,
  '43400000-0000-4000-8000-000000000001'::uuid,
  'direct.csv', 'csv', 'parsed', 2, 0, 0, 1,
  '["date","description","amount"]'::jsonb,
  '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb,
  'csv_import@1.0', 1
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, parser_version, mapping_version
) values
(
  '43420000-0000-4000-8000-000000000001'::uuid,
  '43400000-0000-4000-8000-000000000001'::uuid,
  'expense', 45000, 'Cafe A', 'Cafe A', '2026-08-20', 'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43400000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '43400000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  '20/08/2026,Cafe A,-45000',
  '43410000-0000-4000-8000-000000000001'::uuid, 1, 'csv_import@1.0', 1
),
(
  '43420000-0000-4000-8000-000000000002'::uuid,
  '43400000-0000-4000-8000-000000000001'::uuid,
  'expense', 90000, 'Market B', 'Market B', '2026-08-20', 'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43400000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '43400000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  '20/08/2026,Market B,-90000',
  '43410000-0000-4000-8000-000000000001'::uuid, 2, 'csv_import@1.0', 1
);

select has_function(
  'public',
  'approve_inbox_candidates_batch',
  array['uuid', 'jsonb'],
  'batch approval RPC exists'
);

select throws_ok(
  $$
    select public.approve_inbox_candidates_batch(
      '43410000-0000-4000-8000-000000000001'::uuid,
      jsonb_build_array(
        jsonb_build_object(
          'candidate_id', '43420000-0000-4000-8000-000000000001',
          'kind', 'expense',
          'account_id', (select id::text from public.accounts
            where user_id = '43400000-0000-4000-8000-000000000001'
            order by created_at, id limit 1),
          'category_id', (select id::text from public.categories
            where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'expense'
            order by created_at, id limit 1),
          'amount_minor', 45000,
          'occurred_on', '2026-08-20',
          'note', 'Cafe A',
          'idempotency_key', '43430000-0000-4000-8000-000000000001'
        ),
        jsonb_build_object(
          'candidate_id', '43420000-0000-4000-8000-000000000002',
          'kind', 'expense',
          'account_id', (select id::text from public.accounts
            where user_id = '43400000-0000-4000-8000-000000000001'
            order by created_at, id limit 1),
          'category_id', (select id::text from public.categories
            where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'income'
            order by created_at, id limit 1),
          'amount_minor', 90000,
          'occurred_on', '2026-08-20',
          'note', 'Market B',
          'idempotency_key', '43430000-0000-4000-8000-000000000002'
        )
      )
    )
  $$,
  'category_kind_mismatch',
  'late invalid row rejects the batch'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where idempotency_key in (
     '43430000-0000-4000-8000-000000000001'::uuid,
     '43430000-0000-4000-8000-000000000002'::uuid
   )),
  0,
  'failed batch leaves no partial financial transactions'
);

select is(
  (select count(*)::integer from public.transaction_import_provenance
   where candidate_id in (
     '43420000-0000-4000-8000-000000000001'::uuid,
     '43420000-0000-4000-8000-000000000002'::uuid
   )),
  0,
  'failed batch leaves no partial provenance'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where id in (
     '43420000-0000-4000-8000-000000000001'::uuid,
     '43420000-0000-4000-8000-000000000002'::uuid
   ) and status = 'pending'),
  2,
  'failed batch rolls candidate approvals back to pending evidence'
);

select is(
  (select status::text from public.import_batches
   where id = '43410000-0000-4000-8000-000000000001'::uuid),
  'parsed',
  'failed batch remains parsed rather than falsely committed'
);

create temporary table direct_batch_ids (
  ordinal bigint primary key,
  transaction_id uuid not null
) on commit drop;

select lives_ok(
  $$
    insert into direct_batch_ids (ordinal, transaction_id)
    select row_number() over (), id
    from unnest(public.approve_inbox_candidates_batch(
      '43410000-0000-4000-8000-000000000001'::uuid,
      jsonb_build_array(
        jsonb_build_object(
          'candidate_id', '43420000-0000-4000-8000-000000000001',
          'kind', 'expense',
          'account_id', (select id::text from public.accounts
            where user_id = '43400000-0000-4000-8000-000000000001'
            order by created_at, id limit 1),
          'category_id', (select id::text from public.categories
            where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'expense'
            order by created_at, id limit 1),
          'amount_minor', 45000,
          'occurred_on', '2026-08-20',
          'note', 'Cafe A',
          'idempotency_key', '43430000-0000-4000-8000-000000000011'
        ),
        jsonb_build_object(
          'candidate_id', '43420000-0000-4000-8000-000000000002',
          'kind', 'expense',
          'account_id', (select id::text from public.accounts
            where user_id = '43400000-0000-4000-8000-000000000001'
            order by created_at, id limit 1),
          'category_id', (select id::text from public.categories
            where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'expense'
            order by created_at, id limit 1),
          'amount_minor', 90000,
          'occurred_on', '2026-08-20',
          'note', 'Market B',
          'idempotency_key', '43430000-0000-4000-8000-000000000012'
        )
      )
    )) as id
  $$,
  'valid batch approves every candidate'
);

select is((select count(*)::integer from direct_batch_ids), 2, 'batch returns two transaction ids');

select is(
  (select count(*)::integer from public.transaction_import_provenance
   where candidate_id in (
     '43420000-0000-4000-8000-000000000001'::uuid,
     '43420000-0000-4000-8000-000000000002'::uuid
   )),
  2,
  'successful batch writes provenance for every transaction'
);

select is(
  (select count(*)::integer from public.transaction_import_provenance
   where import_batch_id = '43410000-0000-4000-8000-000000000001'::uuid
     and source = 'csv'
     and source_row_index in (1, 2)
     and parser_version = 'csv_import@1.0'
     and mapping_version = 1),
  2,
  'provenance retains batch, source row and parser/mapping versions'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where id in (
     '43420000-0000-4000-8000-000000000001'::uuid,
     '43420000-0000-4000-8000-000000000002'::uuid
   ) and status = 'approved' and approved_transaction_id is not null),
  2,
  'successful batch links every candidate to an approved transaction'
);

select is(
  (select status::text from public.import_batches
   where id = '43410000-0000-4000-8000-000000000001'::uuid),
  'committed',
  'successful batch marks the import committed'
);

select is(
  array_length(
    public.approve_inbox_candidates_batch(
      '43410000-0000-4000-8000-000000000001'::uuid,
      jsonb_build_array(
        jsonb_build_object(
          'candidate_id', '43420000-0000-4000-8000-000000000001',
          'kind', 'expense',
          'account_id', (select id::text from public.accounts
            where user_id = '43400000-0000-4000-8000-000000000001'
            order by created_at, id limit 1),
          'category_id', (select id::text from public.categories
            where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'expense'
            order by created_at, id limit 1),
          'amount_minor', 45000,
          'occurred_on', '2026-08-20',
          'note', 'retry ignored',
          'idempotency_key', '43430000-0000-4000-8000-000000000021'
        ),
        jsonb_build_object(
          'candidate_id', '43420000-0000-4000-8000-000000000002',
          'kind', 'expense',
          'account_id', (select id::text from public.accounts
            where user_id = '43400000-0000-4000-8000-000000000001'
            order by created_at, id limit 1),
          'category_id', (select id::text from public.categories
            where user_id = '43400000-0000-4000-8000-000000000001' and kind = 'expense'
            order by created_at, id limit 1),
          'amount_minor', 90000,
          'occurred_on', '2026-08-20',
          'note', 'retry ignored',
          'idempotency_key', '43430000-0000-4000-8000-000000000022'
        )
      )
    ),
    1
  ),
  2,
  'replaying already-approved candidates returns the linked transactions'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where id in (select transaction_id from direct_batch_ids)),
  2,
  'replay creates no second financial facts'
);

select is(
  (select count(*)::integer from public.transaction_import_provenance
   where candidate_id in (
     '43420000-0000-4000-8000-000000000001'::uuid,
     '43420000-0000-4000-8000-000000000002'::uuid
   )),
  2,
  'replay creates no second provenance rows'
);

set local request.jwt.claims = '{"sub":"43400000-0000-4000-8000-000000000002","role":"authenticated"}';

select throws_ok(
  $$
    select public.approve_inbox_candidates_batch(
      '43410000-0000-4000-8000-000000000001'::uuid,
      jsonb_build_array(jsonb_build_object(
        'candidate_id', '43420000-0000-4000-8000-000000000001',
        'kind', 'expense',
        'account_id', '43440000-0000-4000-8000-000000000001',
        'category_id', '43440000-0000-4000-8000-000000000002',
        'amount_minor', 45000,
        'occurred_on', '2026-08-20',
        'note', 'cross tenant',
        'idempotency_key', '43430000-0000-4000-8000-000000000099'
      ))
    )
  $$,
  'import_batch_not_found',
  'another tenant cannot invoke the owner batch'
);

select * from finish();
rollback;
