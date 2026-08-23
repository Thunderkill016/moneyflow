begin;
select plan(25);

select has_function(
  'public',
  'review_source_lifecycle_observation_from_candidate',
  array['uuid', 'uuid'],
  'reviewed source lifecycle reconciliation RPC exists'
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
  '44800000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'lifecycle-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Lifecycle Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '44800000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'lifecycle-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Lifecycle Other"}'::jsonb,
  now(), now(), '', '', false, false
);

create or replace function pg_temp.insert_source_candidate(
  p_id uuid,
  p_user_id uuid,
  p_external_id text,
  p_lifecycle text,
  p_amount bigint,
  p_occurred_on date,
  p_raw text,
  p_predecessor text default null,
  p_kind public.transaction_kind default 'expense'::public.transaction_kind
)
returns void
language plpgsql
as $$
begin
  insert into public.inbox_candidates (
    id, user_id, kind, amount_minor, merchant, note, occurred_on, source,
    confidence, status, category_id, category_name, account_id, account_name,
    raw_snippet, source_row_index, source_external_id, source_lifecycle_state,
    source_predecessor_external_id, parser_version, mapping_version
  ) values (
    p_id, p_user_id, p_kind, p_amount,
    'Lifecycle merchant', 'Lifecycle evidence', p_occurred_on, 'csv',
    'high', 'pending',
    (select id from public.categories
      where user_id = p_user_id and kind::text = p_kind::text
      order by created_at, id limit 1),
    (select name from public.categories
      where user_id = p_user_id and kind::text = p_kind::text
      order by created_at, id limit 1),
    (select id from public.accounts
      where user_id = p_user_id order by created_at, id limit 1),
    (select name from public.accounts
      where user_id = p_user_id order by created_at, id limit 1),
    p_raw, 1, p_external_id, p_lifecycle, p_predecessor,
    'lifecycle-test@1.0', 1
  );
end;
$$;

