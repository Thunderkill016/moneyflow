begin;
select plan(41);

-- R7 — restore must reconstruct a tenant faithfully in one transaction, or leave
-- the target exactly as it was. Every identity and row here is transaction-scoped
-- and rolled back.

create temporary table restore_ctx (key text primary key, id uuid) on commit drop;
create temporary table restore_out (key text primary key, payload jsonb not null) on commit drop;
grant select, insert, update, delete on restore_ctx to authenticated;
grant select, insert, update, delete on restore_out to authenticated;

create or replace function pg_temp.restore_error(p_sql text)
returns text language plpgsql as $$
declare v_detail text;
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
grant execute on function pg_temp.restore_error(text) to authenticated, anon;

-- SOURCE tenant, TARGET tenant (fresh bootstrap), and a third used tenant.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-00000000c001','authenticated','authenticated','restore-src@example.invalid',crypt('x', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Restore Source"}'::jsonb),
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-00000000c002','authenticated','authenticated','restore-dst@example.invalid',crypt('x', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Restore Target"}'::jsonb),
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-00000000c003','authenticated','authenticated','restore-used@example.invalid',crypt('x', gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Restore Used"}'::jsonb);

insert into restore_ctx values
  ('src_account', (select id from public.accounts where user_id = '00000000-0000-4000-8000-00000000c001' limit 1)),
  ('src_expense', (select id from public.categories where user_id = '00000000-0000-4000-8000-00000000c001' and kind = 'expense' order by name limit 1)),
  ('src_expense_2', (select id from public.categories where user_id = '00000000-0000-4000-8000-00000000c001' and kind = 'expense' order by name offset 1 limit 1)),
  ('src_income', (select id from public.categories where user_id = '00000000-0000-4000-8000-00000000c001' and kind = 'income' order by name limit 1));

-- Build a source ledger covering every domain.
set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c001', true); end; $$;

insert into restore_ctx values
  ('src_account_2', public.create_financial_account('Ngân hàng','bank',500000,'VND'));
insert into restore_ctx values
  ('src_income_tx', public.create_money_transaction((select id from restore_ctx where key='src_account'),(select id from restore_ctx where key='src_income'),'income',9007199254740991,current_date,'Biggest safe income','00000000-0000-4000-8000-00000000c101')),
  ('src_expense_tx', public.create_money_transaction((select id from restore_ctx where key='src_account'),(select id from restore_ctx where key='src_expense'),'expense',123456,current_date,'An expense','00000000-0000-4000-8000-00000000c102')),
  ('src_deleted_tx', public.create_money_transaction((select id from restore_ctx where key='src_account'),(select id from restore_ctx where key='src_expense'),'expense',5000,current_date,'Soft deleted','00000000-0000-4000-8000-00000000c103'));
insert into restore_ctx values
  ('src_split_tx', public.create_split_expense((select id from restore_ctx where key='src_account'),
    jsonb_build_array(
      jsonb_build_object('category_id',(select id from restore_ctx where key='src_expense'),'amount_minor',70000),
      jsonb_build_object('category_id',(select id from restore_ctx where key='src_expense_2'),'amount_minor',30000)),
    current_date,'Split','00000000-0000-4000-8000-00000000c104')),
  ('src_transfer_tx', public.create_account_transfer((select id from restore_ctx where key='src_account'),(select id from restore_ctx where key='src_account_2'),250000,current_date,'Transfer','00000000-0000-4000-8000-00000000c105'));
select public.soft_delete_money_transaction((select id from restore_ctx where key='src_deleted_tx'));
insert into restore_ctx values
  ('src_budget', public.upsert_monthly_budget((select id from restore_ctx where key='src_expense'), date_trunc('month',current_date)::date, 2000000)),
  ('src_goal', public.upsert_savings_goal(null,'Quỹ dự phòng',50000000,null));
select public.adjust_savings_goal((select id from restore_ctx where key='src_goal'), 1500000);
insert into restore_ctx values
  ('src_commitment', public.upsert_recurring_commitment(null,'Tiền nhà',4000000,5,(select id from restore_ctx where key='src_account'),(select id from restore_ctx where key='src_expense'))),
  ('src_template', public.upsert_recurring_income_template(null,'Lương',15000000,10,(select id from restore_ctx where key='src_account'),(select id from restore_ctx where key='src_income')));
