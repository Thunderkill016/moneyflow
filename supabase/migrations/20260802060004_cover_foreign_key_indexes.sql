create index commitment_occurrences_commitment_owner_fk_idx
  on public.commitment_occurrences (commitment_id, user_id);

create index commitment_occurrences_transaction_owner_fk_idx
  on public.commitment_occurrences (transaction_id, user_id);

create index inbox_candidates_approved_transaction_owner_fk_idx
  on public.inbox_candidates (approved_transaction_id, user_id);

create index inbox_candidates_import_batch_owner_fk_idx
  on public.inbox_candidates (import_batch_id, user_id);

create index inbox_candidates_transfer_pair_owner_fk_idx
  on public.inbox_candidates (transfer_pair_id, user_id);

create index income_template_occurrences_template_owner_fk_idx
  on public.income_template_occurrences (template_id, user_id);

create index income_template_occurrences_transaction_owner_fk_idx
  on public.income_template_occurrences (transaction_id, user_id);

create index monthly_budgets_category_owner_fk_idx
  on public.monthly_budgets (category_id, user_id);

create index savings_goal_allocations_goal_owner_fk_idx
  on public.savings_goal_allocations (goal_id, user_id);

create index transaction_entries_account_owner_fk_idx
  on public.transaction_entries (account_id, user_id);

create index transaction_entries_category_owner_fk_idx
  on public.transaction_entries (category_id, user_id);

create index transaction_entries_transaction_owner_fk_idx
  on public.transaction_entries (transaction_id, user_id);

create index transaction_import_provenance_batch_owner_fk_idx
  on public.transaction_import_provenance (import_batch_id, user_id);
