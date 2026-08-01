begin;
select plan(5);

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

select * from finish();
rollback;
