-- Transaction review state and bounded bulk correction.
--
-- Deployment compatibility:
-- - keep transaction_feed unchanged so an application/database version skew
--   cannot turn the ledger into a false empty state;
-- - expose review state through a small companion security-invoker view;
-- - validate every selected row before writing so bulk changes are atomic.

create type public.transaction_review_status as enum (
  'needs_review',
  'reviewed'
);

alter table public.financial_transactions
  add column review_status public.transaction_review_status
    not null default 'reviewed';

create index financial_transactions_user_review_active_idx
  on public.financial_transactions (user_id, review_status, occurred_on desc, id)
  where deleted_at is null;

create view public.transaction_review_feed with (security_invoker = true) as
select
  transaction_record.id,
  transaction_record.user_id,
  transaction_record.review_status,
  transaction_record.occurred_on,
  transaction_record.created_at
from public.financial_transactions as transaction_record
where transaction_record.deleted_at is null;

revoke all on public.transaction_review_feed from public, anon;
grant select on public.transaction_review_feed to authenticated;

create or replace function public.set_transaction_review_status_bulk(
  p_transaction_ids uuid[],
  p_review_status public.transaction_review_status
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ids uuid[];
  v_locked_ids uuid[] := array[]::uuid[];
  v_id uuid;
  v_affected integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if p_review_status is null then
    raise exception 'review_status_required';
  end if;

  select array_agg(candidate_id order by candidate_id)
    into v_ids
  from (
    select distinct candidate_id
    from unnest(coalesce(p_transaction_ids, array[]::uuid[])) as candidate(candidate_id)
    where candidate_id is not null
  ) as normalized;

  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'transaction_selection_required';
  end if;
  if cardinality(v_ids) > 100 then
    raise exception 'transaction_selection_limit';
  end if;
  if cardinality(v_ids) <> cardinality(coalesce(p_transaction_ids, array[]::uuid[])) then
    raise exception 'transaction_selection_invalid';
  end if;

  for v_id in
    select transaction_record.id
    from public.financial_transactions as transaction_record
    where transaction_record.user_id = v_user_id
      and transaction_record.deleted_at is null
      and transaction_record.id = any(v_ids)
    order by transaction_record.id
    for update
  loop
    v_locked_ids := array_append(v_locked_ids, v_id);
  end loop;

  if cardinality(v_locked_ids) <> cardinality(v_ids) then
    raise exception 'transaction_selection_not_found';
  end if;

  update public.financial_transactions
  set review_status = p_review_status
  where user_id = v_user_id
    and deleted_at is null
    and id = any(v_ids)
    and review_status <> p_review_status;
  get diagnostics v_affected = row_count;

  return v_affected;
end;
$$;

create or replace function public.bulk_update_transaction_category(
  p_transaction_ids uuid[],
  p_category_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ids uuid[];
  v_locked_ids uuid[] := array[]::uuid[];
  v_id uuid;
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_selected_kind public.transaction_kind;
  v_affected integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select array_agg(candidate_id order by candidate_id)
    into v_ids
  from (
    select distinct candidate_id
    from unnest(coalesce(p_transaction_ids, array[]::uuid[])) as candidate(candidate_id)
    where candidate_id is not null
  ) as normalized;

  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'transaction_selection_required';
  end if;
  if cardinality(v_ids) > 100 then
    raise exception 'transaction_selection_limit';
  end if;
  if cardinality(v_ids) <> cardinality(coalesce(p_transaction_ids, array[]::uuid[])) then
    raise exception 'transaction_selection_invalid';
  end if;

  select category.kind, category.is_archived
    into v_category_kind, v_category_archived
  from public.categories as category
  where category.id = p_category_id
    and category.user_id = v_user_id
  for share;

  if v_category_kind is null then
    raise exception 'category_not_found';
  end if;
  if v_category_archived then
    raise exception 'category_archived';
  end if;

  for v_id in
    select transaction_record.id
    from public.financial_transactions as transaction_record
    where transaction_record.user_id = v_user_id
      and transaction_record.deleted_at is null
      and transaction_record.id = any(v_ids)
    order by transaction_record.id
    for update
  loop
    v_locked_ids := array_append(v_locked_ids, v_id);
  end loop;

  if cardinality(v_locked_ids) <> cardinality(v_ids) then
    raise exception 'transaction_selection_not_found';
  end if;

  if exists (
    select 1
    from public.financial_transactions as transaction_record
    where transaction_record.user_id = v_user_id
      and transaction_record.id = any(v_ids)
      and transaction_record.kind = 'transfer'
  ) then
    raise exception 'bulk_transfer_category_locked';
  end if;

  select min(transaction_record.kind)
    into v_selected_kind
  from public.financial_transactions as transaction_record
  where transaction_record.user_id = v_user_id
    and transaction_record.id = any(v_ids);

  if exists (
    select 1
    from public.financial_transactions as transaction_record
    where transaction_record.user_id = v_user_id
      and transaction_record.id = any(v_ids)
      and transaction_record.kind <> v_selected_kind
  ) then
    raise exception 'bulk_transaction_kind_mismatch';
  end if;

  if v_selected_kind::text <> v_category_kind::text then
    raise exception 'category_kind_mismatch';
  end if;

  if exists (
    select 1
    from public.commitment_occurrences as occurrence
    where occurrence.user_id = v_user_id
      and occurrence.transaction_id = any(v_ids)
  ) or exists (
    select 1
    from public.income_template_occurrences as occurrence
    where occurrence.user_id = v_user_id
      and occurrence.transaction_id = any(v_ids)
  ) then
    raise exception 'recurring_payment_locked';
  end if;

  if exists (
    select transaction_record.id
    from public.financial_transactions as transaction_record
    left join public.transaction_entries as entry
      on entry.transaction_id = transaction_record.id
     and entry.user_id = transaction_record.user_id
    where transaction_record.user_id = v_user_id
      and transaction_record.id = any(v_ids)
    group by transaction_record.id
    having count(entry.id) <> 1
       or count(entry.category_id) <> 1
  ) then
    raise exception 'bulk_split_transaction_locked';
  end if;

  update public.transaction_entries as entry
  set category_id = p_category_id
  from public.financial_transactions as transaction_record
  where transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
    and transaction_record.user_id = v_user_id
    and transaction_record.deleted_at is null
    and transaction_record.id = any(v_ids);
  get diagnostics v_affected = row_count;

  if v_affected <> cardinality(v_ids) then
    raise exception 'bulk_category_update_incomplete';
  end if;

  return v_affected;
end;
$$;

revoke all on function public.set_transaction_review_status_bulk(
  uuid[], public.transaction_review_status
) from public, anon;
grant execute on function public.set_transaction_review_status_bulk(
  uuid[], public.transaction_review_status
) to authenticated;

revoke all on function public.bulk_update_transaction_category(
  uuid[], uuid
) from public, anon;
grant execute on function public.bulk_update_transaction_category(
  uuid[], uuid
) to authenticated;
