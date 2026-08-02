begin;
select plan(5);

select has_function(
  'public',
  'lock_reconciliation_account',
  array['uuid'],
  'account-scoped reconciliation lock helper exists'
);

select ok(
  position(
    'lock_reconciliation_account'
    in pg_get_functiondef(
      'public.start_account_reconciliation(uuid,date,bigint)'::regprocedure
    )
  ) > 0,
  'start reconciliation takes the account lock'
);

select ok(
  position(
    'lock_reconciliation_account'
    in pg_get_functiondef(
      'public.set_account_entry_reconciliation_state(uuid,entry_reconciliation_state)'::regprocedure
    )
  ) > 0,
  'entry state changes take the account lock'
);

select ok(
  position(
    'lock_reconciliation_account'
    in pg_get_functiondef(
      'public.complete_account_reconciliation(uuid)'::regprocedure
    )
  ) > 0,
  'completion takes the account lock'
);

select ok(
  position(
    'lock_reconciliation_account'
    in pg_get_functiondef(
      'public.reopen_account_reconciliation(uuid)'::regprocedure
    )
  ) > 0,
  'reopen takes the account lock'
);

select * from finish();
rollback;
