-- #442 hardening: the archive-mode marker is necessary but never sufficient.
-- Only the effective owner of the SECURITY DEFINER archive restore may suppress
-- inbox candidate updated_at while replaying preserved source-lineage metadata.

create or replace function public.set_inbox_candidate_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_restore_owner name;
begin
  select pg_catalog.pg_get_userbyid(proc.proowner)
    into v_restore_owner
  from pg_catalog.pg_proc as proc
  where proc.oid = pg_catalog.to_regprocedure('public.restore_user_archive(jsonb)');

  if v_restore_owner is not null
    and current_user = v_restore_owner
    and pg_catalog.current_setting(
      'moneyflow.archive_restore_source_lineage', true
    ) = 'on' then
    return new;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_inbox_candidate_updated_at()
from public, anon, authenticated, service_role;
