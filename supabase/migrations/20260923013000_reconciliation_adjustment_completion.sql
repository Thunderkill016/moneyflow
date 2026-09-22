-- Optional adjustment transaction when completing a nonzero reconciliation.
--
-- Until now `complete_account_reconciliation` hard-failed
-- `reconciliation_difference_nonzero` whenever the cleared ledger did not equal
-- the statement balance, leaving no sanctioned way to close a real gap (bank
-- fee, interest, a posting the bank made). This migration adds an explicit
-- opt-in adjustment path:
--
--   - `p_adjustment_category_id` (default null) chooses the category the
--     adjustment posts under. The transaction kind is forced by the difference
--     sign: income when the statement exceeds the cleared ledger, expense when
--     it falls short. Wrong-kind, cross-tenant or archived categories reuse the
--     existing `category_kind_mismatch` / `category_archived` codes.
--   - `occurred_on` is always the statement date: the reconciliation snapshot
--     only counts transactions with `occurred_on <= statement_date`, so any
--     later date could never close the gap it was posted for.
--   - The entry lands directly in `reconciled` state with
--     `reconciliation_id`/`cleared_at` set — it is locked like every other
--     reconciled row and returns to `cleared` if the period is reopened.
--   - The note defaults to the fixed label `Điều chỉnh đối soát — sao kê
--     <dd/mm/yyyy>`; `p_adjustment_note`/`p_adjustment_payee` allow an explicit
--     override/merchant within the usual length bounds.
--   - The `completed` event records the REAL pre-adjustment difference
--     (previously hardcoded 0) with the pre-adjustment calculated balance, so
--     `statement − calculated = difference` stays true inside the audit row.
--
-- Supplying a category while the difference is zero is harmless: the
-- adjustment branch only runs when the difference is nonzero. A nonzero
-- difference with no category still fails with
-- `reconciliation_difference_nonzero`.
--
-- Signature evolution follows the established pattern: the one-argument form
-- is dropped, the new parameters are appended last with defaults (existing
-- callers and PostgREST named-param calls keep working), and grants are
-- re-pinned explicitly.

drop function if exists public.complete_account_reconciliation(uuid);

