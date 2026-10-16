-- D21 delete_transactions_before (20261017230000): the scoped retention
-- purge hard-deletes the caller's own rows before a date, bucketed by
-- provenance source (manual / notification / import), includes trashed
-- rows, skips recurring/debt-linked rows with an honest `locked` count,
-- releases inbox-candidate links instead of killing the candidate, and
-- fails closed on tenant, anon and malformed-scope calls.

begin;
select plan(17);

-- The inbox_rules/guard triggers read auth.uid() under the fixture role —
-- pin the claim before ANY seeding; `set local role` below still gates
-- the RPC calls themselves.
set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999991","role":"authenticated"}';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '99999999-9999-4999-8999-999999999991'::uuid,
  'authenticated', 'authenticated', 'purge-a@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Purge A"}'::jsonb,
  now(), now(), '', '', false, false
), (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '99999999-9999-4999-8999-999999999992'::uuid,
  'authenticated', 'authenticated', 'purge-b@example.invalid',
  crypt('discarded-test-password', gen_salt('bf')), now(),
  '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Purge B"}'::jsonb,
  now(), now(), '', '', false, false
);

insert into public.accounts (id, user_id, name, kind, currency_code)
values
  ('99999999-0000-4000-8000-0000000000a1'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'Purge wallet', 'cash', 'VND'),
  ('99999999-0000-4000-8000-0000000000a2'::uuid,
   '99999999-9999-4999-8999-999999999992'::uuid, 'B wallet', 'cash', 'VND');

insert into public.categories (id, user_id, name, kind, is_default)
values (
  '99999999-0000-4000-8000-0000000000c1'::uuid,
  '99999999-9999-4999-8999-999999999991'::uuid, 'Purge chi', 'expense', false
);

-- User A ledger rows (all 2026-01 → before the 2026-06-01 sweep unless noted):
--   tx1 manual (no provenance), live
--   tx2 manual web-mirror (provenance 'manual'), live
--   tx3 notification-captured, live, its approving candidate still linked
--   tx4 csv import, live
--   tx5 manual but TRASHED (deleted_at set) — the sweep must still take it
--   tx6 manual + commitment-linked — locked, must survive with a count
--   tx7 manual + debt-repayment-linked — locked, must survive
--   tx8 manual but NEW (2026-09) — out of the date window, must survive
insert into public.financial_transactions
  (id, user_id, kind, note, occurred_on, deleted_at)
values
  ('99999999-0000-4000-8000-0000000000e1'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'expense', 'tx1', '2026-01-10', null),
  ('99999999-0000-4000-8000-0000000000e2'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'expense', 'tx2', '2026-01-11', null),
  ('99999999-0000-4000-8000-0000000000e3'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'expense', 'tx3', '2026-01-12', null),
  ('99999999-0000-4000-8000-0000000000e4'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'expense', 'tx4', '2026-01-15', null),
  ('99999999-0000-4000-8000-0000000000e5'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'expense', 'tx5', '2026-01-09',
   '2026-02-01 00:00:00+00'::timestamptz),
  ('99999999-0000-4000-8000-0000000000e6'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'expense', 'tx6', '2026-01-05', null),
  ('99999999-0000-4000-8000-0000000000e7'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'income', 'tx7', '2026-01-06', null),
  ('99999999-0000-4000-8000-0000000000e8'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'expense', 'tx8', '2026-09-10', null);

insert into public.transaction_entries
  (transaction_id, user_id, account_id, category_id, amount_minor)
select
  t.id, t.user_id,
  '99999999-0000-4000-8000-0000000000a1'::uuid,
  '99999999-0000-4000-8000-0000000000c1'::uuid,
  -10000
from public.financial_transactions t
where t.user_id = '99999999-9999-4999-8999-999999999991'::uuid;

-- The approving candidates behind tx3 (notification) and tx4 (csv) — the
-- approval path writes both the provenance row and the back-link.
insert into public.inbox_candidates
  (id, user_id, source, kind, amount_minor, merchant, occurred_on, confidence,
   status, approved_transaction_id, approved_at)
values
  ('99999999-0000-4000-8000-0000000000f3'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'notification', 'expense',
   10000, 'NAPAS', '2026-01-12', 'high', 'approved',
   '99999999-0000-4000-8000-0000000000e3'::uuid, now()),
  ('99999999-0000-4000-8000-0000000000f4'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'csv', 'expense',
   10000, 'IMPORT', '2026-01-15', 'high', 'approved',
   '99999999-0000-4000-8000-0000000000e4'::uuid, now()),
  ('99999999-0000-4000-8000-0000000000f2'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid, 'manual', 'expense',
   10000, 'WEB QUICK', '2026-01-11', 'high', 'approved',
   '99999999-0000-4000-8000-0000000000e2'::uuid, now());

