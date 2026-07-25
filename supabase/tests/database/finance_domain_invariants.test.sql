begin;
select plan(41);

-- Permanent database-level money laws.
-- These tests exercise the real RPC + view layer instead of duplicating
-- the TypeScript-only domain tests in src/lib/money-invariants.test.ts.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '427b40d0-ae5b-4976-810b-bd785d873d50'::uuid,
  'authenticated', 'authenticated', 'finance-invariants@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Finance Invariants"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer from public.accounts
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'),
  1,
  'test user receives one default financial account'
);

select ok(
  (select count(*) from public.categories
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and kind = 'expense') >= 2,
  'test user receives at least two expense categories for split coverage'
);

set local request.jwt.claims = '{"sub":"427b40d0-ae5b-4976-810b-bd785d873d50","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$
    select public.create_financial_account(
      'Invariant destination',
      'savings'::public.account_kind,
      0::bigint,
      'VND'
    )
  $$,
  'a second VND account can be created through the public RPC'
);

select lives_ok(
  $$
    select public.upsert_monthly_budget(
      (select id from public.categories
       where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
         and kind = 'expense'
       order by created_at, id
       limit 1),
      date_trunc('month', current_date)::date,
      500000::bigint
    )
  $$,
  'an expense-category budget can be created through the public RPC'
);

select lives_ok(
  $$
    select public.create_money_transaction(
      (select id from public.accounts
       where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
         and name <> 'Invariant destination'
       order by created_at, id
       limit 1),
      (select id from public.categories
       where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
         and kind = 'expense'
       order by created_at, id
       limit 1),
      'expense'::public.transaction_kind,
      30000::bigint,
      current_date,
      'Invariant baseline expense',
      '10000000-0000-0000-0000-000000000002'::uuid
    )
  $$,
  'a baseline expense can be created through the public RPC'
);

select lives_ok(
  $$
    select public.create_account_transfer(
      (select id from public.accounts
       where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
         and name <> 'Invariant destination'
       order by created_at, id
       limit 1),
      (select id from public.accounts
       where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
         and name = 'Invariant destination'),
      50000::bigint,
      current_date,
      'Invariant transfer',
      '10000000-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'a transfer can be created through the public RPC'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid),
  1,
  'transfer creates exactly one financial transaction'
);

select is(
  (select count(*)::integer
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and transaction_record.idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid),
  2,
  'transfer creates exactly two ledger entries'
);

select is(
  (select sum(entry.amount_minor)::bigint
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and transaction_record.idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid),
  0::bigint,
  'transfer entries are balanced to zero'
);

select is(
  (select min(entry.amount_minor)
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and transaction_record.idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid),
  (-50000)::bigint,
  'transfer debits the source by the exact amount'
);

select is(
  (select max(entry.amount_minor)
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and transaction_record.idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid),
  50000::bigint,
  'transfer credits the destination by the exact amount'
);

select is(
  (select count(*)::integer
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and transaction_record.idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid
     and entry.category_id is not null),
  0,
  'transfer entries never carry an expense or income category'
);

select is(
  (select amount_minor from public.transaction_feed
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and id = (select id from public.financial_transactions
               where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                 and idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid)),
  50000::bigint,
  'transaction feed exposes transfer amount once instead of summing both legs'
);

select is(
  (select account_id from public.transaction_feed
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and id = (select id from public.financial_transactions
               where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                 and idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid)),
  (select id from public.accounts
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and name <> 'Invariant destination'
   order by created_at, id
   limit 1),
  'transaction feed identifies the debit account as transfer source'
);

select is(
  (select destination_account_id from public.transaction_feed
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and id = (select id from public.financial_transactions
               where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                 and idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid)),
  (select id from public.accounts
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and name = 'Invariant destination'),
  'transaction feed identifies the credit account as transfer destination'
);

select is(
  (select sum(balance_minor)::bigint from public.account_balances
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'),
  (-30000)::bigint,
  'transfer preserves total assets after the baseline expense'
);

select is(
  (select balance_minor from public.account_balances
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and account_id = (select id from public.accounts
                       where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                         and name <> 'Invariant destination'
                       order by created_at, id
                       limit 1)),
  (-80000)::bigint,
  'source account reflects baseline expense plus transfer debit'
);

select is(
  (select balance_minor from public.account_balances
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and account_id = (select id from public.accounts
                       where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                         and name = 'Invariant destination')),
  50000::bigint,
  'destination account reflects transfer credit'
);

select is(
  public.create_account_transfer(
    (select id from public.accounts
     where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
       and name <> 'Invariant destination'
     order by created_at, id
     limit 1),
    (select id from public.accounts
     where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
       and name = 'Invariant destination'),
    50000::bigint,
    current_date,
    'Retry must not mutate the original transfer',
    '10000000-0000-0000-0000-000000000001'::uuid
  ),
  (select id from public.financial_transactions
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid),
  'reusing a transfer idempotency key returns the original transaction'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid),
  1,
  'idempotent transfer retry does not create a second transaction'
);

select is(
  (select count(*)::integer
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and transaction_record.idempotency_key = '10000000-0000-0000-0000-000000000001'::uuid),
  2,
  'idempotent transfer retry does not create extra ledger entries'
);

select is(
  (select spent_minor from public.budget_progress
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and category_id = (select id from public.categories
                        where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                          and kind = 'expense'
                        order by created_at, id
                        limit 1)
     and month_start = date_trunc('month', current_date)::date),
  30000::bigint,
  'budget progress counts the expense but ignores the transfer'
);

select lives_ok(
  $$
    select public.create_split_expense(
      (select id from public.accounts
       where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
         and name <> 'Invariant destination'
       order by created_at, id
       limit 1),
      jsonb_build_array(
        jsonb_build_object(
          'category_id',
          (select id from public.categories
           where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
             and kind = 'expense'
           order by created_at, id
           limit 1),
          'amount_minor', 40000
        ),
        jsonb_build_object(
          'category_id',
          (select id from public.categories
           where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
             and kind = 'expense'
           order by created_at, id
           offset 1 limit 1),
          'amount_minor', 60000
        )
      ),
      current_date,
      'Invariant split expense',
      '10000000-0000-0000-0000-000000000003'::uuid
    )
  $$,
  'a split expense can be created through the public RPC'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid),
  1,
  'split expense creates exactly one financial transaction'
);

