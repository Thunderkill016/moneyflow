begin;
select plan(35);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-8000-000000000000'::uuid,
  '63000000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'mon63-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"MON-63 Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-4000-8000-000000000000'::uuid,
  '63000000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'mon63-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"MON-63 Other"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"63000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map, parser_version, mapping_version
) values
(
  '63010000-0000-4000-8000-000000000001'::uuid,
  '63000000-0000-4000-8000-000000000001'::uuid,
  'owner.csv', 'csv', 'parsed', 2, 0, 0, 1,
  '["date","description","amount"]'::jsonb,
  '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb,
  'csv_import@1.0', 1
),
(
  '63010000-0000-4000-8000-000000000003'::uuid,
  '63000000-0000-4000-8000-000000000001'::uuid,
  'rollback.csv', 'csv', 'parsed', 2, 0, 0, 1,
  '["date","description","amount"]'::jsonb,
  '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb,
  'csv_import@1.0', 1
);

select has_function(
  'public',
  'commit_import_batch_candidates',
  array['uuid', 'text', 'jsonb'],
  'atomic import batch commit RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.commit_import_batch_candidates(uuid,text,jsonb)',
    'EXECUTE'
  ),
  'authenticated may execute atomic import commit'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.commit_import_batch_candidates(uuid,text,jsonb)',
    'EXECUTE'
  ),
  'anon cannot execute atomic import commit'
);

select is(
  (
    select prosecdef
    from pg_catalog.pg_proc
    where oid = 'public.commit_import_batch_candidates(uuid,text,jsonb)'::regprocedure
  ),
  false,
  'atomic import commit is SECURITY INVOKER'
);

select ok(
  position(
    'FOR UPDATE' in upper(
      pg_catalog.pg_get_functiondef(
        'public.commit_import_batch_candidates(uuid,text,jsonb)'::regprocedure
      )
    )
  ) > 0,
  'atomic import commit row-locks the batch before mutation'
);

select is(
  (
    public.commit_import_batch_candidates(
      '63010000-0000-4000-8000-000000000001'::uuid,
      repeat('a', 64),
      jsonb_build_array(
        jsonb_build_object(
          'id', '63020000-0000-4000-8000-000000000001',
          'import_batch_id', '63010000-0000-4000-8000-000000000001',
          'kind', 'expense',
          'amount_minor', 45000,
          'merchant', 'Highlands',
          'note', '',
          'occurred_on', '2026-09-09',
          'source', 'csv',
          'confidence', 'high',
          'status', 'pending',
          'possible_duplicate', false,
          'raw_snippet', '09/09/2026 | Highlands | -45000',
          'source_row_index', 1,
          'parser_version', 'csv_import@1.0',
          'mapping_version', 1
        ),
        jsonb_build_object(
          'id', '63020000-0000-4000-8000-000000000002',
          'import_batch_id', '63010000-0000-4000-8000-000000000001',
          'kind', 'income',
          'amount_minor', 900000,
          'merchant', 'Salary',
          'note', '',
          'occurred_on', '2026-09-08',
          'source', 'csv',
          'confidence', 'medium',
          'status', 'pending',
          'possible_duplicate', false,
          'raw_snippet', '08/09/2026 | Salary | 900000',
          'source_row_index', 2,
          'parser_version', 'csv_import@1.0',
          'mapping_version', 1
        )
      )
    ) ->> 'candidate_count'
  )::integer,
  2,
  'first commit persists the complete candidate set'
);

select is(
  (select status::text from public.import_batches
   where id = '63010000-0000-4000-8000-000000000001'::uuid),
  'committed',
  'first commit marks the batch committed atomically'
);

select is(
  (select commit_intent_hash from public.import_batches
   where id = '63010000-0000-4000-8000-000000000001'::uuid),
  repeat('a', 64),
  'first commit stores the stable intent hash'
);

select is(
  (select commit_candidate_count from public.import_batches
   where id = '63010000-0000-4000-8000-000000000001'::uuid),
  2,
  'first commit stores durable candidate count outcome'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where import_batch_id = '63010000-0000-4000-8000-000000000001'::uuid),
  2,
  'first commit creates exactly two candidates'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where import_batch_id = '63010000-0000-4000-8000-000000000001'::uuid
     and status = 'pending'),
  2,
  'atomic commit only creates pending Inbox evidence'
);

