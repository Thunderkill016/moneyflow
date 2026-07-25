begin;
select plan(15);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  phone_change,
  phone_change_token,
  is_sso_user,
  is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'tenant-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')),
  now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Tenant A"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid,
  'authenticated',
  'authenticated',
  'tenant-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')),
  now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Tenant B"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer from public.profiles),
  1,
  'tenant A sees exactly one profile'
);
select is(
  (select id from public.profiles limit 1),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'tenant A sees only its own profile'
);
select ok(
  (select count(*) from public.accounts) >= 1,
  'tenant A sees its default account'
);
select is(
  (select count(*)::integer from public.accounts
   where user_id <> '10000000-0000-0000-0000-000000000001'::uuid),
  0,
  'tenant A cannot see another user account'
);
select ok(
  (select count(*) from public.categories where kind = 'expense') >= 1,
  'tenant A sees an expense category'
);

select lives_ok(
  $$
    select public.create_money_transaction(
      (select id from public.accounts order by created_at, id limit 1),
      (select id from public.categories
       where kind = 'expense'
       order by created_at, id
       limit 1),
      'expense'::public.transaction_kind,
      45000::bigint,
      current_date,
      'Tenant isolation expense',
      '30000000-0000-0000-0000-000000000003'::uuid
    )
  $$,
  'tenant A can create a transaction through the public RPC'
);
select is(
  (select count(*)::integer from public.financial_transactions),
  1,
  'tenant A sees its transaction'
);
select is(
  (select count(*)::integer from public.transaction_entries),
  1,
  'tenant A sees its ledger entry'
);
select ok(
  set_config(
    'moneyflow.test_transaction_id',
    (select id::text from public.financial_transactions limit 1),
    true
  ) <> '',
  'test captures tenant A transaction id without exposing it to application code'
);

reset role;
set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer from public.profiles),
  1,
  'tenant B sees exactly one profile'
);
select is(
  (select id from public.profiles limit 1),
  '20000000-0000-0000-0000-000000000002'::uuid,
  'tenant B sees only its own profile'
);
select is(
  (select count(*)::integer from public.financial_transactions),
  0,
  'tenant B cannot read tenant A transactions'
);
select is(
  (select count(*)::integer from public.transaction_entries),
  0,
  'tenant B cannot read tenant A ledger entries'
);
select is(
  public.soft_delete_money_transaction(
    current_setting('moneyflow.test_transaction_id')::uuid
  ),
  false,
  'tenant B cannot soft-delete tenant A transaction through the RPC'
);

reset role;
select is(
  (select deleted_at from public.financial_transactions
   where id = current_setting('moneyflow.test_transaction_id')::uuid),
  null::timestamptz,
  'tenant A transaction remains active after tenant B mutation attempt'
);

select * from finish();
rollback;
