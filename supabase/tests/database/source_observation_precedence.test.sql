begin;
select plan(24);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '44000000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'source-observation-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Source Observation Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '44000000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'source-observation-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Source Observation Other"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"44000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

create temporary table source_observation_ids (
  key text primary key,
  id uuid not null
) on commit drop;

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map, parser_version, mapping_version
) values (
  '44010000-0000-4000-8000-000000000001'::uuid,
  '44000000-0000-4000-8000-000000000001'::uuid,
  'source-observations.csv', 'csv', 'committed', 4, 0, 0, 1,
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
  '44020000-0000-4000-8000-000000000001'::uuid,
  '44000000-0000-4000-8000-000000000001'::uuid,
  'expense', 51000, 'Canonical merchant', 'Original source', '2026-08-20',
  'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '44000000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '44000000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  '20/08 Canonical merchant -51000',
  '44010000-0000-4000-8000-000000000001'::uuid,
  1, 'stable-event-440', 'csv_import@2.0', 2
);

insert into source_observation_ids (key, id)
select 'transaction', public.approve_inbox_candidate(
  '44020000-0000-4000-8000-000000000001'::uuid,
  'expense'::public.transaction_kind,
  (select id from public.accounts
   where user_id = '44000000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  null, 51000, '2026-08-20', 'Người dùng giữ ghi chú riêng',
  '44030000-0000-4000-8000-000000000001'::uuid, false
);

-- Same source identity and same source evidence is only an unchanged replay.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, source_external_id,
  parser_version, mapping_version
) values (
  '44020000-0000-4000-8000-000000000002'::uuid,
  '44000000-0000-4000-8000-000000000001'::uuid,
  'expense', 51000, 'Canonical merchant', 'Same source replay', '2026-08-20',
  'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '44000000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '44000000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  '20/08 Canonical merchant -51000',
  '44010000-0000-4000-8000-000000000001'::uuid,
  2, 'stable-event-440', 'csv_import@2.0', 2
);

select is(
  public.plan_inbox_candidate('44020000-0000-4000-8000-000000000002'::uuid) ->> 'reason',
  'source_external_id_match',
  'unchanged live same-ID observation stays the existing hard duplicate'
);

-- Same stable ID but materially changed source payload is a different observation.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, source_external_id,
  parser_version, mapping_version
) values (
  '44020000-0000-4000-8000-000000000003'::uuid,
  '44000000-0000-4000-8000-000000000001'::uuid,
  'expense', 61000, 'Canonical merchant corrected upstream', 'Changed source', '2026-08-20',
  'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '44000000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '44000000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  '20/08 Canonical merchant corrected upstream -61000',
  '44010000-0000-4000-8000-000000000001'::uuid,
  3, 'stable-event-440', 'csv_import@2.0', 2
);

select is(
  public.plan_inbox_candidate('44020000-0000-4000-8000-000000000003'::uuid) ->> 'reason',
  'source_external_id_changed',
  'changed live same-ID observation gets a distinct hard source plan'
);

select is(
  (public.plan_inbox_candidate('44020000-0000-4000-8000-000000000003'::uuid) ->> 'matched_transaction_id')::uuid,
  (select id from source_observation_ids where key = 'transaction'),
  'changed-source plan identifies the canonical transaction'
);

