begin;
select plan(21);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '43800000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'deleted-reimport-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Deleted Reimport Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '43800000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'deleted-reimport-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Deleted Reimport Other"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"43800000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

create temporary table deleted_reimport_ids (
  key text primary key,
  id uuid not null
) on commit drop;

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map, parser_version, mapping_version
) values (
  '43810000-0000-4000-8000-000000000001'::uuid,
  '43800000-0000-4000-8000-000000000001'::uuid,
  'stable-source.csv', 'csv', 'committed', 3, 0, 0, 1,
  '["date","description","amount"]'::jsonb,
  '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb,
  'csv_import@2.0', 2
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, source_external_id,
  parser_version, mapping_version
) values (
  '43820000-0000-4000-8000-000000000001'::uuid,
  '43800000-0000-4000-8000-000000000001'::uuid,
  'expense', 51000, 'Stable merchant', 'Original source', '2026-08-19',
  'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '43800000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '43800000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43800000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '43800000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  '19/08 Stable merchant -51000',
  '43810000-0000-4000-8000-000000000001'::uuid,
  1, 'stable-event-438', 'csv_import@2.0', 2
);

insert into deleted_reimport_ids (key, id)
select 'transaction', public.approve_inbox_candidate(
  '43820000-0000-4000-8000-000000000001'::uuid,
  'expense'::public.transaction_kind,
  (select id from public.accounts
   where user_id = '43800000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = '43800000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  null,
  51000,
  '2026-08-19',
  'Người dùng giữ ghi chú riêng',
  '43830000-0000-4000-8000-000000000001'::uuid,
  false
);

-- A repeat observation while the transaction is live stays a hard duplicate.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, source_external_id,
  parser_version, mapping_version
) values (
  '43820000-0000-4000-8000-000000000002'::uuid,
  '43800000-0000-4000-8000-000000000001'::uuid,
  'expense', 51000, 'Stable merchant', 'Repeat source', '2026-08-19',
  'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '43800000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '43800000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43800000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '43800000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  '19/08 Stable merchant -51000',
  '43810000-0000-4000-8000-000000000001'::uuid,
  2, 'stable-event-438', 'csv_import@2.0', 2
);

select is(
  public.plan_inbox_candidate('43820000-0000-4000-8000-000000000002'::uuid) ->> 'reason',
  'source_external_id_match',
  'live exact source ID remains a hard duplicate'
);

select ok(
  public.soft_delete_money_transaction((select id from deleted_reimport_ids where key = 'transaction')),
  'owner can soft-delete the imported transaction'
);

select is(
  public.plan_inbox_candidate('43820000-0000-4000-8000-000000000002'::uuid) ->> 'reason',
  'source_external_id_deleted_match',
  'same exact source observation against a deleted transaction becomes a reviewed restore plan'
);

select is(
  (public.plan_inbox_candidate('43820000-0000-4000-8000-000000000002'::uuid) ->> 'matched_transaction_id')::uuid,
  (select id from deleted_reimport_ids where key = 'transaction'),
  'deleted restore plan identifies the canonical transaction'
);

select ok(
  (select deleted_at is not null from public.financial_transactions
   where id = (select id from deleted_reimport_ids where key = 'transaction')),
  'planning does not restore the deleted transaction'
);

create temporary table deleted_reimport_before on commit drop as
select
  t.kind::text as kind,
  t.note,
  t.occurred_on,
  t.review_status::text as review_status,
  e.account_id,
  e.category_id,
  e.amount_minor,
  e.reconciliation_state::text as reconciliation_state,
  e.cleared_at,
  e.reconciliation_id
from public.financial_transactions t
join public.transaction_entries e
  on e.transaction_id = t.id and e.user_id = t.user_id
where t.id = (select id from deleted_reimport_ids where key = 'transaction');

create temporary table deleted_reimport_audit_before on commit drop as
select count(*)::integer as count
from public.financial_mutation_audit_events
where user_id = '43800000-0000-4000-8000-000000000001'
  and related_transaction_id = (select id from deleted_reimport_ids where key = 'transaction')
  and action = 'transaction_restored';

select is(
  public.restore_deleted_imported_transaction_from_candidate(
    '43820000-0000-4000-8000-000000000002'::uuid,
    (select id from deleted_reimport_ids where key = 'transaction')
  ),
  (select id from deleted_reimport_ids where key = 'transaction'),
  'explicit reviewed restore returns the same transaction'
);

select ok(
  (select deleted_at is null from public.financial_transactions
   where id = (select id from deleted_reimport_ids where key = 'transaction')),
  'explicit restore clears only the deletion state on the existing transaction'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '43800000-0000-4000-8000-000000000001'),
  1,
  'restore creates no second financial transaction'
);

