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
    where i.indrelid = c.conrelid
      and i.indisvalid
      and i.indisready
      and i.indislive
      and i.indpred is null
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
  'every public foreign key has a valid non-partial left-prefix covering index'
);

select * from finish();
rollback;
