-- Authenticated deterministic categorization rules.
-- Rules normalize pending Inbox candidates only; they never post ledger facts.

create table public.inbox_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null default 'candidate'
    check (stage = 'candidate'),
  priority integer not null
    check (priority between 1 and 100000),
  enabled boolean not null default true,
  match_field text not null
    check (match_field in ('merchant', 'note', 'raw', 'any')),
  contains_text text not null
    check (char_length(trim(contains_text)) between 1 and 120),
  category_id uuid not null references public.categories(id) on delete restrict,
  merchant_name text
    check (merchant_name is null or char_length(merchant_name) between 1 and 200),
  version integer not null default 1
    check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index inbox_rules_user_priority_idx
  on public.inbox_rules (user_id, priority, created_at, id);

create index inbox_rules_category_user_idx
  on public.inbox_rules (category_id, user_id);

alter table public.inbox_rules enable row level security;

create policy "inbox_rules_select_own"
  on public.inbox_rules
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "inbox_rules_insert_own"
  on public.inbox_rules
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "inbox_rules_update_own"
  on public.inbox_rules
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "inbox_rules_delete_own"
  on public.inbox_rules
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.inbox_rules from public, anon, authenticated;
grant select, insert, update, delete on public.inbox_rules to authenticated;

create or replace function public.validate_inbox_rule_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requires_active_category boolean;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'rule_tenant_mismatch';
  end if;

  if tg_op = 'INSERT' then
    v_requires_active_category := true;
  else
    v_requires_active_category :=
      new.enabled
      or new.category_id is distinct from old.category_id;
  end if;

  if v_requires_active_category and not exists (
    select 1
    from public.categories category_record
    where category_record.id = new.category_id
      and category_record.user_id = new.user_id
      and category_record.is_archived = false
  ) then
    raise exception 'rule_category_not_available';
  end if;

  new.contains_text := trim(new.contains_text);
  new.merchant_name := nullif(trim(new.merchant_name), '');
  return new;
end;
$$;

create trigger inbox_rules_validate_category
  before insert or update of
    user_id,
    category_id,
    contains_text,
    merchant_name,
    enabled
  on public.inbox_rules
  for each row execute function public.validate_inbox_rule_category();

create or replace function public.version_inbox_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.stage,
    new.priority,
    new.enabled,
    new.match_field,
    new.contains_text,
    new.category_id,
    new.merchant_name
  ) is distinct from row(
    old.stage,
    old.priority,
    old.enabled,
    old.match_field,
    old.contains_text,
    old.category_id,
    old.merchant_name
  ) then
    new.version := old.version + 1;
    new.updated_at := now();
  else
    new.version := old.version;
    new.updated_at := old.updated_at;
  end if;
  new.created_at := old.created_at;
  new.user_id := old.user_id;
  return new;
end;
$$;

create trigger inbox_rules_version_changes
  before update on public.inbox_rules
  for each row execute function public.version_inbox_rule();

alter table public.inbox_candidates
  add column applied_rule_id uuid,
  add column applied_rule_version integer
    check (applied_rule_version is null or applied_rule_version >= 1),
  add constraint inbox_candidates_applied_rule_pair_check check (
    (applied_rule_id is null and applied_rule_version is null)
    or (applied_rule_id is not null and applied_rule_version is not null)
  );

create index inbox_candidates_user_applied_rule_idx
  on public.inbox_candidates (user_id, applied_rule_id, applied_rule_version)
  where applied_rule_id is not null;

create or replace function public.validate_inbox_candidate_rule_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.applied_rule_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.inbox_rules rule_record
    where rule_record.id = new.applied_rule_id
      and rule_record.user_id = new.user_id
      and rule_record.version = new.applied_rule_version
  ) then
    raise exception 'candidate_rule_evidence_invalid';
  end if;

  return new;
end;
$$;

create trigger inbox_candidates_validate_rule_evidence
  before insert or update of applied_rule_id, applied_rule_version
  on public.inbox_candidates
  for each row execute function public.validate_inbox_candidate_rule_evidence();