-- Direct callers cannot use the heuristic override to escape a hard source identity plan.
select throws_ok(
  format(
    'select public.approve_inbox_candidate(%L::uuid, %L::public.transaction_kind, %L::uuid, %L::uuid, null, 61000, %L::date, %L, %L::uuid, true)',
    '44020000-0000-4000-8000-000000000003',
    'expense',
    (select id from public.accounts where user_id = '44000000-0000-4000-8000-000000000001' order by created_at, id limit 1),
    (select id from public.categories where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
    '2026-08-20',
    'must not create separately',
    '44030000-0000-4000-8000-000000000002'
  ),
  'source_external_id_duplicate',
  'hard source identity cannot be bypassed by p_allow_heuristic_duplicate'
);

create temporary table source_observation_before on commit drop as
select
  t.kind::text as kind,
  t.note,
  t.occurred_on,
  t.review_status::text as review_status,
  t.deleted_at,
  e.account_id,
  e.category_id,
  e.amount_minor,
  e.reconciliation_state::text as reconciliation_state,
  e.cleared_at,
  e.reconciliation_id,
  p.candidate_id as canonical_candidate_id,
  p.source::text as source,
  p.source_external_id,
  p.fingerprint_version,
  p.fingerprint,
  p.original_description,
  p.import_batch_id
from public.financial_transactions t
join public.transaction_entries e
  on e.transaction_id = t.id and e.user_id = t.user_id
join public.transaction_import_provenance p
  on p.transaction_id = t.id and p.user_id = t.user_id
where t.id = (select id from source_observation_ids where key = 'transaction');

create temporary table source_observation_audit_before on commit drop as
select count(*)::integer as count
from public.financial_mutation_audit_events
where user_id = '44000000-0000-4000-8000-000000000001'
  and related_transaction_id = (select id from source_observation_ids where key = 'transaction');

select is(
  public.record_changed_source_observation_from_candidate(
    '44020000-0000-4000-8000-000000000003'::uuid,
    (select id from source_observation_ids where key = 'transaction')
  ),
  (select id from source_observation_ids where key = 'transaction'),
  'reviewed changed observation resolves to the same canonical transaction'
);

select is(
  (select approved_transaction_id from public.inbox_candidates
   where id = '44020000-0000-4000-8000-000000000003'::uuid),
  (select id from source_observation_ids where key = 'transaction'),
  'changed observation is linked to the existing transaction'
);

select is(
  (select match_reason from public.inbox_candidates
   where id = '44020000-0000-4000-8000-000000000003'::uuid),
  'source_external_id_changed_observation',
  'changed observation persists the reviewed source-update decision'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '44000000-0000-4000-8000-000000000001'),
  1,
  'observation-only resolution creates no second financial fact'
);

select is(
  (select count(*)::integer from public.transaction_import_provenance
   where user_id = '44000000-0000-4000-8000-000000000001'),
  1,
  'observation-only resolution creates no second canonical provenance row'
);

select is(
  (select candidate_id from public.transaction_import_provenance
   where transaction_id = (select id from source_observation_ids where key = 'transaction')),
  '44020000-0000-4000-8000-000000000001'::uuid,
  'canonical provenance remains anchored to the original imported candidate'
);

select is(
  (
    select row(
      t.kind::text, t.note, t.occurred_on, t.review_status::text, t.deleted_at,
      e.account_id, e.category_id, e.amount_minor, e.reconciliation_state::text,
      e.cleared_at, e.reconciliation_id,
      p.candidate_id, p.source::text, p.source_external_id,
      p.fingerprint_version, p.fingerprint, p.original_description, p.import_batch_id
    )::text
    from public.financial_transactions t
    join public.transaction_entries e
      on e.transaction_id = t.id and e.user_id = t.user_id
    join public.transaction_import_provenance p
      on p.transaction_id = t.id and p.user_id = t.user_id
    where t.id = (select id from source_observation_ids where key = 'transaction')
  ),
  (
    select row(
      kind, note, occurred_on, review_status, deleted_at,
      account_id, category_id, amount_minor, reconciliation_state,
      cleared_at, reconciliation_id,
      canonical_candidate_id, source, source_external_id,
      fingerprint_version, fingerprint, original_description, import_batch_id
    )::text
    from source_observation_before
  ),
  'reviewed observation leaves ledger, reconciliation and canonical provenance unchanged'
);

select is(
  (select count(*)::integer from public.financial_mutation_audit_events
   where user_id = '44000000-0000-4000-8000-000000000001'
     and related_transaction_id = (select id from source_observation_ids where key = 'transaction')),
  (select count from source_observation_audit_before),
  'observation-only resolution creates no financial mutation audit event'
);

select is(
  public.record_changed_source_observation_from_candidate(
    '44020000-0000-4000-8000-000000000003'::uuid,
    (select id from source_observation_ids where key = 'transaction')
  ),
  (select id from source_observation_ids where key = 'transaction'),
  'replay returns the same resolved transaction'
);

select is(
  (select count(*)::integer from public.financial_mutation_audit_events
   where user_id = '44000000-0000-4000-8000-000000000001'
     and related_transaction_id = (select id from source_observation_ids where key = 'transaction')),
  (select count from source_observation_audit_before),
  'replay remains free of financial mutation audit events'
);

select throws_ok(
  $$
    select public.record_changed_source_observation_from_candidate(
      '44020000-0000-4000-8000-000000000002'::uuid,
      (select id from source_observation_ids where key = 'transaction')
    )
  $$,
  'source_observation_unchanged',
  'unchanged replay cannot use the changed-observation resolution RPC'
);