select is(
  (select count(*)::integer
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and transaction_record.idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid),
  2,
  'split expense creates one ledger entry per category line'
);

select is(
  (select sum(abs(entry.amount_minor))::bigint
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and transaction_record.idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid),
  100000::bigint,
  'split line magnitudes sum to the transaction amount'
);

select is(
  (select sum(entry.amount_minor)::bigint
   from public.transaction_entries entry
   join public.financial_transactions transaction_record
     on transaction_record.id = entry.transaction_id
    and transaction_record.user_id = entry.user_id
   where transaction_record.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and transaction_record.idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid),
  (-100000)::bigint,
  'split expense entries retain the correct signed account effect'
);

select is(
  (select amount_minor from public.transaction_feed
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and id = (select id from public.financial_transactions
               where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                 and idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid)),
  100000::bigint,
  'transaction feed exposes split total once without parent/line double counting'
);

select is(
  (select jsonb_array_length(split_lines) from public.transaction_feed
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and id = (select id from public.financial_transactions
               where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                 and idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid)),
  2,
  'transaction feed preserves the two split category lines'
);

select is(
  (select sum((line ->> 'amount_minor')::bigint)::bigint
   from public.transaction_feed feed,
        lateral jsonb_array_elements(feed.split_lines) line
   where feed.user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and feed.id = (select id from public.financial_transactions
                    where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                      and idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid)),
  100000::bigint,
  'transaction feed split payload sums to its displayed amount'
);

select is(
  (select spent_minor from public.budget_progress
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and category_id = (select id from public.categories
                        where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                          and kind = 'expense'
                        order by created_at, id
                        limit 1)
     and month_start = date_trunc('month', current_date)::date),
  70000::bigint,
  'budget progress adds only the matching 40000 split portion'
);

select is(
  (select sum(balance_minor)::bigint from public.account_balances
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'),
  (-130000)::bigint,
  'account totals include the split expense exactly once'
);

select is(
  public.soft_delete_money_transaction(
    (select id from public.financial_transactions
     where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
       and idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid)
  ),
  true,
  'soft delete succeeds once for the split transaction'
);

select is(
  (select count(*)::integer from public.transaction_feed
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and id = (select id from public.financial_transactions
               where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                 and idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid)),
  0,
  'soft-deleted split transaction disappears from active feed'
);

select is(
  (select sum(balance_minor)::bigint from public.account_balances
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'),
  (-30000)::bigint,
  'soft delete removes the split expense from account balances'
);

select is(
  (select spent_minor from public.budget_progress
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and category_id = (select id from public.categories
                        where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                          and kind = 'expense'
                        order by created_at, id
                        limit 1)
     and month_start = date_trunc('month', current_date)::date),
  30000::bigint,
  'soft delete removes split spending from budget progress'
);

select is(
  public.restore_money_transaction(
    (select id from public.financial_transactions
     where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
       and idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid)
  ),
  true,
  'restore succeeds once for the soft-deleted split transaction'
);

select is(
  (select count(*)::integer from public.transaction_feed
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and id = (select id from public.financial_transactions
               where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                 and idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid)),
  1,
  'restored split transaction returns to active feed exactly once'
);

select is(
  (select sum(balance_minor)::bigint from public.account_balances
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'),
  (-130000)::bigint,
  'restore reapplies the split expense to account balances exactly once'
);

select is(
  (select spent_minor from public.budget_progress
   where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
     and category_id = (select id from public.categories
                        where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
                          and kind = 'expense'
                        order by created_at, id
                        limit 1)
     and month_start = date_trunc('month', current_date)::date),
  70000::bigint,
  'restore reapplies only the matching split portion to budget progress'
);

select is(
  public.restore_money_transaction(
    (select id from public.financial_transactions
     where user_id = '427b40d0-ae5b-4976-810b-bd785d873d50'
       and idempotency_key = '10000000-0000-0000-0000-000000000003'::uuid)
  ),
  false,
  'restoring an already active transaction is a no-op'
);

reset role;
select * from finish();
rollback;