create or replace function public.replace_inbox_rule_priorities(
  p_rule_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_requested_count integer := coalesce(cardinality(p_rule_ids), 0);
  v_visible_count integer;
  v_total_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if v_requested_count < 1 or v_requested_count > 100 then
    raise exception 'invalid_rule_order';
  end if;
  if (select count(distinct item) from unnest(p_rule_ids) item) <> v_requested_count then
    raise exception 'duplicate_rule_order';
  end if;

  select count(*)::integer
  into v_total_count
  from public.inbox_rules rule_record
  where rule_record.user_id = v_user_id;

  if v_total_count <> v_requested_count then
    raise exception 'incomplete_rule_order';
  end if;

  select count(*)::integer
  into v_visible_count
  from public.inbox_rules rule_record
  where rule_record.user_id = v_user_id
    and rule_record.id = any(p_rule_ids);

  if v_visible_count <> v_requested_count then
    raise exception 'rule_not_found';
  end if;

  update public.inbox_rules rule_record
  set priority = ordered.ordinality::integer
  from unnest(p_rule_ids) with ordinality as ordered(rule_id, ordinality)
  where rule_record.user_id = v_user_id
    and rule_record.id = ordered.rule_id
    and rule_record.priority is distinct from ordered.ordinality::integer;
end;
$$;

create or replace function public.apply_inbox_rule_to_candidate(
  p_candidate_id uuid,
  p_rule_id uuid,
  p_expected_version integer
)
returns table (
  candidate_id uuid,
  rule_id uuid,
  rule_version integer,
  category_id uuid,
  category_name text,
  merchant_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_candidate public.inbox_candidates%rowtype;
  v_rule public.inbox_rules%rowtype;
  v_category public.categories%rowtype;
  v_haystack text;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'invalid_rule_version';
  end if;

  select *
  into v_candidate
  from public.inbox_candidates candidate_record
  where candidate_record.id = p_candidate_id
    and candidate_record.user_id = v_user_id
  for update;

  if not found then
    raise exception 'candidate_not_found';
  end if;
  if v_candidate.status <> 'pending' then
    raise exception 'candidate_not_pending';
  end if;
  if v_candidate.kind not in ('income', 'expense') then
    raise exception 'candidate_kind_not_supported';
  end if;

  select *
  into v_rule
  from public.inbox_rules rule_record
  where rule_record.id = p_rule_id
    and rule_record.user_id = v_user_id
    and rule_record.enabled = true
    and rule_record.stage = 'candidate'
    and rule_record.version = p_expected_version;

  if not found then
    raise exception 'rule_not_available';
  end if;

  select *
  into v_category
  from public.categories category_record
  where category_record.id = v_rule.category_id
    and category_record.user_id = v_user_id
    and category_record.is_archived = false
    and category_record.kind::text = v_candidate.kind::text;

  if not found then
    raise exception 'rule_category_kind_mismatch';
  end if;

  v_haystack := case v_rule.match_field
    when 'merchant' then coalesce(v_candidate.merchant, '')
    when 'note' then coalesce(v_candidate.note, '')
    when 'raw' then coalesce(v_candidate.raw_snippet, '')
    else concat_ws(
      ' ',
      coalesce(v_candidate.merchant, ''),
      coalesce(v_candidate.note, ''),
      coalesce(v_candidate.raw_snippet, '')
    )
  end;

  if position(lower(v_rule.contains_text) in lower(v_haystack)) = 0 then
    raise exception 'rule_no_longer_matches';
  end if;

  update public.inbox_candidates candidate_record
  set category_id = v_rule.category_id,
      category_name = v_category.name,
      merchant = coalesce(v_rule.merchant_name, candidate_record.merchant),
      applied_rule_id = v_rule.id,
      applied_rule_version = v_rule.version
  where candidate_record.id = v_candidate.id;

  return query
  select
    v_candidate.id,
    v_rule.id,
    v_rule.version,
    v_rule.category_id,
    v_category.name,
    coalesce(v_rule.merchant_name, v_candidate.merchant);
end;
$$;

revoke all on function public.validate_inbox_rule_category() from public, anon, authenticated;
revoke all on function public.version_inbox_rule() from public, anon, authenticated;
revoke all on function public.validate_inbox_candidate_rule_evidence() from public, anon, authenticated;
revoke all on function public.replace_inbox_rule_priorities(uuid[]) from public, anon;
revoke all on function public.apply_inbox_rule_to_candidate(uuid, uuid, integer) from public, anon;
grant execute on function public.replace_inbox_rule_priorities(uuid[]) to authenticated;
grant execute on function public.apply_inbox_rule_to_candidate(uuid, uuid, integer) to authenticated;
