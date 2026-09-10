begin;
select plan(7);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
  ),
  'anon has no grants on public tables or views'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (
        has_function_privilege('public', p.oid, 'EXECUTE')
        or has_function_privilege('anon', p.oid, 'EXECUTE')
      )
  ),
  'SECURITY DEFINER functions are not executable by public or anon'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not coalesce(p.proconfig, array[]::text[]) @> array['search_path=""']::text[]
  ),
  'authenticated SECURITY DEFINER functions pin an empty search_path'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and pg_get_functiondef(p.oid) not ilike '%auth.uid()%'
  ),
  'authenticated SECURITY DEFINER functions derive the current user from auth.uid()'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and c.relname in (
        'account_balances',
        'budget_progress',
        'recurring_commitment_feed',
        'recurring_income_template_feed',
        'transaction_feed'
      )
      and coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']::text[]
  ),
  5,
  'all exposed finance views execute with caller security'
);

select ok(
  exists (
    select 1
    from pg_default_acl default_acl
    join pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    where owner_role.rolname = 'postgres'
      and namespace.nspname = 'public'
      and default_acl.defaclobjtype = 'f'
  ),
  'postgres has an explicit default function ACL for the public schema'
);

select ok(
  not exists (
    select 1
    from pg_default_acl default_acl
    join pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    cross join lateral aclexplode(default_acl.defaclacl) acl
    left join pg_roles grantee_role on grantee_role.oid = acl.grantee
    where owner_role.rolname = 'postgres'
      and namespace.nspname = 'public'
      and default_acl.defaclobjtype = 'f'
      and acl.privilege_type = 'EXECUTE'
      and (
        acl.grantee = 0
        or grantee_role.rolname in ('anon', 'authenticated')
      )
  ),
  'new postgres-owned public functions do not grant EXECUTE to PUBLIC, anon or authenticated by default'
);

select * from finish();
rollback;
