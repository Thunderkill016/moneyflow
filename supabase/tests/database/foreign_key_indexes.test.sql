begin;
select plan(1);

select ok(
  not exists (
    select 1
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
          and i.indnkeyatts >= cardinality(c.conkey)
          and (
            select array_agg(key_column order by ordinality)
            from unnest(i.indkey::smallint[]) with ordinality
              as indexed(key_column, ordinality)
            where ordinality <= cardinality(c.conkey)
          ) = c.conkey
      )
  ),
  'every public foreign key has a valid left-prefix covering index'
);

select * from finish();
rollback;