select public.pay_recurring_commitment((select id from restore_ctx where key='src_commitment'), date_trunc('month',current_date)::date, current_date, '00000000-0000-4000-8000-00000000c106');
select public.record_recurring_income_template((select id from restore_ctx where key='src_template'), date_trunc('month',current_date)::date, current_date, '00000000-0000-4000-8000-00000000c107');
insert into restore_ctx values
  ('src_reconciliation', public.start_account_reconciliation((select id from restore_ctx where key='src_account'), current_date, 250000));

insert into public.import_batches (id,user_id,file_name,source,status,row_count,warning_count,skipped_rows,map_confidence,headers,column_map,local_id,parser_version,mapping_version)
values ('00000000-0000-4000-8000-00000000c201','00000000-0000-4000-8000-00000000c001','sao-ke.csv','csv','committed',2,0,0,0.9,'["Ngày"]'::jsonb,'{"date":"Ngày"}'::jsonb,'b1','parser-v2',3);
insert into public.inbox_rules (id,user_id,priority,enabled,match_field,contains_text,category_id,merchant_name)
values ('00000000-0000-4000-8000-00000000c202','00000000-0000-4000-8000-00000000c001',10,true,'merchant','grab',(select id from restore_ctx where key='src_expense'),'Grab');
insert into public.inbox_candidates (id,user_id,kind,amount_minor,merchant,note,occurred_on,source,confidence,status,import_batch_id,account_id,category_id,match_status,match_confidence,source_row_index,source_external_id,applied_rule_id,applied_rule_version,possible_transfer,raw_snippet)
values
('00000000-0000-4000-8000-00000000c203','00000000-0000-4000-8000-00000000c001','expense',45000,'Grab','',current_date,'csv','high','pending','00000000-0000-4000-8000-00000000c201',(select id from restore_ctx where key='src_account'),(select id from restore_ctx where key='src_expense'),'would_create',0.75,0,'ext-1','00000000-0000-4000-8000-00000000c202',1,true,'GRAB 45.000'),
('00000000-0000-4000-8000-00000000c204','00000000-0000-4000-8000-00000000c001','income',45000,'Grab refund','',current_date,'csv','medium','pending','00000000-0000-4000-8000-00000000c201',(select id from restore_ctx where key='src_account'),(select id from restore_ctx where key='src_income'),'suspected_transfer',0.5,1,'ext-2',null,null,true,'GRAB refund');
update public.inbox_candidates set transfer_pair_id='00000000-0000-4000-8000-00000000c204' where id='00000000-0000-4000-8000-00000000c203';
update public.inbox_candidates set transfer_pair_id='00000000-0000-4000-8000-00000000c203' where id='00000000-0000-4000-8000-00000000c204';

reset role;
insert into public.transaction_import_provenance (transaction_id,user_id,candidate_id,import_batch_id,source,source_row_index,original_description,source_external_id,fingerprint,fingerprint_version,parser_version,mapping_version,match_status,match_reason,match_confidence)
values ((select id from restore_ctx where key='src_expense_tx'),'00000000-0000-4000-8000-00000000c001','00000000-0000-4000-8000-00000000c203','00000000-0000-4000-8000-00000000c201','csv',0,'GRAB *ăn uống','ext-1','fp-1',1,'parser-v2',3,'would_create','matched',0.75);
update public.categories set is_archived = true where id = (select id from restore_ctx where key='src_expense_2');
update public.accounts set is_archived = true where id = (select id from restore_ctx where key='src_account_2');

-- Export the source archive.
set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c001', true); end; $$;
insert into restore_out values ('archive', public.export_user_archive());
reset role;

-- Give the third tenant real activity so it is not restore-eligible.
set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c003', true); end; $$;
select public.create_money_transaction(
  (select id from public.accounts where user_id='00000000-0000-4000-8000-00000000c003' limit 1),
  (select id from public.categories where user_id='00000000-0000-4000-8000-00000000c003' and kind='expense' limit 1),
  'expense', 1000, current_date, 'used', '00000000-0000-4000-8000-00000000c108');
reset role;

-- ---------------------------------------------------------------------------
-- Boundary
-- ---------------------------------------------------------------------------
set local role anon;
select ok(
  pg_temp.restore_error('select public.restore_user_archive((select payload from restore_out where key = ''archive''))') like '%permission denied%',
  'anon cannot execute restore'
);
reset role;

set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub','', true); end; $$;
select is(
  pg_temp.restore_error('select public.restore_user_archive((select payload from restore_out where key = ''archive''))'),
  'authentication_required',
  'a session without a subject claim cannot restore'
);

