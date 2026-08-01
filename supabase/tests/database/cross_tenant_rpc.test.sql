begin;
select plan(25);

create temporary table security_ctx (
  key text primary key,
  id uuid not null
) on commit drop;
create temporary table security_setup (
  value boolean not null check (value)
) on commit drop;
create temporary table security_results (
  test text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;
create temporary table security_attack_cases (
  test text primary key,
  statement text not null,
  expected text not null
) on commit drop;

grant select, insert, update, delete on security_ctx to authenticated;
grant select, insert, update, delete on security_setup to authenticated;
grant select, insert, update, delete on security_results to authenticated;
grant select, insert, update, delete on security_attack_cases to authenticated;

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

-- These identities and every generated tenant row are transaction-scoped and
-- rolled back. The normal Auth trigger creates profiles, accounts and categories.
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
  now(), now(), now(),
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
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Security B"}'::jsonb
);

insert into security_ctx values
  ('a_account_1', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000aa01' limit 1
  )),
  ('a_expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000aa01'
      and kind = 'expense' limit 1
  )),
  ('a_income_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000aa01'
      and kind = 'income' limit 1
  )),
  ('b_account_1', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000bb01' limit 1
  )),
  ('b_expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000bb01'
      and kind = 'expense' limit 1
  )),
  ('b_income_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000bb01'
      and kind = 'income' limit 1
  ));

set local role authenticated;
do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-00000000aa01',
    true
  );
end;
$$;

insert into security_ctx values
  ('a_account_2', public.create_financial_account('A second', 'bank', 0, 'VND'));
insert into security_ctx values
  ('a_tx_active', public.create_money_transaction(
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_expense_category'),
    'expense', 1000, current_date, 'A active transaction',
    '00000000-0000-4000-8000-00000000aa11'
  ));
insert into security_ctx values
  ('a_tx_deleted', public.create_money_transaction(
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_expense_category'),
    'expense', 1200, current_date, 'A deleted transaction',
    '00000000-0000-4000-8000-00000000aa12'
  ));
insert into security_setup values (
  public.soft_delete_money_transaction(
    (select id from security_ctx where key = 'a_tx_deleted')
  )
);
insert into security_ctx values
  ('a_transfer', public.create_account_transfer(
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_account_2'),
    500, current_date, 'A transfer',
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
    null, 'A rent', 2000, 5,
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_expense_category')
  ));
insert into security_ctx values
  ('a_commitment_tx', public.pay_recurring_commitment(
    (select id from security_ctx where key = 'a_commitment'),
    date_trunc('month', current_date)::date,
    current_date,
    '00000000-0000-4000-8000-00000000aa14'
  ));
insert into security_ctx values
  ('a_income_template', public.upsert_recurring_income_template(
    null, 'A salary', 5000, 10,
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_income_category')
  ));
insert into security_ctx values
  ('a_income_tx', public.record_recurring_income_template(
    (select id from security_ctx where key = 'a_income_template'),
    date_trunc('month', current_date)::date,
    current_date,
    '00000000-0000-4000-8000-00000000aa15'
  ));
insert into security_ctx values
  ('a_goal', public.upsert_savings_goal(null, 'A goal', 100000, null));

do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-00000000bb01',
    true
  );
end;
$$;

-- Give B two active accounts so the foreign-account archive call cannot stop
-- at the unrelated last_active_account guard before checking row ownership.
insert into security_ctx values
  ('b_account_2', public.create_financial_account('B second', 'bank', 0, 'VND'));

insert into security_results values
  ('rls_account_read', not exists (
    select 1 from public.accounts
    where id = (select id from security_ctx where key = 'a_account_1')
  ), 'foreign account must be invisible'),
  ('rls_transaction_read', not exists (
    select 1 from public.financial_transactions
    where id = (select id from security_ctx where key = 'a_tx_active')
  ), 'foreign transaction must be invisible'),
  ('rls_transaction_view', not exists (
    select 1 from public.transaction_feed
    where id = (select id from security_ctx where key = 'a_tx_active')
  ), 'foreign transaction view row must be invisible'),
  ('update_foreign_account', public.update_financial_account(
    (select id from security_ctx where key = 'a_account_1'),
    'pwned', 'cash', 0
  ) = false, 'foreign account update must return false'),
  ('archive_foreign_account', public.set_financial_account_archived(
    (select id from security_ctx where key = 'a_account_1'), true
  ) = false, 'foreign account archive must return false'),
  ('delete_foreign_budget', public.delete_monthly_budget(
    (select id from security_ctx where key = 'a_budget')
  ) = false, 'foreign budget delete must return false'),
  ('archive_foreign_commitment', public.set_recurring_commitment_archived(
    (select id from security_ctx where key = 'a_commitment'), true
  ) = false, 'foreign commitment archive must return false'),
  ('undo_foreign_commitment', public.undo_recurring_commitment_payment(
    (select id from security_ctx where key = 'a_commitment'),
    date_trunc('month', current_date)::date
  ) = false, 'foreign commitment undo must return false'),
  ('archive_foreign_income_template', public.set_recurring_income_template_archived(
    (select id from security_ctx where key = 'a_income_template'), true
  ) = false, 'foreign income template archive must return false'),
  ('undo_foreign_income', public.undo_recurring_income_template_receipt(
    (select id from security_ctx where key = 'a_income_template'),
    date_trunc('month', current_date)::date
  ) = false, 'foreign income undo must return false'),
  ('archive_foreign_goal', public.set_savings_goal_archived(
    (select id from security_ctx where key = 'a_goal'), true
  ) = false, 'foreign goal archive must return false'),
  ('soft_delete_foreign_tx', public.soft_delete_money_transaction(
    (select id from security_ctx where key = 'a_tx_active')
  ) = false, 'foreign transaction delete must return false'),
  ('restore_foreign_tx', public.restore_money_transaction(
    (select id from security_ctx where key = 'a_tx_deleted')
  ) = false, 'foreign transaction restore must return false');

