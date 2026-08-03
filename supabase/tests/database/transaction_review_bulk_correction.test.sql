begin;
select plan(30);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '25400000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'bulk-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Bulk Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '25400000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'bulk-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Bulk Other"}'::jsonb,
  now(), now(), '', '', false, false
);

select is(
  (select count(*)::integer from public.accounts
   where user_id = '25400000-0000-4000-8000-000000000001'),
  1,
  'owner receives one default account'
);

select ok(
  (select count(*) from public.categories
   where user_id = '25400000-0000-4000-8000-000000000001'
     and kind = 'expense') >= 2,
  'owner receives at least two expense categories'
);

set local request.jwt.claims = '{"sub":"25400000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

create temporary table bulk_test_ids (
  key text primary key,
  id uuid not null
) on commit drop;

select lives_ok(
  $$
    insert into bulk_test_ids (key, id)
    select 'destination', public.create_financial_account(
      'Bulk destination', 'savings'::public.account_kind, 0, 'VND'
    )
  $$,
  'owner can create a second account for transfer coverage'
);

select lives_ok(
  $$
    insert into bulk_test_ids (key, id)
    select 'expense-1', public.create_money_transaction(
      (select id from public.accounts
       where user_id = '25400000-0000-4000-8000-000000000001'
         and name <> 'Bulk destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      'expense'::public.transaction_kind,
      11000, current_date, 'Bulk expense one',
      '25410000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'first ordinary expense is created'
);

select lives_ok(
  $$
    insert into bulk_test_ids (key, id)
    select 'expense-2', public.create_money_transaction(
      (select id from public.accounts
       where user_id = '25400000-0000-4000-8000-000000000001'
         and name <> 'Bulk destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1),
      'expense'::public.transaction_kind,
      22000, current_date, 'Bulk expense two',
      '25410000-0000-4000-8000-000000000002'::uuid
    )
  $$,
  'second ordinary expense is created'
);

select lives_ok(
  $$
    insert into bulk_test_ids (key, id)
    select 'income', public.create_money_transaction(
      (select id from public.accounts
       where user_id = '25400000-0000-4000-8000-000000000001'
         and name <> 'Bulk destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'income'
       order by created_at, id limit 1),
      'income'::public.transaction_kind,
      33000, current_date, 'Bulk income',
      '25410000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  'ordinary income is created'
);

select lives_ok(
  $$
    insert into bulk_test_ids (key, id)
    select 'transfer', public.create_account_transfer(
      (select id from public.accounts
       where user_id = '25400000-0000-4000-8000-000000000001'
         and name <> 'Bulk destination'
       order by created_at, id limit 1),
      (select id from bulk_test_ids where key = 'destination'),
      44000, current_date, 'Bulk transfer',
      '25410000-0000-4000-8000-000000000004'::uuid
    )
  $$,
  'transfer is created for an ineligible selection'
);

select lives_ok(
  $$
    insert into bulk_test_ids (key, id)
    select 'split', public.create_split_expense(
      (select id from public.accounts
       where user_id = '25400000-0000-4000-8000-000000000001'
         and name <> 'Bulk destination'
       order by created_at, id limit 1),
      jsonb_build_array(
        jsonb_build_object(
          'category_id',
          (select id from public.categories
           where user_id = '25400000-0000-4000-8000-000000000001'
             and kind = 'expense'
           order by created_at, id limit 1),
          'amount_minor', 12000
        ),
        jsonb_build_object(
          'category_id',
          (select id from public.categories
           where user_id = '25400000-0000-4000-8000-000000000001'
             and kind = 'expense'
           order by created_at, id offset 1 limit 1),
          'amount_minor', 13000
        )
      ),
      current_date, 'Bulk split',
      '25410000-0000-4000-8000-000000000005'::uuid
    )
  $$,
  'split expense is created for an ineligible selection'
);

select lives_ok(
  $$
    insert into bulk_test_ids (key, id)
    select 'commitment', public.upsert_recurring_commitment(
      null,
      'Bulk recurring',
      55000,
      5,
      (select id from public.accounts
       where user_id = '25400000-0000-4000-8000-000000000001'
         and name <> 'Bulk destination'
       order by created_at, id limit 1),
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1)
    )
  $$,
  'recurring commitment is created'
);

select lives_ok(
  $$
    insert into bulk_test_ids (key, id)
    select 'recurring', public.pay_recurring_commitment(
      (select id from bulk_test_ids where key = 'commitment'),
      date_trunc('month', current_date)::date,
      current_date,
      '25410000-0000-4000-8000-000000000006'::uuid
    )
  $$,
  'recurring payment transaction is created'
);

select is(
  (select review_status::text from public.financial_transactions
   where id = (select id from bulk_test_ids where key = 'expense-1')),
  'reviewed',
  'new transactions default to reviewed'
);

select is(
  (select review_status::text from public.transaction_review_feed
   where id = (select id from bulk_test_ids where key = 'expense-1')),
  'reviewed',
  'companion review feed exposes the active review state'
);

select is(
  public.set_transaction_review_status_bulk(
    array[
      (select id from bulk_test_ids where key = 'expense-1'),
      (select id from bulk_test_ids where key = 'expense-2')
    ],
    'needs_review'::public.transaction_review_status
  ),
  2,
  'bulk review updates both selected rows'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where id in (
     (select id from bulk_test_ids where key = 'expense-1'),
     (select id from bulk_test_ids where key = 'expense-2')
   ) and review_status = 'needs_review'),
  2,
  'both selected rows retain needs-review state'
);

select throws_ok(
  $$
    select public.set_transaction_review_status_bulk(
      array[
        (select id from bulk_test_ids where key = 'expense-1'),
        (select id from bulk_test_ids where key = 'expense-1')
      ],
      'reviewed'::public.transaction_review_status
    )
  $$,
  'transaction_selection_invalid',
  'database rejects duplicate selection IDs instead of double-counting'
);

set local role postgres;
set local request.jwt.claims = '{}';

insert into public.financial_transactions (
  id, user_id, kind, note, occurred_on, idempotency_key
) values (
  '25420000-0000-4000-8000-000000000001'::uuid,
  '25400000-0000-4000-8000-000000000002'::uuid,
  'expense', 'Other tenant expense', current_date,
  '25410000-0000-4000-8000-000000000007'::uuid
);
insert into public.transaction_entries (
  transaction_id, user_id, account_id, category_id, amount_minor
) values (
  '25420000-0000-4000-8000-000000000001'::uuid,
  '25400000-0000-4000-8000-000000000002'::uuid,
  (select id from public.accounts
   where user_id = '25400000-0000-4000-8000-000000000002'
   order by created_at, id limit 1),
  (select id from public.categories
   where user_id = '25400000-0000-4000-8000-000000000002'
     and kind = 'expense'
   order by created_at, id limit 1),
  -66000
);

set local request.jwt.claims = '{"sub":"25400000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$
    select public.set_transaction_review_status_bulk(
      array[
        (select id from bulk_test_ids where key = 'expense-1'),
        '25420000-0000-4000-8000-000000000001'::uuid
      ],
      'reviewed'::public.transaction_review_status
    )
  $$,
  'transaction_selection_not_found',
  'review RPC rejects a mixed cross-tenant selection atomically'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where id in (
     (select id from bulk_test_ids where key = 'expense-1'),
     (select id from bulk_test_ids where key = 'expense-2')
   ) and review_status = 'needs_review'),
  2,
  'failed cross-tenant review changes no owned row'
);