select is(
  (
    public.commit_import_batch_candidates(
      '63010000-0000-4000-8000-000000000001'::uuid,
      repeat('a', 64),
      jsonb_build_array(
        jsonb_build_object(
          'id', '63020000-0000-4000-8000-000000000001',
          'kind', 'expense', 'amount_minor', 45000, 'merchant', 'Highlands',
          'occurred_on', '2026-09-09', 'source', 'csv', 'confidence', 'high'
        ),
        jsonb_build_object(
          'id', '63020000-0000-4000-8000-000000000002',
          'kind', 'income', 'amount_minor', 900000, 'merchant', 'Salary',
          'occurred_on', '2026-09-08', 'source', 'csv', 'confidence', 'medium'
        )
      )
    ) ->> 'replayed'
  )::boolean,
  true,
  'exact intent replay returns the durable result without reinserting'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where import_batch_id = '63010000-0000-4000-8000-000000000001'::uuid),
  2,
  'exact replay does not duplicate candidates'
);

select throws_ok(
  $$
    select public.commit_import_batch_candidates(
      '63010000-0000-4000-8000-000000000001'::uuid,
      repeat('b', 64),
      jsonb_build_array(
        jsonb_build_object(
          'id', '63020000-0000-4000-8000-000000000001',
          'kind', 'expense', 'amount_minor', 46000, 'merchant', 'Changed Highlands',
          'occurred_on', '2026-09-09', 'source', 'csv', 'confidence', 'high'
        ),
        jsonb_build_object(
          'id', '63020000-0000-4000-8000-000000000002',
          'kind', 'income', 'amount_minor', 900000, 'merchant', 'Salary',
          'occurred_on', '2026-09-08', 'source', 'csv', 'confidence', 'medium'
        )
      )
    )
  $$,
  'P0001',
  'import_batch_replay_mismatch',
  'same batch identity rejects a changed financial intent'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where import_batch_id = '63010000-0000-4000-8000-000000000001'::uuid),
  2,
  'rejected changed replay leaves committed candidates unchanged'
);

select throws_ok(
  $$
    select public.commit_import_batch_candidates(
      '63010000-0000-4000-8000-000000000003'::uuid,
      repeat('c', 64),
      jsonb_build_array(
        jsonb_build_object(
          'id', '63020000-0000-4000-8000-000000000010',
          'kind', 'expense', 'amount_minor', 10000, 'merchant', 'Valid first',
          'occurred_on', '2026-09-09', 'source', 'csv', 'confidence', 'high'
        ),
        jsonb_build_object(
          'id', '63020000-0000-4000-8000-000000000011',
          'kind', 'expense', 'amount_minor', 20000, 'merchant', '',
          'occurred_on', '2026-09-09', 'source', 'csv', 'confidence', 'high'
        )
      )
    )
  $$,
  'P0001',
  'invalid_import_candidate',
  'late invalid candidate rolls back the whole commit'
);

select is(
  (select status::text from public.import_batches
   where id = '63010000-0000-4000-8000-000000000003'::uuid),
  'parsed',
  'failed atomic commit leaves the batch parsed'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where import_batch_id = '63010000-0000-4000-8000-000000000003'::uuid),
  0,
  'failed atomic commit leaves no candidate prefix'
);

reset role;
set local request.jwt.claims = '{"sub":"63000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map
) values (
  '63010000-0000-4000-8000-000000000002'::uuid,
  '63000000-0000-4000-8000-000000000002'::uuid,
  'other.csv', 'csv', 'parsed', 1, 0, 0, 1, '[]'::jsonb, '{}'::jsonb
);

reset role;
set local request.jwt.claims = '{"sub":"63000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$
    select public.commit_import_batch_candidates(
      '63010000-0000-4000-8000-000000000002'::uuid,
      repeat('d', 64),
      jsonb_build_array(jsonb_build_object(
        'id', '63020000-0000-4000-8000-000000000020',
        'kind', 'expense', 'amount_minor', 10000, 'merchant', 'Foreign batch',
        'occurred_on', '2026-09-09', 'source', 'csv', 'confidence', 'high'
      ))
    )
  $$,
  'P0001',
  'import_batch_not_found',
  'cross-tenant batch ids are invisible to the invoker RPC'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '63000000-0000-4000-8000-000000000001'::uuid),
  0,
  'atomic import commit never creates ledger transactions'
);

-- Phase A connected persisted statement journey: reuse the committed batch
-- above, resolve its unmapped fields explicitly, then reconcile the same book.
-- Synthetic statement closing balance is 0 opening + 900000 salary - 45000 cafe.
create temporary table statement_journey_ids (
  key text primary key,
  id uuid not null
) on commit drop;

insert into statement_journey_ids (key, id)
select 'account', id from public.accounts
where user_id = auth.uid() order by created_at, id limit 1;

