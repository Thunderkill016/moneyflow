begin;
select plan(7);

select ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and (c.relname = 'profiles' or exists (
      select 1 from pg_attribute a where a.attrelid = c.oid
        and a.attname = 'user_id' and not a.attisdropped
    ))
    and not exists (
      select 1 from pg_trigger t where t.tgrelid = c.oid
        and t.tgfoid = 'public.guard_oauth_mutation()'::regprocedure
        and t.tgenabled = 'O'
    )
), 'every owned table guards OAuth writes including privileged RPC writes');

select ok(not has_function_privilege('authenticated',
  'public.guard_oauth_mutation()', 'EXECUTE'), 'guard cannot be called as a public RPC');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '75200000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'oauth-boundary@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"OAuth Boundary"}'::jsonb
);

set local request.jwt.claims = '{"sub":"75200000-0000-4000-8000-000000000001","role":"authenticated","client_id":"75200000-0000-4000-8000-000000000002"}';
set local role authenticated;

-- Direct table writes to accounts are already denied by RLS before any
-- trigger fires, so the direct-path guard is proven on inbox_candidates
-- where the insert policy passes and the trigger is the deciding boundary.
select throws_ok(
  $$ insert into public.inbox_candidates(user_id, kind, amount_minor, merchant, occurred_on, source, confidence, status)
     values ('75200000-0000-4000-8000-000000000001', 'expense', 45000, 'OAuth direct', current_date, 'manual', 'medium', 'pending') $$,
  '42501', 'oauth_mutation_forbidden', 'OAuth cannot write directly even where RLS would allow');

select throws_ok(
  $$ select public.create_financial_account('OAuth RPC forbidden', 'cash', 0, 'VND') $$,
  '42501', 'oauth_mutation_forbidden', 'SECURITY DEFINER account RPC cannot bypass OAuth guard');

select throws_ok(
  $$ insert into public.inbox_candidates(user_id, kind, amount_minor, merchant, occurred_on, source, confidence, status, source_external_id, source_lifecycle_state)
     values ('75200000-0000-4000-8000-000000000001', 'expense', 45000, 'OAuth proposal', current_date, 'agent', 'medium', 'pending', 'agent|75200000-0000-4000-8000-000000000002|75200000-0000-4000-8000-000000000003', 'pending') $$,
  '42501', 'oauth_mutation_forbidden', 'unallowlisted OAuth client cannot propose even a pending candidate');

reset role;

select lives_ok(
  $$ select set_config('request.jwt.claims', '{"sub":"75200000-0000-4000-8000-000000000001","role":"authenticated"}', true) $$,
  'first-party JWT context restores without OAuth client');

set local request.jwt.claims = '{"sub":"75200000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ select public.create_financial_account('First party allowed', 'cash', 0, 'VND') $$,
  'first-party mutation remains available');

reset role;

select * from finish();
rollback;
