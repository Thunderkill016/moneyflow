-- Archived categories are hidden from normal entry flows and must not receive
-- new budgets, templates or generated recurring transactions.

create or replace function public.upsert_monthly_budget(
  p_category_id uuid,
  p_month_start date,
  p_limit_minor bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_budget_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_month_start is null or p_month_start <> date_trunc('month', p_month_start)::date then
    raise exception 'invalid_budget_month';
  end if;
  if p_limit_minor is null or p_limit_minor <= 0 or p_limit_minor > 9007199254740991 then
    raise exception 'invalid_budget_limit';
  end if;

  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  insert into public.monthly_budgets (user_id, category_id, month_start, limit_minor)
  values (v_user_id, p_category_id, p_month_start, p_limit_minor)
  on conflict (user_id, category_id, month_start)
  do update set limit_minor = excluded.limit_minor, updated_at = now()
  returning id into v_budget_id;
  return v_budget_id;
end;
$$;

create or replace function public.upsert_recurring_commitment(
  p_commitment_id uuid,
  p_name text,
  p_amount_minor bigint,
  p_due_day integer,
  p_account_id uuid,
  p_category_id uuid
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
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'invalid_commitment_name'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_commitment_amount'; end if;
  if p_due_day is null or p_due_day not between 1 and 31 then raise exception 'invalid_due_day'; end if;
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  if p_commitment_id is null then
    insert into public.recurring_commitments
      (user_id, name, amount_minor, due_day, account_id, category_id)
    values
      (v_user_id, trim(p_name), p_amount_minor, p_due_day, p_account_id, p_category_id)
    returning id into v_id;
  else
    update public.recurring_commitments
    set name = trim(p_name),
        amount_minor = p_amount_minor,
        due_day = p_due_day,
        account_id = p_account_id,
        category_id = p_category_id
    where id = p_commitment_id and user_id = v_user_id
    returning id into v_id;
    if v_id is null then raise exception 'commitment_not_found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.pay_recurring_commitment(
  p_commitment_id uuid,
  p_month_start date,
  p_paid_on date,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_commitment public.recurring_commitments%rowtype;
  v_transaction_id uuid;
  v_category_kind public.category_kind;
  v_category_archived boolean;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_month_start is null or p_month_start <> date_trunc('month', p_month_start)::date then raise exception 'invalid_commitment_month'; end if;
  if p_paid_on is null then raise exception 'invalid_paid_date'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_commitment_id::text || p_month_start::text, 0)
  );

  select transaction_id into v_transaction_id
  from public.commitment_occurrences
  where user_id = v_user_id
    and commitment_id = p_commitment_id
    and month_start = p_month_start;
  if v_transaction_id is not null then return v_transaction_id; end if;

  select * into v_commitment
  from public.recurring_commitments
  where id = p_commitment_id and user_id = v_user_id and not is_archived;
  if v_commitment.id is null then raise exception 'commitment_not_found'; end if;
  if not exists (
    select 1 from public.accounts
    where id = v_commitment.account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = v_commitment.category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  insert into public.financial_transactions
    (user_id, kind, note, occurred_on, idempotency_key)
  values
    (v_user_id, 'expense', v_commitment.name, p_paid_on, p_idempotency_key)
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, v_commitment.account_id, v_commitment.category_id, -v_commitment.amount_minor);

  insert into public.commitment_occurrences
    (user_id, commitment_id, month_start, transaction_id)
  values
    (v_user_id, p_commitment_id, p_month_start, v_transaction_id);
  return v_transaction_id;
end;
$$;

create or replace function public.upsert_recurring_income_template(
  p_template_id uuid,
  p_name text,
  p_amount_minor bigint,
  p_due_day integer,
  p_account_id uuid,
  p_category_id uuid
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
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'invalid_income_template_name'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_income_template_amount'; end if;
  if p_due_day is null or p_due_day not between 1 and 31 then raise exception 'invalid_due_day'; end if;
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'income' then raise exception 'income_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  if p_template_id is null then
    insert into public.recurring_income_templates
      (user_id, name, amount_minor, due_day, account_id, category_id)
    values
      (v_user_id, trim(p_name), p_amount_minor, p_due_day, p_account_id, p_category_id)
    returning id into v_id;
  else
    update public.recurring_income_templates
    set name = trim(p_name),
        amount_minor = p_amount_minor,
        due_day = p_due_day,
        account_id = p_account_id,
        category_id = p_category_id
    where id = p_template_id and user_id = v_user_id
    returning id into v_id;
    if v_id is null then raise exception 'income_template_not_found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.record_recurring_income_template(
  p_template_id uuid,
  p_month_start date,
  p_received_on date,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.recurring_income_templates%rowtype;
  v_transaction_id uuid;
  v_category_kind public.category_kind;
  v_category_archived boolean;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_month_start is null or p_month_start <> date_trunc('month', p_month_start)::date then raise exception 'invalid_income_template_month'; end if;
  if p_received_on is null then raise exception 'invalid_received_date'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_template_id::text || p_month_start::text || ':income', 0)
  );

  select transaction_id into v_transaction_id
  from public.income_template_occurrences
  where user_id = v_user_id
    and template_id = p_template_id
    and month_start = p_month_start;
  if v_transaction_id is not null then return v_transaction_id; end if;

  select * into v_template
  from public.recurring_income_templates
  where id = p_template_id and user_id = v_user_id and not is_archived;
  if v_template.id is null then raise exception 'income_template_not_found'; end if;
  if not exists (
    select 1 from public.accounts
    where id = v_template.account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = v_template.category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'income' then raise exception 'income_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  insert into public.financial_transactions
    (user_id, kind, note, occurred_on, idempotency_key)
  values
    (v_user_id, 'income', v_template.name, p_received_on, p_idempotency_key)
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, v_template.account_id, v_template.category_id, v_template.amount_minor);

  insert into public.income_template_occurrences
    (user_id, template_id, month_start, transaction_id)
  values
    (v_user_id, p_template_id, p_month_start, v_transaction_id);
  return v_transaction_id;
end;
$$;

revoke all on function public.upsert_monthly_budget(uuid, date, bigint) from public, anon;
revoke all on function public.upsert_recurring_commitment(uuid, text, bigint, integer, uuid, uuid) from public, anon;
revoke all on function public.pay_recurring_commitment(uuid, date, date, uuid) from public, anon;
revoke all on function public.upsert_recurring_income_template(uuid, text, bigint, integer, uuid, uuid) from public, anon;
revoke all on function public.record_recurring_income_template(uuid, date, date, uuid) from public, anon;

grant execute on function public.upsert_monthly_budget(uuid, date, bigint) to authenticated;
grant execute on function public.upsert_recurring_commitment(uuid, text, bigint, integer, uuid, uuid) to authenticated;
grant execute on function public.pay_recurring_commitment(uuid, date, date, uuid) to authenticated;
grant execute on function public.upsert_recurring_income_template(uuid, text, bigint, integer, uuid, uuid) to authenticated;
grant execute on function public.record_recurring_income_template(uuid, date, date, uuid) to authenticated;