-- Deleted targets stay under #439 deletion precedence, not this live-source operation.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, source_external_id,
  parser_version, mapping_version
) values (
  '44020000-0000-4000-8000-000000000004'::uuid,
  '44000000-0000-4000-8000-000000000001'::uuid,
  'expense', 71000, 'Another upstream correction', 'Changed again', '2026-08-20',
  'csv', 'high', 'pending',
  (select id from public.categories where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
  (select name from public.categories where user_id = '44000000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
  (select id from public.accounts where user_id = '44000000-0000-4000-8000-000000000001' order by created_at, id limit 1),
  (select name from public.accounts where user_id = '44000000-0000-4000-8000-000000000001' order by created_at, id limit 1),
  '20/08 Another upstream correction -71000',
  '44010000-0000-4000-8000-000000000001'::uuid,
  4, 'stable-event-440', 'csv_import@2.0', 2
);

select ok(
  public.soft_delete_money_transaction((select id from source_observation_ids where key = 'transaction')),
  'canonical transaction can be soft-deleted for boundary test'
);

select throws_ok(
  $$
    select public.record_changed_source_observation_from_candidate(
      '44020000-0000-4000-8000-000000000004'::uuid,
      (select id from source_observation_ids where key = 'transaction')
    )
  $$,
  'transaction_deleted',
  'changed-source live resolution refuses a deleted canonical transaction'
);

select ok(
  public.restore_deleted_imported_transaction_from_candidate(
    '44020000-0000-4000-8000-000000000002'::uuid,
    (select id from source_observation_ids where key = 'transaction')
  ) = (select id from source_observation_ids where key = 'transaction'),
  'existing #439 unchanged-evidence restore path still owns deleted-source restoration'
);

-- Resolved source evidence cannot be silently rewritten through the browser role.
select throws_ok(
  $$
    update public.inbox_candidates
    set amount_minor = 999999
    where id = '44020000-0000-4000-8000-000000000003'::uuid
  $$,
  'approved_candidate_evidence_immutable',
  'approved source observation evidence cannot be rewritten'
);

select ok(
  not has_table_privilege('authenticated', 'public.inbox_candidates', 'DELETE'),
  'authenticated role cannot directly delete persisted Inbox observation evidence'
);

-- Import batch deletion remains valid and may null only the batch linkage.
create temporary table source_observation_candidate_before on commit drop as
select
  kind::text as kind, amount_minor, merchant, note, occurred_on,
  source::text as source, confidence::text as confidence, status::text as status,
  raw_snippet, source_row_index, source_external_id, fingerprint_version, fingerprint,
  parser_version, mapping_version, match_status::text as match_status,
  match_reason, match_confidence, approved_transaction_id, approved_at
from public.inbox_candidates
where id = '44020000-0000-4000-8000-000000000003'::uuid;

delete from public.import_batches
where id = '44010000-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select count(*)::integer
    from public.import_batches
    where id = '44010000-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'owner can still delete import-batch metadata'
);

select ok(
  (select import_batch_id is null from public.inbox_candidates
   where id = '44020000-0000-4000-8000-000000000003'::uuid),
  'batch deletion nulls only the approved observation batch linkage'
);

select is(
  (
    select row(
      kind::text, amount_minor, merchant, note, occurred_on,
      source::text, confidence::text, status::text,
      raw_snippet, source_row_index, source_external_id, fingerprint_version, fingerprint,
      parser_version, mapping_version, match_status::text,
      match_reason, match_confidence, approved_transaction_id, approved_at
    )::text
    from public.inbox_candidates
    where id = '44020000-0000-4000-8000-000000000003'::uuid
  ),
  (
    select row(
      kind, amount_minor, merchant, note, occurred_on,
      source, confidence, status,
      raw_snippet, source_row_index, source_external_id, fingerprint_version, fingerprint,
      parser_version, mapping_version, match_status,
      match_reason, match_confidence, approved_transaction_id, approved_at
    )::text
    from source_observation_candidate_before
  ),
  'batch cleanup preserves all approved observation evidence fields'
);

set local request.jwt.claims = '{"sub":"44000000-0000-4000-8000-000000000002","role":"authenticated"}';

select throws_ok(
  $$
    select public.record_changed_source_observation_from_candidate(
      '44020000-0000-4000-8000-000000000004'::uuid,
      (select id from source_observation_ids where key = 'transaction')
    )
  $$,
  'candidate_not_found',
  'another tenant cannot resolve the owner source observation'
);

reset role;
select * from finish();
rollback;
