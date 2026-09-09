-- MON-63: first-party, privacy-safe maintenance measurement on existing import batches.
-- Counters intentionally contain no amounts, descriptions, source IDs, account IDs,
-- raw statement data or credentials. Financial commit correctness never depends on them.

alter table public.import_batches
  add column commit_attempt_count integer not null default 0
    check (commit_attempt_count >= 0 and commit_attempt_count <= 1000000),
  add column commit_replay_count integer not null default 0
    check (commit_replay_count >= 0 and commit_replay_count <= 1000000),
  add constraint import_batches_replay_not_over_attempts
    check (commit_replay_count <= commit_attempt_count);

create or replace function public.record_import_batch_measurement(
  p_batch_id uuid,
  p_event text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt_count integer;
  v_replay_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if p_batch_id is null or p_event not in ('commit_attempt', 'commit_replay') then
    raise exception 'invalid_import_measurement';
  end if;

  if p_event = 'commit_attempt' then
    update public.import_batches batch_record
    set commit_attempt_count = batch_record.commit_attempt_count + 1
    where batch_record.id = p_batch_id
      and batch_record.user_id = v_user_id
    returning batch_record.commit_attempt_count, batch_record.commit_replay_count
      into v_attempt_count, v_replay_count;
  else
    update public.import_batches batch_record
    set commit_replay_count = batch_record.commit_replay_count + 1
    where batch_record.id = p_batch_id
      and batch_record.user_id = v_user_id
      and batch_record.commit_replay_count < batch_record.commit_attempt_count
    returning batch_record.commit_attempt_count, batch_record.commit_replay_count
      into v_attempt_count, v_replay_count;
  end if;

  if not found then
    raise exception 'import_batch_measurement_not_recorded';
  end if;

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'event', p_event,
    'commit_attempt_count', v_attempt_count,
    'commit_replay_count', v_replay_count
  );
end;
$$;

revoke all on function public.record_import_batch_measurement(uuid, text)
  from public, anon, service_role;
grant execute on function public.record_import_batch_measurement(uuid, text)
  to authenticated;
