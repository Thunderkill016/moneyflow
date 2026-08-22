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
  '44200000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'lineage-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Lineage Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '44200000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'lineage-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Lineage Other"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"44200000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

create temporary table lineage_ids (
  key text primary key,
  id uuid not null
) on commit drop;

-- Canonical imported source identity P.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) values (
  '44210000-0000-4000-8000-000000000001'::uuid,
  '44200000-0000-4000-8000-000000000001'::uuid,
  'expense', 51000, 'Pending merchant', 'pending evidence', '2026-08-20',
  'csv', 'high', 'pending',
  (select id from public.categories where user_id = '44200000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
  (select name from public.categories where user_id = '44200000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
  (select id from public.accounts where user_id = '44200000-0000-4000-8000-000000000001' order by created_at, id limit 1),
  (select name from public.accounts where user_id = '44200000-0000-4000-8000-000000000001' order by created_at, id limit 1),
  '20/08 Pending merchant -51000', 1, 'pending-442', 'pending', null,
  'lineage-test@1.0', 1
);

insert into lineage_ids (key, id)
select 'transaction', public.approve_inbox_candidate(
  '44210000-0000-4000-8000-000000000001'::uuid,
  'expense'::public.transaction_kind,
  (select id from public.accounts where user_id = '44200000-0000-4000-8000-000000000001' order by created_at, id limit 1),
  (select id from public.categories where user_id = '44200000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
  null, 51000, '2026-08-20', 'Người dùng giữ dữ liệu riêng',
  '44220000-0000-4000-8000-000000000001'::uuid, false
);

-- Source explicitly says posted ID Q replaces pending ID P.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) values (
  '44210000-0000-4000-8000-000000000002'::uuid,
  '44200000-0000-4000-8000-000000000001'::uuid,
  'expense', 53000, 'Posted merchant', 'posted evidence', '2026-08-21',
  'csv', 'high', 'pending',
  (select id from public.categories where user_id = '44200000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
  (select name from public.categories where user_id = '44200000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
  (select id from public.accounts where user_id = '44200000-0000-4000-8000-000000000001' order by created_at, id limit 1),
  (select name from public.accounts where user_id = '44200000-0000-4000-8000-000000000001' order by created_at, id limit 1),
  '21/08 Posted merchant -53000', 2, 'posted-442', 'posted', 'pending-442',
  'lineage-test@1.0', 1
);

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000002'::uuid) ->> 'reason',
  'source_predecessor_match',
  'explicit predecessor identity produces a hard replacement plan'
);

select is(
  (public.plan_inbox_candidate('44210000-0000-4000-8000-000000000002'::uuid) ->> 'matched_transaction_id')::uuid,
  (select id from lineage_ids where key = 'transaction'),
  'predecessor plan resolves the existing canonical transaction'
);

select throws_ok(
  format(
    'select public.approve_inbox_candidate(%L::uuid, %L::public.transaction_kind, %L::uuid, %L::uuid, null, 53000, %L::date, %L, %L::uuid, true)',
    '44210000-0000-4000-8000-000000000002',
    'expense',
    (select id from public.accounts where user_id = '44200000-0000-4000-8000-000000000001' order by created_at, id limit 1),
    (select id from public.categories where user_id = '44200000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
    '2026-08-21', 'must not create separately',
    '44220000-0000-4000-8000-000000000002'
  ),
  'source_external_id_duplicate',
  'heuristic duplicate override cannot escape explicit predecessor identity'
);

create temporary table lineage_before on commit drop as
select
  t.kind::text as kind, t.note, t.occurred_on, t.review_status::text as review_status,
  t.deleted_at, e.account_id, e.category_id, e.amount_minor,
  e.reconciliation_state::text as reconciliation_state, e.cleared_at,
  e.reconciliation_id, p.candidate_id, p.source::text as source,
  p.source_external_id, p.fingerprint_version, p.fingerprint, p.original_description
from public.financial_transactions t
join public.transaction_entries e on e.transaction_id = t.id and e.user_id = t.user_id
join public.transaction_import_provenance p on p.transaction_id = t.id and p.user_id = t.user_id
where t.id = (select id from lineage_ids where key = 'transaction');

create temporary table lineage_audit_before on commit drop as
select count(*)::integer as count
from public.financial_mutation_audit_events
where user_id = '44200000-0000-4000-8000-000000000001'
  and related_transaction_id = (select id from lineage_ids where key = 'transaction');

select is(
  public.record_source_replacement_observation_from_candidate(
    '44210000-0000-4000-8000-000000000002'::uuid,
    (select id from lineage_ids where key = 'transaction')
  ),
  (select id from lineage_ids where key = 'transaction'),
  'reviewed replacement resolves to the same financial transaction'
);

select is(
  (select approved_transaction_id from public.inbox_candidates where id = '44210000-0000-4000-8000-000000000002'::uuid),
  (select id from lineage_ids where key = 'transaction'),
  'replacement observation is durably linked to the existing transaction'
);

select is(
  (select match_reason from public.inbox_candidates where id = '44210000-0000-4000-8000-000000000002'::uuid),
  'source_predecessor_observation',
  'replacement observation records the explicit lineage decision'
);

select is(
  (
    select row(
      t.kind::text, t.note, t.occurred_on, t.review_status::text, t.deleted_at,
      e.account_id, e.category_id, e.amount_minor, e.reconciliation_state::text,
      e.cleared_at, e.reconciliation_id, p.candidate_id, p.source::text,
      p.source_external_id, p.fingerprint_version, p.fingerprint, p.original_description
    )::text
    from public.financial_transactions t
    join public.transaction_entries e on e.transaction_id = t.id and e.user_id = t.user_id
    join public.transaction_import_provenance p on p.transaction_id = t.id and p.user_id = t.user_id
    where t.id = (select id from lineage_ids where key = 'transaction')
  ),
  (select row(kind, note, occurred_on, review_status, deleted_at, account_id, category_id,
              amount_minor, reconciliation_state, cleared_at, reconciliation_id,
              candidate_id, source, source_external_id, fingerprint_version,
              fingerprint, original_description)::text from lineage_before),
  'replacement observation leaves ledger, reconciliation and canonical provenance unchanged'
);

select is(
  (select count(*)::integer from public.financial_mutation_audit_events
   where user_id = '44200000-0000-4000-8000-000000000001'
     and related_transaction_id = (select id from lineage_ids where key = 'transaction')),
  (select count from lineage_audit_before),
  'observation-only replacement creates no financial mutation audit event'
);

select is(
  public.record_source_replacement_observation_from_candidate(
    '44210000-0000-4000-8000-000000000002'::uuid,
    (select id from lineage_ids where key = 'transaction')
  ),
  (select id from lineage_ids where key = 'transaction'),
  'replacement resolution is replay-idempotent'
);

-- Q is now a durable exact source identity even though canonical provenance still says P.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) select
  '44210000-0000-4000-8000-000000000003'::uuid, user_id, kind, amount_minor,
  merchant, 'replay Q', occurred_on, source, confidence, 'pending', category_id,
  category_name, account_id, account_name, raw_snippet, 3, source_external_id,
  source_lifecycle_state, source_predecessor_external_id, parser_version, mapping_version
from public.inbox_candidates
where id = '44210000-0000-4000-8000-000000000002'::uuid;

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000003'::uuid) ->> 'reason',
  'source_external_id_match',
  'replay of a reviewed replacement ID is an exact-source duplicate'
);

-- Q changes upstream; after review, replay of that revised observation must become unchanged.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) select
  '44210000-0000-4000-8000-000000000004'::uuid, user_id, kind, 55000,
  'Posted merchant corrected', 'changed Q', occurred_on, source, confidence,
  'pending', category_id, category_name, account_id, account_name,
  '21/08 Posted merchant corrected -55000', 4, source_external_id,
  'posted', source_predecessor_external_id, parser_version, mapping_version
from public.inbox_candidates
where id = '44210000-0000-4000-8000-000000000002'::uuid;

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000004'::uuid) ->> 'reason',
  'source_external_id_changed',
  'changed evidence under replacement ID is detected against latest durable observation'
);

