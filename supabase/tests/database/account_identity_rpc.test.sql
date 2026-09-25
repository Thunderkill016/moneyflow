begin;
select plan(9);

-- Account identity (icon/color) persistence contract.
-- The accounts row has carried icon/color columns since the initial schema,
-- but the only write path (security-definer RPCs, direct mutation revoked)
-- could not accept them. The extended signatures accept + validate a fixed
-- palette mirroring the app enums.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'a1d4e07a-22f8-4f09-bb55-0f0f6b1b7c10'::uuid,
  'authenticated', 'authenticated', 'account-identity@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Account Identity"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"a1d4e07a-22f8-4f09-bb55-0f0f6b1b7c10","role":"authenticated"}';
set local role authenticated;

create temporary table identity_ctx (
  account_id uuid
) on commit drop;

select lives_ok(
  $$
    insert into identity_ctx
    select public.create_financial_account(
      'Ví chính', 'e_wallet'::public.account_kind, 0::bigint, 'VND',
      'spark', 'violet'
    )
  $$,
  'create accepts a valid icon/color pair'
);

select is(
  (select (icon, color) from public.accounts
   where user_id = 'a1d4e07a-22f8-4f09-bb55-0f0f6b1b7c10'
     and name = 'Ví chính'),
  row('spark', 'violet'),
  'stored icon and color survive the create RPC'
);

select lives_ok(
  $$
    select public.create_financial_account(
      'Tiền mặt phụ', 'cash'::public.account_kind, 0::bigint, 'VND'
    )
  $$,
  'create without identity still succeeds (defaults null)'
);

select is(
  (select (icon is null and color is null) from public.accounts
   where user_id = 'a1d4e07a-22f8-4f09-bb55-0f0f6b1b7c10'
     and name = 'Tiền mặt phụ'),
  true,
  'omitted identity stores null, not a guessed default'
);

select lives_ok(
  $$
    select public.update_financial_account(
      (select account_id from identity_ctx),
      'Ví chính', 'e_wallet'::public.account_kind, 0::bigint,
      'coins', 'amber'
    )
  $$,
  'update accepts a valid icon/color pair'
);

select is(
  (select (icon, color) from public.accounts
   where id = (select account_id from identity_ctx)),
  row('coins', 'amber'),
  'stored icon and color survive the update RPC'
);

select throws_ok(
  $$
    select public.update_financial_account(
      (select account_id from identity_ctx),
      'Ví chính', 'e_wallet'::public.account_kind, 0::bigint,
      'gibberish-icon', 'violet'
    )
  $$,
  'P0001',
  'invalid_account_icon',
  'update rejects an icon outside the picker set'
);

select throws_ok(
  $$
    select public.update_financial_account(
      (select account_id from identity_ctx),
      'Ví chính', 'e_wallet'::public.account_kind, 0::bigint,
      'coins', '#ff00ff'
    )
  $$,
  'P0001',
  'invalid_account_color',
  'update rejects a color outside the palette'
);

select throws_ok(
  $$
    select public.create_financial_account(
      'Xấu', 'bank'::public.account_kind, 0::bigint, 'VND',
      'evil;drop', 'blue'
    )
  $$,
  'P0001',
  'invalid_account_icon',
  'create rejects an icon outside the picker set'
);

reset role;
select * from finish();
rollback;
