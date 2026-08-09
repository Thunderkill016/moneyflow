begin;
select plan(3);

select ok(
  has_table_privilege(
    'service_role',
    'public.financial_mutation_audit_events',
    'SELECT'
  ),
  'service role can read audit events for cleanup verification'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.financial_mutation_audit_events',
    'INSERT,UPDATE,DELETE'
  ),
  'service role cannot mutate audit rows directly'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.financial_mutation_audit_events',
    'TRUNCATE,REFERENCES,TRIGGER,MAINTAIN'
  ),
  'service role has no non-read table-management privileges on audit events'
);

select * from finish();
rollback;
