-- Cross-device persistence for advisory pattern dismissals.
--
-- "Bỏ qua" on the ledger-duplicate strip and on recurring-suggestion cards was
-- browser-local: a dismissal made on the phone reappeared on the PC. The
-- pattern keys are deterministic (fnv1a over account|kind|amount|desc for
-- ledger dupes, expense|note for recurring suggestions), so the same ledger
-- data produces the same keys on every device — storing the key is enough to
-- share the decision.
--
-- These rows are viewer state, not ledger truth: deleting them only
-- re-surfaces a suggestion, and the table never affects balances. The scope
-- enum is a whitelist so a caller cannot invent arbitrary dismissal domains;
-- adding one is a deliberate migration, not a client-side string.

-- The lifetime anchor is profiles(id), not auth.users(id): tenant purge
-- deletes the profile row and the cascade removes dismissals with it, and an
-- auth-user delete cascades through profiles the same way. No separate purge
-- enumeration is needed — viewer state dies with the viewer.
create table public.pattern_dismissals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('ledger_dupe', 'recurring')),
  pattern_key text not null check (pattern_key ~ '^[0-9a-f]{8}$'),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, scope, pattern_key)
);

comment on table public.pattern_dismissals is
  'Viewer-scoped advisory dismissals keyed by deterministic pattern hash. Not ledger truth: deleting a row only re-surfaces a suggestion.';

alter table public.pattern_dismissals enable row level security;

create policy "pattern_dismissals_select_own" on public.pattern_dismissals
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.pattern_dismissals from anon, authenticated;
grant select on public.pattern_dismissals to authenticated;

-- Writes go through a security-definer RPC like every other finance mutation:
-- the client never supplies user_id, and the whole batch is validated before a
-- single row lands so a malformed key cannot hide inside a partial write.
create or replace function public.dismiss_pattern_keys(
  p_scope text,
  p_keys text[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_scope is null or p_scope not in ('ledger_dupe', 'recurring') then
    raise exception 'invalid_dismissal_scope';
  end if;
  -- The strip's dismiss-all sends every visible group at once; 500 bounds the
  -- payload while staying far above any realistic group count.
  if p_keys is null or cardinality(p_keys) = 0 or cardinality(p_keys) > 500 then
    raise exception 'invalid_dismissal_keys';
  end if;
  if exists (select 1 from unnest(p_keys) as k where k !~ '^[0-9a-f]{8}$') then
    raise exception 'invalid_dismissal_key';
  end if;

  insert into public.pattern_dismissals (user_id, scope, pattern_key)
  select v_user_id, p_scope, k
  from unnest(p_keys) as k
  on conflict (user_id, scope, pattern_key) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.dismiss_pattern_keys(text, text[])
  from public, anon, authenticated;
grant execute on function public.dismiss_pattern_keys(text, text[])
  to authenticated;

comment on function public.dismiss_pattern_keys(text, text[]) is
  'Record advisory dismissals for the caller (server-derived user_id). Idempotent: re-dismissing a stored key is a no-op.';
