begin;
select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-8000-000000000000'::uuid,
  '63100000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'mon63-measure-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb, now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-8000-000000000000'::uuid,
  '63100000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'mon63-measure-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb, now(), now(), '', '', false, false
);

set local request.jwt.claims = '{"sub":"63100000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

insert into public.import_batches (
  id, user_id, file_name, source, status, row_count, warning_count,
  skipped_rows, map_confidence, headers, column_map
) values (
  '63110000-0000-4000-8000-000000000001'::uuid,
  '63100000-0000-4000-8000-000000000001'::uuid,
  'measure.csv', 'csv', 'parsed', 1, 0, 0, 1,
  '["date","amount"]'::jsonb,
  '{"date":0,"amount":1,"desc":null,"debit":null,"credit":null}'::jsonb
);

select has_function(
  'public', 'record_import_batch_measurement', array['uuid','text'],
  'privacy-safe import measurement RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated', 'public.record_import_batch_measurement(uuid,text)', 'EXECUTE'
  ),
  'authenticated may record own import measurement'
);

select ok(
  not has_function_privilege(
    'anon', 'public.record_import_batch_measurement(uuid,text)', 'EXECUTE'
  ),
  'anon cannot record import measurement'
);

select is(
  (select prosecdef from pg_catalog.pg_proc
   where oid = 'public.record_import_batch_measurement(uuid,text)'::regprocedure),
  false,
  'measurement RPC is SECURITY INVOKER'
);

select is(
  (public.record_import_batch_measurement(
    '63110000-0000-4000-8000-000000000001'::uuid,
    'commit_attempt'
  ) ->> 'commit_attempt_count')::integer,
  1,
  'commit attempt increments durable counter'
);

select is(
  (public.record_import_batch_measurement(
    '63110000-0000-4000-8000-000000000001'::uuid,
    'commit_replay'
  ) ->> 'commit_replay_count')::integer,
  1,
  'confirmed exact replay increments durable replay counter'
);

select throws_ok(
  $$ select public.record_import_batch_measurement(
    '63110000-0000-4000-8000-000000000001'::uuid, 'commit_replay'
  ) $$,
  'P0001',
  'import_batch_measurement_not_recorded',
  'replay count cannot exceed observed attempts'
);

select throws_ok(
  $$ select public.record_import_batch_measurement(
    '63110000-0000-4000-8000-000000000001'::uuid, 'raw_statement'
  ) $$,
  'P0001',
  'invalid_import_measurement',
  'measurement event vocabulary is allowlisted'
);

set local request.jwt.claims = '{"sub":"63100000-0000-4000-8000-000000000002","role":"authenticated"}';

select throws_ok(
  $$ select public.record_import_batch_measurement(
    '63110000-0000-4000-8000-000000000001'::uuid, 'commit_attempt'
  ) $$,
  'P0001',
  'import_batch_measurement_not_recorded',
  'another tenant cannot increment owner batch counters'
);

reset role;
select is(
  (select commit_attempt_count from public.import_batches
   where id = '63110000-0000-4000-8000-000000000001'::uuid),
  1,
  'cross-tenant attempt did not mutate owner measurement'
);

select * from finish();
rollback;
