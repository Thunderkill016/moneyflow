-- Request IDs are correlation tokens, never a free-text logging channel.

alter table public.financial_mutation_audit_events
  add constraint financial_mutation_audit_request_id_token_check
  check (
    request_id is null
    or request_id ~ '^[A-Za-z0-9._:-]{1,128}$'
  );

create or replace function public.current_financial_audit_request_id()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_headers_text text;
  v_headers jsonb;
  v_request_id text;
begin
  v_headers_text := current_setting('request.headers', true);
  if nullif(trim(coalesce(v_headers_text, '')), '') is null then
    return null;
  end if;

  begin
    v_headers := v_headers_text::jsonb;
  exception
    when others then
      return null;
  end;

  v_request_id := nullif(trim(v_headers ->> 'x-request-id'), '');
  if v_request_id is null
     or v_request_id !~ '^[A-Za-z0-9._:-]{1,128}$' then
    return null;
  end if;

  return v_request_id;
end;
$$;

revoke all on function public.current_financial_audit_request_id()
from public, anon, authenticated, service_role;
