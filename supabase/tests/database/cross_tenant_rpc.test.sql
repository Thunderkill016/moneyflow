begin;
select plan(25);

create temporary table security_ctx (
  key text primary key,
  id uuid not null
) on commit drop;
grant select, insert, update, delete on security_ctx to authenticated;

create or replace function pg_temp.security_call_error(p_sql text)
returns text
language plpgsql
as $$
declare
  v_detail text;
begin
  begin
    execute p_sql;
    return 'unexpected_success';
  exception when others then
    get stacked diagnostics v_detail = message_text;
    return v_detail;
  end;
end;
$$;
grant execute on function pg_temp.security_call_error(text) to authenticated;

-- Deterministic identities live only inside this transaction. The normal Auth
-- trigger creates each profile, default account and category set exactly as it
-- would for a real user.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000aa01',
  'authenticated',
  'authenticated',
  'security-a@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Security A"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000bb01',
  'authenticated',
  'authenticated',
  'security-b@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Security B"}'::jsonb
);

insert into security_ctx values
  ('a_account_1', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000aa01'
    limit 1
  )),
  ('a_expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000aa01'
      and kind = 'expense'
    limit 1
  )),
  ('a_income_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000aa01'
      and kind = 'income'
    limit 1
  )),
  ('b_account_1', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000bb01'
    limit 1
  )),
  ('b_expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000bb01'
      and kind = 'expense'
    limit 1
  )),
  ('b_income_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000bb01'
      and kind = 'income'
    limit 1
  ));

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-00000000aa01',
  true
);

insert into security_ctx values
  ('a_account_2', public.create_financial_account('A second', 'bank', 0, 'VND'));
insert into security_ctx values
  ('a_tx_active', public.create_money_transaction(
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_expense_category'),
    'expense',
    1000,
    current_date,
    'A active transaction',
    '00000000-0000-4000-8000-00000000aa11'
  ));
insert into security_ctx values
  ('a_tx_deleted', public.create_money_transaction(
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_expense_category'),
    'expense',
    1200,
    current_date,
    'A deleted transaction',
    '00000000-0000-4000-8000-00000000aa12'
  ));
select public.soft_delete_money_transaction(
  (select id from security_ctx where key = 'a_tx_deleted')
);
insert into security_ctx values
  ('a_transfer', public.create_account_transfer(
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_account_2'),
    500,
    current_date,
    'A transfer',
    '00000000-0000-4000-8000-00000000aa13'
  ));
insert into security_ctx values
  ('a_budget', public.upsert_monthly_budget(
    (select id from security_ctx where key = 'a_expense_category'),
    date_trunc('month', current_date)::date,
    100000
  ));
insert into security_ctx values
  ('a_commitment', public.upsert_recurring_commitment(
    null,
    'A rent',
    2000,
    5,
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_expense_category')
  ));
select public.pay_recurring_commitment(
  (select id from security_ctx where key = 'a_commitment'),
  date_trunc('month', current_date)::date,
  current_date,
  '00000000-0000-4000-8000-00000000aa14'
);
insert into security_ctx values
  ('a_income_template', public.upsert_recurring_income_template(
    null,
    'A salary',
    5000,
    10,
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_income_category')
  ));
select public.record_recurring_income_template(
  (select id from security_ctx where key = 'a_income_template'),
  date_trunc('month', current_date)::date,
  current_date,
  '00000000-0000-4000-8000-00000000aa15'
);
insert into security_ctx values
  ('a_goal', public.upsert_savings_goal(null, 'A goal', 100000, null));

-- Attack A's real rows using B's JWT claim and authenticated role.
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-00000000bb01',
  true
);

select ok(
  not exists (
    select 1 from public.accounts
    where id = (select id from security_ctx where key = 'a_account_1')
  ),
  'user B cannot read user A account through RLS'
);
select ok(
  not exists (
    select 1 from public.financial_transactions
    where id = (select id from security_ctx where key = 'a_tx_active')
  ),
  'user B cannot read user A transaction through RLS'
);
select ok(
  not exists (
    select 1 from public.transaction_feed
    where id = (select id from security_ctx where key = 'a_tx_active')
  ),
  'user B cannot read user A transaction through security-invoker view'
);
select is(
  public.update_financial_account(
    (select id from security_ctx where key = 'a_account_1'),
    'pwned',
    'cash',
    0
  ),
  false,
  'user B cannot update user A account'
);
select is(
  public.set_financial_account_archived(
    (select id from security_ctx where key = 'a_account_1'),
    true
  ),
  false,
  'user B cannot archive user A account'
);
select is(
  public.delete_monthly_budget(
    (select id from security_ctx where key = 'a_budget')
  ),
  false,
  'user B cannot delete user A budget'
);
select is(
  public.set_recurring_commitment_archived(
    (select id from security_ctx where key = 'a_commitment'),
    true
  ),
  false,
  'user B cannot archive user A commitment'
);
select is(
  public.undo_recurring_commitment_payment(
    (select id from security_ctx where key = 'a_commitment'),
    date_trunc('month', current_date)::date
  ),
  false,
  'user B cannot undo user A commitment occurrence'
);
select is(
  public.set_recurring_income_template_archived(
    (select id from security_ctx where key = 'a_income_template'),
    true
  ),
  false,
  'user B cannot archive user A income template'
);
select is(
  public.undo_recurring_income_template_receipt(
    (select id from security_ctx where key = 'a_income_template'),
    date_trunc('month', current_date)::date
  ),
  false,
  'user B cannot undo user A income occurrence'
);
select is(
  public.set_savings_goal_archived(
    (select id from security_ctx where key = 'a_goal'),
    true
  ),
  false,
  'user B cannot archive user A goal'
);
select is(
  public.soft_delete_money_transaction(
    (select id from security_ctx where key = 'a_tx_active')
  ),
  false,
  'user B cannot soft-delete user A transaction'
);
select is(
  public.restore_money_transaction(
    (select id from security_ctx where key = 'a_tx_deleted')
  ),
  false,
  'user B cannot restore user A transaction'
);

