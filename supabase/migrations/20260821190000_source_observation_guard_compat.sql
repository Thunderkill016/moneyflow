-- #440 review fix: keep durable approved source observations compatible with
-- archive reconstruction while preventing browser-side approval/evidence edits.
--
-- `restore_user_archive(jsonb)` inserts approved candidates before their
-- self-referential transfer_pair_id can exist, then fills that one field in a
-- privileged phase-two UPDATE. The source-observation guard must allow exactly
-- that reconstruction shape without granting the browser or service role a
-- general approved-row mutation path.

create or replace function public.guard_approved_inbox_candidate_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_archive_restore_owner name;
begin
  -- Browser-side persistence is allowed to insert pending/rejected observations,
  -- but an authenticated caller must never fabricate an already-approved row.
  -- Archive reconstruction runs under the SECURITY DEFINER owner and is therefore
  -- intentionally outside this browser-role block.
  if tg_op = 'INSERT' then
    if new.status = 'approved' and current_user = 'authenticated' then
      raise exception 'approved_candidate_evidence_immutable';
    end if;
    return new;
  end if;

  -- Normal authenticated approval is performed inside reviewed SECURITY DEFINER
  -- RPCs. A browser-role UPDATE must not fabricate an approved observation.
  if old.status <> 'approved'
    and new.status = 'approved'
    and current_user = 'authenticated' then
    raise exception 'approved_candidate_evidence_immutable';
  end if;

  if old.status = 'approved' then
    -- Import-batch deletion uses ON DELETE SET NULL, which PostgreSQL executes as
    -- an UPDATE on the referencing candidate. Permit only that FK cleanup shape.
    if old.import_batch_id is not null
      and new.import_batch_id is null
      and (
        to_jsonb(new) - array['import_batch_id', 'updated_at']::text[]
      ) = (
        to_jsonb(old) - array['import_batch_id', 'updated_at']::text[]
      ) then
      return new;
    end if;

    -- Archive restore's only approved-row repair is null -> non-null
    -- transfer_pair_id after every candidate exists. Match the current execution
    -- role to the actual restore function owner rather than trusting any broad
    -- privileged role such as service_role.
    select pg_catalog.pg_get_userbyid(proc.proowner)
      into v_archive_restore_owner
    from pg_catalog.pg_proc as proc
    where proc.oid = pg_catalog.to_regprocedure(
      'public.restore_user_archive(jsonb)'
    );

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

    raise exception 'approved_candidate_evidence_immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_approved_inbox_candidate_evidence()
from public, anon, authenticated, service_role;

drop trigger if exists inbox_candidates_guard_approved_evidence
on public.inbox_candidates;
create trigger inbox_candidates_guard_approved_evidence
before insert or update on public.inbox_candidates
for each row execute function public.guard_approved_inbox_candidate_evidence();
