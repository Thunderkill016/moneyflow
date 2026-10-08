-- Cover the real composite foreign-key access paths that currently have no
-- equivalent index. Existing owner-first indexes are intentionally preserved
-- rather than duplicated in reverse order merely to silence the advisor.

create index if not exists inbox_candidates_account_owner_idx
  on public.inbox_candidates (account_id, user_id)
  where account_id is not null;

create index if not exists inbox_candidates_category_owner_idx
  on public.inbox_candidates (category_id, user_id)
  where category_id is not null;

create index if not exists recurring_commitments_account_owner_idx
  on public.recurring_commitments (account_id, user_id);

create index if not exists recurring_commitments_category_owner_idx
  on public.recurring_commitments (category_id, user_id);

create index if not exists recurring_income_templates_account_owner_idx
  on public.recurring_income_templates (account_id, user_id);

create index if not exists recurring_income_templates_category_owner_idx
  on public.recurring_income_templates (category_id, user_id);