select is(
  public.record_changed_source_observation_from_candidate(
    '44210000-0000-4000-8000-000000000004'::uuid,
    (select id from lineage_ids where key = 'transaction')
  ),
  (select id from lineage_ids where key = 'transaction'),
  'same-ID update can be reviewed even when identity originated as a replacement alias'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) select
  '44210000-0000-4000-8000-000000000005'::uuid, user_id, kind, amount_minor,
  merchant, 'replay revised Q', occurred_on, source, confidence, 'pending',
  category_id, category_name, account_id, account_name, raw_snippet, 5,
  source_external_id, source_lifecycle_state, source_predecessor_external_id,
  parser_version, mapping_version
from public.inbox_candidates
where id = '44210000-0000-4000-8000-000000000004'::uuid;

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000005'::uuid) ->> 'reason',
  'source_external_id_match',
  'replay of the reviewed revised observation is no longer perpetually changed'
);

-- Same economics but no explicit predecessor: heuristic duplicate may fire, lineage may not.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) select
  '44210000-0000-4000-8000-000000000006'::uuid, user_id, kind, 51000,
  'Pending merchant', 'same economics no lineage', '2026-08-20', source,
  confidence, 'pending', category_id, category_name, account_id, account_name,
  '20/08 Pending merchant -51000', 6, 'unlinked-442', 'posted', null,
  parser_version, mapping_version
