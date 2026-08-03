begin;
select plan(43);

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
  'account reconciliation summaries exist'
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
  'account-leg state RPC exists'
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
  'financial_transactions',
  'review_status',
  'current-main review state exists before reconciliation'
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
  '77777777-7777-4777-8777-777777777777'::uuid,
  'authenticated', 'authenticated', 'reconciliation-current-a@example.invalid',
  crypt('discarded-test-password-a', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation Current A"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '88888888-8888-4888-8888-888888888888'::uuid,
  'authenticated', 'authenticated', 'reconciliation-current-b@example.invalid',
  crypt('discarded-test-password-b', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation Current B"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer
   from public.accounts
   where user_id = '77777777-7777-4777-8777-777777777777'),
  1,
  'tenant A receives one default account'
);

set local request.jwt.claims =
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.current_reconciliation_account',
  (select id::text
   from public.accounts
   where user_id = '77777777-7777-4777-8777-777777777777'
   order by created_at, id
   limit 1),
  true
);

select set_config(
  'moneyflow_test.current_reconciliation_income_category',
  (select id::text
   from public.categories
   where user_id = '77777777-7777-4777-8777-777777777777'
     and kind = 'income'
   order by created_at, id
   limit 1),
  true
);

select lives_ok(
  format(
    $sql$
      select public.create_money_transaction(
        %L::uuid,
        %L::uuid,
        'income'::public.transaction_kind,
        100000,
        '2026-07-10'::date,
        'First statement fact',
        '70000000-0000-4000-8000-000000000001'::uuid
      )
    $sql$,
    current_setting('moneyflow_test.current_reconciliation_account'),
    current_setting('moneyflow_test.current_reconciliation_income_category')
  ),
  'first statement transaction can be created'
);

select set_config(
  'moneyflow_test.current_reconciliation_tx_one',
  (select id::text
   from public.financial_transactions
   where user_id = '77777777-7777-4777-8777-777777777777'
     and idempotency_key = '70000000-0000-4000-8000-000000000001'::uuid),
  true
);
select set_config(
  'moneyflow_test.current_reconciliation_entry_one',
  (select id::text
   from public.transaction_entries
   where transaction_id = current_setting(
     'moneyflow_test.current_reconciliation_tx_one'
   )::uuid),
  true
);
select set_config(
  'moneyflow_test.current_reconciliation_session_one',
  public.start_account_reconciliation(
    current_setting('moneyflow_test.current_reconciliation_account')::uuid,
    '2026-07-31'::date,
    100000
  )::text,
  true
);

select is(
  (select count(*)::integer
   from public.account_reconciliations
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_one'
   )::uuid
     and status = 'open'),
  1,
  'first statement session opens'
);
select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.current_reconciliation_entry_one')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'first account leg can be cleared'
);
select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.current_reconciliation_session_one')::uuid
  ),
  true,
  'first zero-difference statement completes'
);
select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_one'
   )::uuid),
  100000::bigint,
  'completed first statement stores its cleared balance'
);
select is(
  (select difference_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_one'
   )::uuid),
  0::bigint,
  'completed first statement stores zero difference'
);

select is(
  public.set_transaction_review_status_bulk(
    array[current_setting('moneyflow_test.current_reconciliation_tx_one')::uuid],
    'needs_review'::public.transaction_review_status
  ),
  1,
  'review status remains mutable after reconciliation'
);
select is(
  (select review_status
   from public.financial_transactions
   where id = current_setting(
     'moneyflow_test.current_reconciliation_tx_one'
   )::uuid),
  'needs_review'::public.transaction_review_status,
  'reconciled transaction receives the requested review status'
);
select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_entry_one'
   )::uuid),
  'reconciled'::public.entry_reconciliation_state,
  'review mutation does not reset reconciliation state'
);
select throws_ok(
  format(
    $sql$
      select public.update_money_transaction(
        %L::uuid,
        %L::uuid,
        %L::uuid,
        'income'::public.transaction_kind,
        90000,
        '2026-07-10'::date,
        'Financial rewrite must fail'
      )
    $sql$,
    current_setting('moneyflow_test.current_reconciliation_tx_one'),
    current_setting('moneyflow_test.current_reconciliation_account'),
    current_setting('moneyflow_test.current_reconciliation_income_category')
  ),
  'P0001',
  'transaction_reconciled',
  'financial mutation remains blocked after reconciliation'
);

