-- Supabase's project defaults grant broad table privileges to browser roles.
-- RLS does not protect TRUNCATE, and browser roles never need schema/trigger or
-- maintenance privileges. Preserve the existing application CRUD grants while
-- removing privileges outside the Data API contract.

revoke all privileges on all tables in schema public from anon;
revoke truncate, references, trigger, maintain
  on all tables in schema public
  from authenticated;

-- Ledger/reporting views are read models only.
revoke all privileges on
  public.account_balances,
  public.budget_progress,
  public.recurring_commitment_feed,
  public.recurring_income_template_feed,
  public.transaction_feed
from authenticated;

grant select on
  public.account_balances,
  public.budget_progress,
  public.recurring_commitment_feed,
  public.recurring_income_template_feed,
  public.transaction_feed
to authenticated;

-- Trigger helpers must not be callable through the Data API.
revoke execute on all functions in schema public from public, anon;
revoke execute on function public.set_updated_at() from authenticated;

-- Prevent future postgres-owned migrations from recreating the dangerous grants.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
