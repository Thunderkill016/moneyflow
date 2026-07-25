-- Tenant hard-delete must remove ledger entries before accounts/categories.
-- Direct account/category deletion remains restricted; only auth-user deletion cascades.

alter table public.transaction_entries
  add constraint transaction_entries_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;
