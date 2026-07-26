begin;
select plan(6);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'inbox_candidates'
      and indexname = 'inbox_candidates_account_owner_idx'
      and lower(indexdef) like '%(account_id, user_id)%'
      and lower(indexdef) like '%where (account_id is not null)%'
  ),
  'inbox candidate account ownership FK has a covering partial index'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'inbox_candidates'
      and indexname = 'inbox_candidates_category_owner_idx'
      and lower(indexdef) like '%(category_id, user_id)%'
      and lower(indexdef) like '%where (category_id is not null)%'
  ),
  'inbox candidate category ownership FK has a covering partial index'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'recurring_commitments'
      and indexname = 'recurring_commitments_account_owner_idx'
      and lower(indexdef) like '%(account_id, user_id)%'
  ),
  'recurring commitment account ownership FK has a covering index'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'recurring_commitments'
      and indexname = 'recurring_commitments_category_owner_idx'
      and lower(indexdef) like '%(category_id, user_id)%'
  ),
  'recurring commitment category ownership FK has a covering index'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'recurring_income_templates'
      and indexname = 'recurring_income_templates_account_owner_idx'
      and lower(indexdef) like '%(account_id, user_id)%'
  ),
  'recurring income account ownership FK has a covering index'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'recurring_income_templates'
      and indexname = 'recurring_income_templates_category_owner_idx'
      and lower(indexdef) like '%(category_id, user_id)%'
  ),
  'recurring income category ownership FK has a covering index'
);

select * from finish();
rollback;