set local request.jwt.claims = '{"sub":"44800000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000001',
  '44800000-0000-4000-8000-000000000001',
  'same-id-448', 'pending', 51000, '2026-08-20',
  '20/08 Lifecycle merchant -51000'
);
select set_config(
  'moneyflow_test.lifecycle_tx',
  public.approve_inbox_candidate(
    '44810000-0000-4000-8000-000000000001', 'expense',
    (select id from public.accounts where user_id = '44800000-0000-4000-8000-000000000001' order by created_at, id limit 1),
    (select id from public.categories where user_id = '44800000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
    null, 51000, '2026-08-20', 'User ledger fact',
    '44820000-0000-4000-8000-000000000001', false
  )::text,
  true
);
select is(
  (select reconciliation_state::text from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.lifecycle_tx')::uuid),
  'pending',
  'initial pending source approval leaves the account leg pending'
);

select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000002',
  '44800000-0000-4000-8000-000000000001',
  'same-id-448', 'posted', 51000, '2026-08-20',
  '20/08 Lifecycle merchant -51000'
);
select is(
  public.plan_inbox_candidate('44810000-0000-4000-8000-000000000002') ->> 'reason',
  'source_external_id_lifecycle_changed',
  'same-ID lifecycle-only transition is reviewable'
);
select throws_ok(
  format(
    'select public.approve_inbox_candidate(%L::uuid, %L::public.transaction_kind, %L::uuid, %L::uuid, null, 51000, %L::date, %L, %L::uuid, true)',
    '44810000-0000-4000-8000-000000000002', 'expense',
    (select id from public.accounts where user_id = '44800000-0000-4000-8000-000000000001' order by created_at, id limit 1),
    (select id from public.categories where user_id = '44800000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
    '2026-08-20', 'must not create separately',
    '44820000-0000-4000-8000-000000000002'
  ),
  'source_external_id_duplicate',
  'ordinary approval cannot bypass lifecycle source identity'
);
select set_config(
  'moneyflow_test.lifecycle_audit_before',
  (select count(*)::text from public.financial_mutation_audit_events
   where user_id = '44800000-0000-4000-8000-000000000001'
     and related_transaction_id = current_setting('moneyflow_test.lifecycle_tx')::uuid
     and action = 'entry_reconciliation_changed'),
  true
);
select is(
  public.review_source_lifecycle_observation_from_candidate(
    '44810000-0000-4000-8000-000000000002',
    current_setting('moneyflow_test.lifecycle_tx')::uuid
  ) ->> 'reason',
  'posted_exact_match_cleared',
  'reviewed exact posted evidence clears the pending leg'
);
select is(
  (select reconciliation_state::text from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.lifecycle_tx')::uuid),
  'cleared',
  'posted source evidence advances only to cleared'
);
select is(
  (select match_reason from public.inbox_candidates
   where id = '44810000-0000-4000-8000-000000000002'),
  'source_lifecycle_observation',
  'lifecycle-only evidence is durably approved'
);
select is(
  (select count(*)::integer from public.financial_mutation_audit_events
   where user_id = '44800000-0000-4000-8000-000000000001'
     and related_transaction_id = current_setting('moneyflow_test.lifecycle_tx')::uuid
     and action = 'entry_reconciliation_changed'),
  current_setting('moneyflow_test.lifecycle_audit_before')::integer + 1,
  'pending-to-cleared uses the existing financial audit'
);
select is(
  public.review_source_lifecycle_observation_from_candidate(
    '44810000-0000-4000-8000-000000000002',
    current_setting('moneyflow_test.lifecycle_tx')::uuid
  ) ->> 'reason',
  'already_cleared',
  'review replay is idempotent'
);
select is(
  (select count(*)::integer from public.financial_mutation_audit_events
   where user_id = '44800000-0000-4000-8000-000000000001'
     and related_transaction_id = current_setting('moneyflow_test.lifecycle_tx')::uuid
     and action = 'entry_reconciliation_changed'),
  current_setting('moneyflow_test.lifecycle_audit_before')::integer + 1,
  'review replay creates no second reconciliation audit'
);
select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000003',
  '44800000-0000-4000-8000-000000000001',
  'same-id-448', 'posted', 51000, '2026-08-20',
  '20/08 Lifecycle merchant -51000'
);
select is(
  public.plan_inbox_candidate('44810000-0000-4000-8000-000000000003') ->> 'reason',
  'source_external_id_match',
  'reviewed posted evidence becomes the new exact-source baseline'
);

select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000004',
  '44800000-0000-4000-8000-000000000001',
  'same-id-448', 'pending', 51000, '2026-08-20',
  '20/08 Lifecycle merchant -51000'
);
select is(
  public.review_source_lifecycle_observation_from_candidate(
    '44810000-0000-4000-8000-000000000004',
    current_setting('moneyflow_test.lifecycle_tx')::uuid
  ) ->> 'reason',
  'pending_source_evidence',
  'pending source evidence is observation-only'
);
select is(
  (select reconciliation_state::text from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.lifecycle_tx')::uuid),
  'cleared',
  'pending evidence cannot demote cleared state'
);

select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000005',
  '44800000-0000-4000-8000-000000000001',
  'same-id-448', 'removed', 51000, '2026-08-20',
  '20/08 Lifecycle merchant -51000'
);
select is(
  public.review_source_lifecycle_observation_from_candidate(
    '44810000-0000-4000-8000-000000000005',
    current_setting('moneyflow_test.lifecycle_tx')::uuid
  ) ->> 'reason',
  'removed_source_evidence',
  'removed source evidence is observation-only'
);
select is(
  (select row(t.deleted_at, e.reconciliation_state::text)::text
   from public.financial_transactions t
   join public.transaction_entries e on e.transaction_id = t.id and e.user_id = t.user_id
   where t.id = current_setting('moneyflow_test.lifecycle_tx')::uuid),
  '(,cleared)',
  'removed evidence neither deletes nor demotes the ledger fact'
);

select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000006',
  '44800000-0000-4000-8000-000000000001',
  'mismatch-448', 'pending', 80000, '2026-08-21',
  '21/08 Mismatch merchant -80000'
);
select set_config(
  'moneyflow_test.mismatch_tx',
  public.approve_inbox_candidate(
    '44810000-0000-4000-8000-000000000006', 'expense',
    (select id from public.accounts where user_id = '44800000-0000-4000-8000-000000000001' order by created_at, id limit 1),
    (select id from public.categories where user_id = '44800000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
    null, 80000, '2026-08-21', 'User keeps 80000',
    '44820000-0000-4000-8000-000000000006', false
  )::text,
  true
);
select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000007',
  '44800000-0000-4000-8000-000000000001',
  'mismatch-448', 'posted', 85000, '2026-08-21',
  '21/08 Mismatch merchant -85000'
);
select is(
  public.plan_inbox_candidate('44810000-0000-4000-8000-000000000007') ->> 'reason',
  'source_external_id_changed',
  'changed posted economics remain explicit changed-source evidence'
);
select is(
  public.review_source_lifecycle_observation_from_candidate(
    '44810000-0000-4000-8000-000000000007',
    current_setting('moneyflow_test.mismatch_tx')::uuid
  ) ->> 'reason',
  'posted_ledger_mismatch',
  'changed posted evidence does not clear mismatched ledger economics'
);
select is(
  (select row(e.amount_minor, e.reconciliation_state::text)::text
   from public.transaction_entries e
   where e.transaction_id = current_setting('moneyflow_test.mismatch_tx')::uuid),
  '(-80000,pending)',
  'source mismatch neither overwrites amount nor advances reconciliation'
);

