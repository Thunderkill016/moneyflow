-- Category + deterministic-rule write RPCs (Neon RPC-only write path).
--
-- Hosted Neon is intentionally RPC-only for writes: guard_oauth_mutation()
-- (20261002120000) fires on every owned public table and calls auth.jwt(), and
-- Neon's managed `authenticated` role lacks USAGE on schema `auth`, so every
-- direct table write fails 42501 before RLS is even evaluated. All writes must
-- go through narrowly-scoped SECURITY DEFINER RPCs like these; inside a
-- definer, auth.uid()/auth.jwt() resolve as the function owner against the
-- request JWT, so `v_user_id` below is still the *caller's* tenant.
--
-- Browser callers carry no `client_id` claim, so guard_oauth_mutation passes
-- them through; OAuth proposal clients are denied by the same trigger on any
-- table write these functions perform — no per-function client check needed.
--
-- Icon/color vocabulary mirrors src/lib/transactions/category-presentation.ts:
-- CATEGORY_ICON_NAMES = PICKABLE_CATEGORY_ICONS + LEGACY_CATEGORY_ICONS
-- ('plus', stored by schema seeds before the picker existed). 'arrows' is
-- deliberately excluded — it is the internal transfer glyph, not a writable
-- category icon. CATEGORY_COLORS is the 8-name palette. When the web
-- vocabulary changes, update the whitelists here in the same change.

