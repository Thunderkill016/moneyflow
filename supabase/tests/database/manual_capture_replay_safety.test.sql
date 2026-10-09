begin;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'd17b40d0-ae5b-4976-810b-bd785d873d50'::uuid,
  'authenticated', 'authenticated', 'manual-replay@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Amount Safety"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"d17b40d0-ae5b-4976-810b-bd785d873d50","role":"authenticated"}';
set local role authenticated;

select lives_ok($$select public.create_money_transaction(
    (select id from public.accounts where user_id = 'd17b40d0-ae5b-4976-810b-bd785d873d50' limit 1),
    (select id from public.categories where user_id = 'd17b40d0-ae5b-4976-810b-bd785d873d50' and kind = 'expense' limit 1),
    'expense'::public.transaction_kind, 45000::bigint, current_date, 'same purchase',
    '73c6f589-0196-4723-9985-7cf52af7439a'::uuid
  )$$, 'first save succeeds');
select is((select count(*)::integer from public.financial_transactions where user_id = auth.uid()), 1, 'one financial transaction created');
select is((select creation_intent ->> 'amount_minor' from public.financial_transactions where user_id = auth.uid()), '45000', 'initial intent retained');
select lives_ok($$select public.create_money_transaction(
    (select id from public.accounts where user_id = 'd17b40d0-ae5b-4976-810b-bd785d873d50' limit 1),
    (select id from public.categories where user_id = 'd17b40d0-ae5b-4976-810b-bd785d873d50' and kind = 'expense' limit 1),
    'expense'::public.transaction_kind, 45000::bigint, current_date, 'same purchase',
    '73c6f589-0196-4723-9985-7cf52af7439a'::uuid
  )$$, 'same-key same-payload retry succeeds');
select is((select count(*)::integer from public.financial_transactions where user_id = auth.uid()), 1, 'retry does not duplicate transaction');
select throws_ok($$select public.create_money_transaction(
    (select id from public.accounts where user_id = 'd17b40d0-ae5b-4976-810b-bd785d873d50' limit 1),
    (select id from public.categories where user_id = 'd17b40d0-ae5b-4976-810b-bd785d873d50' and kind = 'expense' limit 1),
    'expense'::public.transaction_kind, 46000::bigint, current_date, 'same purchase',
    '73c6f589-0196-4723-9985-7cf52af7439a'::uuid
  )$$, 'P0001', 'idempotency_intent_mismatch', 'changed amount is rejected');
select throws_ok($$select public.create_money_transaction(
    (select id from public.accounts where user_id = 'd17b40d0-ae5b-4976-810b-bd785d873d50' limit 1),
    (select id from public.categories where user_id = 'd17b40d0-ae5b-4976-810b-bd785d873d50' and kind = 'expense' limit 1),
    'expense'::public.transaction_kind, 45000::bigint, current_date, 'changed description',
    '73c6f589-0196-4723-9985-7cf52af7439a'::uuid
  )$$, 'P0001', 'idempotency_intent_mismatch', 'changed description is rejected');
select is((select count(*)::integer from public.transaction_entries where user_id = auth.uid()), 1, 'failed replays leave one account leg');
reset role;
select * from finish();
rollback;
