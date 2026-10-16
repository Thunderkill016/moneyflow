-- Permanently delete a transaction that is already in the trash.
--
-- Why a dedicated RPC: soft delete keeps deleted_at rows for recovery, but
-- the trash previously had no way out other than restore — it accumulated
-- forever. Permanent delete is only allowed AFTER the row is soft-deleted
-- (deleted_at not null), so a live ledger entry can never be destroyed by a
-- single call — the two-step contract stays intact.
--
-- Dependency order (all FKs are on delete restrict):
--   transaction_import_provenance -> financial_transactions
--   inbox_candidates.approved_transaction_id -> financial_transactions
--   transaction_entries -> financial_transactions
-- commitment_occurrences / income_template_occurrences also restrict, but
-- soft_delete_money_transaction already refuses recurring-linked rows, so
-- they should never reach the trash; we still refuse them here in case a
-- row became linked some other way.

create or replace function public.permanently_delete_money_transaction(
  p_transaction_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_affected integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  -- Same lock as soft delete: a transaction that still backs a recurring
  -- schedule must be resolved there first, not silently destroyed.
  if exists (
    select 1 from public.commitment_occurrences
    where user_id = auth.uid() and transaction_id = p_transaction_id
  ) then
    raise exception 'recurring_payment_locked';
  end if;
  if exists (
    select 1 from public.income_template_occurrences
    where user_id = auth.uid() and transaction_id = p_transaction_id
  ) then
    raise exception 'recurring_payment_locked';
  end if;

  -- Only rows already in the trash may be destroyed.
  if not exists (
    select 1 from public.financial_transactions
    where id = p_transaction_id
      and user_id = auth.uid()
      and deleted_at is not null
  ) then
    return false;
  end if;

  delete from public.transaction_import_provenance
  where transaction_id = p_transaction_id
    and user_id = auth.uid();

  -- Keep the inbox candidate (it is the import history) but release its
  -- link to the transaction being destroyed.
  update public.inbox_candidates
  set approved_transaction_id = null
  where approved_transaction_id = p_transaction_id
    and user_id = auth.uid();

  delete from public.transaction_entries
  where transaction_id = p_transaction_id
    and user_id = auth.uid();

  delete from public.financial_transactions
  where id = p_transaction_id
    and user_id = auth.uid()
    and deleted_at is not null;

  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.permanently_delete_money_transaction(uuid)
  from public, anon;
grant execute on function public.permanently_delete_money_transaction(uuid)
  to authenticated;