-- A used tenant must be refused before any mutation.
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c003', true); end; $$;
select is(
  pg_temp.restore_error('select public.restore_user_archive((select payload from restore_out where key = ''archive''))'),
  'restore_target_not_empty',
  'a populated tenant is refused'
);
select is(
  (select count(*)::integer from public.financial_transactions where user_id='00000000-0000-4000-8000-00000000c003'),
  1,
  'the refused tenant is untouched'
);

-- A corrupt archive must leave the bootstrap target unchanged.
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c002', true); end; $$;
select is(
  pg_temp.restore_error('select public.restore_user_archive(jsonb_set((select payload from restore_out where key = ''archive''), ''{archive_version}'', ''9''::jsonb))'),
  'archive_version_unsupported',
  'an unsupported archive version is refused'
);
select is(
  pg_temp.restore_error($$select public.restore_user_archive(
    jsonb_set((select payload from restore_out where key = 'archive'),
    '{tables,transactionEntries,0,amount_minor}', '9007199254740993'::jsonb))$$),
  'money_out_of_safe_range',
  'unsafe money is refused'
);
select is(
  pg_temp.restore_error($$select public.restore_user_archive(
    jsonb_set((select payload from restore_out where key = 'archive'),
    '{tables,profile,user_id}', '"00000000-0000-4000-8000-00000000c001"'::jsonb))$$),
  'owner_authority_field_present',
  'a source ownership field is refused'
);
-- A row missing a contract field would become NULL through jsonb_to_recordset,
-- silently restoring a soft-deleted transaction as live.
select is(
  pg_temp.restore_error($$select public.restore_user_archive(
    jsonb_set((select payload from restore_out where key = 'archive'), '{tables,transactions}',
      (select jsonb_agg(transaction - 'deleted_at')
       from restore_out, jsonb_array_elements(payload -> 'tables' -> 'transactions') as transaction
       where key = 'archive')))$$),
  'row_shape_invalid',
  'a row missing a contract field is refused'
);
select is(
  (select count(*)::integer from public.categories where user_id='00000000-0000-4000-8000-00000000c002' and is_default = false)
  + (select count(*)::integer from public.financial_transactions where user_id='00000000-0000-4000-8000-00000000c002'),
  0,
  'every refusal left the bootstrap target unchanged'
);
select is(
  (select count(*)::integer from public.archive_restore_batches where user_id='00000000-0000-4000-8000-00000000c002'),
  0,
  'a refused restore records no batch'
);

-- Ids are preserved, so an archive cannot be restored while its source tenant is
-- still present in the database. That is refused explicitly, not as a primary
-- key violation half-way through.
select is(
  pg_temp.restore_error('select public.restore_user_archive((select payload from restore_out where key = ''archive''))'),
  'restore_archive_id_conflict',
  'restoring beside a still-live source tenant is refused'
);

-- ---------------------------------------------------------------------------
-- The restore itself, following the documented lifecycle: the source account is
-- gone by the time its archive is restored.
-- ---------------------------------------------------------------------------
reset role;
select public.purge_user_tenant_data('00000000-0000-4000-8000-00000000c001');
set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c002', true); end; $$;

insert into restore_out values ('result', public.restore_user_archive((select payload from restore_out where key = 'archive')));

select ok(
  (select (payload ->> 'restore_batch_id')::uuid is not null from restore_out where key='result'),
  'restore returns a batch identity'
);

-- Duplicate archive into the same tenant.
select is(
  pg_temp.restore_error('select public.restore_user_archive((select payload from restore_out where key = ''archive''))'),
  'archive_already_restored',
  'the same archive cannot be restored twice into one tenant'
);

-- Re-export the restored tenant and compare.
insert into restore_out values ('restored_archive', public.export_user_archive());
reset role;

select is(
  (select jsonb_array_length(payload -> 'tables' -> 'transactions') from restore_out where key='restored_archive'),
  (select jsonb_array_length(payload -> 'tables' -> 'transactions') from restore_out where key='archive'),
  'every transaction is restored'
);
select is(
  (select jsonb_array_length(payload -> 'tables' -> 'transactionEntries') from restore_out where key='restored_archive'),
  (select jsonb_array_length(payload -> 'tables' -> 'transactionEntries') from restore_out where key='archive'),
  'every entry is restored'
);

