begin;
select plan(27);

select has_function(
  'public',
  'ledger_trust_summary',
  array[]::text[],
  'ledger trust summary function exists'
);

select is(
  (select p.prosecdef
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'ledger_trust_summary'
     and p.pronargs = 0),
  false,
  'ledger trust summary is SECURITY INVOKER'
);

select ok(
  has_function_privilege('authenticated', 'public.ledger_trust_summary()', 'EXECUTE'),
  'authenticated can execute ledger trust summary'
);
select ok(
  not has_function_privilege('anon', 'public.ledger_trust_summary()', 'EXECUTE'),
  'anon cannot execute ledger trust summary'
);
select ok(
  (select coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=""%'
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'ledger_trust_summary'
     and p.pronargs = 0),
  'ledger trust summary pins an empty search_path'
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
  '00000000-0000-4000-8000-00000000a101'::uuid,
  'authenticated', 'authenticated', 'trusted-through-a@example.invalid',
  crypt('discarded-test-password-a', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Trusted Through A"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-4000-8000-00000000b101'::uuid,
  'authenticated', 'authenticated', 'trusted-through-b@example.invalid',
  crypt('discarded-test-password-b', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Trusted Through B"}'::jsonb,
  now(), now(), '', '', false, false
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a101","role":"authenticated"}';
set local role authenticated;

select is(
  (select status from public.ledger_trust_summary()),
  'blocked'::text,
  'active account without a clean completed reconciliation blocks trust'
);
select is(
  (select reason from public.ledger_trust_summary()),
  'missing_clean_reconciliation'::text,
  'missing reconciliation reports a bounded reason'
);
select is(
  (select trusted_through from public.ledger_trust_summary()),
  null::date,
  'missing reconciliation has no trusted-through date'
);

reset role;

insert into public.accounts (
  id, user_id, name, kind, currency_code, initial_balance_minor, is_archived
) values
(
  '00000000-0000-4000-8000-00000000a102'::uuid,
  '00000000-0000-4000-8000-00000000a101'::uuid,
  'Second active account', 'bank', 'VND', 0, false
),
(
  '00000000-0000-4000-8000-00000000a103'::uuid,
  '00000000-0000-4000-8000-00000000a101'::uuid,
  'Archived account', 'bank', 'VND', 0, true
);

insert into public.account_reconciliations (
  id, user_id, account_id, statement_date, statement_balance_minor,
  status, calculated_balance_minor, pending_account_leg_count,
  cleared_account_leg_count, reconciled_account_leg_count, completed_at
) values
(
  '00000000-0000-4000-8000-00000000a131'::uuid,
  '00000000-0000-4000-8000-00000000a101'::uuid,
  (select id from public.accounts
   where user_id = '00000000-0000-4000-8000-00000000a101'::uuid
     and id <> '00000000-0000-4000-8000-00000000a102'::uuid
     and id <> '00000000-0000-4000-8000-00000000a103'::uuid
   order by created_at, id limit 1),
  '2026-08-31', 0, 'completed', 0, 0, 0, 0, now()
),
(
  '00000000-0000-4000-8000-00000000a132'::uuid,
  '00000000-0000-4000-8000-00000000a101'::uuid,
  '00000000-0000-4000-8000-00000000a102'::uuid,
  '2026-09-05', 0, 'completed', 0, 0, 0, 0, now()
);

-- Foreign-tenant unresolved work must not affect tenant A.
insert into public.inbox_candidates (
  user_id, kind, amount_minor, merchant, occurred_on, source, confidence
) values (
  '00000000-0000-4000-8000-00000000b101'::uuid,
  'expense', 100, 'Foreign tenant pending', '2026-08-01', 'csv', 'high'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a101","role":"authenticated"}';
set local role authenticated;

select is(
  (select trusted_through from public.ledger_trust_summary()),
  '2026-08-31'::date,
  'minimum latest clean reconciliation across active accounts defines base trust'
);
select is(
  (select active_account_count from public.ledger_trust_summary()),
  2,
  'archived account is excluded from active-account trust coverage'
);
select is(
  (select clean_reconciled_account_count from public.ledger_trust_summary()),
  2,
  'every active account contributes a clean reconciliation'
);
select is(
  (select pending_inbox_count from public.ledger_trust_summary()),
  0::bigint,
  'foreign-tenant pending Inbox work is invisible and does not affect trust'
);
select is(
  (select coverage_scope from public.ledger_trust_summary()),
  'known_ledger_state_only'::text,
  'result explicitly avoids claiming external source completeness'
);

insert into public.inbox_candidates (
  user_id, kind, amount_minor, merchant, occurred_on, source, confidence
) values
(
  '00000000-0000-4000-8000-00000000a101'::uuid,
  'expense', 100, 'Known unresolved before boundary', '2026-08-20', 'csv', 'high'
),
(
  '00000000-0000-4000-8000-00000000a101'::uuid,
  'expense', 100, 'Known unresolved after boundary', '2026-09-02', 'csv', 'high'
);

select is(
  (select trusted_through from public.ledger_trust_summary()),
  '2026-08-19'::date,
  'pending Inbox work before the base boundary limits trust to the prior day'
);
select is(
  (select pending_inbox_count from public.ledger_trust_summary()),
  1::bigint,
  'pending Inbox count includes only work on or before the base boundary'
);
select is(
  (select earliest_unresolved_on from public.ledger_trust_summary()),
  '2026-08-20'::date,
  'earliest known unresolved date is reported without payload data'
);

update public.inbox_candidates
set status = 'rejected'
where user_id = '00000000-0000-4000-8000-00000000a101'::uuid
  and occurred_on = '2026-08-20';

select is(
  (select trusted_through from public.ledger_trust_summary()),
  '2026-08-31'::date,
  'resolving pre-boundary Inbox work restores base trust while later work is ignored'
);

reset role;

insert into public.financial_transactions (
  id, user_id, kind, note, occurred_on, idempotency_key, review_status
) values (
  '00000000-0000-4000-8000-00000000a141'::uuid,
  '00000000-0000-4000-8000-00000000a101'::uuid,
  'expense', 'Backdated reviewed fact', '2026-08-10',
  '00000000-0000-4000-8000-00000000a241'::uuid,
  'reviewed'
);
insert into public.transaction_entries (
  id, transaction_id, user_id, account_id, amount_minor, reconciliation_state
) values (
  '00000000-0000-4000-8000-00000000a151'::uuid,
  '00000000-0000-4000-8000-00000000a141'::uuid,
  '00000000-0000-4000-8000-00000000a101'::uuid,
  (select account_id from public.account_reconciliations
   where id = '00000000-0000-4000-8000-00000000a131'::uuid),
  -100,
  'pending'
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a101","role":"authenticated"}';
set local role authenticated;

select is(
  (select trusted_through from public.ledger_trust_summary()),
  '2026-08-09'::date,
  'backdated reviewed ledger fact with an unreconciled account leg limits trust'
);
select is(
  (select unreconciled_account_leg_count from public.ledger_trust_summary()),
  1::bigint,
  'unreconciled pre-boundary account leg is counted as known unresolved work'
);

reset role;
update public.transaction_entries
set reconciliation_state = 'reconciled',
    cleared_at = now(),
    reconciliation_id = '00000000-0000-4000-8000-00000000a131'::uuid
where id = '00000000-0000-4000-8000-00000000a151'::uuid;

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a101","role":"authenticated"}';
set local role authenticated;
select is(
  (select trusted_through from public.ledger_trust_summary()),
  '2026-08-31'::date,
  'reconciling the backdated account leg restores trust'
);

reset role;
insert into public.financial_transactions (
  id, user_id, kind, note, occurred_on, idempotency_key, review_status
) values (
  '00000000-0000-4000-8000-00000000a142'::uuid,
  '00000000-0000-4000-8000-00000000a101'::uuid,
  'expense', 'Known review exception', '2026-08-15',
  '00000000-0000-4000-8000-00000000a242'::uuid,
  'needs_review'
);
insert into public.transaction_entries (
  id, transaction_id, user_id, account_id, amount_minor,
  reconciliation_state, cleared_at, reconciliation_id
) values (
  '00000000-0000-4000-8000-00000000a152'::uuid,
  '00000000-0000-4000-8000-00000000a142'::uuid,
  '00000000-0000-4000-8000-00000000a101'::uuid,
  (select account_id from public.account_reconciliations
   where id = '00000000-0000-4000-8000-00000000a131'::uuid),
  -100, 'reconciled', now(),
  '00000000-0000-4000-8000-00000000a131'::uuid
);

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a101","role":"authenticated"}';
set local role authenticated;
select is(
  (select trusted_through from public.ledger_trust_summary()),
  '2026-08-14'::date,
  'needs-review ledger fact before the boundary limits trust'
);
select is(
  (select needs_review_transaction_count from public.ledger_trust_summary()),
  1::bigint,
  'needs-review pre-boundary fact is counted without exposing transaction payload'
);

reset role;
update public.financial_transactions
set review_status = 'reviewed'
where id = '00000000-0000-4000-8000-00000000a142'::uuid;

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a101","role":"authenticated"}';
set local role authenticated;
select is(
  (select trusted_through from public.ledger_trust_summary()),
  '2026-08-31'::date,
  'reviewing the known exception restores trust to the reconciliation boundary'
);
select is(
  (select status from public.ledger_trust_summary()),
  'trusted'::text,
  'clean reconciled state reports trusted status'
);
select is(
  (select reason from public.ledger_trust_summary()),
  'clean_reconciliation_boundary'::text,
  'clean reconciled state reports bounded trust reason'
);

reset role;
update public.accounts
set is_archived = true
where user_id = '00000000-0000-4000-8000-00000000a101'::uuid
  and not is_archived;

set local request.jwt.claims =
  '{"sub":"00000000-0000-4000-8000-00000000a101","role":"authenticated"}';
set local role authenticated;
select is(
  (select status from public.ledger_trust_summary()),
  'blocked'::text,
  'user with no active accounts has no trusted-through period'
);
select is(
  (select reason from public.ledger_trust_summary()),
  'no_active_accounts'::text,
  'no-active-account state is explicit rather than overclaiming trust'
);

select * from finish();
rollback;