select lives_ok(
  format(
    $sql$
      select public.create_money_transaction(
        %L::uuid,
        %L::uuid,
        'income'::public.transaction_kind,
        50000,
        '2026-07-15'::date,
        'Backdated later-session fact',
        '70000000-0000-4000-8000-000000000002'::uuid
      )
    $sql$,
    current_setting('moneyflow_test.current_reconciliation_account'),
    current_setting('moneyflow_test.current_reconciliation_income_category')
  ),
  'later-session backdated transaction can be created'
);
select set_config(
  'moneyflow_test.current_reconciliation_tx_two',
  (select id::text
   from public.financial_transactions
   where user_id = '77777777-7777-4777-8777-777777777777'
     and idempotency_key = '70000000-0000-4000-8000-000000000002'::uuid),
  true
);
select set_config(
  'moneyflow_test.current_reconciliation_entry_two',
  (select id::text
   from public.transaction_entries
   where transaction_id = current_setting(
     'moneyflow_test.current_reconciliation_tx_two'
   )::uuid),
  true
);
select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.current_reconciliation_entry_two')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'backdated account leg can be cleared for the later statement'
);
select set_config(
  'moneyflow_test.current_reconciliation_session_two',
  public.start_account_reconciliation(
    current_setting('moneyflow_test.current_reconciliation_account')::uuid,
    '2026-08-02'::date,
    150000
  )::text,
  true
);
select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_two'
   )::uuid),
  150000::bigint,
  'open later statement counts prior reconciled and current cleared legs once'
);
select is(
  (select reconciled_account_leg_count
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_two'
   )::uuid),
  1::bigint,
  'open later statement sees one prior reconciled account leg'
);
select is(
  (select cleared_account_leg_count
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_two'
   )::uuid),
  1::bigint,
  'open later statement sees one currently cleared account leg'
);
select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_one'
   )::uuid),
  100000::bigint,
  'first completed statement is stable before later completion'
);
select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.current_reconciliation_session_two')::uuid
  ),
  true,
  'later zero-difference statement completes'
);
select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_one'
   )::uuid),
  100000::bigint,
  'later backdated reconciliation does not rewrite first balance'
);
select is(
  (select difference_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_one'
   )::uuid),
  0::bigint,
  'later backdated reconciliation does not rewrite first difference'
);
select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_two'
   )::uuid),
  150000::bigint,
  'later completed statement stores its own balance'
);
select is(
  (select difference_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_two'
   )::uuid),
  0::bigint,
  'later completed statement stores zero difference'
);
select is(
  public.reopen_account_reconciliation(
    current_setting('moneyflow_test.current_reconciliation_session_two')::uuid
  ),
  true,
  'latest completed statement can reopen'
);
select is(
  (select reconciliation_id
   from public.transaction_entries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_entry_one'
   )::uuid),
  current_setting('moneyflow_test.current_reconciliation_session_one')::uuid,
  'reopen leaves earlier-session membership untouched'
);
select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_entry_one'
   )::uuid),
  'reconciled'::public.entry_reconciliation_state,
  'reopen leaves earlier-session state reconciled'
);
select is(
  (select reconciliation_state
   from public.transaction_entries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_entry_two'
   )::uuid),
  'cleared'::public.entry_reconciliation_state,
  'reopen restores only the latest-session account leg to cleared'
);
select is(
  (select reconciliation_id is null
   from public.transaction_entries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_entry_two'
   )::uuid),
  true,
  'reopened account leg no longer points at the completed session'
);
select is(
  (select cleared_balance_minor
   from public.account_reconciliation_summaries
   where id = current_setting(
     'moneyflow_test.current_reconciliation_session_one'
   )::uuid),
  100000::bigint,
  'first completed statement remains stable after later reopen'
);

reset role;
set local request.jwt.claims =
  '{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  format(
    $sql$
      select public.set_account_entry_reconciliation_state(
        %L::uuid,
        'pending'::public.entry_reconciliation_state
      )
    $sql$,
    current_setting('moneyflow_test.current_reconciliation_entry_one')
  ),
  'P0001',
  'entry_not_found',
  'cross-tenant account-leg ID cannot be mutated'
);
select is(
  (select count(*)::integer
   from public.account_reconciliation_summaries),
  0,
  'RLS hides another tenant reconciliation summaries'
);

reset role;
set local request.jwt.claims =
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}';
set local role authenticated;
select is(
  (select count(*)::integer
   from public.account_reconciliation_summaries),
  2,
  'owner can read both reconciliation sessions'
);

reset role;
select lives_ok(
  $$
    select public.purge_user_tenant_data(
      '77777777-7777-4777-8777-777777777777'::uuid
    )
  $$,
  'tenant purge succeeds with reconciliation history'
);
select is(
  (select count(*)::integer
   from public.account_reconciliations
   where user_id = '77777777-7777-4777-8777-777777777777'),
  0,
  'tenant purge removes reconciliation sessions through account cascade'
);
select is(
  (select count(*)::integer
   from public.account_reconciliation_events
   where user_id = '77777777-7777-4777-8777-777777777777'),
  0,
  'tenant purge removes reconciliation events'
);

select * from finish();
rollback;
