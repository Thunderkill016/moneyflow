begin;
select plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '18400000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'overlap-import@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Overlap Import"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"18400000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select public.create_financial_account(
  'Overlap import account',
  'savings'::public.account_kind,
  0::bigint,
  'VND'
);

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map, parser_version,
  mapping_version
) values
(
  '18410000-0000-4000-8000-000000000001'::uuid,
  '18400000-0000-4000-8000-000000000001'::uuid,
  'statement-window-a.xlsx', 'xlsx', 'committed', 1, 0, 0, 1,
  '["Ngày giao dịch","Số tham chiếu","Thay đổi","Số tiền","Mô tả"]'::jsonb,
  '{"date":0,"desc":4,"amount":3,"debit":null,"credit":null}'::jsonb,
  'xlsx_pilot@1.0', 1
),
(
  '18410000-0000-4000-8000-000000000002'::uuid,
  '18400000-0000-4000-8000-000000000001'::uuid,
  'statement-window-b.xlsx', 'xlsx', 'committed', 1, 0, 0, 1,
  '["Ngày giao dịch","Số tham chiếu","Thay đổi","Số tiền","Mô tả"]'::jsonb,
  '{"date":0,"desc":4,"amount":3,"debit":null,"credit":null}'::jsonb,
  'xlsx_pilot@1.0', 1
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, parser_version,
  mapping_version
) values (
  '18420000-0000-4000-8000-000000000001'::uuid,
  '18400000-0000-4000-8000-000000000001'::uuid,
  'expense', 125000, 'Overlap Merchant', '', '2026-09-10', 'xlsx',
  'high', 'pending',
  (select id from public.categories
   where user_id = '18400000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '18400000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '18400000-0000-4000-8000-000000000001'
     and name = 'Overlap import account'
   limit 1),
  'Overlap import account',
  '10/09/2026 | REF-OVERLAP-1 | - | 125000 | Overlap Merchant',
  '18410000-0000-4000-8000-000000000001'::uuid,
  5,
  'xlsx_pilot@1.0',
  1
);

select lives_ok(
  $$
    select public.approve_inbox_candidate(
      '18420000-0000-4000-8000-000000000001'::uuid,
      'expense'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18400000-0000-4000-8000-000000000001'
         and name = 'Overlap import account'
       limit 1),
      (select id from public.categories
       where user_id = '18400000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      null,
      125000,
      '2026-09-10',
      '',
      '18430000-0000-4000-8000-000000000001'::uuid,
      false
    )
  $$,
  'first XLSX observation can be approved normally'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, category_id, category_name, account_id, account_name,
  raw_snippet, import_batch_id, source_row_index, parser_version,
  mapping_version
) values (
  '18420000-0000-4000-8000-000000000002'::uuid,
  '18400000-0000-4000-8000-000000000001'::uuid,
  'expense', 125000, 'Overlap Merchant', '', '2026-09-10', 'xlsx',
  'high', 'pending',
  (select id from public.categories
   where user_id = '18400000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select name from public.categories
   where user_id = '18400000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '18400000-0000-4000-8000-000000000001'
     and name = 'Overlap import account'
   limit 1),
  'Overlap import account',
  '10/09/2026 | REF-OVERLAP-1 | - | 125000 | Overlap Merchant',
  '18410000-0000-4000-8000-000000000002'::uuid,
  11,
  'xlsx_pilot@1.0',
  1
);

select is(
  public.plan_inbox_candidate('18420000-0000-4000-8000-000000000002'::uuid) ->> 'status',
  'duplicate',
  'overlapping XLSX export is classified as duplicate across batch ids'
);

select is(
  public.plan_inbox_candidate('18420000-0000-4000-8000-000000000002'::uuid) ->> 'reason',
  'fingerprint_transaction_match',
  'overlap duplicate is explained by transaction provenance fingerprint'
);

select throws_ok(
  $$
    select public.approve_inbox_candidate(
      '18420000-0000-4000-8000-000000000002'::uuid,
      'expense'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18400000-0000-4000-8000-000000000001'
         and name = 'Overlap import account'
       limit 1),
      (select id from public.categories
       where user_id = '18400000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      null,
      125000,
      '2026-09-10',
      '',
      '18430000-0000-4000-8000-000000000002'::uuid,
      false
    )
  $$,
  'candidate_duplicate',
  'overlap heuristic duplicate cannot reach the ledger without explicit review override'
);

select is(
  (select count(*)::integer
   from public.transaction_import_provenance
   where user_id = '18400000-0000-4000-8000-000000000001'
     and source = 'xlsx'),
  1,
  'blocked overlap keeps exactly one imported transaction provenance row'
);

select * from finish();
rollback;
