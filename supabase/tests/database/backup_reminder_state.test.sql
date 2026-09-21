begin;
select plan(7);

-- S1: profiles carries the backup-recency column, the dashboard bundle
-- surfaces it as an additive `backup_state` object, and RLS keeps the write
-- owner-scoped.

select has_column(
  'public',
  'profiles',
  'last_backup_at',
  'profiles records when the tenant last produced an archive backup'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000ba01',
  'authenticated',
  'authenticated',
  'backup-a@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Backup A"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000bb01',
  'authenticated',
  'authenticated',
  'backup-b@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Backup B"}'::jsonb
);

create temporary table backup_test_bundle (
  bundle jsonb not null
) on commit drop;
grant select, insert, delete on backup_test_bundle to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-00000000ba01',
  true
);

insert into backup_test_bundle
select public.get_dashboard_bundle(current_date, current_date, 5);

-- Never backed up: null timestamp, but account creation is present so the
-- client has an honest baseline for the reminder window.
select is(
  (select bundle #>> '{backup_state,last_backup_at}' from backup_test_bundle),
  null::text,
  'bundle reports null last_backup_at for a tenant that never backed up'
);

select is(
  (select bundle #>> '{backup_state,created_at}' from backup_test_bundle),
  current_date::text,
  'bundle reports the profile creation date as YYYY-MM-DD'
);

-- The owner records a backup; the bundle reflects it on the next read.
update public.profiles
set last_backup_at = now()
where id = '00000000-0000-4000-8000-00000000ba01';

delete from backup_test_bundle;
insert into backup_test_bundle
select public.get_dashboard_bundle(current_date, current_date, 5);

select is(
  (select bundle #>> '{backup_state,last_backup_at}' from backup_test_bundle),
  current_date::text,
  'owner backup write surfaces in the bundle as a date'
);

-- Tenant B cannot write tenant A's row: RLS makes it a silent no-op. Write a
-- deliberately wrong timestamp, then prove A's real value survives.
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-00000000bb01',
  true
);

update public.profiles
set last_backup_at = '2000-01-01'::timestamptz
where id = '00000000-0000-4000-8000-00000000ba01';

-- And tenant B's own bundle still reports its own state, not A's.
delete from backup_test_bundle;
insert into backup_test_bundle
select public.get_dashboard_bundle(current_date, current_date, 5);

select is(
  (select bundle #>> '{backup_state,last_backup_at}' from backup_test_bundle),
  null::text,
  'tenant B bundle sees its own null last_backup_at, not A’s'
);

select is(
  (select bundle #>> '{backup_state,created_at}' from backup_test_bundle),
  current_date::text,
  'tenant B bundle reports its own created_at'
);

-- Back as A: the cross-tenant write really was a no-op, not just invisible.
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-00000000ba01',
  true
);

select is(
  (
    select last_backup_at::date::text
    from public.profiles
    where id = '00000000-0000-4000-8000-00000000ba01'
  ),
  current_date::text,
  'tenant B attempted overwrite left tenant A timestamp untouched'
);

select * from finish();
rollback;