select is(
  (select count(*)::integer from public.transaction_import_provenance
   where user_id = '43800000-0000-4000-8000-000000000001'),
  1,
  'restore creates no second canonical provenance row'
);

select is(
  (select candidate_id from public.transaction_import_provenance
   where transaction_id = (select id from deleted_reimport_ids where key = 'transaction')),
  '43820000-0000-4000-8000-000000000001'::uuid,
  'restore leaves canonical provenance linked to the original imported candidate'
);

select is(
  (
    select row(
      t.kind::text, t.note, t.occurred_on, t.review_status::text,
      e.account_id, e.category_id, e.amount_minor, e.reconciliation_state::text,
      e.cleared_at, e.reconciliation_id
    )::text
    from public.financial_transactions t
    join public.transaction_entries e
      on e.transaction_id = t.id and e.user_id = t.user_id
    where t.id = (select id from deleted_reimport_ids where key = 'transaction')
  ),
  (
    select row(
      kind, note, occurred_on, review_status,
      account_id, category_id, amount_minor, reconciliation_state,
      cleared_at, reconciliation_id
    )::text
    from deleted_reimport_before
  ),
  'restore preserves ledger and reconciliation values exactly'
);

select is(
  (select approved_transaction_id from public.inbox_candidates
   where id = '43820000-0000-4000-8000-000000000002'::uuid),
  (select id from deleted_reimport_ids where key = 'transaction'),
  'repeat candidate links to the restored canonical transaction'
);

select is(
  (select match_reason from public.inbox_candidates
   where id = '43820000-0000-4000-8000-000000000002'::uuid),
  'source_external_id_deleted_restore',
  'repeat candidate records the reviewed deleted-reimport decision'
);

select is(
  (select count(*)::integer from public.financial_mutation_audit_events
   where user_id = '43800000-0000-4000-8000-000000000001'
     and related_transaction_id = (select id from deleted_reimport_ids where key = 'transaction')
     and action = 'transaction_restored'),
  (select count + 1 from deleted_reimport_audit_before),
  'existing financial audit trigger records exactly one restore mutation'
);

select is(
  public.restore_deleted_imported_transaction_from_candidate(
    '43820000-0000-4000-8000-000000000002'::uuid,
    (select id from deleted_reimport_ids where key = 'transaction')
  ),
  (select id from deleted_reimport_ids where key = 'transaction'),
  'replay returns the same restored transaction'
);

select is(
  (select count(*)::integer from public.financial_mutation_audit_events
   where user_id = '43800000-0000-4000-8000-000000000001'
     and related_transaction_id = (select id from deleted_reimport_ids where key = 'transaction')
     and action = 'transaction_restored'),
  (select count + 1 from deleted_reimport_audit_before),
  'replay creates no second restore audit event'
);

-- A materially changed repeat observation is not silently restored in this slice.
select ok(
  public.soft_delete_money_transaction((select id from deleted_reimport_ids where key = 'transaction')),
  'transaction can be deleted again for changed-source counterexample'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, source_external_id,
  parser_version, mapping_version
) values (
  '43820000-0000-4000-8000-000000000003'::uuid,
  '43800000-0000-4000-8000-000000000001'::uuid,
  'expense', 61000, 'Stable merchant corrected upstream', 'Changed source', '2026-08-19',
  'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '43800000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '43800000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43800000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '43800000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  '19/08 Stable merchant corrected upstream -61000',
  '43810000-0000-4000-8000-000000000001'::uuid,
  3, 'stable-event-438', 'csv_import@2.0', 2
);

select is(
  public.plan_inbox_candidate('43820000-0000-4000-8000-000000000003'::uuid) ->> 'reason',
  'source_external_id_deleted_changed',
  'same deleted source ID with changed evidence is blocked for later source-update review'
);

select throws_ok(
  $$
    select public.restore_deleted_imported_transaction_from_candidate(
      '43820000-0000-4000-8000-000000000003'::uuid,
      (select id from deleted_reimport_ids where key = 'transaction')
    )
  $$,
  'source_observation_changed',
  'changed source evidence cannot use the deleted-reimport restore RPC'
);

select ok(
  (select deleted_at is not null from public.financial_transactions
   where id = (select id from deleted_reimport_ids where key = 'transaction')),
  'changed-source refusal leaves deletion state intact'
);

set local request.jwt.claims = '{"sub":"43800000-0000-4000-8000-000000000002","role":"authenticated"}';

select throws_ok(
  $$
    select public.restore_deleted_imported_transaction_from_candidate(
      '43820000-0000-4000-8000-000000000003'::uuid,
      (select id from deleted_reimport_ids where key = 'transaction')
    )
  $$,
  'candidate_not_found',
  'another tenant cannot restore the owner source candidate'
);

reset role;
select * from finish();
rollback;
