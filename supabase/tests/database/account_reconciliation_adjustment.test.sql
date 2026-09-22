begin;
select plan(33);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '55555555-5555-4555-8555-555555555555'::uuid,
  'authenticated', 'authenticated', 'reconciliation-adjustment@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reconciliation Adjustment"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer
   from public.accounts
   where user_id = '55555555-5555-4555-8555-555555555555'),
  1,
  'adjustment fixture receives one default account'
);

set local request.jwt.claims =
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.adjustment_account',
  (select id::text
   from public.accounts
   where user_id = '55555555-5555-4555-8555-555555555555'
   order by created_at, id
   limit 1),
  true
);
select set_config(
  'moneyflow_test.adjustment_income_category',
  (select id::text
   from public.categories
   where user_id = '55555555-5555-4555-8555-555555555555'
     and kind = 'income'
     and not is_archived
   order by created_at, id
   limit 1),
  true
);
select set_config(
  'moneyflow_test.adjustment_expense_category',
  (select id::text
   from public.categories
   where user_id = '55555555-5555-4555-8555-555555555555'
     and kind = 'expense'
     and not is_archived
   order by created_at, id
   limit 1),
  true
);

insert into public.categories (user_id, name, kind, is_archived)
values (
  '55555555-5555-4555-8555-555555555555',
  'Thu đã lưu trữ',
  'income',
  true
);
select set_config(
  'moneyflow_test.adjustment_archived_income_category',
  (select id::text
   from public.categories
   where user_id = '55555555-5555-4555-8555-555555555555'
     and name = 'Thu đã lưu trữ'),
  true
);

-- ---------------------------------------------------------------------------
-- Session A: statement sits ABOVE the cleared ledger → income adjustment.
-- ---------------------------------------------------------------------------

