---
name: supabase-rls
description: >
  Supabase/Postgres RLS and money schema rules for MoneyFlow migrations.
  Use when editing supabase/migrations or server data access.
---

# Skill: supabase-rls (MoneyFlow)

## Rules

1. Every user-owned table: `ENABLE ROW LEVEL SECURITY` + policies.  
2. Ledger mutations via RPC / security definer with `search_path` set — no open DML.  
3. Amounts: integer minor units (VND đồng).  
4. Soft delete: `deleted_at` preferred.  
5. Run `npm run check:rls` when available; never weaken RLS to “make it work”.  

## Forbidden

- Service role in client  
- Policies using client-supplied user id without `auth.uid()`  