-- The full semantic round trip over all restorable collections. `inboxRules`
-- timestamps/version and candidate fingerprint/applied_rule_version are the
-- recorded trigger-owned limitations and are compared separately below.
select is(
  (
    select jsonb_object_agg(collection.key, collection.value)
    from jsonb_each((select payload -> 'tables' from restore_out where key='restored_archive')) as collection
    where collection.key not in ('auditHistory', 'inboxRules', 'inboxCandidates')
  ),
  (
    select jsonb_object_agg(collection.key, collection.value)
    from jsonb_each((select payload -> 'tables' from restore_out where key='archive')) as collection
    where collection.key not in ('auditHistory', 'inboxRules', 'inboxCandidates')
  ),
  'source and restored tenants are semantically identical across sixteen collections'
);

-- Rules: everything except the three trigger-owned fields.
select is(
  (
    select jsonb_agg(rule - 'created_at' - 'updated_at' - 'version' order by rule ->> 'id')
    from restore_out, jsonb_array_elements(payload -> 'tables' -> 'inboxRules') as rule
    where key = 'restored_archive'
  ),
  (
    select jsonb_agg(rule - 'created_at' - 'updated_at' - 'version' order by rule ->> 'id')
    from restore_out, jsonb_array_elements(payload -> 'tables' -> 'inboxRules') as rule
    where key = 'archive'
  ),
  'rules restore identically apart from the trigger-owned version and timestamps'
);

-- Candidates: everything except the trigger-recomputed provenance fields.
select is(
  (
    select jsonb_agg(candidate - 'fingerprint' - 'fingerprint_version' - 'applied_rule_version' order by candidate ->> 'id')
    from restore_out, jsonb_array_elements(payload -> 'tables' -> 'inboxCandidates') as candidate
    where key = 'restored_archive'
  ),
  (
    select jsonb_agg(candidate - 'fingerprint' - 'fingerprint_version' - 'applied_rule_version' order by candidate ->> 'id')
    from restore_out, jsonb_array_elements(payload -> 'tables' -> 'inboxCandidates') as candidate
    where key = 'archive'
  ),
  'candidates restore identically apart from the trigger-recomputed provenance fields'
);

select is(
  (select count(*)::integer from restore_out as exported,
     jsonb_array_elements(exported.payload -> 'tables' -> 'inboxCandidates') as candidate
   where exported.key='restored_archive' and candidate ->> 'transfer_pair_id' is not null),
  2,
  'the mutually paired candidates survive restore'
);

-- ---------------------------------------------------------------------------
-- Ownership, history and audit truth
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::integer from public.profiles where id='00000000-0000-4000-8000-00000000c002' and full_name='Restore Source'),
  1,
  'profile preferences restore onto the target identity'
);
select is(
  (select count(*)::integer from public.financial_transactions where user_id='00000000-0000-4000-8000-00000000c001'),
  0,
  'the source tenant was purged before the restore, as the lifecycle intends'
);
select is(
  (select count(*)::integer from public.categories where user_id='00000000-0000-4000-8000-00000000c002' and is_archived),
  1,
  'the archived category survives restore'
);
select is(
  (select count(*)::integer from public.accounts where user_id='00000000-0000-4000-8000-00000000c002' and is_archived),
  1,
  'the archived account survives restore'
);
select is(
  (select count(*)::integer from public.financial_transactions where user_id='00000000-0000-4000-8000-00000000c002' and deleted_at is not null),
  1,
  'the soft-deleted transaction survives restore'
);
select is(
  (select count(*)::integer from public.inbox_rules as rule join public.categories as category on category.id = rule.category_id
   where rule.user_id='00000000-0000-4000-8000-00000000c002'),
  1,
  'the rule survives even though its category ends archived'
);
select is(
  (select count(*)::integer from public.accounts where user_id='00000000-0000-4000-8000-00000000c002' and name='Tiền mặt' and initial_balance_minor=0 and not is_archived),
  1,
  'bootstrap is replaced, not merged: exactly the archived cash account remains'
);
-- Compared against the archive, not the source tenant: the source was purged
-- before the restore, which is the lifecycle this feature is for.
select is(
  (select count(*)::integer from public.categories where user_id='00000000-0000-4000-8000-00000000c002'),
  (select jsonb_array_length(payload -> 'tables' -> 'categories')::integer from restore_out where key='archive'),
  'no duplicate default categories survive the bootstrap replacement'
);

