begin;
select plan(40);

-- R6 — the archive producer must emit the complete archive v1 contract for the
-- calling tenant, and only for the calling tenant. Every identity and row below
-- is transaction-scoped and rolled back.

create temporary table archive_ctx (
  key text primary key,
  id uuid
) on commit drop;
create temporary table archive_out (
  key text primary key,
  payload jsonb not null
) on commit drop;

grant select, insert, update, delete on archive_ctx to authenticated;
grant select, insert, update, delete on archive_out to authenticated;

create or replace function pg_temp.export_error(p_sql text)
returns text
language plpgsql
as $$
declare
  v_detail text;
begin
  begin
    execute p_sql;
    return 'unexpected_success';
  exception when others then
    get stacked diagnostics v_detail = message_text;
    return v_detail;
  end;
end;
$$;
grant execute on function pg_temp.export_error(text) to authenticated, anon;

-- The Auth trigger creates one profile, one cash account and eleven default
-- categories for each identity.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000a001',
  'authenticated', 'authenticated', 'archive-a@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Archive A"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000b001',
  'authenticated', 'authenticated', 'archive-b@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Archive B"}'::jsonb
);

insert into archive_ctx values
  ('a_account', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000a001' limit 1
  )),
  ('a_expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000a001'
      and kind = 'expense' order by name limit 1
  )),
  ('a_expense_category_2', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000a001'
      and kind = 'expense' order by name offset 1 limit 1
  )),
  ('a_income_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000a001'
      and kind = 'income' order by name limit 1
  )),
  ('b_account', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000b001' limit 1
  ));

-- ---------------------------------------------------------------------------
-- Tenant A: a populated ledger covering every domain the archive must carry.
-- ---------------------------------------------------------------------------
set local role authenticated;
do $$
begin
  perform set_config(
    'request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a001', true
  );
end;
$$;

insert into archive_ctx values
  ('a_account_2', public.create_financial_account('Ngân hàng', 'bank', 500000, 'VND'));

insert into archive_ctx values
  ('a_income_tx', public.create_money_transaction(
    (select id from archive_ctx where key = 'a_account'),
    (select id from archive_ctx where key = 'a_income_category'),
    'income', 9007199254740991, current_date, 'Biggest safe income',
    '00000000-0000-4000-8000-00000000a101'
  )),
  ('a_expense_tx', public.create_money_transaction(
    (select id from archive_ctx where key = 'a_account'),
    (select id from archive_ctx where key = 'a_expense_category'),
    'expense', 123456, current_date, 'An expense',
    '00000000-0000-4000-8000-00000000a102'
  )),
  ('a_deleted_tx', public.create_money_transaction(
    (select id from archive_ctx where key = 'a_account'),
    (select id from archive_ctx where key = 'a_expense_category'),
    'expense', 5000, current_date, 'Soft deleted later',
    '00000000-0000-4000-8000-00000000a103'
  ));

insert into archive_ctx values
  ('a_split_tx', public.create_split_expense(
    (select id from archive_ctx where key = 'a_account'),
    jsonb_build_array(
      jsonb_build_object(
        'category_id', (select id from archive_ctx where key = 'a_expense_category'),
        'amount_minor', 70000
      ),
      jsonb_build_object(
        'category_id', (select id from archive_ctx where key = 'a_expense_category_2'),
        'amount_minor', 30000
      )
    ),
    current_date, 'Split expense', '00000000-0000-4000-8000-00000000a104'
  )),
  ('a_transfer_tx', public.create_account_transfer(
    (select id from archive_ctx where key = 'a_account'),
    (select id from archive_ctx where key = 'a_account_2'),
    250000, current_date, 'Transfer', '00000000-0000-4000-8000-00000000a105'
  ));

select public.soft_delete_money_transaction(
  (select id from archive_ctx where key = 'a_deleted_tx')
);

