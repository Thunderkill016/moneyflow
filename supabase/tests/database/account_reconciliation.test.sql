begin;
select plan(61);

select has_table(
  'public',
  'account_reconciliations',
  'account reconciliation sessions exist'
);
select has_table(
  'public',
  'account_reconciliation_events',
  'account reconciliation events exist'
);
select has_view(
  'public',
  'account_reconciliation_summaries',
  'account reconciliation summary view exists'
);
select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.account_reconciliations'::regclass),
  'account reconciliations have RLS'
);
select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.account_reconciliation_events'::regclass),
  'account reconciliation events have RLS'
);
select ok(
  exists(
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_reconciliations'
      and policyname = 'account_reconciliations_select_own'
  ),
  'account reconciliation own-row select policy exists'
);
select ok(
  exists(
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'account_reconciliation_events'
      and policyname = 'account_reconciliation_events_select_own'
  ),
  'account reconciliation event own-row select policy exists'
);
select has_function(
  'public',
  'start_account_reconciliation',
  array['uuid', 'date', 'bigint'],
  'start reconciliation RPC exists'
);
select has_function(
  'public',
  'set_account_entry_reconciliation_state',
  array['uuid', 'entry_reconciliation_state'],
  'entry state RPC exists'
);
select has_function(
  'public',
  'complete_account_reconciliation',
  array['uuid'],
  'complete reconciliation RPC exists'
);
select has_function(
  'public',
  'reopen_account_reconciliation',
  array['uuid'],
  'reopen reconciliation RPC exists'
);
select has_column(
  'public',
  'transaction_entries',
  'reconciliation_state',
  'ledger entries carry reconciliation state'
);
select has_column(
  'public',
  'transaction_entries',
  'cleared_at',
  'ledger entries carry cleared timestamp'
);
select has_column(
  'public',
  'transaction_entries',
  'reconciliation_id',
  'ledger entries link to a reconciliation session'
);
select col_type_is(
  'public',
  'transaction_entries',
  'reconciliation_state',
  'entry_reconciliation_state',
  'entry reconciliation state uses the domain enum'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid,
  'authenticated', 'authenticated', 'reconciliation-a@example.invalid',
  crypt('discarded-test-password-a', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation A"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '44444444-4444-4444-8444-444444444444'::uuid,
  'authenticated', 'authenticated', 'reconciliation-b@example.invalid',
  crypt('discarded-test-password-b', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation B"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer
   from public.accounts
   where user_id = '33333333-3333-4333-8333-333333333333'),
  1,
  'tenant A receives one default account'
);

set local request.jwt.claims =
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.reconciliation_source_account',
  (select id::text
   from public.accounts
   where user_id = '33333333-3333-4333-8333-333333333333'
   order by created_at, id
   limit 1),
  true
);

select lives_ok(
  $$
    select public.create_financial_account(
      'Reconciliation destination',
      'savings'::public.account_kind,
      0,
      'VND'
    )
  $$,
  'a destination account can be created'
);

select set_config(
  'moneyflow_test.reconciliation_destination_account',
  (select id::text
   from public.accounts
   where user_id = '33333333-3333-4333-8333-333333333333'
     and name = 'Reconciliation destination'),
  true
);

select set_config(
  'moneyflow_test.reconciliation_income_category',
  (select id::text
   from public.categories
   where user_id = '33333333-3333-4333-8333-333333333333'
     and kind = 'income'
   order by created_at, id
   limit 1),
  true
);

select set_config(
  'moneyflow_test.reconciliation_expense_category',
  (select id::text
   from public.categories
   where user_id = '33333333-3333-4333-8333-333333333333'
     and kind = 'expense'
   order by created_at, id
   limit 1),
  true
);

