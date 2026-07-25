begin;
select plan(7);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ),
  'anon has no direct public table or view privileges'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
  ),
  'authenticated has no truncate, trigger or references privileges'
);

select ok(
  not exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p', 'v', 'm')
      and has_table_privilege('authenticated', relation.oid, 'MAINTAIN')
  ),
  'authenticated has no maintain privilege on public relations'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'account_balances',
        'budget_progress',
        'recurring_commitment_feed',
        'recurring_income_template_feed',
        'transaction_feed'
      )
      and grantee = 'authenticated'
      and privilege_type <> 'SELECT'
  ),
  'ledger views are select-only for authenticated'
);

select ok(
  not exists (
    select 1
    from pg_proc function_record
    join pg_namespace namespace on namespace.oid = function_record.pronamespace
    where namespace.nspname = 'public'
      and has_function_privilege('anon', function_record.oid, 'EXECUTE')
  ),
  'anon cannot execute public functions'
);

select ok(
  not has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE'),
  'authenticated cannot invoke trigger helper set_updated_at'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_money_transaction(uuid,uuid,public.transaction_kind,bigint,date,text,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.create_account_transfer(uuid,uuid,bigint,date,text,uuid)',
    'EXECUTE'
  ),
  'authenticated retains intended financial RPC execution'
);

select * from finish();
rollback;
