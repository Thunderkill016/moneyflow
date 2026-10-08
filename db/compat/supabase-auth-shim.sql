-- PoC-only compatibility shim: stand up the minimum Supabase auth surface the
-- migrations + pgTAP suites reference, on a vanilla Postgres cluster. This file
-- is NOT a migration target design — it exists so the Neon PoC can replay the
-- existing schema and prove RLS/RPC parity without weakening any grant.
--
-- Supabase production provides: roles anon/authenticated/service_role/
-- authenticator/supabase_migrations, schema auth (users + functions), and the
-- request.jwt.claims GUC set per-request by PostgREST. We mirror exactly that.

-- Roles --------------------------------------------------------------------
-- Postgres cannot CREATE ROLE IF NOT EXISTS; guard with a DO block.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_migrations') then
    create role supabase_migrations nologin;
  end if;
end $$;

-- The postgres bootstrap user owns DDL for the replay; let it impersonate the
-- request-scoped roles so `set role authenticated` works in tests.
grant anon, authenticated, service_role to postgres;

-- Supabase puts `extensions` on the default search_path (extensions.pgcrypto
-- provides crypt()/gen_salt() that tests and auth flows call unqualified).
alter database postgres set search_path to "$user", public, extensions;

-- Supabase installs extensions into the `extensions` schema; vanilla Postgres
-- defaults to `public`. Mirror the Supabase layout so migrations replay
-- unchanged.
create schema if not exists extensions;
grant usage on schema extensions to public;

-- Supabase CLI bookkeeping schema: one migration deletes stale records from it.
-- On the real target the migration runner owns this; an empty table here keeps
-- the replay faithful (delete of absent versions is a no-op).
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
create table if not exists supabase_migrations.seed_files (
  path text primary key,
  hash text
);

-- auth schema --------------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token varchar(255),
  recovery_sent_at timestamptz,
  email_change_token_new varchar(255),
  email_change varchar(255),
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamptz,
  updated_at timestamptz,
  phone text,
  phone_confirmed_at timestamptz,
  phone_change text,
  phone_change_token varchar(255),
  phone_change_sent_at timestamptz,
  email_change_token_current varchar(255),
  email_change_confirm_status smallint,
  banned_until timestamptz,
  reauthentication_token varchar(255),
  reauthentication_sent_at timestamptz,
  is_sso_user boolean not null default false,
  deleted_at timestamptz,
  is_anonymous boolean not null default false
);

-- auth.uid(): the user UUID of the current request JWT (sub claim). Mirrors
-- Supabase: reads the per-request GUC PostgREST sets; NULL when absent.
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

-- auth.jwt(): raw claims for the current request (MCP client_id enforcement).
create or replace function auth.jwt()
returns jsonb
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

-- auth.email(): convenience used by some policies/tools.
create or replace function auth.email()
returns text
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email',
    nullif(current_setting('request.jwt.claim.email', true), '')
  );
$$;

revoke all on function auth.uid() from public;
revoke all on function auth.jwt() from public;
revoke all on function auth.email() from public;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
grant execute on function auth.email() to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
