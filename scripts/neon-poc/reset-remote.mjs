// Reset the Neon PoC database to a clean slate WITHOUT touching managed
// objects (auth schema/functions, neon_auth.* tables, Data API roles).
// pg_session_jwt is installed INTO schema public, so `drop schema public
// cascade` destroys the Data API's JWT layer — learned the hard way.
// `drop owned by neondb_owner` removes only objects this PoC created
// (tables/functions/types in public, extensions + supabase_migrations
// schemas, the trigger on neon_auth."user") and leaves cloud_admin-owned
// extensions alone.
//
//   NEON_POC_URL=postgresql://… node scripts/neon-poc/reset-remote.mjs
import pg from "pg";

const url = process.env.NEON_POC_URL;
if (!url) throw new Error("NEON_POC_URL env var required");

const client = new pg.Client({ connectionString: url });
await client.connect();

// Surgical reset — `drop owned` / `drop schema public cascade` are NOT safe
// here: the Data API's auth schema and the pg_session_jwt extension (installed
// into public) are owned by neondb_owner, so either command destroys the
// managed auth surface. Drop only what the PoC creates:
//   - the provisioning trigger on neon_auth."user"
//   - relations (tables/views/sequences) in public
//   - standalone functions/types in public that are NOT extension members
//   - the supabase_migrations bookkeeping schema
// extensions/pgcrypto is left in place (idempotent in the preflight).
await client.query(`
do $$
declare
  stmt text;
begin
  execute 'drop trigger if exists on_auth_user_created on neon_auth."user"';

  for stmt in
    select format('drop %s if exists public.%I cascade',
                  case c.relkind when 'r' then 'table'
                                 when 'v' then 'view'
                                 when 'm' then 'materialized view'
                                 when 'S' then 'sequence' end,
                  c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r','v','m','S')
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_class'::regclass and d.objid = c.oid
          and d.deptype = 'e'
      )
  loop execute stmt; end loop;

  for stmt in
    select format('drop function if exists public.%s cascade',
                  p.oid::regprocedure::text)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_proc'::regclass and d.objid = p.oid
          and d.deptype = 'e'
      )
  loop execute stmt; end loop;

  for stmt in
    select format('drop type if exists public.%I cascade', t.typname)
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype in ('e','d')
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_type'::regclass and d.objid = t.oid
          and d.deptype in ('e','i')
      )
  loop execute stmt; end loop;

  execute 'drop schema if exists supabase_migrations cascade';
end $$;
`);

const { rows } = await client.query(
  `select n.nspname,
          count(p.oid)::int as functions,
          count(c.oid)::int as tables
   from pg_namespace n
   left join pg_proc p on p.pronamespace = n.oid
   left join pg_class c on c.relnamespace = n.oid and c.relkind = 'r'
   where n.nspname in ('public','extensions','supabase_migrations','auth','neon_auth')
   group by n.nspname order by n.nspname`,
);
for (const r of rows)
  console.log(`  ${r.nspname}: ${r.tables} tables, ${r.functions} functions`);
await client.end();
