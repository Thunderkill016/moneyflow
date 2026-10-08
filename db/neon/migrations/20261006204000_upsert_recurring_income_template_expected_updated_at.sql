-- upsert_recurring_income_template: optional optimistic-concurrency precondition.
--
-- Mirrors migrations 20260923160000_update_money_transaction_expected_updated_at.sql
-- and 20261006160000_update_account_transfer_expected_updated_at.sql for the
-- recurring-income-template sibling: adds `p_expected_updated_at` — on the
-- update branch (p_template_id supplied), when the caller's version does not
-- match the row's `updated_at`, raises `stale_write` instead of overwriting.
-- `null` keeps the previous last-write-wins behavior; the insert branch has
-- nothing to be stale against.
--
-- The old 6-argument signature is dropped; named-argument RPC calls with the
-- original six parameters resolve to the new signature via the default.

drop function if exists public.upsert_recurring_income_template(uuid, text, bigint, integer, uuid, uuid);

create function public.upsert_recurring_income_template(
  p_template_id uuid,
  p_name text,
  p_amount_minor bigint,
  p_due_day integer,
  p_account_id uuid,
  p_category_id uuid,
  p_expected_updated_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_existing_updated_at timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'invalid_income_template_name'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_income_template_amount'; end if;
  if p_due_day is null or p_due_day not between 1 and 31 then raise exception 'invalid_due_day'; end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id and not is_archived) then
    raise exception 'account_not_found';
  end if;
  select kind, is_archived into v_category_kind, v_category_archived from public.categories where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'income' then raise exception 'income_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  if p_template_id is null then
    insert into public.recurring_income_templates (user_id, name, amount_minor, due_day, account_id, category_id)
    values (v_user_id, trim(p_name), p_amount_minor, p_due_day, p_account_id, p_category_id)
    returning id into v_id;
  else
    -- Optimistic concurrency: fail closed under the row lock before any write
    -- when the caller's version is stale. `is distinct from` also rejects a
    -- non-null expectation when the column were somehow null.
    select updated_at into v_existing_updated_at
    from public.recurring_income_templates
    where id = p_template_id and user_id = v_user_id
    for update;
    if v_existing_updated_at is null then raise exception 'income_template_not_found'; end if;
    if p_expected_updated_at is not null
       and v_existing_updated_at is distinct from p_expected_updated_at then
      raise exception 'stale_write';
    end if;

    update public.recurring_income_templates set name = trim(p_name), amount_minor = p_amount_minor,
      due_day = p_due_day, account_id = p_account_id, category_id = p_category_id
    where id = p_template_id and user_id = v_user_id
    returning id into v_id;
    if v_id is null then raise exception 'income_template_not_found'; end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.upsert_recurring_income_template(uuid, text, bigint, integer, uuid, uuid, timestamptz) from public, anon;
grant execute on function public.upsert_recurring_income_template(uuid, text, bigint, integer, uuid, uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- recurring_income_template_feed: expose updated_at so the client carries the
-- version it read and can hand it back as the write precondition.
-- ---------------------------------------------------------------------------

create or replace view public.recurring_income_template_feed with (security_invoker = true) as
select template.id, template.user_id, template.name, template.amount_minor, template.due_day,
  template.account_id, account.name as account_name, template.category_id,
  category.name as category_name, category.icon as category_icon, category.color as category_color,
  template.is_archived, template.created_at, template.updated_at
from public.recurring_income_templates template
join public.accounts account on account.id = template.account_id and account.user_id = template.user_id
join public.categories category on category.id = template.category_id and category.user_id = template.user_id;