select lives_ok(
  $$
    insert into statement_journey_ids (key, id)
    select 'expense', public.approve_inbox_candidate(
      '63020000-0000-4000-8000-000000000001'::uuid,
      'expense'::public.transaction_kind,
      (select id from statement_journey_ids where key = 'account'),
      (select id from public.categories where user_id = auth.uid()
       and kind = 'expense' order by created_at, id limit 1),
      null, 45000, '2026-09-09', 'Synthetic cafe',
      '63030000-0000-4000-8000-000000000001'::uuid, false
    )
  $$,
  'statement review resolves expense account and category before posting'
);
select lives_ok(
  $$
    insert into statement_journey_ids (key, id)
    select 'income', public.approve_inbox_candidate(
      '63020000-0000-4000-8000-000000000002'::uuid,
      'income'::public.transaction_kind,
      (select id from statement_journey_ids where key = 'account'),
      (select id from public.categories where user_id = auth.uid()
       and kind = 'income' order by created_at, id limit 1),
      null, 900000, '2026-09-08', 'Synthetic salary',
      '63030000-0000-4000-8000-000000000002'::uuid, false
    )
  $$,
  'statement review posts salary to the same represented account'
);
select is(
  (select count(*)::integer from public.transaction_import_provenance
   where import_batch_id = '63010000-0000-4000-8000-000000000001'::uuid),
  2, 'both posted facts retain their statement provenance'
);
select is(
  (public.commit_import_batch_candidates(
    '63010000-0000-4000-8000-000000000001'::uuid, repeat('a', 64),
    jsonb_build_array(
      jsonb_build_object('id', '63020000-0000-4000-8000-000000000001',
        'kind', 'expense', 'amount_minor', 45000, 'merchant', 'Highlands',
        'occurred_on', '2026-09-09', 'source', 'csv', 'confidence', 'high'),
      jsonb_build_object('id', '63020000-0000-4000-8000-000000000002',
        'kind', 'income', 'amount_minor', 900000, 'merchant', 'Salary',
        'occurred_on', '2026-09-08', 'source', 'csv', 'confidence', 'medium')
    )
  ) ->> 'replayed')::boolean,
  true, 'replaying the committed statement after posting returns its durable outcome'
);
select is(
  (select count(*)::integer from public.inbox_candidates
   where import_batch_id = '63010000-0000-4000-8000-000000000001'::uuid
     and status = 'approved'),
  2, 'statement replay does not reset reviewed candidates to pending'
);
select is(
  (select count(*)::integer from public.financial_transactions where user_id = auth.uid()),
  2, 'statement replay creates no additional posted facts'
);

insert into statement_journey_ids (key, id)
select 'reconciliation', public.start_account_reconciliation(
  (select id from statement_journey_ids where key = 'account'),
  '2026-09-30', 855000
);
select throws_ok(
  $$select public.complete_account_reconciliation(
    (select id from statement_journey_ids where key = 'reconciliation'))$$,
  'P0001', 'reconciliation_difference_nonzero',
  'uncleared statement cannot silently complete by inventing an adjustment'
);
select is(
  public.set_account_entry_reconciliation_state(
    (select id from public.transaction_entries
     where transaction_id = (select id from statement_journey_ids where key = 'expense')),
    'cleared'),
  'cleared'::public.entry_reconciliation_state, 'reviewed expense leg is explicitly cleared'
);
select is(
  public.set_account_entry_reconciliation_state(
    (select id from public.transaction_entries
     where transaction_id = (select id from statement_journey_ids where key = 'income')),
    'cleared'),
  'cleared'::public.entry_reconciliation_state, 'reviewed salary leg is explicitly cleared'
);
select is(
  (select difference_minor from public.account_reconciliation_summaries
   where id = (select id from statement_journey_ids where key = 'reconciliation')),
  0::bigint, 'represented source facts match the independent synthetic closing balance'
);
select is(
  public.complete_account_reconciliation(
    (select id from statement_journey_ids where key = 'reconciliation')),
  true, 'same persisted statement completes with zero difference'
);
select is(
  (select count(*)::integer from public.transaction_entries
   where reconciliation_id = (select id from statement_journey_ids where key = 'reconciliation')
     and reconciliation_state = 'reconciled'),
  2, 'completion locks both source-linked account legs'
);

set local request.jwt.claims = '{"sub":"63000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(
  (select count(*)::integer from public.account_reconciliations
   where id = (select id from statement_journey_ids where key = 'reconciliation')),
  0, 'another tenant cannot read the completed statement session'
);
select is(
  (select count(*)::integer from public.transaction_import_provenance
   where import_batch_id = '63010000-0000-4000-8000-000000000001'::uuid),
  0, 'another tenant cannot read its imported financial provenance'
);
set local request.jwt.claims = '{"sub":"63000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(
  (select count(*)::integer from public.financial_transactions where user_id = auth.uid()),
  2, 'completion and tenant switching never create a balancing transaction'
);

select * from finish();
rollback;
