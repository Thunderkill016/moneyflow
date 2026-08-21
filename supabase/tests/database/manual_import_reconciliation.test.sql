begin;
select plan(25);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'manual-link-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Manual Link Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '43600000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'manual-link-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Manual Link Other"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"43600000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

create temporary table manual_link_ids (
  key text primary key,
  id uuid not null
) on commit drop;

insert into manual_link_ids (key, id)
select 'manual', public.create_money_transaction(
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  'expense',
  45000,
  '2026-08-20',
  'Tên cũ',
  '43610000-0000-4000-8000-000000000001'::uuid
);

select lives_ok(
  $$
    select public.update_money_transaction(
      (select id from manual_link_ids where key = 'manual'),
      (select id from public.accounts
       where user_id = '43600000-0000-4000-8000-000000000001'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '43600000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      'expense',
      45000,
      '2026-08-20',
      'Người dùng đã sửa tay'
    )
  $$,
  'manual transaction can be user-corrected before later evidence arrives'
);

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map, parser_version, mapping_version
) values (
  '43620000-0000-4000-8000-000000000001'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'later-source.csv', 'csv', 'parsed', 8, 0, 0, 1,
  '["date","description","amount"]'::jsonb,
  '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb,
  'csv_import@1.0', 1
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, source_external_id,
  parser_version, mapping_version
) values (
  '43630000-0000-4000-8000-000000000001'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'expense', 45000, 'Cafe source', 'Imported description', '2026-08-20',
  'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  '20/08/2026,Cafe source,-45000',
  '43620000-0000-4000-8000-000000000001'::uuid,
  1, 'later-source-001', 'csv_import@1.0', 1
);

select is(
  public.plan_inbox_candidate('43630000-0000-4000-8000-000000000001'::uuid) ->> 'reason',
  'existing_transaction_match',
  'one eligible unprovenanced existing fact is surfaced for review'
);

select is(
  (public.plan_inbox_candidate('43630000-0000-4000-8000-000000000001'::uuid) ->> 'matched_transaction_id')::uuid,
  (select id from manual_link_ids where key = 'manual'),
  'unique existing match identifies the exact reviewed transaction'
);

create temporary table manual_before on commit drop as
select
  t.id,
  t.kind::text as kind,
  t.note,
  t.occurred_on,
  t.deleted_at,
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
where t.id = (select id from manual_link_ids where key = 'manual')
  and t.user_id = '43600000-0000-4000-8000-000000000001';

create temporary table audit_before on commit drop as
select count(*)::integer as count
from public.financial_mutation_audit_events
where user_id = '43600000-0000-4000-8000-000000000001'
  and related_transaction_id = (select id from manual_link_ids where key = 'manual');

select is(
  public.attach_inbox_candidate_to_existing_transaction(
    '43630000-0000-4000-8000-000000000001'::uuid,
    (select id from manual_link_ids where key = 'manual')
  ),
  (select id from manual_link_ids where key = 'manual'),
  'explicit review attaches source evidence to the existing fact'
);

select is(
  (select count(*)::integer
   from public.financial_transactions
   where user_id = '43600000-0000-4000-8000-000000000001'
     and id = (select id from manual_link_ids where key = 'manual')),
  1,
  'attachment creates no second financial transaction'
);

select is(
  (select count(*)::integer
   from public.transaction_import_provenance
   where transaction_id = (select id from manual_link_ids where key = 'manual')),
  1,
  'attachment writes one provenance record'
);

select is(
  (select source_external_id
   from public.transaction_import_provenance
   where transaction_id = (select id from manual_link_ids where key = 'manual')),
  'later-source-001',
  'attached provenance preserves stable source identity'
);

select is(
  (select match_reason
   from public.transaction_import_provenance
   where transaction_id = (select id from manual_link_ids where key = 'manual')),
  'existing_transaction_match',
  'attached provenance records reviewed match reason'
);

select is(
  (select approved_transaction_id
   from public.inbox_candidates
   where id = '43630000-0000-4000-8000-000000000001'::uuid),
  (select id from manual_link_ids where key = 'manual'),
  'candidate links to the existing transaction'
);

