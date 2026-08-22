begin;
select plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '44100000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'source-guard-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Source Guard Owner"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"44100000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, source_row_index, source_external_id, parser_version, mapping_version
) values
(
  '44110000-0000-4000-8000-000000000001'::uuid,
  '44100000-0000-4000-8000-000000000001'::uuid,
  'expense', 41000, 'Guard source A', '', '2026-08-18', 'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '44100000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '44100000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '44100000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '44100000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  'Guard source A -41000', 1, 'guard-source-a', 'csv_import@2.0', 2
),
(
  '44110000-0000-4000-8000-000000000002'::uuid,
  '44100000-0000-4000-8000-000000000001'::uuid,
  'expense', 42000, 'Guard source B', '', '2026-08-17', 'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '44100000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '44100000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '44100000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '44100000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  'Guard source B -42000', 2, 'guard-source-b', 'csv_import@2.0', 2
),
(
  '44110000-0000-4000-8000-000000000003'::uuid,
  '44100000-0000-4000-8000-000000000001'::uuid,
  'expense', 43000, 'Pending source', '', '2026-08-16', 'csv', 'high', 'pending',
  (select id from public.categories
   where user_id = '44100000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '44100000-0000-4000-8000-000000000001' and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '44100000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  (select name from public.accounts
   where user_id = '44100000-0000-4000-8000-000000000001'
   order by created_at, id limit 1),
  'Pending source -43000', 3, 'guard-source-c', 'csv_import@2.0', 2
);

create temporary table source_guard_transactions (
  candidate_id uuid primary key,
  transaction_id uuid not null
) on commit drop;

insert into source_guard_transactions
select
  '44110000-0000-4000-8000-000000000001'::uuid,
  public.approve_inbox_candidate(
    '44110000-0000-4000-8000-000000000001'::uuid,
    'expense'::public.transaction_kind,
    (select id from public.accounts
     where user_id = '44100000-0000-4000-8000-000000000001'
     order by created_at, id limit 1),
    (select id from public.categories
     where user_id = '44100000-0000-4000-8000-000000000001' and kind = 'expense'
     order by created_at, id limit 1),
    null, 41000, '2026-08-18', '',
    '44120000-0000-4000-8000-000000000001'::uuid, false
  )
union all
select
  '44110000-0000-4000-8000-000000000002'::uuid,
  public.approve_inbox_candidate(
    '44110000-0000-4000-8000-000000000002'::uuid,
    'expense'::public.transaction_kind,
    (select id from public.accounts
     where user_id = '44100000-0000-4000-8000-000000000001'
     order by created_at, id limit 1),
    (select id from public.categories
     where user_id = '44100000-0000-4000-8000-000000000001' and kind = 'expense'
     order by created_at, id limit 1),
    null, 42000, '2026-08-17', '',
    '44120000-0000-4000-8000-000000000002'::uuid, false
  );

select throws_ok(
  $$
    update public.inbox_candidates
    set transfer_pair_id = '44110000-0000-4000-8000-000000000002'::uuid
    where id = '44110000-0000-4000-8000-000000000001'::uuid
  $$,
  'approved_candidate_evidence_immutable',
  'authenticated browser role cannot rewrite approved transfer-pair evidence'
);

select throws_ok(
  $$
    update public.inbox_candidates
    set status = 'approved',
        approved_at = now()
    where id = '44110000-0000-4000-8000-000000000003'::uuid
  $$,
  'approved_candidate_evidence_immutable',
  'authenticated browser role cannot fabricate an approved observation by update'
);

select throws_ok(
  $$
    insert into public.inbox_candidates (
      id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
      confidence, status, category_id, account_id, source_external_id,
      approved_transaction_id, approved_at
    )
    select
      '44110000-0000-4000-8000-000000000004'::uuid,
      '44100000-0000-4000-8000-000000000001'::uuid,
      'expense'::public.transaction_kind,
      44000,
      'Forged approved source',
      '',
      '2026-08-15'::date,
      'csv'::public.inbox_candidate_source,
      'high'::public.inbox_candidate_confidence,
      'approved'::public.inbox_candidate_status,
      (select id from public.categories
       where user_id = '44100000-0000-4000-8000-000000000001' and kind = 'expense'
       order by created_at, id limit 1),
      (select id from public.accounts
       where user_id = '44100000-0000-4000-8000-000000000001'
       order by created_at, id limit 1),
      'guard-source-forged-approved',
      transaction_id,
      now()
    from source_guard_transactions
    where candidate_id = '44110000-0000-4000-8000-000000000001'::uuid
  $$,
  'approved_candidate_evidence_immutable',
  'authenticated browser role cannot fabricate an approved observation by insert'
);

reset role;

select is(
  current_user,
  (
    select pg_catalog.pg_get_userbyid(proc.proowner)
    from pg_catalog.pg_proc as proc
    where proc.oid = pg_catalog.to_regprocedure('public.restore_user_archive(jsonb)')
  ),
  'database test owner matches the SECURITY DEFINER archive-restore owner'
);

update public.inbox_candidates
set transfer_pair_id = '44110000-0000-4000-8000-000000000002'::uuid
where id = '44110000-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select transfer_pair_id
    from public.inbox_candidates
    where id = '44110000-0000-4000-8000-000000000001'::uuid
  ),
  '44110000-0000-4000-8000-000000000002'::uuid,
  'archive-restore owner context can perform the exact phase-two transfer-pair repair'
);

set local role authenticated;

select throws_ok(
  $$
    update public.inbox_candidates
    set transfer_pair_id = null
    where id = '44110000-0000-4000-8000-000000000001'::uuid
  $$,
  'approved_candidate_evidence_immutable',
  'browser role still cannot undo the privileged restore repair'
);

select is(
  (
    select row(
      status::text,
      source::text,
      source_external_id,
      amount_minor,
      approved_transaction_id,
      transfer_pair_id
    )::text
    from public.inbox_candidates
    where id = '44110000-0000-4000-8000-000000000001'::uuid
  ),
  format(
    '(approved,csv,guard-source-a,41000,%s,44110000-0000-4000-8000-000000000002)',
    (select transaction_id from source_guard_transactions
     where candidate_id = '44110000-0000-4000-8000-000000000001'::uuid)
  ),
  'privileged repair changes only transfer-pair linkage and preserves approved source identity'
);

reset role;
select * from finish();
rollback;