select lives_ok(
  $$
    select public.create_money_transaction(
      current_setting('moneyflow_test.reconciliation_source_account')::uuid,
      current_setting('moneyflow_test.reconciliation_income_category')::uuid,
      'income'::public.transaction_kind,
      100000,
      '2026-07-15'::date,
      'Reconciliation income',
      '30000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'income fixture can be created'
);

select lives_ok(
  $$
    select public.create_money_transaction(
      current_setting('moneyflow_test.reconciliation_source_account')::uuid,
      current_setting('moneyflow_test.reconciliation_expense_category')::uuid,
      'expense'::public.transaction_kind,
      30000,
      '2026-07-16'::date,
      'Reconciliation expense',
      '30000000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'expense fixture can be created'
);

select lives_ok(
  $$
    select public.create_account_transfer(
      current_setting('moneyflow_test.reconciliation_source_account')::uuid,
      current_setting('moneyflow_test.reconciliation_destination_account')::uuid,
      10000,
      '2026-07-17'::date,
      'Reconciliation transfer',
      '30000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  'transfer fixture can be created'
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where user_id = '33333333-3333-4333-8333-333333333333'
     and reconciliation_state = 'pending'),
  4,
  'new ledger entries default to pending'
);

select set_config(
  'moneyflow_test.reconciliation_income_transaction',
  (select id::text
   from public.financial_transactions
   where user_id = '33333333-3333-4333-8333-333333333333'
     and idempotency_key = '30000000-0000-4000-8000-000000000001'::uuid),
  true
);

select set_config(
  'moneyflow_test.reconciliation_expense_transaction',
  (select id::text
   from public.financial_transactions
   where user_id = '33333333-3333-4333-8333-333333333333'
     and idempotency_key = '30000000-0000-4000-8000-000000000002'::uuid),
  true
);

select set_config(
  'moneyflow_test.reconciliation_transfer_transaction',
  (select id::text
   from public.financial_transactions
   where user_id = '33333333-3333-4333-8333-333333333333'
     and idempotency_key = '30000000-0000-4000-8000-000000000003'::uuid),
  true
);

select set_config(
  'moneyflow_test.reconciliation_income_entry',
  (select id::text
   from public.transaction_entries
   where transaction_id =
     current_setting('moneyflow_test.reconciliation_income_transaction')::uuid),
  true
);

select set_config(
  'moneyflow_test.reconciliation_expense_entry',
  (select id::text
   from public.transaction_entries
   where transaction_id =
     current_setting('moneyflow_test.reconciliation_expense_transaction')::uuid),
  true
);

select set_config(
  'moneyflow_test.reconciliation_transfer_source_entry',
  (select id::text
   from public.transaction_entries
   where transaction_id =
       current_setting('moneyflow_test.reconciliation_transfer_transaction')::uuid
     and amount_minor < 0),
  true
);

select set_config(
  'moneyflow_test.reconciliation_transfer_destination_entry',
  (select id::text
   from public.transaction_entries
   where transaction_id =
       current_setting('moneyflow_test.reconciliation_transfer_transaction')::uuid
     and amount_minor > 0),
  true
);

select set_config(
  'moneyflow_test.reconciliation_first',
  public.start_account_reconciliation(
    current_setting('moneyflow_test.reconciliation_source_account')::uuid,
    '2026-07-31'::date,
    60000
  )::text,
  true
);

select is(
  (select count(*)::integer
   from public.account_reconciliations
   where user_id = '33333333-3333-4333-8333-333333333333'
     and status = 'open'),
  1,
  'starting creates one open reconciliation'
);

select is(
  (select count(*)::integer
   from public.account_reconciliation_events
   where reconciliation_id =
     current_setting('moneyflow_test.reconciliation_first')::uuid
     and kind = 'started'),
  1,
  'starting appends one started event'
);

select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting('moneyflow_test.reconciliation_first')::uuid),
  0::bigint,
  'pending entries do not affect the cleared balance'
);

select is(
  (select difference_minor
   from public.account_reconciliation_summaries
   where id = current_setting('moneyflow_test.reconciliation_first')::uuid),
  60000::bigint,
  'summary exposes the exact initial statement difference'
);

select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.reconciliation_income_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'an owned active entry can be marked cleared'
);

select throws_ok(
  $$
    select public.complete_account_reconciliation(
      current_setting('moneyflow_test.reconciliation_first')::uuid
    )
  $$,
  'P0001',
  'reconciliation_difference_nonzero',
  'completion fails while the statement difference is nonzero'
);

select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.reconciliation_expense_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'the expense entry can be cleared'
);

select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.reconciliation_transfer_source_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'the source transfer leg can be cleared independently'
);