select is(
  (
    select row(
      t.kind::text, t.note, t.occurred_on, t.deleted_at, t.review_status::text,
      e.account_id, e.category_id, e.amount_minor, e.reconciliation_state::text,
      e.cleared_at, e.reconciliation_id
    )::text
    from public.financial_transactions t
    join public.transaction_entries e
      on e.transaction_id = t.id and e.user_id = t.user_id
    where t.id = (select id from manual_link_ids where key = 'manual')
  ),
  (
    select row(
      kind, note, occurred_on, deleted_at, review_status,
      account_id, category_id, amount_minor, reconciliation_state,
      cleared_at, reconciliation_id
    )::text
    from manual_before
  ),
  'source attachment leaves user-corrected ledger and reconciliation fields unchanged'
);

select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where user_id = '43600000-0000-4000-8000-000000000001'
     and related_transaction_id = (select id from manual_link_ids where key = 'manual')),
  (select count from audit_before),
  'source attachment emits no transaction or entry mutation audit event'
);

select is(
  public.attach_inbox_candidate_to_existing_transaction(
    '43630000-0000-4000-8000-000000000001'::uuid,
    (select id from manual_link_ids where key = 'manual')
  ),
  (select id from manual_link_ids where key = 'manual'),
  'replay returns the same linked transaction'
);

select is(
  (select count(*)::integer
   from public.transaction_import_provenance
   where candidate_id = '43630000-0000-4000-8000-000000000001'::uuid),
  1,
  'replay creates no second provenance row'
);

-- Same stable source ID remains a hard duplicate before any fallback matching.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, occurred_on, source,
  confidence, status, account_id, account_name, raw_snippet,
  source_external_id, parser_version, mapping_version
) values (
  '43630000-0000-4000-8000-000000000002'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'expense', 123000, 'Different event', '2026-08-19', 'csv',
  'high', 'pending',
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  'different row', 'later-source-001', 'csv_import@1.0', 1
);

select is(
  public.plan_inbox_candidate('43630000-0000-4000-8000-000000000002'::uuid) ->> 'reason',
  'source_external_id_match',
  'exact source ID remains stronger than existing-transaction fallback'
);

-- Ambiguity must never be resolved by row order.
insert into manual_link_ids (key, id)
select 'ambiguous-a', public.create_money_transaction(
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  'expense', 88000, '2026-08-18', 'A',
  '43610000-0000-4000-8000-000000000002'::uuid
);
insert into manual_link_ids (key, id)
select 'ambiguous-b', public.create_money_transaction(
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  'expense', 88000, '2026-08-18', 'B',
  '43610000-0000-4000-8000-000000000003'::uuid
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, occurred_on, source,
  confidence, status, category_id, account_id, raw_snippet,
  source_external_id, parser_version, mapping_version
) values (
  '43630000-0000-4000-8000-000000000003'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'expense', 88000, 'Ambiguous source', '2026-08-18', 'csv',
  'medium', 'pending',
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  'ambiguous source row', 'later-source-003', 'csv_import@1.0', 1
);

select is(
  public.plan_inbox_candidate('43630000-0000-4000-8000-000000000003'::uuid) ->> 'reason',
  'existing_transaction_ambiguous',
  'multiple eligible existing facts stay ambiguous'
);

select ok(
  public.plan_inbox_candidate('43630000-0000-4000-8000-000000000003'::uuid)
    ->> 'matched_transaction_id' is null,
  'ambiguous plan exposes no arbitrary target transaction'
);

select throws_ok(
  $$
    select public.attach_inbox_candidate_to_existing_transaction(
      '43630000-0000-4000-8000-000000000003'::uuid,
      (select id from manual_link_ids where key = 'ambiguous-a')
    )
  $$,
  'existing_transaction_match_ambiguous',
  'explicit attachment refuses an ambiguous candidate'
);

-- Deleted transactions are not silently resurrected.
insert into manual_link_ids (key, id)
select 'deleted', public.create_money_transaction(
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  'expense', 99000, '2026-08-17', 'Deleted manual',
  '43610000-0000-4000-8000-000000000004'::uuid
);
select public.soft_delete_money_transaction((select id from manual_link_ids where key = 'deleted'));

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, occurred_on, source,
  confidence, status, category_id, account_id, raw_snippet,
  source_external_id, parser_version, mapping_version
) values (
  '43630000-0000-4000-8000-000000000004'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'expense', 99000, 'Deleted source', '2026-08-17', 'csv',
  'high', 'pending',
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  'deleted source row', 'later-source-004', 'csv_import@1.0', 1
);

select isnt(
  public.plan_inbox_candidate('43630000-0000-4000-8000-000000000004'::uuid) ->> 'reason',
  'existing_transaction_match',
  'soft-deleted facts are not proposed as existing matches'
);