create or replace function public.upsert_financial_category(
  p_name text,
  p_kind public.category_kind,
  p_icon text default null,
  p_color text default null,
  p_category_id uuid default null
)
returns table (
  id uuid,
  name text,
  kind public.category_kind,
  icon text,
  color text,
  is_default boolean,
  is_archived boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_icon text;
  v_color text;
  v_existing public.categories%rowtype;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  -- Same normalization as normalizeCategoryName(): trim + collapse whitespace.
  v_name := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  if char_length(v_name) not between 1 and 60 then
    raise exception 'invalid_category_name';
  end if;
  if p_kind is null then
    raise exception 'invalid_category_kind';
  end if;

  -- Kind-based defaults match defaultCategoryMeta(): income wallet/green,
  -- expense spark/violet. 'arrows' stays excluded per the web vocabulary.
  v_icon := coalesce(p_icon, case p_kind when 'income' then 'wallet' else 'spark' end);
  if v_icon not in (
    'bowl', 'coffee', 'car', 'fuel', 'bus', 'bike', 'parking', 'bag', 'shirt',
    'laundry', 'home', 'wifi', 'phone', 'receipt', 'tax', 'heart', 'pill',
    'baby', 'paw', 'book', 'study', 'gym', 'music', 'film', 'plane', 'gift',
    'charity', 'ticket', 'briefcase', 'piggy', 'coins', 'wallet', 'bank',
    'spark', 'plus'
  ) then
    raise exception 'invalid_category_icon';
  end if;
  v_color := coalesce(p_color, case p_kind when 'income' then 'green' else 'violet' end);
  if v_color not in ('amber', 'blue', 'coral', 'cyan', 'green', 'pink', 'red', 'violet') then
    raise exception 'invalid_category_color';
  end if;

  if p_category_id is null then
    insert into public.categories (user_id, name, kind, icon, color)
    values (v_user_id, v_name, p_kind, v_icon, v_color)
    returning categories.id into v_id;
  else
    select * into v_existing
    from public.categories category_record
    where category_record.id = p_category_id
      and category_record.user_id = v_user_id
    for update;
    if not found then raise exception 'category_not_found'; end if;
    -- Kind is immutable after create (no reparent), same as the web save path.
    if v_existing.kind <> p_kind then raise exception 'category_kind_locked'; end if;

    update public.categories category_record
    set name = v_name, icon = v_icon, color = v_color
    where category_record.id = p_category_id
      and category_record.user_id = v_user_id
    returning category_record.id into v_id;
    if v_id is null then raise exception 'category_not_found'; end if;
  end if;

  return query
  select category_record.id, category_record.name, category_record.kind,
    category_record.icon, category_record.color, category_record.is_default,
    category_record.is_archived, category_record.created_at
  from public.categories category_record
  where category_record.id = v_id
    and category_record.user_id = v_user_id;
exception
  -- unique (user_id, name, kind)
  when unique_violation then
    raise exception 'category_name_taken';
end;
$$;

revoke all on function public.upsert_financial_category(text, public.category_kind, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.upsert_financial_category(text, public.category_kind, text, text, uuid)
  to authenticated;

create or replace function public.set_category_archived(
  p_category_id uuid,
  p_archived boolean
)
returns table (
  id uuid,
  name text,
  kind public.category_kind,
  icon text,
  color text,
  is_default boolean,
  is_archived boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_archived is null then raise exception 'archive_state_required'; end if;

  update public.categories category_record
  set is_archived = p_archived
  where category_record.id = p_category_id
    and category_record.user_id = v_user_id
  returning category_record.id into v_id;
  if v_id is null then raise exception 'category_not_found'; end if;

  return query
  select category_record.id, category_record.name, category_record.kind,
    category_record.icon, category_record.color, category_record.is_default,
    category_record.is_archived, category_record.created_at
  from public.categories category_record
  where category_record.id = v_id
    and category_record.user_id = v_user_id;
end;
$$;

revoke all on function public.set_category_archived(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_category_archived(uuid, boolean)
  to authenticated;

create or replace function public.delete_financial_category(
  p_category_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.categories%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  select * into v_existing
  from public.categories category_record
  where category_record.id = p_category_id
    and category_record.user_id = v_user_id
  for update;
  if not found then raise exception 'category_not_found'; end if;

  -- Load-bearing under SECURITY DEFINER: the categories delete RLS policy
  -- (`auth.uid() = user_id and not is_default`) is bypassed by the owner role,
  -- so this is the only remaining guard against deleting seeded defaults.
  if v_existing.is_default then raise exception 'category_default_locked'; end if;

  delete from public.categories category_record
  where category_record.id = p_category_id
    and category_record.user_id = v_user_id;
  return true;
exception
  -- transaction_entries / monthly_budgets / recurring_commitments /
  -- recurring_income_templates reference (category_id, user_id) RESTRICT;
  -- inbox_rules references categories(id) RESTRICT.
  when foreign_key_violation then
    raise exception 'category_in_use';
end;
$$;

revoke all on function public.delete_financial_category(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_financial_category(uuid)
  to authenticated;

create or replace function public.reject_inbox_candidate(
  p_candidate_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status public.inbox_candidate_status;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;

  select candidate_record.status into v_status
  from public.inbox_candidates candidate_record
  where candidate_record.id = p_candidate_id
    and candidate_record.user_id = v_user_id
  for update;
  if not found then raise exception 'candidate_not_found'; end if;
  if v_status <> 'pending' then raise exception 'candidate_not_pending'; end if;

  update public.inbox_candidates candidate_record
  set status = 'rejected'
  where candidate_record.id = p_candidate_id
    and candidate_record.user_id = v_user_id;
  return true;
end;
$$;

revoke all on function public.reject_inbox_candidate(uuid)
  from public, anon, authenticated;
grant execute on function public.reject_inbox_candidate(uuid)
  to authenticated;

create or replace function public.upsert_inbox_rule(
  p_match_field text,
  p_contains_text text,
  p_category_id uuid,
  p_merchant_name text default null,
  p_enabled boolean default true,
  p_rule_id uuid default null,
  p_expected_version integer default null
)
returns table (
  id uuid,
  stage text,
  priority integer,
  enabled boolean,
  match_field text,
  contains_text text,
  category_id uuid,
  merchant_name text,
  version integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rule public.inbox_rules%rowtype;
  v_priority integer;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  -- stage is hardcoded 'candidate': the table check only permits that value.
  if p_match_field is null or p_match_field not in ('merchant', 'note', 'raw', 'any') then
    raise exception 'invalid_rule_field';
  end if;
  if char_length(btrim(coalesce(p_contains_text, ''))) not between 1 and 120 then
    raise exception 'invalid_rule_contains';
  end if;
  if p_merchant_name is not null and char_length(btrim(p_merchant_name)) > 200 then
    raise exception 'invalid_rule_merchant';
  end if;

  if p_rule_id is null then
    -- Append at the end of the caller's ordered list, mirroring the web save
    -- path's max(priority)+1. The check constraint permits 1..100000; beyond
    -- that the sequence space is exhausted rather than silently clamped.
    select coalesce(max(rule_record.priority) + 1, 1)
    into v_priority
    from public.inbox_rules rule_record
    where rule_record.user_id = v_user_id;
    if v_priority > 100000 then raise exception 'rule_priority_exhausted'; end if;

    -- category availability and user_id/audit normalization are enforced by
    -- the SECURITY DEFINER validate_inbox_rule_category trigger.
    insert into public.inbox_rules (
      user_id, stage, priority, enabled, match_field,
      contains_text, category_id, merchant_name
    )
    values (
      v_user_id, 'candidate', v_priority, coalesce(p_enabled, true), p_match_field,
      p_contains_text, p_category_id, p_merchant_name
    )
    returning inbox_rules.id into v_id;
  else
    if p_expected_version is null or p_expected_version < 1 then
      raise exception 'invalid_rule_version';
    end if;

    select * into v_rule
    from public.inbox_rules rule_record
    where rule_record.id = p_rule_id
      and rule_record.user_id = v_user_id
    for update;
    if not found then raise exception 'rule_not_found'; end if;
    if v_rule.version <> p_expected_version then raise exception 'stale_write'; end if;

    update public.inbox_rules rule_record
    set enabled = coalesce(p_enabled, true),
        match_field = p_match_field,
        contains_text = p_contains_text,
        category_id = p_category_id,
        merchant_name = p_merchant_name
    where rule_record.id = p_rule_id
      and rule_record.user_id = v_user_id
    returning rule_record.id into v_id;
    if v_id is null then raise exception 'rule_not_found'; end if;
  end if;

  return query
  select rule_record.id, rule_record.stage, rule_record.priority,
    rule_record.enabled, rule_record.match_field, rule_record.contains_text,
    rule_record.category_id, rule_record.merchant_name, rule_record.version,
    rule_record.created_at, rule_record.updated_at
  from public.inbox_rules rule_record
  where rule_record.id = v_id
    and rule_record.user_id = v_user_id;
end;
$$;

revoke all on function public.upsert_inbox_rule(text, text, uuid, text, boolean, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.upsert_inbox_rule(text, text, uuid, text, boolean, uuid, integer)
  to authenticated;

create or replace function public.delete_inbox_rule(
  p_rule_id uuid,
  p_expected_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_version integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'invalid_rule_version';
  end if;

  select rule_record.version into v_version
  from public.inbox_rules rule_record
  where rule_record.id = p_rule_id
    and rule_record.user_id = v_user_id
  for update;
  if not found then raise exception 'rule_not_found'; end if;
  if v_version <> p_expected_version then raise exception 'stale_write'; end if;

  delete from public.inbox_rules rule_record
  where rule_record.id = p_rule_id
    and rule_record.user_id = v_user_id;
  return true;
end;
$$;

revoke all on function public.delete_inbox_rule(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.delete_inbox_rule(uuid, integer)
  to authenticated;