-- Planning state.
insert into archive_ctx values
  ('a_budget', public.upsert_monthly_budget(
    (select id from archive_ctx where key = 'a_expense_category'),
    date_trunc('month', current_date)::date,
    2000000
  )),
  ('a_goal', public.upsert_savings_goal(null, 'Quỹ dự phòng', 50000000, null));

select public.adjust_savings_goal(
  (select id from archive_ctx where key = 'a_goal'), 1500000
);

insert into archive_ctx values
  ('a_commitment', public.upsert_recurring_commitment(
    null, 'Tiền nhà', 4000000, 5,
    (select id from archive_ctx where key = 'a_account'),
    (select id from archive_ctx where key = 'a_expense_category')
  )),
  ('a_template', public.upsert_recurring_income_template(
    null, 'Lương', 15000000, 10,
    (select id from archive_ctx where key = 'a_account'),
    (select id from archive_ctx where key = 'a_income_category')
  ));

select public.pay_recurring_commitment(
  (select id from archive_ctx where key = 'a_commitment'),
  date_trunc('month', current_date)::date,
  current_date,
  '00000000-0000-4000-8000-00000000a106'
);
select public.record_recurring_income_template(
  (select id from archive_ctx where key = 'a_template'),
  date_trunc('month', current_date)::date,
  current_date,
  '00000000-0000-4000-8000-00000000a107'
);

-- Reconciliation last, so its mutation guards cannot interfere with the ledger
-- fixture above.
insert into archive_ctx values
  ('a_reconciliation', public.start_account_reconciliation(
    (select id from archive_ctx where key = 'a_account'),
    current_date, 250000
  ));

reset role;

-- Import, provenance and rule state. These tables are SELECT-only for
-- `authenticated`, so the fixture writes them as the owner; the export path
-- under test still reads them as the authenticated caller through RLS.
insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map, local_id,
  parser_version, mapping_version
) values (
  '00000000-0000-4000-8000-00000000a201',
  '00000000-0000-4000-8000-00000000a001',
  'sao-ke.csv', 'csv', 'committed', 2, 0, 0, 0.9,
  '["Ngày","Số tiền"]'::jsonb, '{"date":"Ngày","amount":"Số tiền"}'::jsonb,
  'batch-local-1', 'parser-v2', 3
);

insert into public.inbox_rules (
  id, user_id, priority, enabled, match_field, contains_text,
  category_id, merchant_name
) values (
  '00000000-0000-4000-8000-00000000a202',
  '00000000-0000-4000-8000-00000000a001',
  10, true, 'merchant', 'grab',
  (select id from archive_ctx where key = 'a_expense_category'),
  'Grab'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, import_batch_id, account_id, category_id,
  fingerprint, fingerprint_version, parser_version, mapping_version,
  match_status, match_confidence, source_row_index, source_external_id,
  applied_rule_id, applied_rule_version, possible_transfer
) values
(
  '00000000-0000-4000-8000-00000000a203',
  '00000000-0000-4000-8000-00000000a001',
  'expense', 45000, 'Grab', '', current_date, 'csv',
  'high', 'pending', '00000000-0000-4000-8000-00000000a201',
  (select id from archive_ctx where key = 'a_account'),
  (select id from archive_ctx where key = 'a_expense_category'),
  'fp-1', 1, 'parser-v2', 3, 'would_create', 0.75, 0, 'ext-1',
  '00000000-0000-4000-8000-00000000a202', 1, true
),
(
  '00000000-0000-4000-8000-00000000a204',
  '00000000-0000-4000-8000-00000000a001',
  'income', 45000, 'Grab refund', '', current_date, 'csv',
  'medium', 'pending', '00000000-0000-4000-8000-00000000a201',
  (select id from archive_ctx where key = 'a_account'),
  (select id from archive_ctx where key = 'a_income_category'),
  'fp-2', 1, 'parser-v2', 3, 'suspected_transfer', 0.5, 1, 'ext-2',
  null, null, true
);