select throws_ok(
  $$
    select public.attach_inbox_candidate_to_existing_transaction(
      '43630000-0000-4000-8000-000000000004'::uuid,
      (select id from manual_link_ids where key = 'deleted')
    )
  $$,
  'transaction_not_eligible',
  'attachment cannot resurrect a deleted transaction'
);

-- A transaction can carry at most the first provenance record in the current model.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, occurred_on, source,
  confidence, status, category_id, account_id, raw_snippet,
  source_external_id, parser_version, mapping_version
) values (
  '43630000-0000-4000-8000-000000000005'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'expense', 45000, 'Second evidence', '2026-08-20', 'email',
  'high', 'pending',
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  'second evidence row', 'email-source-005', 'email@1.0', 1
);

select throws_ok(
  $$
    select public.attach_inbox_candidate_to_existing_transaction(
      '43630000-0000-4000-8000-000000000005'::uuid,
      (select id from manual_link_ids where key = 'manual')
    )
  $$,
  'transaction_already_provenanced',
  'already-provenanced target is not eligible for a second evidence row in this slice'
);

-- Manual candidates do not use the later-source reconciliation shortcut.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, occurred_on, source,
  confidence, status, category_id, account_id, raw_snippet,
  parser_version, mapping_version
) values (
  '43630000-0000-4000-8000-000000000006'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'expense', 88000, 'Manual candidate', '2026-08-18', 'manual',
  'high', 'pending',
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  'manual candidate', 'manual_entry@1.0', 1
);

select isnt(
  public.plan_inbox_candidate('43630000-0000-4000-8000-000000000006'::uuid) ->> 'reason',
  'existing_transaction_match',
  'manual candidate source does not self-reconcile to another manual fact'
);

select throws_ok(
  $$
    select public.attach_inbox_candidate_to_existing_transaction(
      '43630000-0000-4000-8000-000000000006'::uuid,
      (select id from manual_link_ids where key = 'ambiguous-a')
    )
  $$,
  'candidate_not_attachable',
  'manual candidate cannot use the later-source attach RPC'
);

-- Transfer targets are never eligible for later-source attachment.
select lives_ok(
  $$
    select public.create_financial_account(
      'Transfer target', 'savings'::public.account_kind, 0::bigint, 'VND'
    )
  $$,
  'owner can create a second account for the transfer counterexample'
);

insert into manual_link_ids (key, id)
select 'transfer', public.create_account_transfer(
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
     and name <> 'Transfer target'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
     and name = 'Transfer target'
   order by created_at, id limit 1),
  66000, '2026-08-15', 'Internal transfer',
  '43610000-0000-4000-8000-000000000005'::uuid
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, occurred_on, source,
  confidence, status, category_id, account_id, raw_snippet,
  source_external_id, parser_version, mapping_version
) values (
  '43630000-0000-4000-8000-000000000008'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'expense', 66000, 'Transfer-like source', '2026-08-15', 'csv',
  'medium', 'pending',
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
     and name <> 'Transfer target'
   order by created_at, id limit 1),
  'transfer-like source row', 'later-source-008', 'csv_import@1.0', 1
);

select throws_ok(
  $$
    select public.attach_inbox_candidate_to_existing_transaction(
      '43630000-0000-4000-8000-000000000008'::uuid,
      (select id from manual_link_ids where key = 'transfer')
    )
  $$,
  'transaction_not_eligible',
  'transfer transaction cannot be used as an existing source-link target'
);

-- Cross-tenant requests reveal neither candidate nor target.
insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, occurred_on, source,
  confidence, status, category_id, account_id, raw_snippet,
  source_external_id, parser_version, mapping_version
) values (
  '43630000-0000-4000-8000-000000000007'::uuid,
  '43600000-0000-4000-8000-000000000001'::uuid,
  'expense', 77000, 'Owner-only candidate', '2026-08-16', 'csv',
  'high', 'pending',
  (select id from public.categories
   where user_id = '43600000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43600000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  'owner only', 'owner-only-007', 'csv_import@1.0', 1
);

set local request.jwt.claims = '{"sub":"43600000-0000-4000-8000-000000000002","role":"authenticated"}';

select throws_ok(
  $$
    select public.attach_inbox_candidate_to_existing_transaction(
      '43630000-0000-4000-8000-000000000007'::uuid,
      (select id from manual_link_ids where key = 'ambiguous-a')
    )
  $$,
  'candidate_not_found',
  'another tenant cannot attach the owner candidate'
);

reset role;
select * from finish();
rollback;