from public.inbox_candidates
where id = '44210000-0000-4000-8000-000000000002'::uuid;

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000006'::uuid) ->> 'reason',
  'fingerprint_transaction_match',
  'different ID without explicit predecessor stays heuristic rather than lineage'
);

-- A source tombstone with no known identity must never create a ledger fact.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) select
  '44210000-0000-4000-8000-000000000007'::uuid, user_id, kind, 88000,
  'Removed unknown', 'removed', '2026-08-22', source, confidence, 'pending',
  category_id, category_name, account_id, account_name, 'removed unknown 88000',
  7, 'removed-unknown-442', 'removed', null, parser_version, mapping_version
from public.inbox_candidates
where id = '44210000-0000-4000-8000-000000000002'::uuid;

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000007'::uuid) ->> 'reason',
  'source_removed_unmatched',
  'unmatched removed source evidence is blocked rather than posted as money'
);

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000007'::uuid) ->> 'status',
  'invalid',
  'unmatched removed source evidence is an invalid financial approval plan'
);

-- Wrong source never resolves a predecessor with the same text id.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) select
  '44210000-0000-4000-8000-000000000008'::uuid, user_id, kind, 99000,
  'Wrong source', '', '2026-08-22', 'email'::public.inbox_candidate_source,
  confidence, 'pending', category_id, category_name, account_id, account_name,
  'wrong source 99000', 8, 'email-posted-442', 'posted', 'pending-442',
  'lineage-test@1.0', 1
from public.inbox_candidates
where id = '44210000-0000-4000-8000-000000000002'::uuid;

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000008'::uuid) ->> 'reason',
  'no_server_match',
  'predecessor identity is source-scoped'
);

-- Another tenant's source identity is never visible to this owner.
set local request.jwt.claims = '{"sub":"44200000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) values (
  '44210000-0000-4000-8000-000000000009'::uuid,
  '44200000-0000-4000-8000-000000000002'::uuid,
  'expense', 77000, 'Other tenant', '', '2026-08-22', 'csv', 'high', 'pending',
  (select id from public.categories where user_id = '44200000-0000-4000-8000-000000000002' and kind = 'expense' order by created_at, id limit 1),
  (select name from public.categories where user_id = '44200000-0000-4000-8000-000000000002' and kind = 'expense' order by created_at, id limit 1),
  (select id from public.accounts where user_id = '44200000-0000-4000-8000-000000000002' order by created_at, id limit 1),
  (select name from public.accounts where user_id = '44200000-0000-4000-8000-000000000002' order by created_at, id limit 1),
  'other tenant 77000', 1, 'other-posted-442', 'posted', 'pending-442',
  'lineage-test@1.0', 1
);

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000009'::uuid) ->> 'reason',
  'no_server_match',
  'predecessor resolution is tenant-scoped'
);