-- Mutually paired candidates: the self-reference the contract requires.
update public.inbox_candidates
set transfer_pair_id = '00000000-0000-4000-8000-00000000a204'
where id = '00000000-0000-4000-8000-00000000a203';
update public.inbox_candidates
set transfer_pair_id = '00000000-0000-4000-8000-00000000a203'
where id = '00000000-0000-4000-8000-00000000a204';

insert into public.transaction_import_provenance (
  transaction_id, user_id, candidate_id, import_batch_id, source,
  source_row_index, original_description, source_external_id,
  fingerprint, fingerprint_version, parser_version, mapping_version,
  match_status, match_reason, match_confidence
) values (
  (select id from archive_ctx where key = 'a_expense_tx'),
  '00000000-0000-4000-8000-00000000a001',
  '00000000-0000-4000-8000-00000000a203',
  '00000000-0000-4000-8000-00000000a201',
  'csv', 0, 'GRAB *ăn uống', 'ext-1', 'fp-1', 1, 'parser-v2', 3,
  'would_create', 'matched by rule', 0.75
);

-- Archived history: written directly so no RPC guard can refuse the fixture.
update public.categories set is_archived = true
where id = (select id from archive_ctx where key = 'a_expense_category_2');
update public.accounts set is_archived = true
where id = (select id from archive_ctx where key = 'a_account_2');

create temporary table archive_before_counts on commit drop as
select
  (select count(*) from public.financial_transactions) as transactions,
  (select count(*) from public.transaction_entries) as entries,
  (select count(*) from public.inbox_candidates) as candidates,
  (select count(*) from public.financial_mutation_audit_events) as audit_events;
grant select on archive_before_counts to authenticated;

-- ---------------------------------------------------------------------------
-- Export as A, then as B.
-- ---------------------------------------------------------------------------
set local role authenticated;
do $$
begin
  perform set_config(
    'request.jwt.claim.sub', '00000000-0000-4000-8000-00000000a001', true
  );
end;
$$;

insert into archive_out values ('a', public.export_user_archive());
insert into archive_out values ('a_again', public.export_user_archive());

-- An authenticated session without a subject claim must be refused. The
-- premise is asserted first so a change in how auth.uid() reads a cleared claim
-- reports itself instead of surfacing as a confusing message mismatch.
do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;
select ok(
  auth.uid() is null,
  'clearing the subject claim leaves no authenticated identity'
);
select is(
  pg_temp.export_error('select public.export_user_archive()'),
  'authentication_required',
  'a session without a subject claim cannot export'
);

-- A well-formed identity that owns no tenant fails explicitly rather than
-- emitting an archive with a null profile.
do $$
begin
  perform set_config(
    'request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000ff', true
  );
end;
$$;
select is(
  pg_temp.export_error('select public.export_user_archive()'),
  'archive_profile_missing',
  'an identity with no tenant rows cannot produce an archive'
);

do $$
begin
  perform set_config(
    'request.jwt.claim.sub', '00000000-0000-4000-8000-00000000b001', true
  );
end;
$$;
insert into archive_out values ('b', public.export_user_archive());

reset role;

-- anon holds no EXECUTE privilege at all, so the boundary fails closed before
-- the function body can run.
set local role anon;
select ok(
  pg_temp.export_error('select public.export_user_archive()') like '%permission denied%',
  'anon cannot execute the archive producer'
);
reset role;

-- ---------------------------------------------------------------------------
-- Envelope
-- ---------------------------------------------------------------------------
select is(
  (select payload -> 'archive_version' from archive_out where key = 'a'),
  '1'::jsonb,
  'the envelope carries archive version 1'
);

select is(
  (select payload ->> 'schema_generation' from archive_out where key = 'a'),
  '20260804160000',
  'the envelope carries the contract schema generation'
);

select ok(
  (select (payload ->> 'archive_id')::uuid is not null from archive_out where key = 'a'),
  'archive_id is a uuid'
);

select ok(
  (
    select (payload ->> 'produced_at') ~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$'
    from archive_out where key = 'a'
  ),
  'produced_at matches the archive timestamp contract'
);