select is(
  pg_temp.security_call_error(format(
    'select public.create_money_transaction(%L::uuid,%L::uuid,''expense'',1000,current_date,''attack'',%L::uuid)',
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_expense_category'),
    '00000000-0000-4000-8000-00000000bb11'
  )),
  'account_not_found',
  'user B cannot create a transaction against user A account'
);
select is(
  pg_temp.security_call_error(format(
    'select public.create_account_transfer(%L::uuid,%L::uuid,500,current_date,''attack'',%L::uuid)',
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_account_2'),
    '00000000-0000-4000-8000-00000000bb12'
  )),
  'account_not_found',
  'user B cannot create a transfer between user A accounts'
);
select is(
  pg_temp.security_call_error(format(
    'select public.create_split_expense(%L::uuid,%L::jsonb,current_date,''attack'',%L::uuid)',
    (select id from security_ctx where key = 'a_account_1'),
    jsonb_build_array(
      jsonb_build_object(
        'category_id',
        (select id from security_ctx where key = 'b_expense_category'),
        'amount_minor',
        100
      ),
      jsonb_build_object(
        'category_id',
        (select id from security_ctx where key = 'a_expense_category'),
        'amount_minor',
        200
      )
    )::text,
    '00000000-0000-4000-8000-00000000bb13'
  )),
  'account_not_found',
  'user B cannot create a split expense against user A account'
);
select is(
  pg_temp.security_call_error(format(
    'select public.update_money_transaction(%L::uuid,%L::uuid,%L::uuid,''expense'',1000,current_date,''attack'')',
    (select id from security_ctx where key = 'a_tx_active'),
    (select id from security_ctx where key = 'b_account_1'),
    (select id from security_ctx where key = 'b_expense_category')
  )),
  'transaction_not_found',
  'user B cannot update user A transaction'
);
select is(
  pg_temp.security_call_error(format(
    'select public.update_account_transfer(%L::uuid,%L::uuid,%L::uuid,500,current_date,''attack'')',
    (select id from security_ctx where key = 'a_transfer'),
    (select id from security_ctx where key = 'b_account_1'),
    (select id from security_ctx where key = 'a_account_2')
  )),
  'transaction_not_found',
  'user B cannot update user A transfer'
);
select is(
  pg_temp.security_call_error(format(
    'select public.upsert_monthly_budget(%L::uuid,date_trunc(''month'',current_date)::date,1000)',
    (select id from security_ctx where key = 'a_expense_category')
  )),
  'category_not_found',
  'user B cannot budget user A category'
);
select is(
  pg_temp.security_call_error(format(
    'select public.upsert_recurring_commitment(%L::uuid,''attack'',1000,5,%L::uuid,%L::uuid)',
    (select id from security_ctx where key = 'a_commitment'),
    (select id from security_ctx where key = 'b_account_1'),
    (select id from security_ctx where key = 'b_expense_category')
  )),
  'commitment_not_found',
  'user B cannot update user A commitment'
);
select is(
  pg_temp.security_call_error(format(
    'select public.pay_recurring_commitment(%L::uuid,date_trunc(''month'',current_date)::date,current_date,%L::uuid)',
    (select id from security_ctx where key = 'a_commitment'),
    '00000000-0000-4000-8000-00000000bb14'
  )),
  'commitment_not_found',
  'user B cannot pay user A commitment'
);
select is(
  pg_temp.security_call_error(format(
    'select public.upsert_recurring_income_template(%L::uuid,''attack'',1000,5,%L::uuid,%L::uuid)',
    (select id from security_ctx where key = 'a_income_template'),
    (select id from security_ctx where key = 'b_account_1'),
    (select id from security_ctx where key = 'b_income_category')
  )),
  'income_template_not_found',
  'user B cannot update user A income template'
);
select is(
  pg_temp.security_call_error(format(
    'select public.record_recurring_income_template(%L::uuid,date_trunc(''month'',current_date)::date,current_date,%L::uuid)',
    (select id from security_ctx where key = 'a_income_template'),
    '00000000-0000-4000-8000-00000000bb15'
  )),
  'income_template_not_found',
  'user B cannot record user A income template'
);
select is(
  pg_temp.security_call_error(format(
    'select public.upsert_savings_goal(%L::uuid,''attack'',100000,null)',
    (select id from security_ctx where key = 'a_goal')
  )),
  'goal_not_found_or_target_below_allocated',
  'user B cannot update user A goal'
);
select is(
  pg_temp.security_call_error(format(
    'select public.adjust_savings_goal(%L::uuid,100)',
    (select id from security_ctx where key = 'a_goal')
  )),
  'goal_not_found',
  'user B cannot allocate user A goal'
);

reset role;
select * from finish();
rollback;
