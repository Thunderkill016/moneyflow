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
  '18300000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'review-resolution@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Review Resolution"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"18300000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select public.create_financial_account(
  'Review destination',
  'savings'::public.account_kind,
  0::bigint,
  'VND'
);

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, raw_snippet
) values (
  '18320000-0000-4000-8000-000000000001'::uuid,
  '18300000-0000-4000-8000-000000000001'::uuid,
  'expense', 350000, 'Unmapped transfer', '', '2026-08-01', 'csv',
  'low', 'pending', 'Unmapped transfer 350000'
);

select is(
  public.plan_inbox_candidate('18320000-0000-4000-8000-000000000001'::uuid) ->> 'status',
  'invalid',
  'an unmapped candidate is invalid before review'
);

select is(
  public.plan_inbox_candidate('18320000-0000-4000-8000-000000000001'::uuid) ->> 'reason',
  'account_required',
  'the dry-run explains the missing account mapping'
);

select lives_ok(
  $$
    select public.approve_inbox_candidate(
      '18320000-0000-4000-8000-000000000001'::uuid,
      'transfer'::public.transaction_kind,
      (select id from public.accounts
       where user_id = '18300000-0000-4000-8000-000000000001'
         and name <> 'Review destination'
       order by created_at, id limit 1),
      null,
      (select id from public.accounts
       where user_id = '18300000-0000-4000-8000-000000000001'
         and name = 'Review destination'),
      350000,
      '2026-08-01',
      'Reviewed internal transfer',
      '18330000-0000-4000-8000-000000000001'::uuid,
      false
    )
  $$,
  'review can resolve an unmapped candidate as a transfer'
);

select is(
  (select match_status::text
   from public.transaction_import_provenance
   where transaction_id = (
     select approved_transaction_id
     from public.inbox_candidates
     where id = '18320000-0000-4000-8000-000000000001'::uuid
   )),
  'would_create',
  'resolved transfer provenance records the final create classification'
);

select is(
  (select match_reason
   from public.transaction_import_provenance
   where transaction_id = (
     select approved_transaction_id
     from public.inbox_candidates
     where id = '18320000-0000-4000-8000-000000000001'::uuid
   )),
  'resolved_during_review',
  'resolved transfer provenance records the review resolution reason'
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id = (
     select approved_transaction_id
     from public.inbox_candidates
     where id = '18320000-0000-4000-8000-000000000001'::uuid
   )),
  2,
  'resolved transfer creates exactly two ledger entries'
);

select is(
  (select sum(amount_minor)::bigint
   from public.transaction_entries
   where transaction_id = (
     select approved_transaction_id
     from public.inbox_candidates
     where id = '18320000-0000-4000-8000-000000000001'::uuid
   )),
  0::bigint,
  'resolved transfer entries balance to zero'
);

reset role;
select * from finish();
rollback;
