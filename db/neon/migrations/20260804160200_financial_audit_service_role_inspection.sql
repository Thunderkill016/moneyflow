-- The delete-account Edge Function independently verifies zero remaining rows
-- after calling the transaction-atomic tenant purge. It needs read-only access
-- to the audit table for that verification; all audit writes remain trigger-owned.

grant select on public.financial_mutation_audit_events to service_role;
