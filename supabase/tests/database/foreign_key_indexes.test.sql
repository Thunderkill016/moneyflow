begin;
select plan(1);

create temporary view uncovered_public_foreign_keys as
select
  n.nspname as schema_name,
  t.relname as table_name,
  c.conname as constraint_name
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where c.contype = 'f'
  and n.nspname = 'public'
  and not exists (
    select 1
    from pg_index i
    join pg_class index_class on index_class.oid = i.indexrelid
    join pg_namespace index_namespace on index_namespace.oid = index_class.relnamespace
    where i.indrelid = c.conrelid
      and i.indisvalid
      and i.indisready
      and i.indislive
      and (
        i.indpred is null
        or (
          index_namespace.nspname = 'public'
          and index_class.relname in (
            'inbox_candidates_account_owner_idx',
            'inbox_candidates_category_owner_idx'
          )
        )
      )
      and i.indnkeyatts >= cardinality(c.conkey)
      and (
        select array_agg(key_column order by ordinality)
        from unnest(i.indkey::smallint[]) with ordinality
          as indexed(key_column, ordinality)
        where ordinality <= cardinality(c.conkey)
      ) = c.conkey
  );

select diag(
  coalesce(
    (
      select string_agg(
        format('%I.%I constraint %I', schema_name, table_name, constraint_name),
        E'\n'
        order by schema_name, table_name, constraint_name
      )
      from uncovered_public_foreign_keys
    ),
    'all public foreign keys have complete left-prefix index coverage'
  )
);

select ok(
  not exists (select 1 from uncovered_public_foreign_keys),
  'every public foreign key has valid complete left-prefix index coverage'
);

select * from finish();
rollback;
