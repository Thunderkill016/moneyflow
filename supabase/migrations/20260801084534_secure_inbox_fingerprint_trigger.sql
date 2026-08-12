-- The candidate trigger must be able to call the private fingerprint helper
-- without granting that helper directly to the browser role.
create or replace function public.set_inbox_candidate_fingerprint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.fingerprint_version := 1;
  new.fingerprint := public.compute_inbox_candidate_fingerprint(
    new.account_id,
    new.account_name,
    new.occurred_on,
    new.amount_minor,
    coalesce(nullif(new.raw_snippet, ''), concat_ws(' ', new.merchant, new.note))
  );
  return new;
end;
$$;

revoke all on function public.set_inbox_candidate_fingerprint() from public, anon, authenticated;
