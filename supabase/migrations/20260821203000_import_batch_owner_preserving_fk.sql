-- #440 CI remediation: import-batch cleanup must remove only the optional batch
-- link. `user_id` is the durable tenant owner and must never be nulled by the
-- composite foreign-key referential action.
--
-- PostgreSQL 17 supports a column list on ON DELETE SET NULL specifically for
-- composite keys like this: retain the tenant key while nulling the optional
-- referenced identifier.

alter table public.inbox_candidates
  drop constraint inbox_candidates_import_batch_id_user_id_fkey;

alter table public.inbox_candidates
  add constraint inbox_candidates_import_batch_id_user_id_fkey
  foreign key (import_batch_id, user_id)
  references public.import_batches (id, user_id)
  on delete set null (import_batch_id);