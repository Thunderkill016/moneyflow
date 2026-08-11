-- R6 round-trip evidence fixture.
--
-- Builds one realistic tenant, exports it through the real archive producer and
-- prints the resulting JSON on stdout so `scripts/verify-archive-producer.mjs`
-- can feed the *raw* database output into the R5 validator. Nothing is
-- normalized, reshaped or repaired between the two.
--
-- Every collection is deliberately non-empty: the verifier asserts that, so a
-- producer that quietly stops emitting one table fails here instead of looking
-- fine against a thin fixture.
--
-- Everything runs inside a transaction that is rolled back. Run with:
--   psql -t -A -q -f supabase/tests/archive/export_archive_fixture.sql

begin;

\o /dev/null

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000f001',
  'authenticated', 'authenticated', 'archive-fixture@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Archive Fixture"}'::jsonb
);

create temporary table fixture_ctx (key text primary key, id uuid) on commit drop;
grant select, insert on fixture_ctx to authenticated;

insert into fixture_ctx values
  ('account', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000f001' limit 1
  )),
  ('expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000f001'
      and kind = 'expense' order by name limit 1
  )),
  ('expense_category_2', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000f001'
      and kind = 'expense' order by name offset 1 limit 1
  )),
  ('income_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000f001'
      and kind = 'income' order by name limit 1
  ));

set local role authenticated;
do $$
begin
  perform set_config(
    'request.jwt.claim.sub', '00000000-0000-4000-8000-00000000f001', true
  );
end;
$$;

insert into fixture_ctx values
  ('account_2', public.create_financial_account('Ngân hàng', 'bank', 500000, 'VND'));

insert into fixture_ctx values
  ('income_tx', public.create_money_transaction(
    (select id from fixture_ctx where key = 'account'),
    (select id from fixture_ctx where key = 'income_category'),
    'income', 9007199254740991, current_date, 'Biggest safe income',
    '00000000-0000-4000-8000-00000000f101'
  )),
  ('expense_tx', public.create_money_transaction(
    (select id from fixture_ctx where key = 'account'),
    (select id from fixture_ctx where key = 'expense_category'),
    'expense', 123456, current_date, 'An expense',
    '00000000-0000-4000-8000-00000000f102'
  )),
  ('deleted_tx', public.create_money_transaction(
    (select id from fixture_ctx where key = 'account'),
    (select id from fixture_ctx where key = 'expense_category'),
    'expense', 5000, current_date, 'Soft deleted later',
    '00000000-0000-4000-8000-00000000f103'
  ));

insert into fixture_ctx values
  ('split_tx', public.create_split_expense(
    (select id from fixture_ctx where key = 'account'),
    jsonb_build_array(
      jsonb_build_object(
        'category_id', (select id from fixture_ctx where key = 'expense_category'),
        'amount_minor', 70000
      ),
      jsonb_build_object(
        'category_id', (select id from fixture_ctx where key = 'expense_category_2'),
        'amount_minor', 30000
      )
    ),
    current_date, 'Split expense', '00000000-0000-4000-8000-00000000f104'
  )),
  ('transfer_tx', public.create_account_transfer(
    (select id from fixture_ctx where key = 'account'),
    (select id from fixture_ctx where key = 'account_2'),
    250000, current_date, 'Transfer', '00000000-0000-4000-8000-00000000f105'
  ));

select public.soft_delete_money_transaction(
  (select id from fixture_ctx where key = 'deleted_tx')
);

insert into fixture_ctx values
  ('budget', public.upsert_monthly_budget(
    (select id from fixture_ctx where key = 'expense_category'),
    date_trunc('month', current_date)::date,
    2000000
  )),
  ('goal', public.upsert_savings_goal(null, 'Quỹ dự phòng', 50000000, null));

select public.adjust_savings_goal(
  (select id from fixture_ctx where key = 'goal'), 1500000
);

insert into fixture_ctx values
  ('commitment', public.upsert_recurring_commitment(
    null, 'Tiền nhà', 4000000, 5,
    (select id from fixture_ctx where key = 'account'),
    (select id from fixture_ctx where key = 'expense_category')
  )),
  ('template', public.upsert_recurring_income_template(
    null, 'Lương', 15000000, 10,
    (select id from fixture_ctx where key = 'account'),
    (select id from fixture_ctx where key = 'income_category')
  ));

