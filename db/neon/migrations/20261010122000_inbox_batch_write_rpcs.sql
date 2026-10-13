-- Inbox + import-batch write RPCs (Neon RPC-only write path).
--
-- Same boundary as 20261010120000: hosted Neon's managed `authenticated` role
-- cannot resolve auth.uid()/auth.jwt(), so direct table writes fail 42501 and
-- every write goes through reviewed SECURITY DEFINER RPCs whose own
-- user_id = auth.uid() predicates are the tenant boundary.
--
-- Candidate writes never accept a client-supplied status or approval fields:
-- pending/rejected observations are the only shape a browser may persist, and
-- approval stays inside the reviewed approve_inbox_candidate* RPCs. The
-- guard_approved_inbox_candidate_evidence trigger keys on
-- current_user = 'authenticated' — inside SECURITY DEFINER it sees the owner,
-- so the status whitelists below are the *only* thing stopping a caller from
-- fabricating approved evidence. That is why status is hardcoded 'pending' on
-- create and absent from the update whitelist.

create or replace function public.create_inbox_candidates(
  p_candidates jsonb
)
returns setof public.inbox_candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
  v_item jsonb;
  v_id uuid;
  v_kind public.transaction_kind;
  v_amount bigint;
  v_merchant text;
  v_note text;
  v_occurred_on date;
  v_source public.inbox_candidate_source;
  v_confidence public.inbox_candidate_confidence;
  v_ids uuid[] := '{}';
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_candidates is null
    or jsonb_typeof(p_candidates) <> 'array'
    or jsonb_array_length(p_candidates) = 0 then
    raise exception 'invalid_candidates_payload';
  end if;
  v_count := jsonb_array_length(p_candidates);
  -- Server bound mirrors createInboxCandidatesAction (500 per call).
  if v_count > 500 then raise exception 'too_many_candidates'; end if;

  for v_item in select value from jsonb_array_elements(p_candidates) as value
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'invalid_candidate_item';
    end if;

    -- kind --------------------------------------------------------------
    if v_item ->> 'kind' is null
      or v_item ->> 'kind' not in ('income', 'expense', 'transfer') then
      raise exception 'invalid_candidate_kind';
    end if;
    v_kind := (v_item ->> 'kind')::public.transaction_kind;

    -- amount_minor: integer đồng only — web is z.number().int(); gate the
    -- digit shape first because ::bigint would silently round '5.5'.
    if v_item ->> 'amount_minor' is null
      or (v_item ->> 'amount_minor')::text !~ '^\d+$' then
      raise exception 'invalid_candidate_amount';
    end if;
    begin
      v_amount := (v_item ->> 'amount_minor')::bigint;
    exception when others then
      raise exception 'invalid_candidate_amount';
    end;
    if v_amount is null or v_amount <= 0 or v_amount > 9007199254740991 then
      raise exception 'invalid_candidate_amount';
    end if;

    -- merchant -----------------------------------------------------------
    v_merchant := btrim(coalesce(v_item ->> 'merchant', ''));
    if char_length(v_merchant) not between 1 and 200 then
      raise exception 'invalid_candidate_merchant';
    end if;

    -- note ---------------------------------------------------------------
    -- zod trims before max(500); mirror so a padded value is judged the same.
    v_note := btrim(coalesce(v_item ->> 'note', ''));
    if char_length(v_note) > 500 then
      raise exception 'invalid_candidate_note';
    end if;

    -- occurred_on ---------------------------------------------------------
    -- Web accepts only ISO dateSchema (^\d{4}-\d{2}-\d{2}$); gate before the
    -- cast so locale-style strings are rejected identically.
    if v_item ->> 'occurred_on' is null
      or v_item ->> 'occurred_on' !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'invalid_candidate_date';
    end if;
    begin
      v_occurred_on := (v_item ->> 'occurred_on')::date;
    exception when others then
      raise exception 'invalid_candidate_date';
    end;

    -- source -------------------------------------------------------------
    if v_item ->> 'source' is null
      or v_item ->> 'source' not in
        ('paste', 'csv', 'xlsx', 'pdf', 'manual', 'notification', 'email', 'agent') then
      raise exception 'invalid_candidate_source';
    end if;
    v_source := (v_item ->> 'source')::public.inbox_candidate_source;

    -- confidence ----------------------------------------------------------
    if v_item ->> 'confidence' is null
      or v_item ->> 'confidence' not in ('high', 'medium', 'low') then
      raise exception 'invalid_candidate_confidence';
    end if;
    v_confidence := (v_item ->> 'confidence')::public.inbox_candidate_confidence;

    -- Optional fields are validated against the same bounds as the column
    -- checks; composite (id, user_id) foreign keys still enforce own-tenant
    -- category/account/batch references when supplied.
    if v_item ? 'source_row_index'
      and (
        v_item ->> 'source_row_index' is null
        or (v_item ->> 'source_row_index') !~ '^\d+$'
      ) then
      raise exception 'invalid_candidate_source_row_index';
    end if;
    if v_item ? 'source_external_id'
      and char_length(coalesce(v_item ->> 'source_external_id', '')) not between 1 and 200 then
      raise exception 'invalid_candidate_source_external_id';
    end if;
    if v_item ? 'source_lifecycle_state'
      and coalesce(v_item ->> 'source_lifecycle_state', '') not in ('pending', 'posted', 'removed') then
      raise exception 'invalid_candidate_source_lifecycle';
    end if;
    if v_item ? 'source_predecessor_external_id'
      and char_length(coalesce(v_item ->> 'source_predecessor_external_id', '')) not between 1 and 200 then
      raise exception 'invalid_candidate_source_predecessor';
    end if;
    -- inbox_candidates_source_lineage_shape_check + the web superRefine,
    -- raised as RPC codes: manual rows carry no lineage, any lineage field
    -- requires source_external_id, and a predecessor must differ from it.
    if v_source = 'manual'
      and (
        v_item ->> 'source_lifecycle_state' is not null
        or v_item ->> 'source_predecessor_external_id' is not null
      ) then
      raise exception 'invalid_candidate_source_lifecycle';
    end if;
    if (
        v_item ->> 'source_lifecycle_state' is not null
        or v_item ->> 'source_predecessor_external_id' is not null
      )
      and v_item ->> 'source_external_id' is null then
      raise exception 'invalid_candidate_source_external_id';
    end if;
    if v_item ->> 'source_predecessor_external_id' is not null
      and v_item ->> 'source_external_id' = v_item ->> 'source_predecessor_external_id'
    then
      raise exception 'invalid_candidate_source_predecessor';
    end if;
    if v_item ? 'parser_version'
      and char_length(coalesce(v_item ->> 'parser_version', '')) not between 1 and 80 then
      raise exception 'invalid_candidate_parser_version';
    end if;
    if v_item ? 'mapping_version' then
      if v_item ->> 'mapping_version' is null
        or (v_item ->> 'mapping_version') !~ '^\d+$' then
        raise exception 'invalid_candidate_mapping_version';
      end if;
      if (v_item ->> 'mapping_version')::integer < 1 then
        raise exception 'invalid_candidate_mapping_version';
      end if;
    end if;
    if v_item ? 'category_name'
      and char_length(coalesce(v_item ->> 'category_name', '')) > 60 then
      raise exception 'invalid_candidate_category_name';
    end if;
    if v_item ? 'account_name'
      and char_length(coalesce(v_item ->> 'account_name', '')) > 80 then
      raise exception 'invalid_candidate_account_name';
    end if;
    if v_item ? 'raw_snippet'
      and char_length(coalesce(v_item ->> 'raw_snippet', '')) > 2000 then
      raise exception 'invalid_candidate_raw_snippet';
    end if;
    if v_item ? 'created_at'
      and v_item ->> 'created_at' is not null then
      begin
        perform (v_item ->> 'created_at')::timestamptz;
      exception when others then
        raise exception 'invalid_candidate_created_at';
      end;
    end if;

    -- status/approved_*/applied_rule_*/local_id/fingerprint/match_* are
    -- never accepted: status is hardcoded 'pending', approval evidence stays
    -- with the approve RPCs, fingerprint/match fields are trigger-owned.
    -- Non-UUID references nullify like the web optionalUuid() helper instead
    -- of surfacing a raw cast error.
    insert into public.inbox_candidates (
      id, user_id, kind, amount_minor, merchant, note, occurred_on,
      source, confidence, status, possible_duplicate,
      category_id, category_name, account_id, account_name, raw_snippet,
      import_batch_id, source_row_index, source_external_id,
      source_lifecycle_state, source_predecessor_external_id,
      parser_version, mapping_version, created_at
    )
    values (
      coalesce(
        case when v_item ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (v_item ->> 'id')::uuid end,
        gen_random_uuid()
      ),
      v_user_id, v_kind, v_amount, v_merchant, v_note, v_occurred_on,
      v_source, v_confidence, 'pending',
      coalesce((v_item ->> 'possible_duplicate')::boolean, false),
      case when v_item ->> 'category_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (v_item ->> 'category_id')::uuid end,
      nullif(v_item ->> 'category_name', ''),
      case when v_item ->> 'account_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (v_item ->> 'account_id')::uuid end,
      nullif(v_item ->> 'account_name', ''),
      nullif(v_item ->> 'raw_snippet', ''),
      case when v_item ->> 'import_batch_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (v_item ->> 'import_batch_id')::uuid end,
      (v_item ->> 'source_row_index')::integer,
      nullif(v_item ->> 'source_external_id', ''),
      (v_item ->> 'source_lifecycle_state')::text,
      nullif(v_item ->> 'source_predecessor_external_id', ''),
      nullif(v_item ->> 'parser_version', ''),
      (v_item ->> 'mapping_version')::integer,
      coalesce((v_item ->> 'created_at')::timestamptz, now())
    )
    returning inbox_candidates.id into v_id;
    v_ids := v_ids || v_id;
  end loop;

  return query
  select candidate_record.*
  from public.inbox_candidates candidate_record
  where candidate_record.id = any(v_ids)
  order by array_position(v_ids, candidate_record.id);