insert into security_attack_cases
select
  'create_tx_foreign_account',
  format(
    'select public.create_money_transaction(%L::uuid,%L::uuid,''expense'',1000,current_date,''attack'',%L::uuid)',
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_expense_category'),
    '00000000-0000-4000-8000-00000000bb11'
  ),
  'account_not_found';
insert into security_attack_cases
select
  'create_transfer_foreign_accounts',
  format(
    'select public.create_account_transfer(%L::uuid,%L::uuid,500,current_date,''attack'',%L::uuid)',
    (select id from security_ctx where key = 'a_account_1'),
    (select id from security_ctx where key = 'a_account_2'),
    '00000000-0000-4000-8000-00000000bb12'
  ),
  'account_not_found';
insert into security_attack_cases
select
  'create_split_foreign_account',
  format(
    'select public.create_split_expense(%L::uuid,%L::jsonb,current_date,''attack'',%L::uuid)',
    (select id from security_ctx where key = 'a_account_1'),
    jsonb_build_array(
      jsonb_build_object(
        'category_id',
        (select id from security_ctx where key = 'b_expense_category'),
        'amount_minor', 100
      ),
      jsonb_build_object(
        'category_id',
        (select id from security_ctx where key = 'a_expense_category'),
        'amount_minor', 200
      )
    )::text,
    '00000000-0000-4000-8000-00000000bb13'
  ),
  'account_not_found';
insert into security_attack_cases
select
  'update_foreign_tx',
  format(
    'select public.update_money_transaction(%L::uuid,%L::uuid,%L::uuid,''expense'',1000,current_date,''attack'')',
    (select id from security_ctx where key = 'a_tx_active'),
    (select id from security_ctx where key = 'b_account_1'),
    (select id from security_ctx where key = 'b_expense_category')
  ),
  'transaction_not_found';
insert into security_attack_cases
select
  'update_foreign_transfer',
  format(
    'select public.update_account_transfer(%L::uuid,%L::uuid,%L::uuid,500,current_date,''attack'')',
    (select id from security_ctx where key = 'a_transfer'),
    (select id from security_ctx where key = 'b_account_1'),
    (select id from security_ctx where key = 'a_account_2')
  ),
  'transaction_not_found';
insert into security_attack_cases
select
  'upsert_budget_foreign_category',
  format(
    'select public.upsert_monthly_budget(%L::uuid,date_trunc(''month'',current_date)::date,1000)',
    (select id from security_ctx where key = 'a_expense_category')
  ),
  'category_not_found';
insert into security_attack_cases
select
  'update_foreign_commitment',
  format(
    'select public.upsert_recurring_commitment(%L::uuid,''attack'',1000,5,%L::uuid,%L::uuid)',
    (select id from security_ctx where key = 'a_commitment'),
    (select id from security_ctx where key = 'b_account_1'),
    (select id from security_ctx where key = 'b_expense_category')
  ),
  'commitment_not_found';
insert into security_attack_cases
select
  'pay_foreign_commitment',
  format(
    'select public.pay_recurring_commitment(%L::uuid,date_trunc(''month'',current_date)::date,current_date,%L::uuid)',
    (select id from security_ctx where key = 'a_commitment'),
    '00000000-0000-4000-8000-00000000bb14'
  ),
  'commitment_not_found';
insert into security_attack_cases
select
  'update_foreign_income_template',
  format(
    'select public.upsert_recurring_income_template(%L::uuid,''attack'',1000,5,%L::uuid,%L::uuid)',
    (select id from security_ctx where key = 'a_income_template'),
    (select id from security_ctx where key = 'b_account_1'),
    (select id from security_ctx where key = 'b_income_category')
  ),
  'income_template_not_found';
insert into security_attack_cases
select
  'record_foreign_income',
  format(
    'select public.record_recurring_income_template(%L::uuid,date_trunc(''month'',current_date)::date,current_date,%L::uuid)',
    (select id from security_ctx where key = 'a_income_template'),
    '00000000-0000-4000-8000-00000000bb15'
  ),
  'income_template_not_found';
insert into security_attack_cases
select
  'update_foreign_goal',
  format(
    'select public.upsert_savings_goal(%L::uuid,''attack'',100000,null)',
    (select id from security_ctx where key = 'a_goal')
  ),
  'goal_not_found_or_target_below_allocated';
insert into security_attack_cases
select
  'adjust_foreign_goal',
  format(
    'select public.adjust_savings_goal(%L::uuid,100)',
    (select id from security_ctx where key = 'a_goal')
  ),
  'goal_not_found';

do $$
declare
  attack record;
  actual text;
begin
  for attack in
    select test, statement, expected
    from security_attack_cases
    order by test
  loop
    actual := pg_temp.security_call_error(attack.statement);
    insert into security_results values (
      attack.test,
      actual = attack.expected,
      actual
    );
  end loop;
end;
$$;

reset role;
select ok(passed, test || ': ' || detail)
from security_results
order by test;

select * from finish();
rollback;