-- auditHistory is never replayed.
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events as event
   where event.user_id='00000000-0000-4000-8000-00000000c002'
     and event.id in (
       select (source_event ->> 'id')::uuid
       from restore_out, jsonb_array_elements(payload -> 'tables' -> 'auditHistory') as source_event
       where key='archive')),
  0,
  'no archived audit event id is replayed into the target'
);
select ok(
  (select count(*) from public.financial_mutation_audit_events where user_id='00000000-0000-4000-8000-00000000c002') > 0,
  'restore-time audit events exist for the target'
);
-- Every audit event the restore produced names a row attributable to the batch.
select is(
  (select count(*)::integer
   from public.financial_mutation_audit_events as event
   where event.user_id='00000000-0000-4000-8000-00000000c002'
     and not exists (
       select 1 from public.archive_restore_rows as attributed
       where attributed.user_id = event.user_id and attributed.row_id = event.entity_id)),
  0,
  'every restore-time audit event is attributable to the batch'
);
select is(
  (select count(*)::integer from public.financial_mutation_audit_events
   where user_id='00000000-0000-4000-8000-00000000c002' and request_id is not null),
  0,
  'no historical request_id metadata is replayed'
);

-- ---------------------------------------------------------------------------
-- Attribution and removal
-- ---------------------------------------------------------------------------
select ok(
  (select count(*) from public.archive_restore_rows
   where batch_id = (select (payload ->> 'restore_batch_id')::uuid from restore_out where key='result')) > 30,
  'every restored row is attributed to the batch'
);

-- Another tenant cannot see or remove this batch.
set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c003', true); end; $$;
select is(
  pg_temp.restore_error(format('select public.remove_archive_restore_batch(%L)',
    (select (payload ->> 'restore_batch_id')::uuid from restore_out where key='result'))),
  'restore_batch_not_found',
  'another tenant cannot remove someone else''s restore batch'
);
select is(
  (select count(*)::integer from public.archive_restore_batches),
  0,
  'row level security hides another tenant''s batches'
);

-- A pristine restore can be removed; a modified one cannot.
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c002', true); end; $$;
reset role;
-- Editing a restored row keeps its id, so an id-only pristine check would miss
-- it and hard-delete the user's own work.
update public.categories set name = 'Người dùng đổi tên'
where user_id='00000000-0000-4000-8000-00000000c002'
  and id = (select row_id from public.archive_restore_rows
            where table_name='categories'
              and batch_id=(select (payload ->> 'restore_batch_id')::uuid from restore_out where key='result')
            limit 1);
set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c002', true); end; $$;
select is(
  pg_temp.restore_error(format('select public.remove_archive_restore_batch(%L)',
    (select (payload ->> 'restore_batch_id')::uuid from restore_out where key='result'))),
  'restore_batch_not_pristine',
  'removal is refused once the user has edited a restored row'
);
reset role;
insert into restore_out values ('edited_name', jsonb_build_object('n', (
  select name from public.categories where user_id='00000000-0000-4000-8000-00000000c002'
    and name = 'Người dùng đổi tên')));
update public.categories as target set name = (
  select source ->> 'name' from jsonb_array_elements(
    (select payload -> 'tables' -> 'categories' from restore_out where key='archive')) as source
  where (source ->> 'id')::uuid = target.id)
where target.user_id='00000000-0000-4000-8000-00000000c002' and target.name='Người dùng đổi tên';

set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c002', true); end; $$;
insert into restore_out values ('removal', public.remove_archive_restore_batch(
  (select (payload ->> 'restore_batch_id')::uuid from restore_out where key='result')));
reset role;

select is(
  (select count(*)::integer from public.financial_transactions where user_id='00000000-0000-4000-8000-00000000c002'),
  0,
  'removing the batch removes the restored ledger'
);
select is(
  (select count(*)::integer from public.financial_transactions where user_id='00000000-0000-4000-8000-00000000c003'),
  1,
  'removal touched only the target tenant'
);
select is(
  (select status from public.archive_restore_batches where id = (select (payload ->> 'restore_batch_id')::uuid from restore_out where key='result')),
  'removed',
  'the batch is marked removed rather than deleted'
);
select ok(
  (select count(*) from public.financial_mutation_audit_events where user_id='00000000-0000-4000-8000-00000000c002') > 0,
  'removal does not fabricate a past in which the restore never happened'
);
select is(
  (select full_name from public.profiles where id='00000000-0000-4000-8000-00000000c002'),
  'Restore Target',
  'removal reverts the profile the restore overwrote'
);
-- Audit events survive removal by design, so they must not permanently lock the
-- account out of a corrected restore.
set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000c002', true); end; $$;
select is(
  pg_temp.restore_error('select public.restore_user_archive((select payload from restore_out where key = ''archive''))'),
  'archive_already_restored',
  'after removal the target is eligible again, and only the duplicate policy stops this archive'
);
reset role;

select * from finish();
rollback;
