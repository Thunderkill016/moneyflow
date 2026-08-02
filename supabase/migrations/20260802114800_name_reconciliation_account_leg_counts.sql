-- Summary counts are account legs, not raw allocation rows. A split expense can
-- contain multiple category entries but remains one account leg.

alter view public.account_reconciliation_summaries
  rename column pending_entry_count to pending_account_leg_count;

alter view public.account_reconciliation_summaries
  rename column cleared_entry_count to cleared_account_leg_count;

alter view public.account_reconciliation_summaries
  rename column reconciled_entry_count to reconciled_account_leg_count;
