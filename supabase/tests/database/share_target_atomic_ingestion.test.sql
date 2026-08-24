begin;
select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '45000000-0000-4000-8000-000000000001'::uuid,
  'authenticated', 'authenticated', 'share-owner@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Share Owner"}'::jsonb,
  now(), now(), '', '', false, false
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '45000000-0000-4000-8000-000000000002'::uuid,
  'authenticated', 'authenticated', 'share-other@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Share Other"}'::jsonb,
  now(), now(), '', '', false, false
);

create temporary table share_other_account(id uuid not null) on commit drop;
insert into share_other_account(id)
select id
from public.accounts
where user_id = '45000000-0000-4000-8000-000000000002'::uuid
order by created_at, id
limit 1;
grant select on share_other_account to authenticated;

create or replace function pg_temp.cross_tenant_share_rejected()
returns boolean
language plpgsql
as $$
begin
  perform public.ingest_share_target_capture(
    jsonb_build_array(
      jsonb_build_object(
        'id', '45010000-0000-4000-8000-000000000020',
        'file_name', 'cross-tenant.csv',
        'source', 'csv',
        'row_count', 1,
        'warning_count', 0,
        'skipped_rows', 0,
        'map_confidence', 1,
        'headers', '["date","description","amount"]'::jsonb,
        'column_map', '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb,
        'parser_version', 'caller-spoof@9.9',
        'mapping_version', 99
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'id', '45020000-0000-4000-8000-000000000020',
        'import_batch_id', '45010000-0000-4000-8000-000000000020',
        'kind', 'expense',
        'amount_minor', 30000,
        'merchant', 'Foreign account attempt',
        'note', '',
        'occurred_on', '2026-08-24',
        'source', 'csv',
        'confidence', 'high',
        'account_id', (select id::text from pg_temp.share_other_account limit 1),
        'source_row_index', 1,
        'parser_version', 'caller-spoof@9.9',
        'mapping_version', 99
      )
    )
  );
  return false;
exception
  when foreign_key_violation then return true;
end;
$$;
grant execute on function pg_temp.cross_tenant_share_rejected() to authenticated;

set local request.jwt.claims = '{"sub":"45000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select has_function(
  'public',
  'ingest_share_target_capture',
  array['jsonb', 'jsonb'],
  'Share Target atomic ingestion RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.ingest_share_target_capture(jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated may execute Share Target ingestion RPC'
);

select is(
  (
    public.ingest_share_target_capture(
      jsonb_build_array(
        jsonb_build_object(
          'id', '45010000-0000-4000-8000-000000000001',
          'file_name', 'PWA Share text',
          'source', 'paste',
          'row_count', 1,
          'warning_count', 0,
          'skipped_rows', 0,
          'map_confidence', 1,
          'headers', '[]'::jsonb,
          'column_map', '{"date":null,"amount":null,"desc":null,"debit":null,"credit":null}'::jsonb,
          'parser_version', 'caller-spoof@9.9',
          'mapping_version', 99
        ),
        jsonb_build_object(
          'id', '45010000-0000-4000-8000-000000000002',
          'file_name', 'shared.csv',
          'source', 'csv',
          'row_count', 1,
          'warning_count', 0,
          'skipped_rows', 0,
          'map_confidence', 1,
          'headers', '["date","description","amount"]'::jsonb,
          'column_map', '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb,
          'parser_version', 'caller-spoof@9.9',
          'mapping_version', 99
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'id', '45020000-0000-4000-8000-000000000001',
          'import_batch_id', '45010000-0000-4000-8000-000000000001',
          'kind', 'expense',
          'amount_minor', 45000,
          'merchant', 'Highlands',
          'note', '',
          'occurred_on', '2026-08-24',
          'source', 'paste',
          'confidence', 'medium',
          'raw_snippet', 'Highlands 45k',
          'source_row_index', null,
          'parser_version', 'caller-spoof@9.9',
          'mapping_version', 99
        ),
        jsonb_build_object(
          'id', '45020000-0000-4000-8000-000000000002',
          'import_batch_id', '45010000-0000-4000-8000-000000000002',
          'kind', 'expense',
          'amount_minor', 90000,
          'merchant', 'Market',
          'note', '',
          'occurred_on', '2026-08-23',
          'source', 'csv',
          'confidence', 'high',
          'raw_snippet', '23/08/2026 | Market | -90000',
          'source_row_index', 7,
          'parser_version', 'caller-spoof@9.9',
          'mapping_version', 99
        )
      )
    ) ->> 'candidate_count'
  )::integer,
  2,
  'mixed text + CSV share persists as one successful operation'
);