select isnt(
  (select payload ->> 'archive_id' from archive_out where key = 'a'),
  (select payload ->> 'archive_id' from archive_out where key = 'a_again'),
  'each export mints a distinct archive identity'
);

-- ---------------------------------------------------------------------------
-- Complete inventory: all nineteen collections, arrays never null
-- ---------------------------------------------------------------------------
select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_object_keys(exported.payload -> 'tables') as collection
    where exported.key = 'a'
  ),
  19,
  'all nineteen tenant dispositions are present in the payload'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_each(exported.payload -> 'tables') as collection
    where exported.key = 'b'
      and collection.key <> 'profile'
      and jsonb_typeof(collection.value) <> 'array'
  ),
  0,
  'every collection other than profile is a JSON array, never null'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_each(exported.payload -> 'tables') as collection
    where exported.key = 'b'
      and collection.key <> 'profile'
      and jsonb_array_length(collection.value) = 0
  ),
  16,
  'a bootstrap-only tenant emits empty arrays for every unused collection'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_object_keys(exported.payload -> 'tenant_row_counts') as counted
    where exported.key = 'a'
  ),
  19,
  'tenant_row_counts covers every collection'
);

-- The counts must describe the payload that was actually emitted.
select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_each(exported.payload -> 'tables') as collection
    where exported.key = 'a'
      and (exported.payload -> 'tenant_row_counts' -> collection.key)::text <> (
        case
          when collection.key = 'profile' then '1'
          else jsonb_array_length(collection.value)::text
        end
      )
  ),
  0,
  'every tenant_row_counts entry matches the serialized collection length'
);

-- ---------------------------------------------------------------------------
-- Tenant isolation
-- ---------------------------------------------------------------------------
select ok(
  (
    select position(
      (select id::text from archive_ctx where key = 'b_account') in payload::text
    ) = 0
    from archive_out where key = 'a'
  ),
  'tenant A''s archive contains no row belonging to tenant B'
);

select ok(
  (
    select position(
      (select id::text from archive_ctx where key = 'a_account') in payload::text
    ) = 0
    from archive_out where key = 'b'
  ),
  'tenant B''s archive contains no row belonging to tenant A'
);

select is(
  (
    select jsonb_array_length(payload -> 'tables' -> 'transactions')
    from archive_out where key = 'b'
  ),
  0,
  'a tenant with no ledger exports no transactions'
);

-- ---------------------------------------------------------------------------
-- Ownership and secrecy
-- ---------------------------------------------------------------------------
select ok(
  (select payload::text not like '%"user_id"%' from archive_out where key = 'a'),
  'no user_id appears anywhere in the archive'
);

select ok(
  (select payload::text not like '%"actor_user_id"%' from archive_out where key = 'a'),
  'no actor_user_id appears anywhere in the archive'
);

select ok(
  (select payload::text not like '%"request_id"%' from archive_out where key = 'a'),
  'audit transport metadata never reaches the archive'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'auditHistory') as event
    where exported.key = 'a'
      and event ? 'idempotency_key'
  ),
  0,
  'sanitized audit history carries no idempotency key'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_object_keys(exported.payload -> 'tables' -> 'profile') as field
    where exported.key = 'a'
  ),
  5,
  'the profile carries exactly its five source-neutral preference fields'
);

select ok(
  (
    select not (payload -> 'tables' -> 'profile' ? 'id')
    from archive_out where key = 'a'
  ),
  'the profile never carries the source tenant identity'
);

select ok(
  (
    select payload::text not like '%password%'
      and payload::text not like '%token%'
      and payload::text not like '%secret%'
      and payload::text not like '%service_role%'
      and payload::text not like '%"jwt"%'
    from archive_out where key = 'a'
  ),
  'no secret-bearing key name appears in the archive'
);

