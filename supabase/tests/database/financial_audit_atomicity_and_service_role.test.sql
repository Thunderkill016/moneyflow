begin;
select plan(6);

select ok(
  has_table_privilege(
    'service_role',
    'public.financial_mutation_audit_events',
    'SELECT'
  ),
  'service role can verify audit cleanup'
);
select ok(
  not has_table_privilege(
    'service_role',
    'public.financial_mutation_audit_events',
    'INSERT,UPDATE,DELETE'
  ),
  'service role cannot bypass trigger-owned audit writes'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '26830000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'audit-actor@example.invalid',
  crypt('discarded-audit-actor-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Audit Actor"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '26830000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'audit-target@example.invalid',
  crypt('discarded-audit-target-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Audit Target"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims =
  '{"sub":"26830000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok(
  $$
    insert into public.financial_transactions (
      id,
      user_id,
      kind,
      note,
      occurred_on,
      idempotency_key
    ) values (
      '26831000-0000-4000-8000-000000000001'::uuid,
      '26830000-0000-4000-8000-000000000002'::uuid,
      'expense'::public.transaction_kind,
      'must roll back with failed audit actor check',
      current_date,
      '26832000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'P0001',
  'financial_audit_actor_tenant_mismatch',
  'audit actor mismatch aborts the financial mutation'
);
select is(
  (
    select count(*)::integer
    from public.financial_transactions
    where id = '26831000-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'failed audit trigger leaves no unaudited transaction row'
);

set local request.headers =
  '{"x-request-id":"SECRET note and card number"}';
select lives_ok(
  $$
    insert into public.financial_transactions (
      id,
      user_id,
      kind,
      note,
      occurred_on,
      idempotency_key
    ) values (
      '26831000-0000-4000-8000-000000000002'::uuid,
      '26830000-0000-4000-8000-000000000001'::uuid,
      'expense'::public.transaction_kind,
      'ordinary transaction note',
      current_date,
      '26832000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'unsafe request-ID text cannot break the financial mutation'
);
select is(
  (
    select request_id
    from public.financial_mutation_audit_events
    where action = 'transaction_created'
      and entity_id = '26831000-0000-4000-8000-000000000002'::uuid
  ),
  null::text,
  'unsafe request-ID free text is discarded instead of logged'
);

select * from finish();
rollback;
