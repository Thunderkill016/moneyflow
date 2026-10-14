-- recurring_commitments.interval_months — non-monthly cycles (Tết yearly,
-- bảo hiểm yearly, học phí per-term). `1` keeps the monthly contract every
-- existing row already follows; 3/6/12 cover quarterly/half-yearly/yearly and
-- the bound 24 leaves room for a biennial row without opening an integer
-- free-for-all.
--
-- Occurrence anchoring stays client-side by design: `commitment_occurrences`
-- rows are written explicitly by `pay_recurring_commitment(p_month_start)` —
-- there is no server-side "next occurrence" generator to retarget. The due
-- month is derived from the latest paid month (`latest_paid + interval` —
-- never-paid rows are due now, a missed cycle is overdue) exactly like the
-- clients' declared-data convention; `due_day` keeps its clamped
-- day-of-month meaning inside the due month.
--
-- upsert_recurring_commitment gains `p_interval_months` (default 1) appended
-- after `p_expected_updated_at` — named-argument RPC calls resolve to the new
-- signature via the default, same convention as 20261006202000.
--
-- NOTE: export_user_archive / restore_user_archive keep their explicit column
-- lists — an archive round-trip restores the row as monthly (interval 1),
-- never invents a cadence.

alter table public.recurring_commitments
  add column interval_months integer not null default 1
    check (interval_months between 1 and 24);

drop function if exists public.upsert_recurring_commitment(uuid, text, bigint, integer, uuid, uuid, timestamptz);

create function public.upsert_recurring_commitment(
  p_commitment_id uuid,
  p_name text,
  p_amount_minor bigint,
  p_due_day integer,
  p_account_id uuid,
  p_category_id uuid,
  p_expected_updated_at timestamptz default null,
  p_interval_months integer default 1
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
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'invalid_commitment_name'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_commitment_amount'; end if;
  if p_due_day is null or p_due_day not between 1 and 31 then raise exception 'invalid_due_day'; end if;
  if p_interval_months is null or p_interval_months not between 1 and 24 then raise exception 'invalid_commitment_interval'; end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id and not is_archived) then
    raise exception 'account_not_found';
  end if;
  select kind, is_archived into v_category_kind, v_category_archived from public.categories where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  if p_commitment_id is null then
    insert into public.recurring_commitments (user_id, name, amount_minor, due_day, account_id, category_id, interval_months)
    values (v_user_id, trim(p_name), p_amount_minor, p_due_day, p_account_id, p_category_id, p_interval_months)
    returning id into v_id;
  else
    -- Optimistic concurrency: fail closed under the row lock before any write
    -- when the caller's version is stale. `is distinct from` also rejects a
    -- non-null expectation when the column were somehow null.
    select updated_at into v_existing_updated_at
    from public.recurring_commitments
    where id = p_commitment_id and user_id = v_user_id
    for update;
    if v_existing_updated_at is null then raise exception 'commitment_not_found'; end if;
    if p_expected_updated_at is not null
       and v_existing_updated_at is distinct from p_expected_updated_at then
      raise exception 'stale_write';
    end if;

    update public.recurring_commitments set name = trim(p_name), amount_minor = p_amount_minor,
      due_day = p_due_day, account_id = p_account_id, category_id = p_category_id,
      interval_months = p_interval_months
    where id = p_commitment_id and user_id = v_user_id
    returning id into v_id;
    if v_id is null then raise exception 'commitment_not_found'; end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.upsert_recurring_commitment(uuid, text, bigint, integer, uuid, uuid, timestamptz, integer) from public, anon;
grant execute on function public.upsert_recurring_commitment(uuid, text, bigint, integer, uuid, uuid, timestamptz, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- recurring_commitment_feed: expose interval_months so the client can label
-- the cadence and derive the next due month. NOTE: the column must stay last.
-- CREATE OR REPLACE VIEW cannot rename an existing positional column (the
-- current view ends with updated_at at position 14); appending keeps
-- positions 1-14 name-stable for every consumer that reads it.
-- ---------------------------------------------------------------------------

create or replace view public.recurring_commitment_feed with (security_invoker = true) as
select commitment.id, commitment.user_id, commitment.name, commitment.amount_minor, commitment.due_day,
  commitment.account_id, account.name as account_name, commitment.category_id,
  category.name as category_name, category.icon as category_icon, category.color as category_color,
  commitment.is_archived, commitment.created_at, commitment.updated_at,
  commitment.interval_months
from public.recurring_commitments commitment
join public.accounts account on account.id = commitment.account_id and account.user_id = commitment.user_id
join public.categories category on category.id = commitment.category_id and category.user_id = commitment.user_id;