end;
$$;

revoke all on function public.create_inbox_candidates(jsonb)
  from public, anon, authenticated;
grant execute on function public.create_inbox_candidates(jsonb)
  to authenticated;

create or replace function public.update_inbox_candidate(
  p_candidate_id uuid,
  p_patch jsonb
)
returns public.inbox_candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_key text;
  v_amount bigint;
  v_merchant text;
  v_note text;
  v_occurred_on date;
  v_kind public.transaction_kind;
  v_source public.inbox_candidate_source;
  v_confidence public.inbox_candidate_confidence;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'invalid_candidate_patch';
  end if;

  -- Editable whitelist mirrors updateCandidateSchema minus `status`: the
  -- candidate stays pending and status/approval/rule-evidence columns are
  -- never writable through this RPC (approve/reject have their own RPCs).
  for v_key in select key from jsonb_object_keys(p_patch) as key
  loop
    if v_key not in (
      'kind', 'amount_minor', 'merchant', 'note', 'occurred_on', 'source',
      'confidence', 'possible_duplicate', 'category_id', 'category_name',
      'account_id', 'account_name', 'raw_snippet', 'import_batch_id'
    ) then
      raise exception 'invalid_candidate_patch';
    end if;
  end loop;

  select * into v_candidate
  from public.inbox_candidates candidate_record
  where candidate_record.id = p_candidate_id
    and candidate_record.user_id = v_user_id
  for update;
  if not found then raise exception 'candidate_not_found'; end if;
  if v_candidate.status <> 'pending' then raise exception 'candidate_not_pending'; end if;

  if p_patch ? 'kind' then
    if p_patch ->> 'kind' is null
      or p_patch ->> 'kind' not in ('income', 'expense', 'transfer') then
      raise exception 'invalid_candidate_kind';
    end if;
    v_kind := (p_patch ->> 'kind')::public.transaction_kind;
  else
    v_kind := v_candidate.kind;
  end if;

  if p_patch ? 'amount_minor' then
    if p_patch ->> 'amount_minor' is null
      or (p_patch ->> 'amount_minor')::text !~ '^\d+$' then
      raise exception 'invalid_candidate_amount';
    end if;
    begin
      v_amount := (p_patch ->> 'amount_minor')::bigint;
    exception when others then
      raise exception 'invalid_candidate_amount';
    end;
    if v_amount is null or v_amount <= 0 or v_amount > 9007199254740991 then
      raise exception 'invalid_candidate_amount';
    end if;
  else
    v_amount := v_candidate.amount_minor;
  end if;

  if p_patch ? 'merchant' then
    v_merchant := btrim(coalesce(p_patch ->> 'merchant', ''));
    if char_length(v_merchant) not between 1 and 200 then
      raise exception 'invalid_candidate_merchant';
    end if;
  else
    v_merchant := v_candidate.merchant;
  end if;

  if p_patch ? 'note' then
    -- zod trims before max(500); mirror it.
    v_note := btrim(coalesce(p_patch ->> 'note', ''));
    if char_length(v_note) > 500 then raise exception 'invalid_candidate_note'; end if;
  else
    v_note := v_candidate.note;
  end if;

  if p_patch ? 'occurred_on' then
    if p_patch ->> 'occurred_on' is null
      or p_patch ->> 'occurred_on' !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'invalid_candidate_date';
    end if;
    begin
      v_occurred_on := (p_patch ->> 'occurred_on')::date;
    exception when others then
      raise exception 'invalid_candidate_date';
    end;
  else
    v_occurred_on := v_candidate.occurred_on;
  end if;

  if p_patch ? 'source' then
    if p_patch ->> 'source' is null
      or p_patch ->> 'source' not in
        ('paste', 'csv', 'xlsx', 'pdf', 'manual', 'notification', 'email', 'agent') then
      raise exception 'invalid_candidate_source';
    end if;
    v_source := (p_patch ->> 'source')::public.inbox_candidate_source;
  else
    v_source := v_candidate.source;
  end if;

  if p_patch ? 'confidence' then
    if p_patch ->> 'confidence' is null
      or p_patch ->> 'confidence' not in ('high', 'medium', 'low') then
      raise exception 'invalid_candidate_confidence';
    end if;
    v_confidence := (p_patch ->> 'confidence')::public.inbox_candidate_confidence;
  else
    v_confidence := v_candidate.confidence;
  end if;

  update public.inbox_candidates candidate_record
  set kind = v_kind,
      amount_minor = v_amount,
      merchant = v_merchant,
      note = v_note,
      occurred_on = v_occurred_on,
      source = v_source,
      confidence = v_confidence,
      possible_duplicate = case
        when p_patch ? 'possible_duplicate'
          then coalesce((p_patch ->> 'possible_duplicate')::boolean, false)
        else candidate_record.possible_duplicate
      end,
      category_id = case
        when p_patch ? 'category_id' and p_patch ->> 'category_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (p_patch ->> 'category_id')::uuid
        when p_patch ? 'category_id' then null
        else candidate_record.category_id
      end,
      category_name = case
        when p_patch ? 'category_name' then nullif(p_patch ->> 'category_name', '')
        else candidate_record.category_name
      end,
      account_id = case
        when p_patch ? 'account_id' and p_patch ->> 'account_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (p_patch ->> 'account_id')::uuid
        when p_patch ? 'account_id' then null
        else candidate_record.account_id
      end,
      account_name = case
        when p_patch ? 'account_name' then nullif(p_patch ->> 'account_name', '')
        else candidate_record.account_name
      end,
      raw_snippet = case
        when p_patch ? 'raw_snippet' then nullif(p_patch ->> 'raw_snippet', '')
        else candidate_record.raw_snippet
      end,
      import_batch_id = case
        when p_patch ? 'import_batch_id' and p_patch ->> 'import_batch_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (p_patch ->> 'import_batch_id')::uuid
        when p_patch ? 'import_batch_id' then null
        else candidate_record.import_batch_id
      end
  where candidate_record.id = p_candidate_id
    and candidate_record.user_id = v_user_id
  returning * into v_candidate;

  return v_candidate;