set local request.jwt.claims = '{"sub":"44200000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok(
  $$
    insert into public.inbox_candidates (
      user_id, kind, amount_minor, merchant, note, occurred_on, source,
      confidence, status, source_external_id, source_lifecycle_state,
      source_predecessor_external_id
    ) values (
      '44200000-0000-4000-8000-000000000001'::uuid,
      'expense', 1000, 'manual lineage', '', '2026-08-22', 'manual', 'high',
      'pending', 'manual-current', 'pending', 'manual-previous'
    )
  $$,
  'new row for relation "inbox_candidates" violates check constraint "inbox_candidates_source_lineage_shape_check"',
  'manual candidates cannot fabricate source predecessor lifecycle evidence'
);

select throws_ok(
  $$
    insert into public.inbox_candidates (
      user_id, kind, amount_minor, merchant, note, occurred_on, source,
      confidence, status, source_external_id, source_lifecycle_state,
      source_predecessor_external_id
    ) values (
      '44200000-0000-4000-8000-000000000001'::uuid,
      'expense', 1000, 'self lineage', '', '2026-08-22', 'csv', 'high',
      'pending', 'same-442', 'posted', 'same-442'
    )
  $$,
  'new row for relation "inbox_candidates" violates check constraint "inbox_candidates_source_lineage_shape_check"',
  'a source ID cannot declare itself as its own predecessor'
);

-- Identity consistency is a database invariant, not merely an RPC convention.
reset role;
insert into public.financial_transactions (
  id, user_id, kind, note, occurred_on, idempotency_key
) values (
  '44230000-0000-4000-8000-000000000002'::uuid,
  '44200000-0000-4000-8000-000000000001'::uuid,
  'expense', 'conflict target', '2026-08-22',
  '44220000-0000-4000-8000-000000000099'::uuid
);

set local role authenticated;
select throws_ok(
  format(
    'update public.inbox_candidates set status = %L, approved_transaction_id = %L::uuid, approved_at = now(), match_status = %L::public.import_match_status, match_reason = %L where id = %L::uuid',
    'approved', '44230000-0000-4000-8000-000000000002', 'duplicate',
    'source_predecessor_observation', '44210000-0000-4000-8000-000000000003'
  ),
  'approved_candidate_evidence_immutable',
  'browser role still cannot rewrite an approved observation while identity guards exist'
);

reset role;
select throws_ok(
  format(
    'update public.inbox_candidates set approved_transaction_id = %L::uuid where id = %L::uuid',
    '44230000-0000-4000-8000-000000000002',
    '44210000-0000-4000-8000-000000000002'
  ),
  'source_identity_conflict',
  'database guard rejects binding one source ID to a second transaction'
);

set local role authenticated;

-- Deleting the target keeps explicit predecessor replacement hard-blocked; it never restores implicitly.
reset role;
update public.financial_transactions
set deleted_at = now()
where id = (select id from lineage_ids where key = 'transaction');
set local role authenticated;

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
  source_predecessor_external_id, parser_version, mapping_version
) select
  '44210000-0000-4000-8000-000000000010'::uuid, user_id, kind, 56000,
  'Next replacement', '', '2026-08-22', source, confidence, 'pending',
  category_id, category_name, account_id, account_name, 'next replacement 56000',
  10, 'posted-next-442', 'posted', 'posted-442', parser_version, mapping_version
from public.inbox_candidates
where id = '44210000-0000-4000-8000-000000000002'::uuid;

select is(
  public.plan_inbox_candidate('44210000-0000-4000-8000-000000000010'::uuid) ->> 'reason',
  'source_predecessor_deleted_match',
  'explicit predecessor to a deleted target has its own hard blocked plan'
);

select throws_ok(
  format(
    'select public.record_source_replacement_observation_from_candidate(%L::uuid, %L::uuid)',
    '44210000-0000-4000-8000-000000000010',
    (select id from lineage_ids where key = 'transaction')
  ),
  'source_predecessor_match_required',
  'replacement review cannot restore a deleted predecessor target'
);

select is(
  (select count(distinct approved_transaction_id)::integer
   from public.inbox_candidates
   where user_id = '44200000-0000-4000-8000-000000000001'
     and source = 'csv'
     and source_external_id = 'posted-442'
     and status = 'approved'),
  1,
  'all durable observations for one source ID resolve to one transaction'
);

select * from finish();
rollback;
