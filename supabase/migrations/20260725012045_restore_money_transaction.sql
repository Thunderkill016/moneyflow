-- Restore soft-deleted financial transactions (clear deleted_at).
-- Balances/views ignore deleted rows; restore is a simple null of deleted_at.
-- Does not restore recurring-payment rows that soft_delete blocks (they never get deleted via that RPC).

create or replace function public.restore_money_transaction(p_transaction_id uuid)
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

  update public.financial_transactions
  set deleted_at = null
  where id = p_transaction_id
    and user_id = auth.uid()
    and deleted_at is not null;

  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.restore_money_transaction(uuid) from public, anon;
grant execute on function public.restore_money_transaction(uuid) to authenticated;
