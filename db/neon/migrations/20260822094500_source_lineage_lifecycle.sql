-- #442: explicit source-supplied lineage and lifecycle evidence.
--
-- Different source IDs are related only when the candidate carries an explicit
-- predecessor id. Source lifecycle is evidence only: none of these fields may
-- mutate ledger values or reconciliation state automatically.

alter table public.inbox_candidates
  add column source_lifecycle_state text
    check (
      source_lifecycle_state is null
      or source_lifecycle_state in ('pending', 'posted', 'removed')
    ),
  add column source_predecessor_external_id text
    check (
      source_predecessor_external_id is null
      or char_length(source_predecessor_external_id) between 1 and 200
    ),
  add constraint inbox_candidates_source_lineage_shape_check check (
    (
      source <> 'manual'
      or (
        source_lifecycle_state is null
        and source_predecessor_external_id is null
      )
    )
    and (
      source_predecessor_external_id is null
      or (
        source_external_id is not null
        and source_predecessor_external_id <> source_external_id
      )
    )
  );

create index inbox_candidates_user_approved_source_identity_idx
  on public.inbox_candidates (
    user_id,
    source,
    source_external_id,
    approved_at desc,
    created_at desc,
    id desc
  )
  where status = 'approved'
    and approved_transaction_id is not null
    and source_external_id is not null;

-- Return the durable transaction identity and the source fingerprint baseline for
-- one source id. Only observation-only approvals are safe later-source baselines:
-- an ordinary financial approval may have changed amount/date/note and therefore
-- re-fingerprinted its candidate after canonical provenance was captured.
create or replace function public.resolve_inbox_source_identity(
  p_user_id uuid,
  p_source public.inbox_candidate_source,
  p_source_external_id text
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_transaction_id uuid;
  v_fingerprint_version smallint;
  v_fingerprint text;
  v_deleted_at timestamptz;
  v_candidate_id uuid;
begin
  if p_user_id is null or p_source_external_id is null then
    return null;
  end if;

  select
    candidate.approved_transaction_id,
    candidate.fingerprint_version,
    candidate.fingerprint,
    transaction_record.deleted_at,
    candidate.id
  into
    v_transaction_id,
    v_fingerprint_version,
    v_fingerprint,
    v_deleted_at,
    v_candidate_id
  from public.inbox_candidates candidate
  join public.financial_transactions transaction_record
    on transaction_record.id = candidate.approved_transaction_id
    and transaction_record.user_id = candidate.user_id
  where candidate.user_id = p_user_id
    and candidate.source = p_source
    and candidate.source_external_id = p_source_external_id
    and candidate.status = 'approved'
    and candidate.approved_transaction_id is not null
    and candidate.match_reason in (
      'source_external_id_changed_observation',
      'source_external_id_deleted_restore',
      'source_predecessor_observation'
    )
  order by candidate.approved_at desc nulls last, candidate.created_at desc, candidate.id desc
  limit 1;

  if v_transaction_id is not null then
    return jsonb_build_object(
      'transaction_id', v_transaction_id,
      'fingerprint_version', v_fingerprint_version,
      'fingerprint', v_fingerprint,
      'deleted_at', v_deleted_at,
      'basis', 'approved_observation',
      'candidate_id', v_candidate_id
    );
  end if;

  select
    provenance.transaction_id,
    provenance.fingerprint_version,
    provenance.fingerprint,
    transaction_record.deleted_at
  into
    v_transaction_id,
    v_fingerprint_version,
    v_fingerprint,
    v_deleted_at
  from public.transaction_import_provenance provenance
  join public.financial_transactions transaction_record
    on transaction_record.id = provenance.transaction_id
    and transaction_record.user_id = provenance.user_id
  where provenance.user_id = p_user_id
    and provenance.source = p_source
    and provenance.source_external_id = p_source_external_id
  order by provenance.created_at, provenance.transaction_id
  limit 1;

  if v_transaction_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'transaction_id', v_transaction_id,
    'fingerprint_version', v_fingerprint_version,
    'fingerprint', v_fingerprint,
    'deleted_at', v_deleted_at,
    'basis', 'canonical_provenance'
  );