select public.pay_recurring_commitment(
  (select id from fixture_ctx where key = 'commitment'),
  date_trunc('month', current_date)::date,
  current_date,
  '00000000-0000-4000-8000-00000000f106'
);
select public.record_recurring_income_template(
  (select id from fixture_ctx where key = 'template'),
  date_trunc('month', current_date)::date,
  current_date,
  '00000000-0000-4000-8000-00000000f107'
);

insert into fixture_ctx values
  ('reconciliation', public.start_account_reconciliation(
    (select id from fixture_ctx where key = 'account'),
    current_date, 250000
  ));

reset role;

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map, local_id,
  parser_version, mapping_version
) values (
  '00000000-0000-4000-8000-00000000f201',
  '00000000-0000-4000-8000-00000000f001',
  'sao-ke.csv', 'csv', 'committed', 2, 0, 0, 0.9,
  '["Ngày","Số tiền"]'::jsonb, '{"date":"Ngày","amount":"Số tiền"}'::jsonb,
  'batch-local-1', 'parser-v2', 3
);

insert into public.inbox_rules (
  id, user_id, priority, enabled, match_field, contains_text,
  category_id, merchant_name
) values (
  '00000000-0000-4000-8000-00000000f202',
  '00000000-0000-4000-8000-00000000f001',
  10, true, 'merchant', 'grab',
  (select id from fixture_ctx where key = 'expense_category'),
  'Grab'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, import_batch_id, account_id, category_id,
  fingerprint, fingerprint_version, parser_version, mapping_version,
  match_status, match_confidence, source_row_index, source_external_id,
  applied_rule_id, applied_rule_version, possible_transfer, raw_snippet
) values
(
  '00000000-0000-4000-8000-00000000f203',
  '00000000-0000-4000-8000-00000000f001',
  'expense', 45000, 'Grab', '', current_date, 'csv',
  'high', 'pending', '00000000-0000-4000-8000-00000000f201',
  (select id from fixture_ctx where key = 'account'),
  (select id from fixture_ctx where key = 'expense_category'),
  'fp-1', 1, 'parser-v2', 3, 'would_create', 0.75, 0, 'ext-1',
  '00000000-0000-4000-8000-00000000f202', 1, true, 'GRAB *ăn uống 45.000'
),
(
  '00000000-0000-4000-8000-00000000f204',
  '00000000-0000-4000-8000-00000000f001',
  'income', 45000, 'Grab refund', '', current_date, 'csv',
  'medium', 'pending', '00000000-0000-4000-8000-00000000f201',
  (select id from fixture_ctx where key = 'account'),
  (select id from fixture_ctx where key = 'income_category'),
  'fp-2', 1, 'parser-v2', 3, 'suspected_transfer', 0.5, 1, 'ext-2',
  null, null, true, 'GRAB refund 45.000'
);

update public.inbox_candidates
set transfer_pair_id = '00000000-0000-4000-8000-00000000f204'
where id = '00000000-0000-4000-8000-00000000f203';
update public.inbox_candidates
set transfer_pair_id = '00000000-0000-4000-8000-00000000f203'
where id = '00000000-0000-4000-8000-00000000f204';

insert into public.transaction_import_provenance (
  transaction_id, user_id, candidate_id, import_batch_id, source,
  source_row_index, original_description, source_external_id,
  fingerprint, fingerprint_version, parser_version, mapping_version,
  match_status, match_reason, match_confidence
) values (
  (select id from fixture_ctx where key = 'expense_tx'),
  '00000000-0000-4000-8000-00000000f001',
  '00000000-0000-4000-8000-00000000f203',
  '00000000-0000-4000-8000-00000000f201',
  'csv', 0, 'GRAB *ăn uống', 'ext-1', 'fp-1', 1, 'parser-v2', 3,
  'would_create', 'matched by rule', 0.75
);

-- Archived history must survive the export.
update public.categories set is_archived = true
where id = (select id from fixture_ctx where key = 'expense_category_2');
update public.accounts set is_archived = true
where id = (select id from fixture_ctx where key = 'account_2');

set local role authenticated;
do $$
begin
  perform set_config(
    'request.jwt.claim.sub', '00000000-0000-4000-8000-00000000f001', true
  );
end;
$$;

\o

select public.export_user_archive()::text;

reset role;
rollback;
