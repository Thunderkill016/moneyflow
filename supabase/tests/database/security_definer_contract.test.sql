begin;
select plan(8);

create temporary table flagged_security_definer_functions on commit drop as
select
  p.oid,
  p.oid::regprocedure::text as function_signature,
  p.prosecdef,
  p.proconfig,
  pg_get_functiondef(p.oid) as definition,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  exists (
    select 1
    from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) as public_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and has_function_privilege('authenticated', p.oid, 'EXECUTE');

select is(
  (select count(*)::integer from flagged_security_definer_functions),
  25,
  'the reviewed authenticated SECURITY DEFINER inventory stays explicit'
);

select is(
  (select count(*)::integer from flagged_security_definer_functions where not prosecdef),
  0,
  'the inventory contains only SECURITY DEFINER functions'
);

select is(
  (select count(*)::integer from flagged_security_definer_functions where anon_execute),
  0,
  'anon cannot execute privileged mutation RPCs'
);

select is(
  (select count(*)::integer from flagged_security_definer_functions where public_execute),
  0,
  'PUBLIC cannot execute privileged mutation RPCs'
);

select is(
  (
    select count(*)::integer
    from flagged_security_definer_functions
    where not authenticated_execute
  ),
  0,
  'reviewed browser RPCs remain intentionally callable only by authenticated users'
);

select is(
  (
    select count(*)::integer
    from flagged_security_definer_functions
    where not coalesce(proconfig, '{}'::text[]) @> array['search_path=""']::text[]
  ),
  0,
  'every privileged RPC locks search_path to the empty path'
);

select is(
  (
    select count(*)::integer
    from flagged_security_definer_functions
    where position('auth.uid()' in definition) = 0
  ),
  0,
  'every privileged RPC derives identity from auth.uid()'
);

select is(
  (
    select count(*)::integer
    from flagged_security_definer_functions
    where position('authentication_required' in definition) = 0
  ),
  0,
  'every privileged RPC explicitly rejects unauthenticated execution'
);

select * from finish();
rollback;
