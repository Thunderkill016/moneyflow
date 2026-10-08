-- Account-scoped companion read model for the reconciliation workspace.
-- The stable transaction feed remains unchanged. This view exposes one owned
-- representative entry per logical (transaction, account) leg so split rows
-- render and mutate atomically while transfer legs stay account-independent.

create view public.account_reconciliation_entry_feed
with (security_invoker = true)
as
select
  (array_agg(entry.id order by entry.id))[1] as entry_id,
  entry.user_id,
  entry.transaction_id,
  entry.account_id,
  entry.reconciliation_state,
  min(entry.cleared_at) as cleared_at,
  entry.reconciliation_id,
  count(*)::bigint as entry_count
from public.transaction_entries entry
join public.financial_transactions transaction_record
  on transaction_record.id = entry.transaction_id
 and transaction_record.user_id = entry.user_id
where transaction_record.deleted_at is null
group by
  entry.user_id,
  entry.transaction_id,
  entry.account_id,
  entry.reconciliation_state,
  entry.reconciliation_id;

revoke all privileges on public.account_reconciliation_entry_feed
from public, anon, authenticated;

grant select on public.account_reconciliation_entry_feed
to authenticated;
