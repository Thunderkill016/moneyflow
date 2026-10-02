-- OAuth grants are read-only except for explicitly enabled pending proposals.
-- Enforce at the table boundary: SECURITY DEFINER RPCs retain the JWT claims,
-- so they cannot bypass this guard by running as the function owner.
-- Database operators may configure moneyflow.oauth_proposal_client_ids with the
-- same comma-separated IDs used by CAPABILITY_WRITE_CLIENT_IDS. Missing = deny.
create or replace function public.guard_oauth_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_client_id text := auth.jwt() ->> 'client_id';
  v_allowed_raw text := coalesce(pg_catalog.current_setting('moneyflow.oauth_proposal_client_ids', true), '');
  v_allowed_clients text[] := (
    select coalesce(array_agg(btrim(entry)), '{}')
    from unnest(pg_catalog.string_to_array(v_allowed_raw, ',')) as entry
    where btrim(entry) <> ''
  );
begin
  if v_client_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'inbox_candidates' and tg_op = 'INSERT' then
    if v_client_id = any(v_allowed_clients)
      and new.user_id = auth.uid()
      and new.source::text = 'agent'
      and new.status::text = 'pending'
      and new.approved_transaction_id is null
      and new.approved_at is null
      and new.source_external_id like 'agent|' || v_client_id || '|%'
      and new.source_lifecycle_state::text = 'pending' then
      return new;
    end if;
  end if;

  raise exception 'oauth_mutation_forbidden' using errcode = '42501';
end;
$$;

revoke all on function public.guard_oauth_mutation() from public, anon, authenticated;

-- Cover all owned public tables, including tables normally written only by
-- privileged RPCs. New owned tables must add this trigger in their own
-- migration; the catalog pgTAP test fails closed otherwise.
do $$
declare
  v_table record;
begin
  for v_table in
    select c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and exists (
        select 1 from pg_catalog.pg_attribute a
        where a.attrelid = c.oid and a.attname = 'user_id' and not a.attisdropped
      )
    union select 'profiles' as relname
  loop
    execute pg_catalog.format(
      'drop trigger if exists guard_oauth_mutation on public.%I',
      v_table.relname
    );
    execute pg_catalog.format(
      'create trigger guard_oauth_mutation before insert or update or delete on public.%I for each row execute function public.guard_oauth_mutation()',
      v_table.relname
    );
  end loop;
end;
$$;
