-- D21: delete_transactions_before — scoped retention purge ("delete history
-- before [date]", Monarch 1.12 adapted to MoneyFlow's provenance model).
--
-- Retention control is the deliberate opposite of the trash contract: the
-- user asks for old history to be GONE, so matched rows are hard-deleted —
-- live and already-trashed alike — behind the app's typed-XÓA confirmation.
-- Nothing lands in the trash; there is no restore.
--
-- Source scoping. A posted row's origin lives on
-- transaction_import_provenance (one row per imported/captured
-- transaction; absent for direct writes). Buckets:
--   'manual'        no provenance row, or provenance.source = 'manual'
--                   (typed entry: capture form, transfers, reconciliation
--                   adjustments, archive restores, web quick-capture).
--   'notification'  provenance.source = 'notification' (bank-SMS /
--                   notification capture approved from the inbox).
--   'import'        provenance.source in
--                   ('csv','xlsx','pdf','paste','email','agent') — every
--                   remaining machine-ingested channel.
-- A provenance source not yet in any bucket fails closed: it matches no
-- scope and is never swept.
--
-- Linked rows are never destroyed: a transaction still referenced by a
-- commitment occurrence, income-template occurrence or debt repayment is
-- skipped and reported in `locked` — the same refusal
-- soft_delete_money_transaction applies, kept honest in bulk instead of
-- failing the whole sweep.
--
-- Guard extension (two reviewed changes in one boundary):
--
-- 1) guard_approved_inbox_candidate_evidence gains a fourth allowed UPDATE
--    shape: `approved_transaction_id` nonnull -> null, nothing else
--    changed, only while a transaction-local marker is set and the caller
--    is this migration's purge-function owner. The candidate row itself
--    stays — it is the import history — matching the long-standing intent
--    in permanently_delete_money_transaction's comment.
--
-- 2) permanently_delete_money_transaction is re-created to set that
--    marker before its candidate unlink. This fixes a live defect: every
--    approved-candidate UPDATE that is not one of the three whitelisted
--    shapes raises approved_candidate_evidence_immutable, so a trashed
--    transaction that had come through the inbox could NEVER be
--    permanently deleted (the unlink threw, aborting the whole call).
--    Only manual-capture rows were purgeable until now.
--
-- financial_mutation_audit_events intentionally survives a purge: it
-- stores only structural metadata (entity ids, action kinds — no amounts,
-- notes or labels) and its entity ids are deliberately not FK'd.
--
-- The purge id set is materialized once into an array so every
-- DELETE/UPDATE in the sweep sees the same picked rows instead of
-- re-evaluating the scope under a fresh statement snapshot.

-- The guard stays SECURITY INVOKER: `current_user` inside it must reflect the
-- caller's context — 'authenticated' for direct browser writes, or the owning
-- role while inside a reviewed SECURITY DEFINER function. All four allowed
-- shapes (and the two authenticated-role refusals above) depend on that.
create or replace function public.guard_approved_inbox_candidate_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_archive_restore_owner name;
  v_archive_lineage_mode text;
  v_purge_owner name;