insert into public.transaction_import_provenance
  (transaction_id, user_id, candidate_id, source, match_status)
values
  ('99999999-0000-4000-8000-0000000000e3'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid,
   '99999999-0000-4000-8000-0000000000f3'::uuid, 'notification', 'would_create'),
  ('99999999-0000-4000-8000-0000000000e4'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid,
   '99999999-0000-4000-8000-0000000000f4'::uuid, 'csv', 'would_create'),
  ('99999999-0000-4000-8000-0000000000e2'::uuid,
   '99999999-9999-4999-8999-999999999991'::uuid,
   '99999999-0000-4000-8000-0000000000f2'::uuid, 'manual', 'would_create');

-- Locks: tx6 pays a January commitment occurrence; tx7 backs a debt
-- repayment. Neither may be swept.
insert into public.recurring_commitments
  (id, user_id, name, amount_minor, due_day, account_id, category_id)
values (
  '99999999-0000-4000-8000-0000000000d9'::uuid,
  '99999999-9999-4999-8999-999999999991'::uuid, 'Netflix', 100000, 5,
  '99999999-0000-4000-8000-0000000000a1'::uuid,
  '99999999-0000-4000-8000-0000000000c1'::uuid);
insert into public.commitment_occurrences
  (user_id, commitment_id, month_start, transaction_id)
values (
  '99999999-9999-4999-8999-999999999991'::uuid,
  '99999999-0000-4000-8000-0000000000d9'::uuid, '2026-01-01',
  '99999999-0000-4000-8000-0000000000e6'::uuid);

insert into public.debts
  (id, user_id, counterparty, direction, principal_minor, remaining_minor,
   state, version)
values (
  '99999999-0000-4000-8000-0000000000db'::uuid,
  '99999999-9999-4999-8999-999999999991'::uuid, 'Bạn A', 'payable',
  500000, 400000, 'open', 1);
insert into public.debt_repayments
  (user_id, debt_id, transaction_id, amount_minor, idempotency_key)
values (
  '99999999-9999-4999-8999-999999999991'::uuid,
  '99999999-0000-4000-8000-0000000000db'::uuid,
  '99999999-0000-4000-8000-0000000000e7'::uuid, 100000,
  '99999999-0000-4000-8000-0000000000ee'::uuid);

-- User B: one in-scope manual row — proves tenant isolation both ways.
-- Seeded under B's own claim: the mutation-audit trigger refuses a row
-- whose tenant is not the recorded actor (financial_audit_actor_tenant_
-- mismatch), even under the fixture role.
set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999992","role":"authenticated"}';
insert into public.financial_transactions
  (id, user_id, kind, note, occurred_on)
values (
  '99999999-0000-4000-8000-0000000000b1'::uuid,
  '99999999-9999-4999-8999-999999999992'::uuid, 'expense', 'B tx', '2026-01-03');

set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999991","role":"authenticated"}';
set local role authenticated;

-- 1: manual-scoped sweep takes tx1 (no provenance), tx2 (provenance
-- 'manual' = web quick capture) and tx5 (trashed) — and reports tx6+tx7
-- as locked rather than failing the call.
select is(
  (select string_agg(k || '=' || (s.r ->> k), ',' order by k)
   from (select public.delete_transactions_before(
       '2026-06-01'::date, '{manual}'::text[]) as r) s,
        jsonb_object_keys(s.r) k),
  'before=2026-06-01,deleted=3,locked=2,sources=["manual"]',
  'manual sweep reports deleted=3 locked=2 with the echoed scope'
);

-- 2: the swept rows are gone for real — live manual AND the trashed row.
select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     and id in (
       '99999999-0000-4000-8000-0000000000e1'::uuid,
       '99999999-0000-4000-8000-0000000000e2'::uuid,
       '99999999-0000-4000-8000-0000000000e5'::uuid)),
  0,
  'manual purge hard-deleted live and trashed rows alike'
);

-- 3: out-of-scope survivors stay — notification (tx3), csv (tx4) and the
-- post-window row (tx8), plus both locked rows (tx6, tx7).
select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid),
  5,
  'other scopes, the later row and locked rows survived the manual sweep'
);

