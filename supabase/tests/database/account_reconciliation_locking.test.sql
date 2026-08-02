begin;
select plan(5);

select has_function(
  'public',
  'lock_reconciliation_account',
  array['uuid'],
  'account-scoped reconciliation lock helper exists'
);

select like(
  pg_get_functiondef('public.start_account_reconciliation(uuid,date,bigint)'::regprocedure),
  '%lock_reconciliation_account%',
  'start reconciliation takes the account lock'
);

select like(
  pg_get_functiondef('public.set_account_entry_reconciliation_state(uuid,entry_reconciliation_state)'::regprocedure),
  '%lock_reconciliation_account%',
  'entry state changes take the account lock'
);

select like(
  pg_get_functiondef('public.complete_account_reconciliation(uuid)'::regprocedure),
  '%lock_reconciliation_account%',
  'completion takes the account lock'
);

select like(
  pg_get_functiondef('public.reopen_account_reconciliation(uuid)'::regprocedure),
  '%lock_reconciliation_account%',
  'reopen takes the account lock'
);

select * from finish();
rollback;