end;
$$;

revoke all on function public.resolve_inbox_source_identity(
  uuid, public.inbox_candidate_source, text
) from public, anon, authenticated, service_role;

-- Candidate approval is one side of the durable source-id consistency invariant.
-- The advisory lock makes the check safe under concurrent reviewed operations:
-- the same tenant/source/id may have many observations, but all approved ones
-- must resolve to one financial transaction.
create or replace function public.guard_approved_inbox_candidate_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_archive_restore_owner name;
  v_archive_lineage_mode text;
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

    raise exception 'approved_candidate_evidence_immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_approved_inbox_candidate_evidence()
from public, anon, authenticated, service_role;

-- Canonical provenance is the other side of the identity invariant. Archive
-- restore writes candidates before provenance, while live approval writes
-- provenance before marking the candidate approved, so both directions need a
-- guard to close the race/order gap.
create or replace function public.guard_transaction_import_provenance_source_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source_external_id is null then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.user_id::text || '|' || new.source::text || '|' || new.source_external_id,
      442
    )
  );

  if exists (
    select 1
    from public.inbox_candidates candidate
    where candidate.user_id = new.user_id
      and candidate.source = new.source
      and candidate.source_external_id = new.source_external_id
      and candidate.status = 'approved'
      and candidate.approved_transaction_id is not null
      and candidate.approved_transaction_id <> new.transaction_id
  ) or exists (
    select 1
    from public.transaction_import_provenance provenance
    where provenance.user_id = new.user_id
      and provenance.transaction_id <> new.transaction_id
      and provenance.source = new.source
      and provenance.source_external_id = new.source_external_id
  ) then
    raise exception 'source_identity_conflict';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_transaction_import_provenance_source_identity()
from public, anon, authenticated, service_role;

drop trigger if exists transaction_import_provenance_guard_source_identity
on public.transaction_import_provenance;
create trigger transaction_import_provenance_guard_source_identity
before insert or update of user_id, transaction_id, source, source_external_id
on public.transaction_import_provenance
for each row execute function public.guard_transaction_import_provenance_source_identity();

-- Preserve the full existing planning pipeline behind a source-identity wrapper.
alter function public.plan_inbox_candidate(uuid)
  rename to plan_inbox_candidate_pre_source_lineage;
revoke all on function public.plan_inbox_candidate_pre_source_lineage(uuid)
from public, anon, authenticated;

