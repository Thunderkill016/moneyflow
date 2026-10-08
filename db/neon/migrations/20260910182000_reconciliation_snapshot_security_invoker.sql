-- #567: remove unnecessary elevated privilege from the read-only reconciliation snapshot helper.
-- The function body, stable volatility, empty search_path, tenant guard and existing EXECUTE grants
-- remain unchanged; only execution identity changes to the caller so RLS/table grants stay authoritative.

alter function public.reconciliation_snapshot_for_user(uuid, uuid, date)
  security invoker;
