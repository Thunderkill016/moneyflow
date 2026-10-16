-- D14: merge_categories — fold one category into another.
--
-- Mon Cash / Monarch let users merge duplicate categories so "Ăn uống" and
-- "Ăn uống 2" stop splitting history. The seam moves every referencing row
-- to the target, then archives the source (soft-delete convention — the
-- row stays as audit trail, and its name stays reserved by the global
-- (user_id, name, kind) unique key, which a merged-away name should anyway:
-- resurrecting it would silently re-split the merged history).
--
-- Referencing surfaces and their merge semantics:
--   transaction_entries        reassign — ledger rows follow the target.
--   monthly_budgets            unique (user, category, period_kind,
--                              anchor): a collision keeps the TARGET's own
--                              limit and drops the source row — the target
--                              limit is the number the user last judged.
--   event_budget_categories    PK (event_budget_id, category_id): a
--                              duplicate pair drops the source leg.
--   recurring_commitments,
--   recurring_income_templates,
--   inbox_rules,
--   inbox_candidates           plain reassign — the user's categorization
--                              intent carries over (candidates would SET
--                              NULL on a plain delete, which a merge must
--                              never do).
--
-- Guards: same tenant only, source <> target, same kind, target live,
-- and a DEFAULT source refuses (is_default rows are the seeded pack —
-- merging one away would strand the fallback category). All moves run in
-- one transaction; the jsonb result reports moved/dropped counts so the
-- caller can disclose them honestly instead of pretending merges are free.

create function public.merge_categories(
  p_source_id uuid,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.categories%rowtype;
  v_target public.categories%rowtype;
  v_count bigint;
  v_dropped bigint;
  v_moved jsonb := '{}'::jsonb;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_source_id is null or p_target_id is null then raise exception 'category_not_found'; end if;
  if p_source_id = p_target_id then raise exception 'same_category'; end if;

  -- Lock both rows in a fixed order (ascending id) so two concurrent
  -- merges in opposite directions can't deadlock.
  select * into v_source
  from public.categories
  where id = least(p_source_id, p_target_id) and user_id = v_user_id
  for update;
  select * into v_target
  from public.categories
  where id = greatest(p_source_id, p_target_id) and user_id = v_user_id
  for update;
  if v_source.id is null or v_target.id is null then raise exception 'category_not_found'; end if;
  -- Rebind to the actual roles (least/greatest only decided lock order).
  if v_source.id = p_target_id then
    declare v_swap public.categories%rowtype; begin
      v_swap := v_source; v_source := v_target; v_target := v_swap;
    end;
  end if;

  if v_source.kind <> v_target.kind then raise exception 'category_kind_mismatch'; end if;
  if v_target.is_archived then raise exception 'category_archived'; end if;
  if v_source.is_default then raise exception 'default_category_locked'; end if;

  -- Ledger rows: every entry leg pointing at the source follows the merge.
  update public.transaction_entries
  set category_id = p_target_id
  where category_id = p_source_id and user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('entries', v_count);

  -- Budgets: target wins a same-(period_kind, anchor) collision, then the
  -- surviving source rows move over.
  delete from public.monthly_budgets s
  where s.category_id = p_source_id and s.user_id = v_user_id
    and exists (
      select 1 from public.monthly_budgets t
      where t.category_id = p_target_id and t.user_id = v_user_id
        and t.period_kind = s.period_kind
        and t.month_start = s.month_start
    );
  get diagnostics v_dropped = row_count;
  update public.monthly_budgets
  set category_id = p_target_id
  where category_id = p_source_id and user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object(
    'budgets', v_count, 'budgets_dropped', v_dropped);

  -- Event budget category pairs: a duplicate (event, target) pair drops the
  -- source leg; the rest move.
  delete from public.event_budget_categories s
  where s.category_id = p_source_id and s.user_id = v_user_id
    and exists (
      select 1 from public.event_budget_categories t
      where t.event_budget_id = s.event_budget_id
        and t.user_id = v_user_id
        and t.category_id = p_target_id
    );
  get diagnostics v_dropped = row_count;
  update public.event_budget_categories
  set category_id = p_target_id
  where category_id = p_source_id and user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object(
    'event_lines', v_count, 'event_lines_dropped', v_dropped);

  update public.recurring_commitments
  set category_id = p_target_id
  where category_id = p_source_id and user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('commitments', v_count);

  update public.recurring_income_templates
  set category_id = p_target_id
  where category_id = p_source_id and user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('income_templates', v_count);

  update public.inbox_rules
  set category_id = p_target_id
  where category_id = p_source_id and user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('rules', v_count);

  update public.inbox_candidates
  set category_id = p_target_id
  where category_id = p_source_id and user_id = v_user_id;
  get diagnostics v_count = row_count;
  v_moved := v_moved || jsonb_build_object('candidates', v_count);

  -- Source becomes an archived tombstone — never hard-deleted.
  update public.categories
  set is_archived = true
  where id = p_source_id and user_id = v_user_id;

  return v_moved || jsonb_build_object(
    'source', p_source_id, 'target', p_target_id);
end;
$$;

revoke all on function public.merge_categories(uuid, uuid)
  from public, anon;
grant execute on function public.merge_categories(uuid, uuid)
  to authenticated;