select is(
  (select reconciliation_state
   from public.transaction_entries
   where id =
     current_setting('moneyflow_test.reconciliation_transfer_destination_entry')::uuid),
  'pending'::public.entry_reconciliation_state,
  'the destination transfer leg remains pending'
);

select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting('moneyflow_test.reconciliation_first')::uuid),
  60000::bigint,
  'cleared entries produce the statement balance'
);

select is(
  (select difference_minor
   from public.account_reconciliation_summaries
   where id = current_setting('moneyflow_test.reconciliation_first')::uuid),
  0::bigint,
  'summary reaches an exact zero difference'
);

select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.reconciliation_first')::uuid
  ),
  true,
  'a zero-difference reconciliation completes'
);

select is(
  (select status
   from public.account_reconciliations
   where id = current_setting('moneyflow_test.reconciliation_first')::uuid),
  'completed'::public.account_reconciliation_status,
  'the session becomes completed'
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where reconciliation_id =
     current_setting('moneyflow_test.reconciliation_first')::uuid
     and reconciliation_state = 'reconciled'),
  3,
  'completion locks exactly the three cleared source-account entries'
);

select is(
  (select reconciliation_state
   from public.transaction_entries
   where id =
     current_setting('moneyflow_test.reconciliation_transfer_source_entry')::uuid),
  'reconciled'::public.entry_reconciliation_state,
  'the source transfer leg is reconciled'
);

select is(
  (select reconciliation_state
   from public.transaction_entries
   where id =
     current_setting('moneyflow_test.reconciliation_transfer_destination_entry')::uuid),
  'pending'::public.entry_reconciliation_state,
  'the other transfer leg remains independent after completion'
);

select is(
  (select count(*)::integer
   from public.account_reconciliation_events
   where reconciliation_id =
     current_setting('moneyflow_test.reconciliation_first')::uuid
     and kind = 'completed'),
  1,
  'completion appends an audit event'
);

select throws_ok(
  $$
    select public.soft_delete_money_transaction(
      current_setting('moneyflow_test.reconciliation_income_transaction')::uuid
    )
  $$,
  'P0001',
  'transaction_reconciled',
  'a reconciled transaction cannot be soft-deleted'
);

select throws_ok(
  $$
    select public.update_money_transaction(
      current_setting('moneyflow_test.reconciliation_income_transaction')::uuid,
      current_setting('moneyflow_test.reconciliation_source_account')::uuid,
      current_setting('moneyflow_test.reconciliation_income_category')::uuid,
      'income'::public.transaction_kind,
      100000,
      '2026-07-15'::date,
      'Mutation must be blocked'
    )
  $$,
  'P0001',
  'transaction_reconciled',
  'a reconciled transaction cannot be edited'
);

select throws_ok(
  $$
    select public.update_account_transfer(
      current_setting('moneyflow_test.reconciliation_transfer_transaction')::uuid,
      current_setting('moneyflow_test.reconciliation_source_account')::uuid,
      current_setting('moneyflow_test.reconciliation_destination_account')::uuid,
      10000,
      '2026-07-17'::date,
      'Transfer mutation must be blocked'
    )
  $$,
  'P0001',
  'transaction_reconciled',
  'a transfer is locked when either account leg is reconciled'
);

select throws_ok(
  $$
    select public.update_financial_account(
      current_setting('moneyflow_test.reconciliation_source_account')::uuid,
      'Cannot rewrite opening balance',
      (select kind
       from public.accounts
       where id =
         current_setting('moneyflow_test.reconciliation_source_account')::uuid),
      1
    )
  $$,
  'P0001',
  'reconciliation_requires_adjustment_transaction',
  'initial balance cannot be overwritten after reconciliation starts'
);

select is(
  public.update_financial_account(
    current_setting('moneyflow_test.reconciliation_source_account')::uuid,
    'Renamed reconciled account',
    (select kind
     from public.accounts
     where id =
       current_setting('moneyflow_test.reconciliation_source_account')::uuid),
    0
  ),
  true,
  'non-balance account metadata remains editable'
);

select throws_ok(
  $$
    select public.set_account_entry_reconciliation_state(
      current_setting('moneyflow_test.reconciliation_income_entry')::uuid,
      'pending'
    )
  $$,
  'P0001',
  'entry_reconciled',
  'reconciled state cannot be manually cleared or downgraded'
);

