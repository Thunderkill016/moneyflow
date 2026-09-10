-- #567: PostgreSQL function defaults grant EXECUTE to PUBLIC unless the global
-- default ACL is changed. A per-schema REVOKE cannot remove that hard-wired
-- global privilege; it can only undo a prior per-schema GRANT.
--
-- Make postgres-owned future functions deny-by-default at the global layer.
-- Existing per-schema grants (for example explicit Supabase storage-role grants)
-- remain additive and unchanged.

alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated;