create or replace function public.plan_inbox_candidate(p_candidate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_identity jsonb;
  v_transaction_id uuid;
  v_source_fingerprint_version smallint;
  v_source_fingerprint text;
  v_deleted_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select * into v_candidate
  from public.inbox_candidates
  where id = p_candidate_id
    and user_id = v_user_id;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.approved_transaction_id is not null then
    return jsonb_build_object(
      'status', 'duplicate',
      'reason', 'already_approved',
      'confidence', 1,
      'matched_transaction_id', v_candidate.approved_transaction_id
    );
  end if;

  if v_candidate.status <> 'pending' then
    return jsonb_build_object(
      'status', 'invalid',
      'reason', 'candidate_not_pending',
      'confidence', 1
    );
  end if;

  if v_candidate.source_external_id is not null then
    v_identity := public.resolve_inbox_source_identity(
      v_user_id,
      v_candidate.source,
      v_candidate.source_external_id
    );

    if v_identity is not null then
      v_transaction_id := nullif(v_identity ->> 'transaction_id', '')::uuid;
      v_source_fingerprint_version := nullif(
        v_identity ->> 'fingerprint_version', ''
      )::smallint;
      v_source_fingerprint := v_identity ->> 'fingerprint';
      v_deleted_at := nullif(v_identity ->> 'deleted_at', '')::timestamptz;

      if v_deleted_at is not null then
        if v_candidate.fingerprint is not null
          and v_source_fingerprint is not null
          and v_candidate.fingerprint_version = v_source_fingerprint_version
          and v_candidate.fingerprint = v_source_fingerprint then
          return jsonb_build_object(
            'status', 'duplicate',
            'reason', 'source_external_id_deleted_match',
            'confidence', 1,
            'matched_transaction_id', v_transaction_id
          );
        end if;

        return jsonb_build_object(
          'status', 'duplicate',
          'reason', 'source_external_id_deleted_changed',
          'confidence', 1,
          'matched_transaction_id', v_transaction_id
        );
      end if;

      if v_candidate.fingerprint is not null
        and v_source_fingerprint is not null
        and v_candidate.fingerprint_version = v_source_fingerprint_version
        and v_candidate.fingerprint = v_source_fingerprint then
        return jsonb_build_object(
          'status', 'duplicate',
          'reason', 'source_external_id_match',
          'confidence', 1,
          'matched_transaction_id', v_transaction_id
        );
      end if;

      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'source_external_id_changed',
        'confidence', 1,
        'matched_transaction_id', v_transaction_id
      );
    end if;
  end if;

  if v_candidate.source_predecessor_external_id is not null then
    v_identity := public.resolve_inbox_source_identity(
      v_user_id,
      v_candidate.source,
      v_candidate.source_predecessor_external_id
    );

    if v_identity is not null then
      v_transaction_id := nullif(v_identity ->> 'transaction_id', '')::uuid;
      v_deleted_at := nullif(v_identity ->> 'deleted_at', '')::timestamptz;

      if v_deleted_at is not null then
        return jsonb_build_object(
          'status', 'duplicate',
          'reason', 'source_predecessor_deleted_match',
          'confidence', 1,
          'matched_transaction_id', v_transaction_id
        );
      end if;

      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'source_predecessor_match',
        'confidence', 1,
        'matched_transaction_id', v_transaction_id
      );
    end if;
  end if;

  if v_candidate.source_lifecycle_state = 'removed' then
    return jsonb_build_object(
      'status', 'invalid',
      'reason', 'source_removed_unmatched',
      'confidence', 1
    );
  end if;

  return public.plan_inbox_candidate_pre_source_lineage(p_candidate_id);
end;
$$;

revoke all on function public.plan_inbox_candidate(uuid) from public, anon;
grant execute on function public.plan_inbox_candidate(uuid) to authenticated;

-- Same-ID changed observations now resolve through durable observation aliases as
-- well as canonical provenance. This also makes a replay of a previously reviewed
-- source revision compare against the latest approved source evidence.
create or replace function public.record_changed_source_observation_from_candidate(
  p_candidate_id uuid,
  p_transaction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_target public.financial_transactions%rowtype;
  v_identity jsonb;
  v_plan jsonb;
  v_source_fingerprint_version smallint;
  v_source_fingerprint text;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select * into v_candidate
  from public.inbox_candidates
  where id = p_candidate_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.approved_transaction_id is not null then
    if v_candidate.approved_transaction_id = p_transaction_id
      and v_candidate.status = 'approved'
      and v_candidate.match_reason = 'source_external_id_changed_observation' then
      return p_transaction_id;
    end if;
    raise exception 'candidate_already_approved';
  end if;

  if v_candidate.status <> 'pending' then
    raise exception 'candidate_not_pending';
  end if;

  if v_candidate.source = 'manual' or v_candidate.source_external_id is null then
    raise exception 'candidate_not_source_observation';
  end if;

  v_identity := public.resolve_inbox_source_identity(
    v_user_id,
    v_candidate.source,
    v_candidate.source_external_id
  );

  if v_identity is null
    or nullif(v_identity ->> 'transaction_id', '')::uuid <> p_transaction_id then
    raise exception 'source_provenance_not_found';
  end if;

  v_source_fingerprint_version := nullif(
    v_identity ->> 'fingerprint_version', ''
  )::smallint;
  v_source_fingerprint := v_identity ->> 'fingerprint';

  select * into v_target
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'transaction_not_found';
  end if;

  if v_target.deleted_at is not null then
    raise exception 'transaction_deleted';
  end if;

  if v_candidate.fingerprint is not null
    and v_source_fingerprint is not null
    and v_candidate.fingerprint_version = v_source_fingerprint_version
    and v_candidate.fingerprint = v_source_fingerprint then
    raise exception 'source_observation_unchanged';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);

  if (v_plan ->> 'status') <> 'duplicate'
    or (v_plan ->> 'reason') <> 'source_external_id_changed'
    or nullif(v_plan ->> 'matched_transaction_id', '')::uuid <> p_transaction_id then
    raise exception 'changed_source_match_required';
  end if;

  update public.inbox_candidates
  set match_status = 'duplicate',
      match_reason = 'source_external_id_changed_observation',
      match_confidence = 1,
      status = 'approved',
      approved_transaction_id = p_transaction_id,
      approved_at = now()
  where id = v_candidate.id
    and user_id = v_user_id;

  return p_transaction_id;
