begin;
select plan(35);

select has_table(
  'public',
  'financial_mutation_audit_events',
  'financial mutation audit table exists'
);
select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.financial_mutation_audit_events'::regclass),
  'financial mutation audit table has RLS enabled'
);
select is(
  (select count(*)::integer
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'financial_mutation_audit_events'
     and column_name ~ '(note|merchant|raw|snippet|payload|body|metadata|amount)'),
  0,
  'audit schema has no finance text, amount or arbitrary payload column'
);
select ok(
  has_table_privilege(
    'authenticated',
    'public.financial_mutation_audit_events',
    'SELECT'
  ),
  'authenticated can read own audit metadata'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.financial_mutation_audit_events',
    'INSERT,UPDATE,DELETE'
  ),
  'authenticated cannot forge, rewrite or delete audit metadata'
);
select ok(
  not has_table_privilege(
    'anon',
    'public.financial_mutation_audit_events',
    'SELECT'
  ),
  'anonymous users cannot read audit metadata'
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
  '26800000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'audit-owner@example.invalid',
  crypt('discarded-audit-password-a', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Audit Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '26800000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'audit-other@example.invalid',
  crypt('discarded-audit-password-b', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Audit Other"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims =
  '{"sub":"26800000-0000-4000-8000-000000000001","role":"authenticated"}';
set local request.headers =
  '{"x-request-id":"audit-request-owner-001"}';
set local role authenticated;

select lives_ok(
  $$
    select public.create_money_transaction(
      (select id from public.accounts
       where user_id = '26800000-0000-4000-8000-000000000001'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '26800000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      'expense'::public.transaction_kind,
      30000::bigint,
      current_date,
      'SECRET-NOTE-MUST-NOT-APPEAR',
      '26810000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'transaction creation succeeds with audit triggers enabled'
);

select set_config(
  'moneyflow_test.audit_transaction_a',
  (select id::text
   from public.financial_transactions
   where user_id = '26800000-0000-4000-8000-000000000001'
     and idempotency_key = '26810000-0000-4000-8000-000000000001'::uuid),
  true
);
select set_config(
  'moneyflow_test.audit_entry_a',
  (select id::text
   from public.transaction_entries
   where user_id = '26800000-0000-4000-8000-000000000001'
     and transaction_id = current_setting('moneyflow_test.audit_transaction_a')::uuid
   order by id limit 1),
  true
);

select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'transaction_created'
     and entity_id = current_setting('moneyflow_test.audit_transaction_a')::uuid),
  1,
  'transaction creation emits exactly one header event'
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'entry_created'
     and related_transaction_id =
       current_setting('moneyflow_test.audit_transaction_a')::uuid),
  1,
  'transaction creation emits one ledger-entry event'
);
select is(
  (select request_id
   from public.financial_mutation_audit_events
   where action = 'transaction_created'
     and entity_id = current_setting('moneyflow_test.audit_transaction_a')::uuid),
  'audit-request-owner-001',
  'audit retains the bounded transport request ID'
);
select is(
  (select actor_user_id
   from public.financial_mutation_audit_events
   where action = 'transaction_created'
     and entity_id = current_setting('moneyflow_test.audit_transaction_a')::uuid),
  '26800000-0000-4000-8000-000000000001'::uuid,
  'audit actor derives from auth.uid()'
);
select ok(
  not exists (
    select 1
    from public.financial_mutation_audit_events event
    where to_jsonb(event)::text like '%SECRET-NOTE-MUST-NOT-APPEAR%'
  ),
  'sensitive transaction text is not copied into audit rows'
);

select is(
  public.create_money_transaction(
    (select id from public.accounts
     where user_id = '26800000-0000-4000-8000-000000000001'
     order by created_at, id limit 1),
    (select id from public.categories
     where user_id = '26800000-0000-4000-8000-000000000001'
       and kind = 'expense'
     order by created_at, id limit 1),
    'expense'::public.transaction_kind,
    30000::bigint,
    current_date,
    'retry text must not alter the original transaction',
    '26810000-0000-4000-8000-000000000001'::uuid
  ),
  current_setting('moneyflow_test.audit_transaction_a')::uuid,
  'idempotent retry returns the original transaction'
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'transaction_created'
     and entity_id = current_setting('moneyflow_test.audit_transaction_a')::uuid),
  1,
  'idempotent retry creates no duplicate audit event'
);

select is(
  public.set_transaction_review_status_bulk(
    array[current_setting('moneyflow_test.audit_transaction_a')::uuid],
    'needs_review'::public.transaction_review_status
  ),
  1,
  'review state changes through its bounded RPC'
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'transaction_review_changed'
     and entity_id = current_setting('moneyflow_test.audit_transaction_a')::uuid),
  1,
  'review state change is audited'
);

