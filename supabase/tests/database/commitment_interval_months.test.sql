-- recurring_commitments.interval_months (20261015090000): the new optional
-- RPC arg stores the cycle, defaults to monthly for legacy callers, rejects
-- out-of-range values, and the update path can change the cadence.

begin;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '99999999-9999-4999-8999-999999999991'::uuid,
  'authenticated', 'authenticated', 'interval-commitment@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Interval Commitment"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.accounts (user_id, name, kind, initial_balance_minor)
values ('99999999-9999-4999-8999-999999999991'::uuid, 'Interval account', 'cash', 1000000);
insert into public.categories (user_id, name, kind)
values ('99999999-9999-4999-8999-999999999991'::uuid, 'Interval expense', 'expense');

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999991","role":"authenticated"}';
set local role authenticated;

select set_config(
  'moneyflow_test.ic_account',
  (select id::text from public.accounts
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid and name = 'Interval account'),
  true
);
select set_config(
  'moneyflow_test.ic_category',
  (select id::text from public.categories
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid and name = 'Interval expense'),
  true
);

-- 1: omitting p_interval_months stores the monthly contract (legacy callers).
select set_config(
  'moneyflow_test.ic_monthly',
  public.upsert_recurring_commitment(
    null, 'Monthly default', 500000, 5,
    current_setting('moneyflow_test.ic_account')::uuid,
    current_setting('moneyflow_test.ic_category')::uuid
  )::text,
  true
);
select is(
  (select interval_months from public.recurring_commitments
   where id = current_setting('moneyflow_test.ic_monthly')::uuid),
  1,
  'omitted interval_months stores monthly cadence'
);

-- 2: an explicit yearly cadence is stored, and the feed view exposes it.
select set_config(
  'moneyflow_test.ic_yearly',
  public.upsert_recurring_commitment(
    null, 'Tết yearly', 2000000, 1,
    current_setting('moneyflow_test.ic_account')::uuid,
    current_setting('moneyflow_test.ic_category')::uuid,
    null, 12
  )::text,
  true
);
select is(
  (select interval_months from public.recurring_commitment_feed
   where id = current_setting('moneyflow_test.ic_yearly')::uuid),
  12,
  'yearly cadence is stored and readable through the feed view'
);

-- 3-5: bounds — zero, above-24 and null all fail closed.
select throws_ok(
  format(
    'select public.upsert_recurring_commitment(null, ''Bad zero'', 1000, 5, %L::uuid, %L::uuid, null, 0)',
    current_setting('moneyflow_test.ic_account'),
    current_setting('moneyflow_test.ic_category')
  ),
  'invalid_commitment_interval',
  'interval 0 is rejected'
);
select throws_ok(
  format(
    'select public.upsert_recurring_commitment(null, ''Bad high'', 1000, 5, %L::uuid, %L::uuid, null, 25)',
    current_setting('moneyflow_test.ic_account'),
    current_setting('moneyflow_test.ic_category')
  ),
  'invalid_commitment_interval',
  'interval above 24 is rejected'
);
select throws_ok(
  format(
    'select public.upsert_recurring_commitment(null, ''Bad null'', 1000, 5, %L::uuid, %L::uuid, null, null)',
    current_setting('moneyflow_test.ic_account'),
    current_setting('moneyflow_test.ic_category')
  ),
  'invalid_commitment_interval',
  'explicit null interval is rejected'
);

-- 6: the update path changes the cadence on the same row.
select is(
  (select interval_months from public.recurring_commitments where id =
   public.upsert_recurring_commitment(
     current_setting('moneyflow_test.ic_monthly')::uuid,
     'Quarterly now', 500000, 5,
     current_setting('moneyflow_test.ic_account')::uuid,
     current_setting('moneyflow_test.ic_category')::uuid,
     null, 3
   )),
  3,
  'update path stores the new cadence'
);

-- 7: compatibility — a 7-positional-arg call (with expected_updated_at, no
-- interval) resolves through the default and keeps the monthly cadence.
select is(
  (select interval_months from public.recurring_commitments where id =
   public.upsert_recurring_commitment(
     current_setting('moneyflow_test.ic_monthly')::uuid,
     'Back to monthly', 500000, 5,
     current_setting('moneyflow_test.ic_account')::uuid,
     current_setting('moneyflow_test.ic_category')::uuid,
     (select updated_at from public.recurring_commitments
      where id = current_setting('moneyflow_test.ic_monthly')::uuid)
   )),
  1,
  '7-arg callers keep working and default to monthly'
);

-- 8: pre-existing rows created before the migration keep interval 1
-- (covered by the column default; assert the seeded row honors it).
select is(
  (select count(*)::integer from public.recurring_commitments
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     and interval_months is null),
  0,
  'no commitment row carries a null cadence'
);

select * from finish();
rollback;
