begin;
select plan(12);

select has_table(
  'public',
  'transaction_import_provenance',
  'transaction import provenance table exists'
);

select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.transaction_import_provenance'::regclass),
  'transaction import provenance has RLS'
);

select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_import_provenance'
      and policyname = 'transaction_import_provenance_select_own'
  ),
  'transaction import provenance has own-row select policy'
);

select has_column(
  'public', 'inbox_candidates', 'approved_transaction_id',
  'candidate has approved transaction link'
);

select has_column(
  'public', 'inbox_candidates', 'fingerprint',
  'candidate has durable fingerprint'
);

select has_column(
  'public', 'inbox_candidates', 'match_status',
  'candidate has server match status'
);

select has_column(
  'public', 'import_batches', 'parser_version',
  'import batch records parser version'
);

select has_column(
  'public', 'import_batches', 'mapping_version',
  'import batch records mapping version'
);

select has_function(
  'public',
  'compute_inbox_candidate_fingerprint',
  array['uuid', 'text', 'date', 'bigint', 'text'],
  'server fingerprint function exists'
);

select has_function(
  'public',
  'plan_inbox_candidate',
  array['uuid'],
  'server dry-run function exists'
);

select has_function(
  'public',
  'approve_inbox_candidate',
  array[
    'uuid', 'transaction_kind', 'uuid', 'uuid', 'uuid', 'bigint',
    'date', 'text', 'uuid', 'boolean'
  ],
  'atomic candidate approval function exists'
);

select has_trigger(
  'public',
  'inbox_candidates',
  'inbox_candidates_set_fingerprint',
  'candidate fingerprint trigger exists'
);

select * from finish();
rollback;