select is(
  public.bulk_update_transaction_category(
    array[current_setting('moneyflow_test.audit_transaction_a')::uuid],
    (select id from public.categories
     where user_id = '26800000-0000-4000-8000-000000000001'
       and kind = 'expense'
     order by created_at, id offset 1 limit 1)
  ),
  1,
  'category correction changes one ordinary ledger entry'
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'entry_category_changed'
     and related_transaction_id =
       current_setting('moneyflow_test.audit_transaction_a')::uuid),
  1,
  'entry-only category correction is audited'
);

select is(
  public.soft_delete_money_transaction(
    current_setting('moneyflow_test.audit_transaction_a')::uuid
  ),
  true,
  'soft delete succeeds once'
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'transaction_soft_deleted'
     and entity_id = current_setting('moneyflow_test.audit_transaction_a')::uuid),
  1,
  'soft delete is audited'
);
select is(
  public.restore_money_transaction(
    current_setting('moneyflow_test.audit_transaction_a')::uuid
  ),
  true,
  'restore succeeds once'
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'transaction_restored'
     and entity_id = current_setting('moneyflow_test.audit_transaction_a')::uuid),
  1,
  'restore is audited'
);

select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.audit_entry_a')::uuid,
    'cleared'::public.entry_reconciliation_state
  ),
  'cleared'::public.entry_reconciliation_state,
  'account leg can be cleared before reconciliation'
);
select ok(
  (select count(*)
   from public.financial_mutation_audit_events
   where action = 'entry_reconciliation_changed'
     and entity_id = current_setting('moneyflow_test.audit_entry_a')::uuid) >= 1,
  'entry reconciliation-state mutation is audited'
);

select set_config(
  'moneyflow_test.audit_reconciliation_a',
  public.start_account_reconciliation(
    (select account_id from public.transaction_entries
     where id = current_setting('moneyflow_test.audit_entry_a')::uuid),
    current_date,
    -30000::bigint
  )::text,
  true
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'reconciliation_started'
     and entity_id =
       current_setting('moneyflow_test.audit_reconciliation_a')::uuid),
  1,
  'reconciliation start is audited'
);
select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.audit_reconciliation_a')::uuid
  ),
  true,
  'exact-zero reconciliation completes'
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'reconciliation_completed'
     and entity_id =
       current_setting('moneyflow_test.audit_reconciliation_a')::uuid),
  1,
  'reconciliation completion is audited'
);
select is(
  public.reopen_account_reconciliation(
    current_setting('moneyflow_test.audit_reconciliation_a')::uuid
  ),
  true,
  'latest reconciliation reopens'
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where action = 'reconciliation_reopened'
     and entity_id =
       current_setting('moneyflow_test.audit_reconciliation_a')::uuid),
  1,
  'reconciliation reopen is audited'
);

reset role;
set local request.jwt.claims =
  '{"sub":"26800000-0000-4000-8000-000000000002","role":"authenticated"}';
set local request.headers =
  '{"x-request-id":"audit-request-other-001"}';
set local role authenticated;

select lives_ok(
  $$
    select public.create_money_transaction(
      (select id from public.accounts
       where user_id = '26800000-0000-4000-8000-000000000002'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '26800000-0000-4000-8000-000000000002'
         and kind = 'expense'
       order by created_at, id limit 1),
      'expense'::public.transaction_kind,
      12000::bigint,
      current_date,
      'Other tenant expense',
      '26810000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'second tenant can create its own audited transaction'
);

reset role;
set local request.jwt.claims =
  '{"sub":"26800000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where user_id = '26800000-0000-4000-8000-000000000002'),
  0,
  'RLS hides other-tenant audit events'
);

reset role;
set local role service_role;
select lives_ok(
  $$
    select public.purge_user_tenant_data(
      '26800000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'service-role tenant purge removes current audit and finance rows atomically'
);
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events
   where user_id = '26800000-0000-4000-8000-000000000002'),
  0,
  'tenant purge removes audit events before Auth identity deletion'
);

reset role;
select is(
  (select count(*)::integer
   from auth.users
   where id = '26800000-0000-4000-8000-000000000002'),
  1,
  'tenant purge does not itself delete the Auth identity'
);

select * from finish();
rollback;