-- 4: entry legs went with their transactions (no orphaned ledger legs).
select is(
  (select count(*)::integer from public.transaction_entries
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     and transaction_id in (
       '99999999-0000-4000-8000-0000000000e1'::uuid,
       '99999999-0000-4000-8000-0000000000e2'::uuid,
       '99999999-0000-4000-8000-0000000000e5'::uuid)),
  0,
  'entry legs of purged rows are deleted'
);

-- 5: the web quick-capture candidate kept its history row but lost the
-- approved link to the destroyed transaction.
select is(
  (select (status::text || '|' || coalesce(approved_transaction_id::text, 'null'))
   from public.inbox_candidates
   where id = '99999999-0000-4000-8000-0000000000f2'::uuid),
  'approved|null',
  'candidate survives with its approval link released'
);

-- 6: a notification+import sweep takes tx3+tx4 — provenance rows die with
-- the transactions, candidates stay unlinked.
select is(
  (select (r ->> 'deleted')::integer
   from (select public.delete_transactions_before(
       '2026-06-01'::date, '{notification,import}'::text[]) as r) s),
  2,
  'notification+import sweep deletes tx3 and tx4'
);
select is(
  (select count(*)::integer from public.transaction_import_provenance
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid),
  0,
  'provenance rows deleted with their transactions'
);
select is(
  (select count(*)::integer from public.inbox_candidates
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid
     and approved_transaction_id is not null),
  0,
  'no candidate still points at a destroyed transaction'
);

-- 7: a full-scope sweep deletes nothing more — the two locked rows and
-- the post-window row still refuse the sweep, and the count says so.
select is(
  (select string_agg(k || '=' || (s.r ->> k), ',' order by k)
   from (select public.delete_transactions_before(
       '2026-06-01'::date, '{manual,notification,import}'::text[]) as r) s,
        jsonb_object_keys(s.r) k),
  'before=2026-06-01,deleted=0,locked=2,sources=["manual", "notification", "import"]',
  'locked rows disclose instead of deleting under a full scope'
);

-- 8: commitment-linked and debt-linked rows are still here.
select is(
  (select count(*)::integer from public.financial_transactions
   where id in (
     '99999999-0000-4000-8000-0000000000e6'::uuid,
     '99999999-0000-4000-8000-0000000000e7'::uuid)),
  2,
  'recurring- and debt-linked rows were never swept'
);

-- 9: user B's identical-scope row is untouched by user A's purges. The row
-- lives behind B's RLS boundary, so the existence check runs as the fixture
-- owner — A's session literally cannot see it.
reset role;
select is(
  (select count(*)::integer from public.financial_transactions
   where id = '99999999-0000-4000-8000-0000000000b1'::uuid),
  1,
  'another tenant''s in-scope row is untouched'
);

-- 10: B purges only their own scope — A's survivors stay put.
set local request.jwt.claims =
  '{"sub":"99999999-9999-4999-8999-999999999992","role":"authenticated"}';
set local role authenticated;
select is(
  (select (r ->> 'deleted')::integer
   from (select public.delete_transactions_before(
       '2026-06-01'::date, '{manual,notification,import}'::text[]) as r) s),
  1,
  'tenant B sweeps exactly their own row'
);

reset role;
select is(
  (select count(*)::integer from public.financial_transactions
   where user_id = '99999999-9999-4999-8999-999999999991'::uuid),
  3,
  'tenant A rows remain after B''s sweep'
);
set local role authenticated;
-- 11–13: malformed calls fail closed (still as tenant B — the validation
-- order puts authentication first, so these must run with a live claim).
select throws_ok(
  'select public.delete_transactions_before(''2026-06-01''::date, ''{manual,bogus}''::text[])',
  'invalid_source_scope',
  'an unknown source bucket is refused'
);
select throws_ok(
  'select public.delete_transactions_before(''2026-06-01''::date, ''{}''::text[])',
  'empty_source_scope',
  'an empty scope is refused'
);
select throws_ok(
  'select public.delete_transactions_before(null, ''{manual}''::text[])',
  'invalid_date',
  'a null cutoff is refused'
);
set local request.jwt.claims = '';

-- 14: anonymous callers are rejected before any row work.
select throws_ok(
  'select public.delete_transactions_before(''2026-06-01''::date, ''{manual}''::text[])',
  'authentication_required',
  'anonymous purge is refused'
);

select * from finish();
rollback;
