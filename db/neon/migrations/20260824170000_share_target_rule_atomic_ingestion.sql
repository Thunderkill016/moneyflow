-- Share Target keeps source ingestion and deterministic-rule provenance in one
-- transaction. The original ingestion RPC remains available for callers that
-- intentionally do not supply rule evidence.

create or replace function public.ingest_share_target_capture_with_rules(
  p_batches jsonb,
  p_candidates jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_candidate jsonb;
  v_candidate_id uuid;
  v_rule_id uuid;
  v_rule_version integer;
  v_ordinality bigint;
  v_rule_id_text text;
  v_rule_version_text text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if jsonb_typeof(p_candidates) <> 'array' then
    raise exception 'invalid_share_payload';
  end if;

  -- This call validates and atomically writes every source batch/candidate.
  -- Any rule validation failure below rolls this nested write back as well.
  v_result := public.ingest_share_target_capture(p_batches, p_candidates);

  for v_candidate, v_ordinality in
    select value, ordinality
    from jsonb_array_elements(p_candidates) with ordinality
  loop
    v_rule_id_text := nullif(v_candidate ->> 'applied_rule_id', '');
    v_rule_version_text := nullif(v_candidate ->> 'applied_rule_version', '');

    if v_rule_id_text is null and v_rule_version_text is null then
      continue;
    end if;

    if v_rule_id_text is null or v_rule_version_text is null then
      raise exception 'invalid_share_rule_evidence';
    end if;

    begin
      v_rule_id := v_rule_id_text::uuid;
      v_rule_version := v_rule_version_text::integer;
    exception
      when others then raise exception 'invalid_share_rule_evidence';
    end;

    if v_rule_version < 1 then
      raise exception 'invalid_share_rule_evidence';
    end if;

    begin
      select value::uuid
      into v_candidate_id
      from jsonb_array_elements_text(v_result -> 'candidate_ids') with ordinality
      where ordinality = v_ordinality;
    exception
      when others then raise exception 'invalid_share_candidate';
    end;

    if v_candidate_id is null then
      raise exception 'invalid_share_candidate';
    end if;

    -- Existing rule ownership, status, category-kind and source-field matching
    -- checks remain the authority for the resulting normalized candidate.
    perform public.apply_inbox_rule_to_candidate(
      v_candidate_id,
      v_rule_id,
      v_rule_version
    );
  end loop;

  return v_result;
end;
$$;

revoke all on function public.ingest_share_target_capture_with_rules(jsonb, jsonb)
  from public, anon;
grant execute on function public.ingest_share_target_capture_with_rules(jsonb, jsonb)
  to authenticated;