end;
$$;

revoke all on function public.record_changed_source_observation_from_candidate(uuid, uuid)
from public, anon;
grant execute on function public.record_changed_source_observation_from_candidate(uuid, uuid)
to authenticated;

-- Exact source aliases that already resolve to a deleted transaction keep the
-- existing explicit restore semantics. The comparison baseline is the latest
-- durable observation for the id, not necessarily the original canonical id.
create or replace function public.restore_deleted_imported_transaction_from_candidate(
  p_candidate_id uuid,
  p_transaction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_target public.financial_transactions%rowtype;
  v_identity jsonb;
  v_plan jsonb;
  v_source_fingerprint_version smallint;
  v_source_fingerprint text;
  v_affected integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select * into v_candidate
  from public.inbox_candidates
  where id = p_candidate_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.approved_transaction_id is not null then
    if v_candidate.approved_transaction_id = p_transaction_id
      and v_candidate.status = 'approved'
      and v_candidate.match_reason = 'source_external_id_deleted_restore' then
      return p_transaction_id;
    end if;
    raise exception 'candidate_already_approved';
  end if;

  if v_candidate.status <> 'pending' then
    raise exception 'candidate_not_pending';
  end if;

  if v_candidate.source = 'manual' or v_candidate.source_external_id is null then
    raise exception 'candidate_not_restoreable';
  end if;

  v_identity := public.resolve_inbox_source_identity(
    v_user_id,
    v_candidate.source,
    v_candidate.source_external_id
  );

  if v_identity is null
    or nullif(v_identity ->> 'transaction_id', '')::uuid <> p_transaction_id then
    raise exception 'source_provenance_not_found';
  end if;

  v_source_fingerprint_version := nullif(
    v_identity ->> 'fingerprint_version', ''
  )::smallint;
  v_source_fingerprint := v_identity ->> 'fingerprint';

  select * into v_target
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'transaction_not_found';
  end if;

  if v_target.deleted_at is null then
    raise exception 'transaction_not_deleted';
  end if;

  if v_candidate.fingerprint is null
    or v_source_fingerprint is null
    or v_candidate.fingerprint_version is distinct from v_source_fingerprint_version
    or v_candidate.fingerprint is distinct from v_source_fingerprint then
    raise exception 'source_observation_changed';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);

  if (v_plan ->> 'reason') = 'source_external_id_deleted_changed' then
    raise exception 'source_observation_changed';
  end if;

  if (v_plan ->> 'status') <> 'duplicate'
    or (v_plan ->> 'reason') <> 'source_external_id_deleted_match'
    or nullif(v_plan ->> 'matched_transaction_id', '')::uuid <> p_transaction_id then
    raise exception 'deleted_source_match_required';
  end if;

  update public.financial_transactions
  set deleted_at = null
  where id = p_transaction_id
    and user_id = v_user_id
    and deleted_at is not null;

  get diagnostics v_affected = row_count;
  if v_affected <> 1 then
    raise exception 'transaction_restore_race';
  end if;

  update public.inbox_candidates
  set match_status = 'duplicate',
      match_reason = 'source_external_id_deleted_restore',
      match_confidence = 1,
      status = 'approved',
      approved_transaction_id = p_transaction_id,
      approved_at = now()
  where id = v_candidate.id
    and user_id = v_user_id;

  return p_transaction_id;