create function public.complete_account_reconciliation(
  p_reconciliation_id uuid,
  p_adjustment_category_id uuid default null,
  p_adjustment_note text default null,
  p_adjustment_payee text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_statement_date date;
  v_statement_balance bigint;
  v_snapshot record;
  v_difference bigint;
  v_event_calculated bigint;
  v_adjustment_kind public.transaction_kind;
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_adjustment_transaction_id uuid;
  v_prior_completions bigint;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select account_id
  into v_account_id
  from public.account_reconciliations
  where id = p_reconciliation_id
    and user_id = v_user_id
    and status = 'open';

  if not found then
    raise exception 'open_reconciliation_not_found';
  end if;

  perform public.lock_reconciliation_account(v_account_id);

  select account_id, statement_date, statement_balance_minor
  into v_account_id, v_statement_date, v_statement_balance
  from public.account_reconciliations
  where id = p_reconciliation_id
    and user_id = v_user_id
    and account_id = v_account_id
    and status = 'open'
  for update;

  if not found then
    raise exception 'open_reconciliation_not_found';
  end if;

  perform transaction_record.id
  from public.financial_transactions transaction_record
  where transaction_record.user_id = v_user_id
    and transaction_record.deleted_at is null
    and transaction_record.occurred_on <= v_statement_date
    and exists (
      select 1
      from public.transaction_entries entry
      where entry.transaction_id = transaction_record.id
        and entry.user_id = transaction_record.user_id
        and entry.account_id = v_account_id
        and entry.reconciliation_state in ('cleared', 'reconciled')
    )
  order by transaction_record.id
  for update;

  select * into strict v_snapshot
  from public.reconciliation_snapshot_for_user(
    v_user_id,
    v_account_id,
    v_statement_date
  );

  v_difference := v_statement_balance - v_snapshot.cleared_balance_minor;
  -- The event keeps the pre-adjustment ledger balance so the stored
  -- `statement − calculated = difference` identity describes what the user
  -- actually reconciled, before the adjustment closed the gap.
  v_event_calculated := v_snapshot.cleared_balance_minor;

  if v_difference <> 0 then
    if p_adjustment_category_id is null then
      raise exception 'reconciliation_difference_nonzero';
    end if;

    v_adjustment_kind := case
      when v_difference > 0 then 'income'::public.transaction_kind
      else 'expense'::public.transaction_kind
    end;

    select kind, is_archived
    into v_category_kind, v_category_archived
    from public.categories
    where id = p_adjustment_category_id
      and user_id = v_user_id;
    if v_category_kind is null
       or v_category_kind::text <> v_adjustment_kind::text then
      raise exception 'category_kind_mismatch';
    end if;
    if v_category_archived then
      raise exception 'category_archived';
    end if;
    if char_length(coalesce(p_adjustment_note, '')) > 500 then
      raise exception 'note_too_long';
    end if;
    if char_length(coalesce(p_adjustment_payee, '')) > 200 then
      raise exception 'payee_too_long';
    end if;

    -- Deterministic idempotency key: one adjustment per completion attempt.
    -- A reopened period that completes again has already logged a `completed`
    -- event, so the attempt count keeps a legitimate second adjustment from
    -- colliding with the first under unique (user_id, idempotency_key).
    select count(*) into v_prior_completions
    from public.account_reconciliation_events
    where user_id = v_user_id
      and reconciliation_id = p_reconciliation_id
      and kind = 'completed';

    insert into public.financial_transactions
      (user_id, kind, note, payee, occurred_on, idempotency_key)
    values
      (
        v_user_id,
        v_adjustment_kind,
        coalesce(
          nullif(btrim(p_adjustment_note), ''),
          'Điều chỉnh đối soát — sao kê '
            || to_char(v_statement_date, 'DD/MM/YYYY')
        ),
        btrim(coalesce(p_adjustment_payee, '')),
        v_statement_date,
        md5(
          p_reconciliation_id::text
          || ':reconcile-adjustment:'
          || v_prior_completions::text
        )::uuid
      )
    returning id into v_adjustment_transaction_id;

    insert into public.transaction_entries
      (transaction_id, user_id, account_id, category_id, amount_minor,
       reconciliation_state, cleared_at, reconciliation_id)
    values
      (
        v_adjustment_transaction_id,
        v_user_id,
        v_account_id,
        p_adjustment_category_id,
        v_difference,
        'reconciled',
        now(),
        p_reconciliation_id
      );

    select * into strict v_snapshot
    from public.reconciliation_snapshot_for_user(
      v_user_id,
      v_account_id,
      v_statement_date
    );

    if v_snapshot.cleared_balance_minor <> v_statement_balance then
      raise exception 'reconciliation_difference_nonzero';
    end if;
  end if;

  update public.transaction_entries entry
  set reconciliation_state = 'reconciled',
      reconciliation_id = p_reconciliation_id,
      cleared_at = coalesce(entry.cleared_at, now())
  from public.financial_transactions transaction_record
  where entry.transaction_id = transaction_record.id
    and entry.user_id = transaction_record.user_id
    and entry.user_id = v_user_id
    and entry.account_id = v_account_id
    and entry.reconciliation_state = 'cleared'
    and transaction_record.deleted_at is null
    and transaction_record.occurred_on <= v_statement_date;

  update public.account_reconciliations
  set status = 'completed',
      calculated_balance_minor = v_snapshot.cleared_balance_minor,
      pending_account_leg_count = v_snapshot.pending_account_leg_count,
      cleared_account_leg_count = 0,
      reconciled_account_leg_count =
        v_snapshot.reconciled_account_leg_count + v_snapshot.cleared_account_leg_count,
      completed_at = now()
  where id = p_reconciliation_id
    and user_id = v_user_id;

  insert into public.account_reconciliation_events (
    user_id,
    reconciliation_id,
    account_id,
    kind,
    statement_balance_minor,
    calculated_balance_minor,
    difference_minor
  )
  values (
    v_user_id,
    p_reconciliation_id,
    v_account_id,
    'completed',
    v_statement_balance,
    v_event_calculated,
    v_difference
  );

  return true;
end;
$$;

revoke all on function public.complete_account_reconciliation(uuid, uuid, text, text)
  from public, anon;
grant execute on function public.complete_account_reconciliation(uuid, uuid, text, text)
  to authenticated;