select is(
  public.bulk_update_transaction_category(
    array[
      (select id from bulk_test_ids where key = 'expense-1'),
      (select id from bulk_test_ids where key = 'expense-2')
    ],
    (select id from public.categories
     where user_id = '25400000-0000-4000-8000-000000000001'
       and kind = 'expense'
     order by created_at, id offset 1 limit 1)
  ),
  2,
  'valid bulk category correction updates both ordinary expenses'
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id in (
     (select id from bulk_test_ids where key = 'expense-1'),
     (select id from bulk_test_ids where key = 'expense-2')
   ) and category_id = (
     select id from public.categories
     where user_id = '25400000-0000-4000-8000-000000000001'
       and kind = 'expense'
     order by created_at, id offset 1 limit 1
   )),
  2,
  'both selected ledger entries use the corrected category'
);

select is(
  (select sum(abs(amount_minor))::bigint
   from public.transaction_entries
   where transaction_id in (
     (select id from bulk_test_ids where key = 'expense-1'),
     (select id from bulk_test_ids where key = 'expense-2')
   )),
  33000::bigint,
  'bulk category correction preserves exact integer amounts'
);

select throws_ok(
  $$
    select public.bulk_update_transaction_category(
      array[
        (select id from bulk_test_ids where key = 'expense-1'),
        (select id from bulk_test_ids where key = 'income')
      ],
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1)
    )
  $$,
  'bulk_transaction_kind_mismatch',
  'mixed income and expense selection is rejected'
);

