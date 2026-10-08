-- Fail closed if historical duplicates need owner-reviewed reconciliation.
-- Never delete or collapse the user's existing evidence during a migration.
create unique index inbox_candidates_agent_identity_uidx
on public.inbox_candidates (user_id, source_external_id)
where source = 'agent' and source_external_id is not null;