begin
  -- Browser-side persistence may insert pending/rejected observations, but only
  -- reviewed SECURITY DEFINER operations may create approved source evidence.
  if tg_op = 'INSERT'
    and new.status = 'approved'
    and current_user = 'authenticated' then
    raise exception 'approved_candidate_evidence_immutable';
  end if;

  if tg_op = 'UPDATE'
    and old.status <> 'approved'
    and new.status = 'approved'
    and current_user = 'authenticated' then
    raise exception 'approved_candidate_evidence_immutable';
  end if;

  if new.status = 'approved'
    and new.approved_transaction_id is not null
    and new.source_external_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        new.user_id::text || '|' || new.source::text || '|' || new.source_external_id,
        442
      )
    );

    if exists (
      select 1
      from public.transaction_import_provenance provenance
      where provenance.user_id = new.user_id
        and provenance.source = new.source
        and provenance.source_external_id = new.source_external_id
        and provenance.transaction_id <> new.approved_transaction_id
    ) or exists (
      select 1
      from public.inbox_candidates candidate
      where candidate.user_id = new.user_id
        and candidate.id <> new.id
        and candidate.source = new.source
        and candidate.source_external_id = new.source_external_id
        and candidate.status = 'approved'
        and candidate.approved_transaction_id is not null
        and candidate.approved_transaction_id <> new.approved_transaction_id
    ) then
      raise exception 'source_identity_conflict';
    end if;
  end if;

  if tg_op = 'INSERT' then
    return new;
  end if;

  if old.status = 'approved' then
    -- Import-batch deletion uses ON DELETE SET NULL. Permit exactly that FK
    -- cleanup shape and nothing else.
    if old.import_batch_id is not null
      and new.import_batch_id is null
      and (
        to_jsonb(new) - array['import_batch_id', 'updated_at']::text[]
      ) = (
        to_jsonb(old) - array['import_batch_id', 'updated_at']::text[]
      ) then
      return new;
    end if;

    select pg_catalog.pg_get_userbyid(proc.proowner)
      into v_archive_restore_owner
    from pg_catalog.pg_proc as proc
    where proc.oid = pg_catalog.to_regprocedure('public.restore_user_archive(jsonb)');

    -- Legacy archive restore repairs transfer_pair_id after all candidates exist.
    if v_archive_restore_owner is not null
      and current_user = v_archive_restore_owner
      and old.transfer_pair_id is null
      and new.transfer_pair_id is not null
      and (
        to_jsonb(new) - array['transfer_pair_id', 'updated_at']::text[]
      ) = (
        to_jsonb(old) - array['transfer_pair_id', 'updated_at']::text[]
      ) then
      return new;
    end if;

    -- #442 archive wrapper restores the two new observation fields only after the
    -- legacy restore has reconstructed the candidate row. Require both the
    -- actual restore-function owner and a transaction-local marker set by that
    -- wrapper, then require every other approved-evidence field to be identical.
    v_archive_lineage_mode := pg_catalog.current_setting(
      'moneyflow.archive_restore_source_lineage', true
    );
    if v_archive_restore_owner is not null
      and current_user = v_archive_restore_owner
      and v_archive_lineage_mode = 'on'
      and (
        to_jsonb(new) - array[
          'source_lifecycle_state',
          'source_predecessor_external_id',
          'updated_at'
        ]::text[]
      ) = (
        to_jsonb(old) - array[
          'source_lifecycle_state',
          'source_predecessor_external_id',
          'updated_at'
        ]::text[]
      ) then
      return new;
    end if;

    -- D21 reviewed purge release: a retention sweep (delete_transactions_
    -- before / permanently_delete_money_transaction) must release the
    -- approval link before destroying the transaction — the FK is
    -- on delete restrict. Allowed only while the transaction-local
    -- `moneyflow.transaction_purge` marker is set (the reviewed purge
    -- functions are the only writers), under the purge function's owner,
    -- and only when the single change is approved_transaction_id
    -- nonnull -> null. The candidate row itself is never touched.
    select pg_catalog.pg_get_userbyid(proc.proowner)
      into v_purge_owner
    from pg_catalog.pg_proc as proc
    where proc.oid = pg_catalog.to_regprocedure(
      'public.delete_transactions_before(date,text[])'
    );
    if v_purge_owner is not null
      and current_user = v_purge_owner
      and pg_catalog.current_setting('moneyflow.transaction_purge', true) = 'on'
      and old.approved_transaction_id is not null
      and new.approved_transaction_id is null
      and (
        to_jsonb(new) - array['approved_transaction_id', 'updated_at']::text[]
      ) = (
        to_jsonb(old) - array['approved_transaction_id', 'updated_at']::text[]
      ) then
      return new;
    end if;

    raise exception 'approved_candidate_evidence_immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_approved_inbox_candidate_evidence()