end;
$$;

revoke all on function public.restore_deleted_imported_transaction_from_candidate(uuid, uuid)
from public, anon;
grant execute on function public.restore_deleted_imported_transaction_from_candidate(uuid, uuid)
to authenticated;

create or replace function public.record_source_replacement_observation_from_candidate(
  p_candidate_id uuid,
  p_transaction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_target public.financial_transactions%rowtype;
  v_plan jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select * into v_candidate
  from public.inbox_candidates
  where id = p_candidate_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;

  if v_candidate.approved_transaction_id is not null then
    if v_candidate.approved_transaction_id = p_transaction_id
      and v_candidate.status = 'approved'
      and v_candidate.match_reason = 'source_predecessor_observation' then
      return p_transaction_id;
    end if;
    raise exception 'candidate_already_approved';
  end if;

  if v_candidate.status <> 'pending' then
    raise exception 'candidate_not_pending';
  end if;

  if v_candidate.source = 'manual'
    or v_candidate.source_external_id is null
    or v_candidate.source_predecessor_external_id is null
    or v_candidate.source_predecessor_external_id = v_candidate.source_external_id then
    raise exception 'candidate_not_source_replacement';
  end if;

  select * into v_target
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'transaction_not_found';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);

  if v_target.deleted_at is not null
    or (v_plan ->> 'status') <> 'duplicate'
    or (v_plan ->> 'reason') <> 'source_predecessor_match'
    or nullif(v_plan ->> 'matched_transaction_id', '')::uuid <> p_transaction_id then
    raise exception 'source_predecessor_match_required';
  end if;

  update public.inbox_candidates
  set match_status = 'duplicate',
      match_reason = 'source_predecessor_observation',
      match_confidence = 1,
      status = 'approved',
      approved_transaction_id = p_transaction_id,
      approved_at = now()
  where id = v_candidate.id
    and user_id = v_user_id;

  return p_transaction_id;
end;
$$;

revoke all on function public.record_source_replacement_observation_from_candidate(uuid, uuid)
from public, anon;
grant execute on function public.record_source_replacement_observation_from_candidate(uuid, uuid)
to authenticated;

-- Wrap the existing full financial approval function rather than copying its
-- accounting logic. The historical function remains owner-callable only; direct
-- authenticated callers cannot bypass this new hard-source preflight.
alter function public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean
) rename to approve_inbox_candidate_pre_source_lineage;
revoke all on function public.approve_inbox_candidate_pre_source_lineage(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean
) from public, anon, authenticated;

create or replace function public.approve_inbox_candidate(
  p_candidate_id uuid,
  p_kind public.transaction_kind,
  p_account_id uuid,
  p_category_id uuid,
  p_destination_account_id uuid,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text,
  p_idempotency_key uuid,
  p_allow_heuristic_duplicate boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan jsonb;
  v_reason text;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);
  v_reason := v_plan ->> 'reason';

  if (v_plan ->> 'status') = 'duplicate'
    and v_reason in (
      'source_external_id_match',
      'source_external_id_changed',
      'source_external_id_deleted_match',
      'source_external_id_deleted_changed',
      'source_predecessor_match',
      'source_predecessor_deleted_match'
    ) then
    raise exception 'source_external_id_duplicate';
  end if;

  return public.approve_inbox_candidate_pre_source_lineage(
    p_candidate_id,
    p_kind,
    p_account_id,
    p_category_id,
    p_destination_account_id,
    p_amount_minor,
    p_occurred_on,
    p_note,
    p_idempotency_key,
    p_allow_heuristic_duplicate
  );
end;
$$;

revoke all on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean
) from public, anon;
grant execute on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean
) to authenticated;
