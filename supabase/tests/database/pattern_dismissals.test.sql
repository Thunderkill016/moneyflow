begin;
select plan(11);

-- Cross-device advisory dismissals: viewer-scoped rows behind RLS, writes only
-- through the security-definer RPC that derives user_id from auth.uid().

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '19300000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'dismiss-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Dismissal Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '19300000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'dismiss-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Dismissal Other"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"19300000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

-- 1. Direct table writes are refused: mutations must name the RPC so user_id
--    is always server-derived.
select throws_ok(
  $$
    insert into public.pattern_dismissals (user_id, scope, pattern_key)
    values ('19300000-0000-4000-8000-000000000001', 'ledger_dupe', 'abcd1234')
  $$,
  null,
  null,
  'direct insert into pattern_dismissals is refused (no INSERT grant)'
);

-- 2. Happy path: the RPC stores caller-scoped dismissals and reports inserts.
select is(
  public.dismiss_pattern_keys('ledger_dupe', array['abcd1234', 'beef0000']),
  2,
  'dismiss_pattern_keys stores both keys'
);

-- 3. Idempotent re-dismissal: a second device dismissing the same pattern is a
--    no-op, not an error.
select is(
  public.dismiss_pattern_keys('ledger_dupe', array['abcd1234', 'cafe1111']),
  1,
  're-dismissing a stored key inserts only the new one'
);

-- 4. Validation rejects malformed batches before any row lands.
select throws_ok(
  $$ select public.dismiss_pattern_keys('ledger_dupe', array['not-a-key']) $$,
  'P0001',
  'invalid_dismissal_key',
  'malformed pattern key is rejected'
);

select throws_ok(
  $$ select public.dismiss_pattern_keys('inbox_suppressed', array['abcd1234']) $$,
  'P0001',
  'invalid_dismissal_scope',
  'unknown scope is rejected'
);

select throws_ok(
  $$ select public.dismiss_pattern_keys('ledger_dupe', array[]::text[]) $$,
  'P0001',
  'invalid_dismissal_keys',
  'empty key list is rejected'
);

-- The rejected batches above must not have partially landed anything.
select is(
  (select count(*)::int from public.pattern_dismissals
   where user_id = '19300000-0000-4000-8000-000000000001'),
  3,
  'only valid keys were stored'
);

-- 5. RLS: the other tenant sees nothing.
set local request.jwt.claims = '{"sub":"19300000-0000-4000-8000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from public.pattern_dismissals
   where user_id = '19300000-0000-4000-8000-000000000001'),
  0,
  'RLS hides another tenant’s dismissals'
);

select is(
  public.dismiss_pattern_keys('recurring', array['face9999']),
  1,
  'second scope works for the other tenant'
);

-- 6. Deleting the auth user cascades viewer state away. Counted as the
--    migration owner because RLS would hide the orphaned rows regardless.
reset role;
delete from auth.users where id = '19300000-0000-4000-8000-000000000001';

select is(
  (select count(*)::int from public.pattern_dismissals
   where user_id = '19300000-0000-4000-8000-000000000001'),
  0,
  'auth user deletion cascades dismissals'
);

-- 7. Unauthenticated calls fail closed.
reset role;
set local role anon;
select throws_ok(
  $$ select public.dismiss_pattern_keys('ledger_dupe', array['abcd1234']) $$,
  'P0001',
  'authentication_required',
  'anonymous dismissal is refused'
);

select * from finish();
rollback;