select is(
  (select count(*)::integer
   from public.transaction_entries
   where transaction_id in (
     (select id from bulk_test_ids where key = 'expense-1'),
     (select id from bulk_test_ids where key = 'expense-2')
   ) and category_id = (
     select id from public.categories
     where user_id = '25400000-0000-4000-8000-000000000001'
       and kind = 'expense'
     order by created_at, id offset 1 limit 1
   )),
  2,
  'failed mixed-kind correction preserves the previous category update'
);

select throws_ok(
  $$
    select public.bulk_update_transaction_category(
      array[(select id from bulk_test_ids where key = 'expense-1')],
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'income'
       order by created_at, id limit 1)
    )
  $$,
  'category_kind_mismatch',
  'wrong-kind category is rejected'
);

select throws_ok(
  $$
    select public.bulk_update_transaction_category(
      array[(select id from bulk_test_ids where key = 'transfer')],
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1)
    )
  $$,
  'bulk_transfer_category_locked',
  'transfer category correction is rejected'
);

select throws_ok(
  $$
    select public.bulk_update_transaction_category(
      array[(select id from bulk_test_ids where key = 'split')],
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1)
    )
  $$,
  'bulk_split_transaction_locked',
  'split category correction is rejected'
);

select throws_ok(
  $$
    select public.bulk_update_transaction_category(
      array[(select id from bulk_test_ids where key = 'recurring')],
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'expense'
       order by created_at, id limit 1)
    )
  $$,
  'recurring_payment_locked',
  'recurring payment category correction is rejected'
);

set local role postgres;
update public.categories
set is_archived = true
where id = (
  select id from public.categories
  where user_id = '25400000-0000-4000-8000-000000000001'
    and kind = 'expense'
  order by created_at, id offset 1 limit 1
);
set local request.jwt.claims = '{"sub":"25400000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$
    select public.bulk_update_transaction_category(
      array[(select id from bulk_test_ids where key = 'expense-1')],
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'expense' and is_archived
       order by created_at, id limit 1)
    )
  $$,
  'category_archived',
  'archived category is rejected'
);

select throws_ok(
  $$
    select public.bulk_update_transaction_category(
      array[(select id from bulk_test_ids where key = 'expense-1')],
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000002'
         and kind = 'expense'
       order by created_at, id limit 1)
    )
  $$,
  'category_not_found',
  'cross-tenant category is rejected'
);

select throws_ok(
  $$
    select public.bulk_update_transaction_category(
      array[
        (select id from bulk_test_ids where key = 'expense-1'),
        '25420000-0000-4000-8000-000000000001'::uuid
      ],
      (select id from public.categories
       where user_id = '25400000-0000-4000-8000-000000000001'
         and kind = 'expense' and not is_archived
       order by created_at, id limit 1)
    )
  $$,
  'transaction_selection_not_found',
  'cross-tenant transaction selection is rejected'
);

set local request.jwt.claims = '{"sub":"25400000-0000-4000-8000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::integer from public.transaction_review_feed),
  1,
  'security-invoker review feed exposes only the current tenant row'
);

select is(
  (select review_status::text from public.transaction_review_feed
   where id = '25420000-0000-4000-8000-000000000001'::uuid),
  'reviewed',
  'other tenant sees its own default review state'
);

select is(
  (select sum(amount_minor)::bigint
   from public.transaction_entries
   where user_id = '25400000-0000-4000-8000-000000000001'
     and transaction_id = (select id from bulk_test_ids where key = 'transfer')),
  0::bigint,
  'all bulk operations preserve transfer neutrality'
);

select * from finish();
rollback;
