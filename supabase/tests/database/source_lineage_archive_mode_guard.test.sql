begin;
select plan(2);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '44290000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'archive-mode-guard@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Archive Mode Guard"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"44290000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

insert into public.inbox_candidates (
  id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
  confidence, status, source_external_id, source_lifecycle_state,
  parser_version, mapping_version, updated_at
) values (
  '44290000-0000-4000-8000-000000000101'::uuid,
  '44290000-0000-4000-8000-000000000001'::uuid,
  'expense', 12000, 'Archive mode guard', 'before', '2026-08-23', 'csv',
  'high', 'pending', 'archive-mode-guard-1', 'pending',
  'lineage-test@1.0', 1, '2000-01-01 00:00:00+00'::timestamptz
);

select is(
  pg_catalog.set_config('moneyflow.archive_restore_source_lineage', 'on', true),
  'on',
  'authenticated SQL role can set the custom archive marker locally'
);

update public.inbox_candidates
set note = 'browser update after forged marker'
where id = '44290000-0000-4000-8000-000000000101'::uuid;

select ok(
  (select updated_at > '2000-01-01 00:00:00+00'::timestamptz
   from public.inbox_candidates
   where id = '44290000-0000-4000-8000-000000000101'::uuid),
  'forged archive marker cannot suppress updated_at outside the restore owner'
);

select * from finish();
rollback;