-- ---------------------------------------------------------------------------
-- Historical state survives
-- ---------------------------------------------------------------------------
select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'transactions') as transaction
    where exported.key = 'a'
      and transaction ->> 'id' = (select id::text from archive_ctx where key = 'a_deleted_tx')
      and transaction ->> 'deleted_at' is not null
  ),
  1,
  'a soft-deleted transaction survives with its deletion timestamp'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'categories') as category
    where exported.key = 'a'
      and (category ->> 'is_archived')::boolean
  ),
  1,
  'an archived category survives as archived'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'accounts') as account
    where exported.key = 'a'
      and (account ->> 'is_archived')::boolean
  ),
  1,
  'an archived account survives as archived'
);

-- ---------------------------------------------------------------------------
-- Money and transaction shapes
-- ---------------------------------------------------------------------------
select is(
  (
    select entry -> 'amount_minor'
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'transactionEntries') as entry
    where exported.key = 'a'
      and entry ->> 'transaction_id' = (select id::text from archive_ctx where key = 'a_income_tx')
  ),
  '9007199254740991'::jsonb,
  'the largest safe integer amount survives exactly'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'transactionEntries') as entry
    where exported.key = 'a'
      and entry ->> 'transaction_id' = (select id::text from archive_ctx where key = 'a_split_tx')
  ),
  2,
  'both split lines survive as entries'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'transactionEntries') as entry
    where exported.key = 'a'
      and entry ->> 'transaction_id' = (select id::text from archive_ctx where key = 'a_transfer_tx')
      and entry -> 'category_id' = 'null'::jsonb
  ),
  2,
  'both transfer legs survive with null categories'
);

-- ---------------------------------------------------------------------------
-- Import, rule, provenance and reconciliation state
-- ---------------------------------------------------------------------------
select is(
  (
    select batch ->> 'parser_version'
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'importBatches') as batch
    where exported.key = 'a'
  ),
  'parser-v2',
  'import batch parser provenance survives'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'inboxCandidates') as candidate
    where exported.key = 'a'
      and candidate ->> 'transfer_pair_id' is not null
  ),
  2,
  'the mutually paired candidates keep their self-reference'
);

select is(
  (
    select candidate ->> 'applied_rule_version'
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'inboxCandidates') as candidate
    where exported.key = 'a'
      and candidate ->> 'applied_rule_id' is not null
  ),
  '1',
  'applied rule evidence survives on the candidate'
);

select is(
  (
    select provenance ->> 'original_description'
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'transactionImportProvenance') as provenance
    where exported.key = 'a'
  ),
  'GRAB *ăn uống',
  'import provenance survives with its original description'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'accountReconciliations') as reconciliation
    where exported.key = 'a'
      and reconciliation ->> 'id' = (select id::text from archive_ctx where key = 'a_reconciliation')
  ),
  1,
  'the reconciliation survives'
);

select ok(
  (
    select jsonb_array_length(payload -> 'tables' -> 'accountReconciliationEvents') > 0
    from archive_out where key = 'a'
  ),
  'reconciliation history events survive'
);

select ok(
  (
    select jsonb_array_length(payload -> 'tables' -> 'auditHistory') > 0
    from archive_out where key = 'a'
  ),
  'sanitized audit history survives'
);

select is(
  (
    select count(*)::integer
    from archive_out as exported,
      jsonb_array_elements(exported.payload -> 'tables' -> 'inboxRules') as rule
    where exported.key = 'a'
      and rule ->> 'contains_text' = 'grab'
  ),
  1,
  'the deterministic rule survives'
);

-- ---------------------------------------------------------------------------
-- Determinism and read-only behaviour
-- ---------------------------------------------------------------------------
select is(
  (select payload -> 'tables' from archive_out where key = 'a'),
  (select payload -> 'tables' from archive_out where key = 'a_again'),
  'the tenant-state payload is identical across two exports'
);

select ok(
  (
    select
      before.transactions = (select count(*) from public.financial_transactions)
      and before.entries = (select count(*) from public.transaction_entries)
      and before.candidates = (select count(*) from public.inbox_candidates)
      and before.audit_events = (select count(*) from public.financial_mutation_audit_events)
    from archive_before_counts as before
  ),
  'exporting mutates nothing'
);

select * from finish();
rollback;