select is(
  (select count(*)::integer from public.import_batches
   where user_id = '45000000-0000-4000-8000-000000000001'),
  2,
  'both source batches persisted'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where user_id = '45000000-0000-4000-8000-000000000001'
     and status = 'pending'),
  2,
  'all Share candidates remain pending review evidence'
);

select is(
  (select source_row_index from public.inbox_candidates
   where id = '45020000-0000-4000-8000-000000000002'),
  7,
  'CSV source row identity is preserved'
);

select ok(
  not exists (
    select 1 from public.inbox_candidates
    where user_id = '45000000-0000-4000-8000-000000000001'
      and source_external_id is not null
  ),
  'Share Target does not fabricate stable external IDs'
);

select is(
  (select parser_version from public.import_batches
   where id = '45010000-0000-4000-8000-000000000002'),
  'csv_import@1.0',
  'RPC derives canonical CSV parser version instead of trusting caller metadata'
);

select is(
  (select mapping_version from public.inbox_candidates
   where id = '45020000-0000-4000-8000-000000000002'),
  1,
  'RPC derives canonical mapping version instead of trusting caller metadata'
);

select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '45000000-0000-4000-8000-000000000001'),
  0,
  'Share ingestion does not write ledger transactions'
);

select throws_ok(
  $$
    select public.ingest_share_target_capture(
      jsonb_build_array(
        jsonb_build_object(
          'id', '45010000-0000-4000-8000-000000000010',
          'file_name', 'atomic-failure.csv',
          'source', 'csv',
          'row_count', 2,
          'warning_count', 0,
          'skipped_rows', 0,
          'map_confidence', 1,
          'headers', '["date","description","amount"]'::jsonb,
          'column_map', '{"date":0,"desc":1,"amount":2,"debit":null,"credit":null}'::jsonb,
          'parser_version', 'caller-spoof@9.9',
          'mapping_version', 99
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'id', '45020000-0000-4000-8000-000000000010',
          'import_batch_id', '45010000-0000-4000-8000-000000000010',
          'kind', 'expense',
          'amount_minor', 10000,
          'merchant', 'Valid first row',
          'note', '',
          'occurred_on', '2026-08-24',
          'source', 'csv',
          'confidence', 'high',
          'source_row_index', 1,
          'parser_version', 'caller-spoof@9.9',
          'mapping_version', 99
        ),
        jsonb_build_object(
          'id', '45020000-0000-4000-8000-000000000011',
          'import_batch_id', '45010000-0000-4000-8000-000000000010',
          'kind', 'expense',
          'amount_minor', 20000,
          'merchant', '',
          'note', '',
          'occurred_on', '2026-08-24',
          'source', 'csv',
          'confidence', 'high',
          'source_row_index', 2,
          'parser_version', 'caller-spoof@9.9',
          'mapping_version', 99
        )
      )
    )
  $$,
  'P0001',
  'invalid_share_candidate',
  'late invalid candidate rejects the entire share action'
);

select is(
  (select count(*)::integer from public.import_batches
   where id = '45010000-0000-4000-8000-000000000010'),
  0,
  'failed Share leaves no batch prefix'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where id in (
     '45020000-0000-4000-8000-000000000010',
     '45020000-0000-4000-8000-000000000011'
   )),
  0,
  'failed Share leaves no candidate prefix'
);

select ok(
  pg_temp.cross_tenant_share_rejected(),
  'Share Target cannot bind a candidate to another tenant account'
);

select is(
  (select count(*)::integer from public.import_batches
   where id = '45010000-0000-4000-8000-000000000020'),
  0,
  'cross-tenant rejection rolls back the attempted batch'
);

select is(
  (select count(*)::integer from public.inbox_candidates
   where id = '45020000-0000-4000-8000-000000000020'),
  0,
  'cross-tenant rejection leaves no attempted candidate'
);

select * from finish();
rollback;
