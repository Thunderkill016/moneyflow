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
  '317b40d0-ae5b-4976-810b-bd785d873d50'::uuid,
  'authenticated', 'authenticated', 'amount-safety@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Amount Safety"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer from public.accounts where user_id = '317b40d0-ae5b-4976-810b-bd785d873d50'),
  1,
  'test user receives one default account'
);

set local request.jwt.claims = '{"sub":"317b40d0-ae5b-4976-810b-bd785d873d50","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$
    select public.create_money_transaction(
      (select id from public.accounts where user_id = '317b40d0-ae5b-4976-810b-bd785d873d50' limit 1),
      (select id from public.categories where user_id = '317b40d0-ae5b-4976-810b-bd785d873d50' and kind = 'expense' limit 1),
      'expense'::public.transaction_kind,
      9007199254740992::bigint,
      current_date,
      'unsafe amount',
      'e676d056-00f7-4605-8a5a-eab6c9eb6d5f'::uuid
    )
  $$,
  'P0001',
  'amount_exceeds_safe_integer',
  'primary transaction RPC rejects values above Number.MAX_SAFE_INTEGER'
);

select lives_ok(
  $$
    select public.create_money_transaction(
      (select id from public.accounts where user_id = '317b40d0-ae5b-4976-810b-bd785d873d50' limit 1),
      (select id from public.categories where user_id = '317b40d0-ae5b-4976-810b-bd785d873d50' and kind = 'expense' limit 1),
      'expense'::public.transaction_kind,
      9007199254740991::bigint,
      current_date,
      'maximum safe amount',
      '820dbfb1-d289-402e-8a47-74d0e84cb8de'::uuid
    )
  $$,
  'primary transaction RPC accepts Number.MAX_SAFE_INTEGER'
);

select is(
  (
    select abs(entry.amount_minor)
    from public.transaction_entries entry
    join public.financial_transactions transaction_record
      on transaction_record.id = entry.transaction_id
    where transaction_record.user_id = '317b40d0-ae5b-4976-810b-bd785d873d50'
      and transaction_record.idempotency_key = '820dbfb1-d289-402e-8a47-74d0e84cb8de'::uuid
  ),
  9007199254740991::bigint,
  'maximum safe integer is stored exactly'
);

select is(
  (
    select count(*)::integer
    from public.financial_transactions
    where user_id = '317b40d0-ae5b-4976-810b-bd785d873d50'
  ),
  1,
  'rejected unsafe amount creates no transaction'
);

reset role;
select * from finish();
rollback;