select lives_ok(
  format(
    $sql$
      select public.create_money_transaction(
        %L::uuid,
        %L::uuid,
        'income'::public.transaction_kind,
        100000,
        '2026-07-10'::date,
        'Statement fact',
        '55550000-0000-4000-8000-000000000001'::uuid
      )
    $sql$,
    current_setting('moneyflow_test.adjustment_account'),
    current_setting('moneyflow_test.adjustment_income_category')
  ),
  'statement fact can be created'
);
select set_config(
  'moneyflow_test.adjustment_entry_one',
  (select entry.id::text
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '55555555-5555-4555-8555-555555555555'
     and transaction_record.idempotency_key =
       '55550000-0000-4000-8000-000000000001'::uuid),
  true
);
select set_config(
  'moneyflow_test.adjustment_session_a',
  public.start_account_reconciliation(
    current_setting('moneyflow_test.adjustment_account')::uuid,
    '2026-07-31'::date,
    300000
  )::text,
  true
);
select is(
  (select status
   from public.account_reconciliations
   where id = current_setting('moneyflow_test.adjustment_session_a')::uuid),
  'open'::public.account_reconciliation_status,
  'adjustment session opens'
);
select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.adjustment_entry_one')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'statement fact leg can be cleared'
);
-- cleared = 100000; statement 300000 → difference +200000 → income required
select throws_ok(
  format(
    $sql$
      select public.complete_account_reconciliation(%L::uuid)
    $sql$,
    current_setting('moneyflow_test.adjustment_session_a')
  ),
  'P0001',
  'reconciliation_difference_nonzero',
  'a nonzero difference without a category still fails'
);
select throws_ok(
  format(
    $sql$
      select public.complete_account_reconciliation(
        %L::uuid,
        %L::uuid
      )
    $sql$,
    current_setting('moneyflow_test.adjustment_session_a'),
    current_setting('moneyflow_test.adjustment_expense_category')
  ),
  'P0001',
  'category_kind_mismatch',
  'an expense category cannot close a positive difference'
);
select throws_ok(
  format(
    $sql$
      select public.complete_account_reconciliation(
        %L::uuid,
        %L::uuid
      )
    $sql$,
    current_setting('moneyflow_test.adjustment_session_a'),
    current_setting('moneyflow_test.adjustment_archived_income_category')
  ),
  'P0001',
  'category_archived',
  'an archived category cannot close a difference'
);
select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.adjustment_session_a')::uuid,
    current_setting('moneyflow_test.adjustment_income_category')::uuid,
    null::text,
    'Ngân hàng MB'
  ),
  true,
  'income adjustment completes the positive-difference session'
);
select is(
  (select status
   from public.account_reconciliations
   where id = current_setting('moneyflow_test.adjustment_session_a')::uuid),
  'completed'::public.account_reconciliation_status,
  'adjusted session stores completed status'
);
select set_config(
  'moneyflow_test.adjustment_tx_a',
  (select id::text
   from public.financial_transactions
   where user_id = '55555555-5555-4555-8555-555555555555'
     and note like 'Điều chỉnh đối soát%'),
  true
);
select is(
  (select kind
   from public.financial_transactions
   where id = current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  'income'::public.transaction_kind,
  'positive difference posts an income adjustment'
);
select is(
  (select occurred_on
   from public.financial_transactions
   where id = current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  '2026-07-31'::date,
  'adjustment is dated on the statement date'
);
select is(
  (select note
   from public.financial_transactions
   where id = current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  'Điều chỉnh đối soát — sao kê 31/07/2026',
  'adjustment carries the fixed statement label'
);
select is(
  (select payee
   from public.financial_transactions
   where id = current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  'Ngân hàng MB',
  'adjustment keeps the requested payee'
);
select is(
  (select amount_minor
   from public.transaction_entries
   where transaction_id =
     current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  200000::bigint,
  'income adjustment entry stores the positive difference'
);
select is(
  (select reconciliation_state
   from public.transaction_entries
   where transaction_id =
     current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  'reconciled'::public.entry_reconciliation_state,
  'adjustment entry lands already reconciled'
);
select is(
  (select reconciliation_id
   from public.transaction_entries
   where transaction_id =
     current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  current_setting('moneyflow_test.adjustment_session_a')::uuid,
  'adjustment entry belongs to the completing session'
);
select is(
  (select cleared_at is not null
   from public.transaction_entries
   where transaction_id =
     current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  true,
  'adjustment entry records its cleared timestamp'
);
select is(
  (select difference_minor
   from public.account_reconciliation_events
   where reconciliation_id =
       current_setting('moneyflow_test.adjustment_session_a')::uuid
     and kind = 'completed'
   order by occurred_at desc
   limit 1),
  200000::bigint,
  'completion event records the real pre-adjustment difference'
);
select is(
  (select calculated_balance_minor
   from public.account_reconciliation_events
   where reconciliation_id =
       current_setting('moneyflow_test.adjustment_session_a')::uuid
     and kind = 'completed'
   order by occurred_at desc
   limit 1),
  100000::bigint,
  'completion event keeps the pre-adjustment calculated balance'
);
select throws_ok(
  format(
    $sql$
      select public.update_money_transaction(
        %L::uuid,
        %L::uuid,
        %L::uuid,
        'income'::public.transaction_kind,
        210000,
        '2026-07-31'::date,
        'Rewrite a locked adjustment'
      )
    $sql$,
    current_setting('moneyflow_test.adjustment_tx_a'),
    current_setting('moneyflow_test.adjustment_account'),
    current_setting('moneyflow_test.adjustment_income_category')
  ),
  'P0001',
  'transaction_reconciled',
  'the reconciled adjustment is financially locked'
);
select is(
  public.reopen_account_reconciliation(
    current_setting('moneyflow_test.adjustment_session_a')::uuid
  ),
  true,
  'the adjusted session can reopen'
);
select is(
  (select reconciliation_state
   from public.transaction_entries
   where transaction_id =
     current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  'cleared'::public.entry_reconciliation_state,
  'reopen returns the adjustment leg to cleared'
);
select is(
  (select reconciliation_id is null
   from public.transaction_entries
   where transaction_id =
     current_setting('moneyflow_test.adjustment_tx_a')::uuid),
  true,
  'reopen detaches the adjustment leg from the session'
);
select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.adjustment_session_a')::uuid
  ),
  true,
  'recompletion needs no second adjustment while the cleared leg still matches'
);

-- ---------------------------------------------------------------------------
-- Session B: statement sits BELOW the cleared ledger → expense adjustment.
-- ---------------------------------------------------------------------------

select lives_ok(
  format(
    $sql$
      select public.create_money_transaction(
        %L::uuid,
        %L::uuid,
        'expense'::public.transaction_kind,
        50000,
        '2026-08-05'::date,
        'Second statement fact',
        '55550000-0000-4000-8000-000000000002'::uuid
      )
    $sql$,
    current_setting('moneyflow_test.adjustment_account'),
    current_setting('moneyflow_test.adjustment_expense_category')
  ),
  'second statement fact can be created'
);
select set_config(
  'moneyflow_test.adjustment_entry_two',
  (select entry.id::text
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '55555555-5555-4555-8555-555555555555'
     and transaction_record.idempotency_key =
       '55550000-0000-4000-8000-000000000002'::uuid),
  true
);
select set_config(
  'moneyflow_test.adjustment_session_b',
  public.start_account_reconciliation(
    current_setting('moneyflow_test.adjustment_account')::uuid,
    '2026-08-10'::date,
    200000
  )::text,
  true
);
select is(
  (select status
   from public.account_reconciliations
   where id = current_setting('moneyflow_test.adjustment_session_b')::uuid),
  'open'::public.account_reconciliation_status,
  'second adjustment session opens'
);
select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.adjustment_entry_two')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'second statement fact leg can be cleared'
);
-- cleared = 300000 - 50000 = 250000; statement 200000 → difference -50000
select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.adjustment_session_b')::uuid,
    current_setting('moneyflow_test.adjustment_expense_category')::uuid
  ),
  true,
  'expense adjustment completes the negative-difference session'
);
select set_config(
  'moneyflow_test.adjustment_tx_b',
  (select id::text
   from public.financial_transactions
   where user_id = '55555555-5555-4555-8555-555555555555'
     and note like 'Điều chỉnh đối soát%10/08/2026'),
  true
);
select is(
  (select kind
   from public.financial_transactions
   where id = current_setting('moneyflow_test.adjustment_tx_b')::uuid),
  'expense'::public.transaction_kind,
  'negative difference posts an expense adjustment'
);
select is(
  (select amount_minor
   from public.transaction_entries
   where transaction_id =
     current_setting('moneyflow_test.adjustment_tx_b')::uuid),
  -50000::bigint,
  'expense adjustment entry stores the negative difference'
);
select is(
  (select note
   from public.financial_transactions
   where id = current_setting('moneyflow_test.adjustment_tx_b')::uuid),
  'Điều chỉnh đối soát — sao kê 10/08/2026',
  'expense adjustment carries the fixed statement label'
);
select is(
  (select difference_minor
   from public.account_reconciliation_events
   where reconciliation_id =
       current_setting('moneyflow_test.adjustment_session_b')::uuid
     and kind = 'completed'
   order by occurred_at desc
   limit 1),
  (-50000)::bigint,
  'second completion event records the real negative difference'
);

reset role;
select lives_ok(
  $$
    select public.purge_user_tenant_data(
      '55555555-5555-4555-8555-555555555555'::uuid
    )
  $$,
  'tenant purge succeeds with adjustment history'
);

select * from finish();
rollback;
