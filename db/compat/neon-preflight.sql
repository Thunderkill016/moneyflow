-- Real-Neon preflight: add ONLY the Supabase surface Neon does not provide.
-- Verified against project polished-pine-75721729 (Neon Free, PG 18):
--
--   Neon already provides (verified pg_roles on the scratch project)
--     - roles `anonymous`, `authenticated`, `authenticator`, `anon`,
--       `service_role` — the full PostgREST-style set, so migration
--       grant/revoke statements apply verbatim; the create-role statements
--       below are harmless no-ops kept for unmanaged-Neon compatibility
--     - auth schema with native pg_session_jwt functions:
--         auth.uid() -> uuid, auth.jwt() -> jsonb, auth.user_id() -> text,
--         auth.session(), auth.organization()
--     - neon_auth schema: Better Auth mirror tables (`user`, `session`,
--       `account`, `verification`, `jwks`, ...) whose `user.id` is uuid
--   Neon does NOT allow
--     - creating anything in schema `auth` (owned by cloud_admin):
--       no auth.users table/view, no auth.email() — call sites must use
--       neon_auth."user" and auth.jwt() ->> 'email' instead
--     - granting `authenticated` membership to the owner role (pgTAP-style
--       `set role authenticated` is not possible as neondb_owner; request-path
--       RLS must be verified through real JWTs via the Data API instead)
--   Neon DOES allow
--     - create role anon / service_role (nologin)
--     - grant anon to anonymous (we own `anon`)
--     - create trigger on neon_auth."user" (TRIGGER privilege granted) —
--       profile provisioning can stay a DB trigger
--
-- The replay transform maps `auth.users` -> `neon_auth."user"` and
-- `X.raw_user_meta_data ->> 'full_name'|'name'` -> `X.name`.

-- Roles ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

-- Data API requests arrive as `anonymous`/`authenticated`; grants that target
-- `anon` must be visible to `anonymous` (Neon's name for the same concept).
grant anon to anonymous;
grant service_role to neondb_owner;

-- Extensions schema + pgcrypto ----------------------------------------------
-- Supabase installs pgcrypto in `extensions` on the default search_path;
-- migrations call crypt()/gen_salt() unqualified.
create schema if not exists extensions;
grant usage on schema extensions to public;
create extension if not exists pgcrypto schema extensions;
alter database neondb set search_path to "$user", public, extensions;

-- Supabase CLI bookkeeping schema (one migration deletes stale rows) ---------
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
