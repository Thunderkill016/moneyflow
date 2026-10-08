-- Deleted-transactions browse surface ("trash").
--
-- Deployment compatibility:
-- - transaction_feed stays untouched: dashboard, reports and the dashboard
--   bundle all assume active-only rows, so a version skew cannot surface
--   deleted rows as live ledger data;
-- - a companion security-invoker view exposes only soft-deleted rows for the
--   /transactions/trash read path, mirroring the transaction_review_feed
--   precedent (20260803090000);
-- - the partial index keeps `deleted_at is not null` scans bounded.

create index financial_transactions_user_deleted_idx
  on public.financial_transactions (user_id, deleted_at desc)
  where deleted_at is not null;

create view public.deleted_transaction_feed with (security_invoker = true) as
select
  transaction_record.id,
  transaction_record.user_id,
  transaction_record.kind,
  transaction_record.note,
  transaction_record.occurred_on,
  transaction_record.created_at,
  case
    when transaction_record.kind = 'transfer' then
      max(
        case
          when entry.amount_minor < 0 then -entry.amount_minor
          else abs(entry.amount_minor)
        end
      )
    else
      sum(abs(entry.amount_minor))
  end::bigint as amount_minor,
  (array_agg(account.id) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_id,
  (array_agg(account.name) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_name,
  (array_agg(category.id) filter (where category.id is not null))[1] as category_id,
  case
    when transaction_record.kind = 'expense'
      and count(distinct category.id) filter (where category.id is not null) > 1
    then
      'Chia · ' || (count(distinct category.id) filter (where category.id is not null))::text || ' danh mục'
    else
      (array_agg(category.name) filter (where category.name is not null))[1]
  end as category_name,
  (array_agg(account.id) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_id,
  (array_agg(account.name) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_name,
  bool_or(commitment_occ.id is not null or income_occ.id is not null) as is_recurring_payment,
  case
    when transaction_record.kind = 'expense'
      and count(category.id) filter (where category.id is not null) > 1
    then
      jsonb_agg(
        jsonb_build_object(
          'category_id', category.id,
          'category_name', category.name,
          'amount_minor', abs(entry.amount_minor)
        )
        order by abs(entry.amount_minor) desc
      ) filter (where category.id is not null)
    else null
  end as split_lines,
  transaction_record.payee,
  transaction_record.deleted_at
from public.financial_transactions as transaction_record
join public.transaction_entries as entry
  on entry.transaction_id = transaction_record.id and entry.user_id = transaction_record.user_id
join public.accounts as account
  on account.id = entry.account_id and account.user_id = entry.user_id
left join public.categories as category
  on category.id = entry.category_id and category.user_id = entry.user_id
left join public.commitment_occurrences as commitment_occ
  on commitment_occ.transaction_id = transaction_record.id
  and commitment_occ.user_id = transaction_record.user_id
left join public.income_template_occurrences as income_occ
  on income_occ.transaction_id = transaction_record.id
  and income_occ.user_id = transaction_record.user_id
where transaction_record.deleted_at is not null
group by transaction_record.id, transaction_record.user_id, transaction_record.kind,
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at,
  transaction_record.payee, transaction_record.deleted_at
order by transaction_record.deleted_at desc;

revoke all on public.deleted_transaction_feed from public, anon;
grant select on public.deleted_transaction_feed to authenticated;