from public, anon, authenticated, service_role;

-- Re-created verbatim from 20261015100000 plus the transaction-local purge
-- marker before the candidate unlink — see the header for the fixed defect.
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
  -- link to the transaction being destroyed. The marker is transaction-
  -- local — the approved-evidence guard admits exactly this field-only
  -- shape and nothing else.
  perform pg_catalog.set_config('moneyflow.transaction_purge', 'on', true);
  update public.inbox_candidates
  set approved_transaction_id = null
  where approved_transaction_id = p_transaction_id
    and user_id = auth.uid();
  perform pg_catalog.set_config('moneyflow.transaction_purge', 'off', true);

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

create or replace function public.delete_transactions_before(
  p_before date,
  p_sources text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ids uuid[];
  v_locked bigint;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_before is null then raise exception 'invalid_date'; end if;
  if p_sources is null or cardinality(p_sources) = 0 then
    raise exception 'empty_source_scope';
  end if;
  if exists (
    select 1 from unnest(p_sources) as s
    where s not in ('manual', 'notification', 'import')
  ) then
    raise exception 'invalid_source_scope';
  end if;

  -- Pick the sweep set once. `scope` buckets provenance; `locked` marks
  -- rows a schedule or debt still owns.
  with scoped as (
    select
      t.id,
      case
        when p.source is null or p.source = 'manual' then 'manual'
        when p.source = 'notification' then 'notification'
        when p.source in ('csv', 'xlsx', 'pdf', 'paste', 'email', 'agent')
          then 'import'
        else null
      end as scope,
      (
        exists (
          select 1 from public.commitment_occurrences co
          where co.transaction_id = t.id and co.user_id = v_user_id
        )
        or exists (
          select 1 from public.income_template_occurrences io
          where io.transaction_id = t.id and io.user_id = v_user_id
        )
        or exists (
          select 1 from public.debt_repayments dr
          where dr.transaction_id = t.id and dr.user_id = v_user_id
        )
      ) as locked
    from public.financial_transactions t
    left join public.transaction_import_provenance p
      on p.transaction_id = t.id and p.user_id = v_user_id
    where t.user_id = v_user_id
      and t.occurred_on < p_before
  )
  select
    coalesce(array_agg(id) filter (where not locked), '{}'::uuid[]),
    count(*) filter (where locked)
  into v_ids, v_locked
  from scoped
  where scope = any(p_sources);

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return jsonb_build_object(
      'deleted', 0, 'locked', v_locked,
      'before', p_before, 'sources', to_jsonb(p_sources)
    );
  end if;

  -- Dependency order — every FK on financial_transactions is
  -- on delete restrict, so children and links go first.
  delete from public.transaction_import_provenance
  where user_id = v_user_id and transaction_id = any(v_ids);

  -- Release approval links only — the candidate rows themselves are the
  -- import history and stay. The marker is transaction-local so the
  -- guard admits exactly this field-only shape and nothing else.
  perform pg_catalog.set_config('moneyflow.transaction_purge', 'on', true);
  update public.inbox_candidates
  set approved_transaction_id = null
  where user_id = v_user_id and approved_transaction_id = any(v_ids);
  perform pg_catalog.set_config('moneyflow.transaction_purge', 'off', true);

  delete from public.transaction_entries
  where user_id = v_user_id and transaction_id = any(v_ids);

  delete from public.financial_transactions
  where user_id = v_user_id and id = any(v_ids);

  return jsonb_build_object(
    'deleted', coalesce(array_length(v_ids, 1), 0),
    'locked', v_locked,
    'before', p_before,
    'sources', to_jsonb(p_sources)
  );
end;
$$;

revoke all on function public.delete_transactions_before(date, text[])
  from public, anon;
grant execute on function public.delete_transactions_before(date, text[])
  to authenticated;
