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
  '43690000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'transfer-precedence@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Transfer Precedence"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"43690000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$
    select public.create_financial_account(
      'Transfer destination',
      'savings'::public.account_kind,
      0::bigint,
      'VND'
    )
  $$,
  'owner can create a second VND account for the opposite transfer leg'
);

create temporary table transfer_precedence_ids (
  key text primary key,
  id uuid not null
) on commit drop;

insert into transfer_precedence_ids (key, id)
select 'manual-expense', public.create_money_transaction(
  (select id from public.accounts
   where user_id = '43690000-0000-4000-8000-000000000001'
     and name <> 'Transfer destination'
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = '43690000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  'expense',
  66000,
  '2026-08-14',
  'User-entered expense that might actually be a transfer',
  '43691000-0000-4000-8000-000000000001'::uuid
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, occurred_on, source,
  confidence, status, category_id, account_id, raw_snippet,
  source_external_id, parser_version, mapping_version
) values
(
  '43692000-0000-4000-8000-000000000001'::uuid,
  '43690000-0000-4000-8000-000000000001'::uuid,
  'expense', 66000, 'Outgoing transfer evidence', '2026-08-14', 'csv',
  'medium', 'pending',
  (select id from public.categories
   where user_id = '43690000-0000-4000-8000-000000000001'
     and kind = 'expense'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43690000-0000-4000-8000-000000000001'
     and name <> 'Transfer destination'
   order by created_at, id limit 1),
  'outgoing 66000', 'transfer-source-out', 'csv_import@1.0', 1
),
(
  '43692000-0000-4000-8000-000000000002'::uuid,
  '43690000-0000-4000-8000-000000000001'::uuid,
  'income', 66000, 'Incoming transfer evidence', '2026-08-14', 'csv',
  'medium', 'pending',
  (select id from public.categories
   where user_id = '43690000-0000-4000-8000-000000000001'
     and kind = 'income'
   order by created_at, id limit 1),
  (select id from public.accounts
   where user_id = '43690000-0000-4000-8000-000000000001'
     and name = 'Transfer destination'
   order by created_at, id limit 1),
  'incoming 66000', 'transfer-source-in', 'csv_import@1.0', 1
);

select is(
  public.plan_inbox_candidate('43692000-0000-4000-8000-000000000001'::uuid) ->> 'status',
  'suspected_transfer',
  'opposite-leg evidence takes precedence over weak existing-transaction fallback'
);

select is(
  public.plan_inbox_candidate('43692000-0000-4000-8000-000000000001'::uuid) ->> 'reason',
  'opposite_candidate_same_amount_date',
  'plan preserves the transfer-pair review reason'
);

select is(
  (public.plan_inbox_candidate('43692000-0000-4000-8000-000000000001'::uuid) ->> 'matched_candidate_id')::uuid,
  '43692000-0000-4000-8000-000000000002'::uuid,
  'plan points to the opposite candidate rather than the manual ledger fact'
);

select throws_ok(
  $$
    select public.attach_inbox_candidate_to_existing_transaction(
      '43692000-0000-4000-8000-000000000001'::uuid,
      (select id from transfer_precedence_ids where key = 'manual-expense')
    )
  $$,
  'existing_transaction_match_required',
  'source attachment cannot bypass transfer review precedence'
);

reset role;
select * from finish();
rollback;