end;
$$;

revoke all on function public.update_inbox_candidate(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_inbox_candidate(uuid, jsonb)
  to authenticated;

create or replace function public.create_import_batch(
  p_file_name text,
  p_source public.import_batch_source,
  p_row_count integer default 0,
  p_warning_count integer default 0,
  p_skipped_rows integer default 0,
  p_map_confidence double precision default 0,
  p_headers jsonb default '[]'::jsonb,
  p_column_map jsonb default '{}'::jsonb,
  p_parser_version text default null,
  p_mapping_version integer default null,
  p_batch_id uuid default null,
  p_created_at timestamptz default null
)
returns public.import_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_file_name text;
  v_batch public.import_batches%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  v_file_name := btrim(coalesce(p_file_name, ''));
  if char_length(v_file_name) not between 1 and 260 then
    raise exception 'invalid_batch_name';
  end if;
  if p_source is null then raise exception 'invalid_batch_source'; end if;
  if p_row_count is null or p_row_count < 0 or p_row_count > 1000000 then
    raise exception 'invalid_batch_row_count';
  end if;
  if p_warning_count is null or p_warning_count < 0 or p_warning_count > 1000000 then
    raise exception 'invalid_batch_warning_count';
  end if;
  if p_skipped_rows is null or p_skipped_rows < 0 or p_skipped_rows > 1000000 then
    raise exception 'invalid_batch_skipped_rows';
  end if;
  if p_map_confidence is null or p_map_confidence < 0 or p_map_confidence > 1 then
    raise exception 'invalid_batch_map_confidence';
  end if;
  if p_headers is null or jsonb_typeof(p_headers) <> 'array' then
    raise exception 'invalid_batch_headers';
  end if;
  if p_column_map is null or jsonb_typeof(p_column_map) <> 'object' then
    raise exception 'invalid_batch_column_map';
  end if;
  if p_parser_version is not null and char_length(p_parser_version) not between 1 and 80 then
    raise exception 'invalid_batch_parser_version';
  end if;
  if p_mapping_version is not null and p_mapping_version < 1 then
    raise exception 'invalid_batch_mapping_version';
  end if;

  -- status/committed_at are server-owned: a batch is always created 'parsed'
  -- and only update_import_batch_status may transition it.
  insert into public.import_batches (
    id, user_id, file_name, source, status, row_count, warning_count,
    skipped_rows, map_confidence, headers, column_map,
    parser_version, mapping_version, created_at
  )
  values (
    coalesce(p_batch_id, gen_random_uuid()), v_user_id, v_file_name, p_source,
    'parsed', p_row_count, p_warning_count, p_skipped_rows, p_map_confidence,
    p_headers, p_column_map, p_parser_version, p_mapping_version,
    coalesce(p_created_at, now())
  )
  returning * into v_batch;

  return v_batch;
end;
$$;

revoke all on function public.create_import_batch(
  text, public.import_batch_source, integer, integer, integer,
  double precision, jsonb, jsonb, text, integer, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_import_batch(
  text, public.import_batch_source, integer, integer, integer,
  double precision, jsonb, jsonb, text, integer, uuid, timestamptz
) to authenticated;

create or replace function public.update_import_batch_status(
  p_batch_id uuid,
  p_status public.import_batch_status
)
returns public.import_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch public.import_batches%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_status is null then raise exception 'invalid_batch_status'; end if;

  update public.import_batches batch_record
  set status = p_status,
      -- committed_at is server-set; callers never supply a timestamp.
      committed_at = case
        when p_status = 'committed' then now()
        else batch_record.committed_at
      end
  where batch_record.id = p_batch_id
    and batch_record.user_id = v_user_id
  returning * into v_batch;
  if not found then raise exception 'batch_not_found'; end if;

  return v_batch;
end;
$$;

revoke all on function public.update_import_batch_status(uuid, public.import_batch_status)
  from public, anon, authenticated;
grant execute on function public.update_import_batch_status(uuid, public.import_batch_status)
  to authenticated;

create or replace function public.delete_import_batch(
  p_batch_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  delete from public.import_batches batch_record
  where batch_record.id = p_batch_id
    and batch_record.user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then raise exception 'batch_not_found'; end if;
  return true;
end;
$$;

revoke all on function public.delete_import_batch(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_import_batch(uuid)
  to authenticated;

create or replace function public.record_backup_made()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  -- Advisory only (archive.ts records a completed backup for the reminder
  -- chip); the only writable profile field through this RPC is the stamp.
  update public.profiles profile
  set last_backup_at = now()
  where profile.id = v_user_id;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.record_backup_made()
  from public, anon, authenticated;
grant execute on function public.record_backup_made() to authenticated;

create or replace function public.propose_inbox_candidate(
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_merchant text,
  p_occurred_on date,
  p_idempotency_key uuid,
  p_note text default '',
  p_category_id uuid default null,
  p_account_id uuid default null,
  p_evidence text default null,
  p_confidence public.inbox_candidate_confidence default 'medium'
)
returns public.inbox_candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  -- Caller OAuth client (null for first-party browser sessions). Inside a
  -- definer, auth.jwt() resolves as owner against the request JWT.
  v_client_id text := auth.jwt() ->> 'client_id';
  v_external_id text;
  v_merchant text;
  v_row public.inbox_candidates%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('income', 'expense') then raise exception 'invalid_proposal_kind'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then
    raise exception 'invalid_proposal_amount';
  end if;
  v_merchant := btrim(coalesce(p_merchant, ''));
  if char_length(v_merchant) not between 1 and 200 then
    raise exception 'invalid_proposal_merchant';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'invalid_proposal_note'; end if;
  if p_occurred_on is null then raise exception 'invalid_proposal_date'; end if;
  if p_evidence is not null and char_length(p_evidence) > 2000 then
    raise exception 'invalid_proposal_evidence';
  end if;
  if p_idempotency_key is null then raise exception 'invalid_idempotency_key'; end if;
  if p_confidence is null then p_confidence := 'medium'; end if;

  -- `agent|<clientId|first-party>|<key>` — same namespacing as
  -- buildAgentSourceExternalId() in src/lib/inbox/agent-proposal.ts.
  v_external_id := 'agent|' || coalesce(v_client_id, 'first-party') || '|' || p_idempotency_key::text;
  if char_length(v_external_id) > 200 then
    raise exception 'invalid_proposal_identity';
  end if;

  -- Replay fast path mirrors the capability's find-before-insert.
  select * into v_row
  from public.inbox_candidates candidate_record
  where candidate_record.user_id = v_user_id
    and candidate_record.source = 'agent'
    and candidate_record.source_external_id = v_external_id
  order by candidate_record.created_at desc
  limit 1;
  if v_row.id is not null then return v_row; end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories category_record
    where category_record.id = p_category_id
      and category_record.user_id = v_user_id
  ) then
    raise exception 'category_not_found';
  end if;
  if p_account_id is not null and not exists (
    select 1 from public.accounts account_record
    where account_record.id = p_account_id
      and account_record.user_id = v_user_id
  ) then
    raise exception 'account_not_found';
  end if;

  -- Shape satisfies guard_oauth_mutation's OAuth exception verbatim
  -- (20261002120000:25-36): source 'agent', status 'pending', approved_*
  -- null, source_external_id like 'agent|<client_id>|%', lifecycle 'pending',
  -- user_id = auth.uid(). First-party callers pass the same row shape; the
  -- guard's client_id null branch admits them and the allowlist check decides
  -- OAuth callers.
  insert into public.inbox_candidates (
    user_id, kind, amount_minor, merchant, note, occurred_on,
    source, confidence, status, category_id, account_id, raw_snippet,
    source_external_id, source_lifecycle_state
  )
  values (
    v_user_id, p_kind, p_amount_minor, v_merchant, coalesce(p_note, ''),
    p_occurred_on, 'agent', p_confidence, 'pending', p_category_id,
    p_account_id, p_evidence, v_external_id, 'pending'
  )
  returning * into v_row;
  return v_row;
exception
  -- 23505 on inbox_candidates_agent_identity_uidx = replayed proposal: return
  -- the existing row, same as the capability's 23505 replay path.
  when unique_violation then
    select * into v_row
    from public.inbox_candidates candidate_record
    where candidate_record.user_id = v_user_id
      and candidate_record.source = 'agent'
      and candidate_record.source_external_id = v_external_id
    order by candidate_record.created_at desc
    limit 1;
    if v_row.id is null then raise; end if;
    return v_row;
end;
$$;

revoke all on function public.propose_inbox_candidate(
  public.transaction_kind, bigint, text, date, uuid,
  text, uuid, uuid, text, public.inbox_candidate_confidence
) from public, anon, authenticated;
grant execute on function public.propose_inbox_candidate(
  public.transaction_kind, bigint, text, date, uuid,
  text, uuid, uuid, text, public.inbox_candidate_confidence
) to authenticated;
