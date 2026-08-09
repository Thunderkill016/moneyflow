-- Normalize the audit-table service-role boundary across legacy and new Supabase
-- projects. Older projects may have broad postgres default table grants that are
-- not re-applied by current local/new-project defaults.
--
-- The delete-account Edge Function needs only SELECT to verify tenant cleanup.
-- Financial audit writes remain trigger-owned through SECURITY DEFINER helpers.

revoke all privileges
on table public.financial_mutation_audit_events
from service_role;

grant select
on table public.financial_mutation_audit_events
to service_role;