select is(
  public.reopen_account_reconciliation(
    current_setting('moneyflow_test.reconciliation_first')::uuid
  ),
  true,
  'the latest completed reconciliation can reopen'
);

select is(
  (select status
   from public.account_reconciliations
   where id = current_setting('moneyflow_test.reconciliation_first')::uuid),
  'open'::public.account_reconciliation_status,
  'reopened session returns to open'
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where user_id = '33333333-3333-4333-8333-333333333333'
     and account_id =
       current_setting('moneyflow_test.reconciliation_source_account')::uuid
     and reconciliation_state = 'cleared'
     and reconciliation_id is null),
  3,
  'reopen restores the session entries to cleared'
);

select is(
  (select count(*)::integer
   from public.account_reconciliation_events
   where reconciliation_id =
     current_setting('moneyflow_test.reconciliation_first')::uuid
     and kind = 'reopened'),
  1,
  'reopen appends an audit event'
);

select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.reconciliation_first')::uuid
  ),
  true,
  'the reopened zero-difference session can complete again'
);

select is(
  (select count(*)::integer
   from public.account_reconciliation_events
   where reconciliation_id =
     current_setting('moneyflow_test.reconciliation_first')::uuid
     and kind = 'completed'),
  2,
  'each successful completion remains in history'
);

select throws_ok(
  $$
    select public.start_account_reconciliation(
      current_setting('moneyflow_test.reconciliation_source_account')::uuid,
      '2026-07-31'::date,
      60000
    )
  $$,
  'P0001',
  'statement_date_not_after_previous_reconciliation',
  'a later session must use a later statement date'
);

select set_config(
  'moneyflow_test.reconciliation_second',
  public.start_account_reconciliation(
    current_setting('moneyflow_test.reconciliation_source_account')::uuid,
    '2026-08-01'::date,
    60000
  )::text,
  true
);

select is(
  (select count(*)::integer
   from public.account_reconciliations
   where id = current_setting('moneyflow_test.reconciliation_second')::uuid
     and status = 'open'),
  1,
  'a later statement opens a new reconciliation'
);

select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.reconciliation_second')::uuid
  ),
  true,
  'prior reconciled entries contribute to the next statement balance'
);

select throws_ok(
  $$
    select public.reopen_account_reconciliation(
      current_setting('moneyflow_test.reconciliation_first')::uuid
    )
  $$,
  'P0001',
  'only_latest_reconciliation_can_reopen',
  'an older reconciliation cannot reopen after a later completion'
);

reset role;
set local request.jwt.claims =
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::integer
   from public.account_reconciliations
   where user_id = '33333333-3333-4333-8333-333333333333'),
  0,
  'tenant B cannot read tenant A reconciliation sessions'
);

select is(
  (select count(*)::integer
   from public.account_reconciliation_events
   where user_id = '33333333-3333-4333-8333-333333333333'),
  0,
  'tenant B cannot read tenant A reconciliation history'
);

select throws_ok(
  $$
    select public.start_account_reconciliation(
      current_setting('moneyflow_test.reconciliation_source_account')::uuid,
      '2026-08-02'::date,
      60000
    )
  $$,
  'P0001',
  'account_not_found',
  'tenant B cannot reconcile tenant A account'
);

reset role;
set local role service_role;

select ok(
  public.purge_user_tenant_data(
    '33333333-3333-4333-8333-333333333333'::uuid
  ) > 0,
  'tenant purge removes reconciliation-owned data'
);

reset role;

select is(
  (select count(*)::integer
   from public.account_reconciliations
   where user_id = '33333333-3333-4333-8333-333333333333'),
  0,
  'purge leaves no reconciliation session'
);

select is(
  (select count(*)::integer
   from public.account_reconciliation_events
   where user_id = '33333333-3333-4333-8333-333333333333'),
  0,
  'purge leaves no reconciliation event'
);

select ok(
  (select count(*)
   from public.accounts
   where user_id = '44444444-4444-4444-8444-444444444444') > 0,
  'purging tenant A preserves tenant B'
);

select * from finish();
rollback;