select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000008',
  '44800000-0000-4000-8000-000000000001',
  'pre-pending-448', 'pending', 70000, '2026-08-22',
  '22/08 Replacement merchant -70000'
);
select set_config(
  'moneyflow_test.predecessor_tx',
  public.approve_inbox_candidate(
    '44810000-0000-4000-8000-000000000008', 'expense',
    (select id from public.accounts where user_id = '44800000-0000-4000-8000-000000000001' order by created_at, id limit 1),
    (select id from public.categories where user_id = '44800000-0000-4000-8000-000000000001' and kind = 'expense' order by created_at, id limit 1),
    null, 70000, '2026-08-22', 'Replacement ledger fact',
    '44820000-0000-4000-8000-000000000008', false
  )::text,
  true
);
select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000009',
  '44800000-0000-4000-8000-000000000001',
  'pre-posted-448', 'posted', 70000, '2026-08-22',
  '22/08 Replacement merchant -70000', 'pre-pending-448'
);
select is(
  public.review_source_lifecycle_observation_from_candidate(
    '44810000-0000-4000-8000-000000000009',
    current_setting('moneyflow_test.predecessor_tx')::uuid
  ) ->> 'reason',
  'posted_exact_match_cleared',
  'explicit pending-to-posted predecessor can clear exact ledger economics'
);
select is(
  (select row(c.match_reason, e.reconciliation_state::text)::text
   from public.inbox_candidates c
   join public.transaction_entries e
     on e.transaction_id = c.approved_transaction_id and e.user_id = c.user_id
   where c.id = '44810000-0000-4000-8000-000000000009'),
  '(source_predecessor_observation,cleared)',
  'predecessor identity stays durable while the account leg becomes cleared'
);

set local request.jwt.claims = '{"sub":"44800000-0000-4000-8000-000000000002","role":"authenticated"}';
select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000010',
  '44800000-0000-4000-8000-000000000002',
  'reconciled-448', 'pending', 100000, '2026-08-20',
  '20/08 Reconciled merchant +100000', null, 'income'
);
select set_config(
  'moneyflow_test.reconciled_tx',
  public.approve_inbox_candidate(
    '44810000-0000-4000-8000-000000000010', 'income',
    (select id from public.accounts where user_id = '44800000-0000-4000-8000-000000000002' order by created_at, id limit 1),
    (select id from public.categories where user_id = '44800000-0000-4000-8000-000000000002' and kind = 'income' order by created_at, id limit 1),
    null, 100000, '2026-08-20', 'Reconciled ledger fact',
    '44820000-0000-4000-8000-000000000010', false
  )::text,
  true
);
select set_config(
  'moneyflow_test.reconciled_entry',
  (select id::text from public.transaction_entries
   where transaction_id = current_setting('moneyflow_test.reconciled_tx')::uuid),
  true
);
select is(
  public.set_account_entry_reconciliation_state(
    current_setting('moneyflow_test.reconciled_entry')::uuid,
    'cleared'
  ),
  'cleared'::public.entry_reconciliation_state,
  'fixture clears the account leg before statement completion'
);
select set_config(
  'moneyflow_test.reconciliation_id',
  public.start_account_reconciliation(
    (select id from public.accounts where user_id = '44800000-0000-4000-8000-000000000002' order by created_at, id limit 1),
    '2026-08-22', 100000
  )::text,
  true
);
select is(
  public.complete_account_reconciliation(
    current_setting('moneyflow_test.reconciliation_id')::uuid
  ),
  true,
  'fixture statement reconciliation completes'
);
select pg_temp.insert_source_candidate(
  '44810000-0000-4000-8000-000000000011',
  '44800000-0000-4000-8000-000000000002',
  'reconciled-448', 'posted', 100000, '2026-08-20',
  '20/08 Reconciled merchant +100000', null, 'income'
);
select is(
  public.review_source_lifecycle_observation_from_candidate(
    '44810000-0000-4000-8000-000000000011',
    current_setting('moneyflow_test.reconciled_tx')::uuid
  ) ->> 'reason',
  'already_reconciled',
  'posted source evidence cannot change statement-reconciled state'
);
select is(
  (select reconciliation_state::text from public.transaction_entries
   where id = current_setting('moneyflow_test.reconciled_entry')::uuid),
  'reconciled',
  'statement-reconciled account leg remains reconciled'
);

set local request.jwt.claims = '{"sub":"44800000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok(
  format(
    'select public.review_source_lifecycle_observation_from_candidate(%L::uuid, %L::uuid)',
    '44810000-0000-4000-8000-000000000011',
    current_setting('moneyflow_test.reconciled_tx')
  ),
  'candidate_not_found',
  'one tenant cannot review another tenant lifecycle observation'
);

select * from finish();
rollback;