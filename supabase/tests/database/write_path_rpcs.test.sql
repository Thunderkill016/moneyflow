begin;
select plan(39);

create temporary table security_ctx (
  key text primary key,
  id uuid not null
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
create temporary table security_json (
  key text primary key,
  payload jsonb not null
) on commit drop;

grant select, insert, update, delete on security_ctx to authenticated;
grant select, insert, update, delete on security_results to authenticated;
grant select, insert, update, delete on security_attack_cases to authenticated;
grant select, insert, update, delete on security_json to authenticated;

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
  'wpath-a@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"WritePath A"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000bb01',
  'authenticated',
  'authenticated',
  'wpath-b@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"WritePath B"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000cc01',
  'authenticated',
  'authenticated',
  'wpath-c@example.invalid',
  crypt('not-a-real-password', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"WritePath C"}'::jsonb
);

insert into security_ctx values
  ('a_expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000aa01'
      and kind = 'expense' and is_default limit 1
  )),
  ('a_income_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000aa01'
      and kind = 'income' limit 1
  )),
  ('a_default_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000aa01'
      and is_default limit 1
  )),
  ('a_account_1', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000aa01' limit 1
  )),
  ('b_expense_category', (
    select id from public.categories
    where user_id = '00000000-0000-4000-8000-00000000bb01'
      and kind = 'expense' limit 1
  )),
  ('b_account_1', (
    select id from public.accounts
    where user_id = '00000000-0000-4000-8000-00000000bb01' limit 1
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

-- Tenant A builds fixtures through the new RPC surface itself: a custom
-- category, a pending rule on it, one pending candidate and one import batch.
insert into security_ctx
select 'a_custom_category', id
from public.upsert_financial_category(
  'A custom', 'expense', null, null, null
);
insert into security_ctx
select 'a_deletable_category', id
from public.upsert_financial_category(
  'A deletable', 'expense', null, null, null
);
insert into security_ctx
select 'a_rule', id
from public.upsert_inbox_rule(
  'merchant', 'grab',
  (select id from security_ctx where key = 'a_expense_category'),
  null, true, null, null
);
-- A second rule pins the deletable category so its delete hits RESTRICT.
insert into security_ctx
select 'a_deletable_rule', id
from public.upsert_inbox_rule(
  'note', 'pin',
  (select id from security_ctx where key = 'a_deletable_category'),
  null, true, null, null
);
insert into security_ctx
select 'a_candidate', id
from public.create_inbox_candidates(jsonb_build_array(jsonb_build_object(
  'kind', 'expense',
  'amount_minor', 12000,
  'merchant', 'A merchant',
  'occurred_on', current_date,
  'source', 'manual',
  'confidence', 'high'
))) limit 1;
insert into security_ctx
select 'a_batch', id
from public.create_import_batch(
  'a-statement.csv', 'csv', 3, 0, 0, 0.5, '[]'::jsonb, '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Tenant B: every write RPC must fail closed on A's rows, and every flipped
-- reader must return only B's own data (definer = own predicates only).
-- ---------------------------------------------------------------------------
do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-00000000bb01',
    true
  );
end;
$$;

insert into security_ctx values
  ('b_account_2', public.create_financial_account('B second', 'bank', 0, 'VND'));

insert into security_json values
  ('b_archive', public.export_user_archive()),
  ('b_bundle', public.get_dashboard_bundle(current_date, current_date, 5));

insert into security_results values
  ('reader_export_tenant_scope', (
    select jsonb_array_length(payload -> 'tables' -> 'accounts') = 2
      and jsonb_array_length(payload -> 'tables' -> 'inboxCandidates') = 0
    from security_json where key = 'b_archive'
  ), 'export_user_archive must contain only B accounts and no A candidates'),
  ('reader_bundle_tenant_scope', (
    select jsonb_array_length(payload -> 'accounts') = 2
      and jsonb_array_length(payload -> 'transactions') = 0
    from security_json where key = 'b_bundle'
  ), 'get_dashboard_bundle must contain only B accounts and no A transactions'),
  ('reader_trust_tenant_scope', (
    select active_account_count = 2
    from public.ledger_trust_summary()
  ), 'ledger_trust_summary must count only B accounts'),
  ('reader_snapshot_forbidden', pg_temp.security_call_error(
    format(
      'select * from public.reconciliation_snapshot_for_user(%L::uuid, %L::uuid, current_date)',
      '00000000-0000-4000-8000-00000000aa01',
      (select id from security_ctx where key = 'a_account_1')
    )
  ) = 'reconciliation_snapshot_forbidden', 'foreign p_user_id must be rejected');

insert into security_attack_cases
select 'upsert_foreign_category', format(
  'select * from public.upsert_financial_category(''pwned'',''expense'',null,null,%L::uuid)',
  (select id from security_ctx where key = 'a_custom_category')
), 'category_not_found';
insert into security_attack_cases
select 'archive_foreign_category', format(
  'select * from public.set_category_archived(%L::uuid, true)',
  (select id from security_ctx where key = 'a_custom_category')
), 'category_not_found';
insert into security_attack_cases
select 'delete_foreign_category', format(
  'select public.delete_financial_category(%L::uuid)',
  (select id from security_ctx where key = 'a_custom_category')
), 'category_not_found';
insert into security_attack_cases
select 'reject_foreign_candidate', format(
  'select public.reject_inbox_candidate(%L::uuid)',
  (select id from security_ctx where key = 'a_candidate')
), 'candidate_not_found';
insert into security_attack_cases
select 'update_foreign_candidate', format(
  'select public.update_inbox_candidate(%L::uuid, ''{"merchant":"pwned"}''::jsonb)',
  (select id from security_ctx where key = 'a_candidate')
), 'candidate_not_found';
insert into security_attack_cases
select 'upsert_foreign_rule', format(
  'select * from public.upsert_inbox_rule(''merchant'',''pwned'',%L::uuid,null,true,%L::uuid,1)',
  (select id from security_ctx where key = 'b_expense_category'),
  (select id from security_ctx where key = 'a_rule')
), 'rule_not_found';
insert into security_attack_cases
select 'delete_foreign_rule', format(
  'select public.delete_inbox_rule(%L::uuid, 1)',
  (select id from security_ctx where key = 'a_rule')
), 'rule_not_found';
insert into security_attack_cases
select 'status_foreign_batch', format(
  'select public.update_import_batch_status(%L::uuid, ''cancelled''::public.import_batch_status)',
  (select id from security_ctx where key = 'a_batch')
), 'batch_not_found';
insert into security_attack_cases
select 'delete_foreign_batch', format(
  'select public.delete_import_batch(%L::uuid)',
  (select id from security_ctx where key = 'a_batch')
), 'batch_not_found';
insert into security_attack_cases
select 'create_candidates_bad_kind', format(
  'select * from public.create_inbox_candidates(jsonb_build_array(jsonb_build_object(''kind'',''bogus'',''amount_minor'',5,''merchant'',''x'',''occurred_on'',current_date,''source'',''manual'',''confidence'',''high'')))'
), 'invalid_candidate_kind';
insert into security_attack_cases
select 'create_candidates_too_many', format(
  'select count(*) from public.create_inbox_candidates((select jsonb_agg(jsonb_build_object(''kind'',''expense'',''amount_minor'',5,''merchant'',''x'',''occurred_on'',current_date,''source'',''manual'',''confidence'',''high'')) from generate_series(1,501)))'
), 'too_many_candidates';
insert into security_attack_cases
select 'propose_transfer_kind', format(
  'select public.propose_inbox_candidate(''transfer''::public.transaction_kind,100,''m'',current_date,gen_random_uuid())'
), 'invalid_proposal_kind';
insert into security_attack_cases
select 'category_transfer_glyph', format(
  'select * from public.upsert_financial_category(''x'',''expense'',''arrows'',null,null)'
), 'invalid_category_icon';

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

-- ---------------------------------------------------------------------------
-- Tenant A: self-tenant error codes and happy paths.
-- ---------------------------------------------------------------------------
do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-00000000aa01',
    true
  );
end;
$$;

insert into security_results values
  ('category_default_locked', pg_temp.security_call_error(
    format(
      'select public.delete_financial_category(%L::uuid)',
      (select id from security_ctx where key = 'a_default_category')
    )
  ) = 'category_default_locked', 'seeded defaults must survive the definer path'),
  ('category_kind_locked', pg_temp.security_call_error(
    format(
      'select * from public.upsert_financial_category(''renamed'',''income'',null,null,%L::uuid)',
      (select id from security_ctx where key = 'a_custom_category')
    )
  ) = 'category_kind_locked', 'kind must be immutable on update'),
  ('category_name_taken', pg_temp.security_call_error(
    format(
      'select * from public.upsert_financial_category(''A custom'',''expense'',null,null,null)'
    )
  ) = 'category_name_taken', 'duplicate (user_id,name,kind) must map to a code'),
  ('category_in_use', pg_temp.security_call_error(
    format(
      'select public.delete_financial_category(%L::uuid)',
      (select id from security_ctx where key = 'a_deletable_category')
    )
  ) = 'category_in_use', 'RESTRICT references must map to a code'),
  ('rule_stale_write', pg_temp.security_call_error(
    format(
      'select * from public.upsert_inbox_rule(''merchant'',''grab v2'',%L::uuid,null,true,%L::uuid,99)',
      (select id from security_ctx where key = 'a_expense_category'),
      (select id from security_ctx where key = 'a_rule')
    )
  ) = 'stale_write', 'mismatched expected version must be rejected'),
  ('delete_rule_stale', pg_temp.security_call_error(
    format(
      'select public.delete_inbox_rule(%L::uuid, 99)',
      (select id from security_ctx where key = 'a_rule')
    )
  ) = 'stale_write', 'delete with wrong version must be rejected'),
  ('candidate_status_patch_blocked', pg_temp.security_call_error(
    format(
      'select public.update_inbox_candidate(%L::uuid, ''{"status":"approved"}''::jsonb)',
      (select id from security_ctx where key = 'a_candidate')
    )
  ) = 'invalid_candidate_patch', 'status must never be writable through patch'),
  ('candidate_update_own', exists (
    select 1
    from public.update_inbox_candidate(
      (select id from security_ctx where key = 'a_candidate'),
      '{"merchant":"renamed","category_id":null}'::jsonb
    ) as updated
    where updated.merchant = 'renamed'
      and updated.status = 'pending'
  ), 'own pending candidate patch applies without touching status'),
  ('candidate_reject_own', public.reject_inbox_candidate(
    (select id from security_ctx where key = 'a_candidate')
  ), 'reject own pending candidate'),
  ('candidate_reject_replay', pg_temp.security_call_error(
    format(
      'select public.reject_inbox_candidate(%L::uuid)',
      (select id from security_ctx where key = 'a_candidate')
    )
  ) = 'candidate_not_pending', 're-reject must fail closed'),
  ('rule_update_own', exists (
    select 1
    from public.upsert_inbox_rule(
      'note', 'grab v2',
      (select id from security_ctx where key = 'a_expense_category'),
      'Grab', true,
      (select id from security_ctx where key = 'a_rule'),
      1
    ) as rule_row
    where rule_row.version = 2
      and rule_row.match_field = 'note'
  ), 'own rule update bumps version via trigger'),
  ('rule_delete_own', public.delete_inbox_rule(
    (select id from security_ctx where key = 'a_rule'), 2
  ), 'delete own rule with matching version'),
  ('batch_commit_own', exists (
    select 1
    from public.update_import_batch_status(
      (select id from security_ctx where key = 'a_batch'),
      'committed'::public.import_batch_status
    ) as batch_row
    where batch_row.status = 'committed'
      and batch_row.committed_at is not null
  ), 'commit stamps committed_at server-side'),
  ('batch_delete_own', public.delete_import_batch(
    (select id from security_ctx where key = 'a_batch')
  ), 'delete own batch'),
  ('backup_stamp_own', public.record_backup_made(), 'backup stamp returns true'),
  ('propose_candidate_own', exists (
    select 1
    from public.propose_inbox_candidate(
      'expense'::public.transaction_kind, 4500, 'agent merchant', current_date,
      '00000000-0000-4000-8000-00000000ee01'
    ) as proposed
    where proposed.source = 'agent'
      and proposed.status = 'pending'
      and proposed.source_external_id =
        'agent|first-party|00000000-0000-4000-8000-00000000ee01'
      and proposed.user_id = '00000000-0000-4000-8000-00000000aa01'
  ), 'agent proposal lands as own pending candidate with first-party external id'),
  ('propose_candidate_replay', exists (
    select 1
    from public.propose_inbox_candidate(
      'expense'::public.transaction_kind, 9999, 'different merchant', current_date,
      '00000000-0000-4000-8000-00000000ee01'
    ) as replayed
    where replayed.merchant = 'agent merchant'
  ), 'replayed idempotency key returns the original row');

-- ---------------------------------------------------------------------------
-- Unauthenticated callers must be rejected by every RPC before any work.
-- ---------------------------------------------------------------------------
do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

insert into security_results values
  ('unauthenticated_upsert_category', pg_temp.security_call_error(
    'select * from public.upsert_financial_category(''x'',''expense'',null,null,null)'
  ) = 'authentication_required', 'anon uid must be rejected'),
  ('unauthenticated_reader', pg_temp.security_call_error(
    'select public.export_user_archive()'
  ) = 'authentication_required', 'anon uid must be rejected');

-- ---------------------------------------------------------------------------
-- Tenant C: delete_my_account removes public rows and the identity row.
-- ---------------------------------------------------------------------------
do $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-00000000cc01',
    true
  );
end;
$$;

insert into security_json
select 'c_delete_result', public.delete_my_account();

reset role;
insert into security_results values
  ('delete_account_identity_gone', not exists (
    select 1 from auth.users
    where id = '00000000-0000-4000-8000-00000000cc01'
  ), 'identity row must be deleted'),
  ('delete_account_report', exists (
    select 1
    from security_json
    where key = 'c_delete_result'
      and (payload ->> 'tenant_rows_remaining')::integer = 0
      and (payload ->> 'deleted_rows')::bigint > 0
  ), 'report must show remaining = 0 and deleted > 0');

select ok(passed, test || ': ' || detail)
from security_results
order by test;

select is(
  (select count(*)::integer from security_results where not passed),
  0,
  'no write-path rpc assertion failed'
);

select * from finish();
rollback;
