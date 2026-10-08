-- Scratch-only PoC for the dual-identity claim ceremony (#774 rounds 4–6).
-- NOT a product migration yet — this is the rehearsal of the design that
-- would become one after review.
--
-- Threat model: under Plan B a registrant receives a fresh Neon UUID. A bare
-- sign-up MUST NOT entitle them to a legacy ledger — nothing proves the
-- registrant controls the old Supabase identity or even the email. The claim
-- is therefore a server-only, single-use, time-limited ceremony binding a
-- VERIFIED old-identity proof to a VERIFIED new Neon subject — bound in BOTH
-- directions at RESERVE time (a stolen claim token is useless to any other
-- session), idempotent on identical payloads only, and audited.
--
-- Old-identity proof (production): a live Supabase access token verified
-- OFFLINE against cached JWKS (signature + iss + aud + exp + sub), plus a
-- recent-auth check when the project is reachable. The E2E substitutes a
-- locally-signed Ed25519 JWT verified via a local JWKS — the ceremony treats
-- proof verification as an injectable boundary, exactly as production must.

create table if not exists public.identity_claims (
  id uuid primary key default gen_random_uuid(),
  -- live uniqueness enforced by partial indexes below (expired/cancelled/
  -- rejected rows are tombstones — they must not block a legitimate retry)
  legacy_user_id uuid not null,
  neon_user_id uuid, -- bound at RESERVE time from the live session
  -- sha256 of a single-use claim secret; the raw secret never rests in DB
  claim_token_hash bytea not null unique,
  -- sha256 of the verified old-identity proof (audit, not the proof itself)
  proof_hash bytea not null,
  idempotency_key text not null unique,
  status text not null default 'reserved'
    check (status in ('reserved', 'completed', 'rejected', 'cancelled')),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null, -- short TTL; no lingering reservations
  completed_at timestamptz,
  audit jsonb not null default '{}'::jsonb
);

-- Live uniqueness: exactly one LIVE claim (reserved or completed) per legacy
-- identity and per neon subject. Tombstones (rejected/cancelled, and
-- 'reserved' rows already past expiry — those get swept to 'rejected'
-- lazily by reserve()) leave the identity free to be claimed again.
drop index if exists public.identity_claims_legacy_live;
create unique index if not exists identity_claims_legacy_live
  on public.identity_claims (legacy_user_id)
  where status in ('reserved', 'completed');
drop index if exists public.identity_claims_neon_live;
create unique index if not exists identity_claims_neon_live
  on public.identity_claims (neon_user_id)
  where status in ('reserved', 'completed');
-- The old column-level unique constraints (from earlier revisions) would
-- count tombstones too — drop them if present.
alter table public.identity_claims
  drop constraint if exists identity_claims_legacy_user_id_key;
alter table public.identity_claims
  drop constraint if exists identity_claims_neon_user_id_key;

-- No row-level visibility for users at all: claims are service-plane state.
alter table public.identity_claims enable row level security;
revoke all on public.identity_claims from public, anon, authenticated;
grant select, insert, update on public.identity_claims to service_role;

-- Session resolution shared by reserve/complete: the raw session token must
-- map to a LIVE neon_auth.session row, and the subject's email must be
-- verified. A forged/stale token yields no subject — the caller can never
-- name one.
create or replace function public.claim_session_subject(
  p_session_token text
) returns uuid
language plpgsql security definer
set search_path = public, neon_auth
as $$
declare
  v_subject uuid;
begin
  select s."userId" into v_subject
    from neon_auth.session s
   where s.token = p_session_token
     and s."expiresAt" > now();
  if v_subject is null then
    raise exception 'no live neon session for the presented token'
      using errcode = 'P0004';
  end if;
  if not (select coalesce(u."emailVerified", false)
            from neon_auth."user" u where u.id = v_subject) then
    raise exception 'destination subject email is not verified'
      using errcode = 'P0005';
  end if;
  return v_subject;
end;
$$;

-- reserve_identity_claim: called by the server ONLY after the old-identity
-- proof has verified AND the claimer holds a live session. The reservation
-- binds BOTH ends at creation: the legacy uuid AND the intended Neon subject
-- (derived from the session, never a parameter). A stolen claim token is
-- therefore useless — completion requires a session for the SAME subject.
-- Idempotent retry requires the SAME payload; reusing an idempotency key
-- with different data is a conflict, not a silent return.
create or replace function public.reserve_identity_claim(
  p_legacy_user_id uuid,
  p_proof_hash bytea,       -- sha256 of verified proof artifact
  p_claim_token_hash bytea, -- sha256 of the single-use secret
  p_session_token text,     -- binds the destination subject NOW
  p_idempotency_key text,
  p_ttl_seconds integer default 900
) returns public.identity_claims
language plpgsql security definer
set search_path = public
as $$
declare
  v_existing public.identity_claims;
  v_subject uuid;
begin
  v_subject := public.claim_session_subject(p_session_token);

  -- Lazy expiry sweep: dead reservations become audit tombstones so neither
  -- the legacy identity nor the subject is permanently blocked by a lapsed
  -- token. (Partial unique indexes below enforce LIVE uniqueness atomically;
  -- now() cannot appear in an index predicate, hence the sweep.)
  update public.identity_claims
     set status = 'rejected',
         audit = audit || '{"reason":"ttl-expired"}'::jsonb
   where status = 'reserved' and expires_at < now();

  select * into v_existing from public.identity_claims
   where idempotency_key = p_idempotency_key;
  if found then
    -- Same key must mean the SAME call — a recycled key carrying different
    -- data is a conflict, never a silent accept. proof_hash is excluded from
    -- the comparison: it hashes the raw JWT artifact, and a retry after a
    -- transient failure may carry a FRESH signature over the same identity —
    -- semantically the same call.
    if v_existing.legacy_user_id = p_legacy_user_id
       and v_existing.claim_token_hash = p_claim_token_hash
       and v_existing.neon_user_id = v_subject then
      return v_existing;
    end if;
    raise exception 'idempotency key reused with a different payload'
      using errcode = '23505';
  end if;

  -- A legacy identity with a LIVE claim (any status in the live set) cannot
  -- be re-reserved — blocks impostor pre-registration and double-claim.
  if exists (select 1 from public.identity_claims
             where legacy_user_id = p_legacy_user_id
               and status in ('reserved', 'completed')) then
    raise exception 'legacy identity already has a claim record'
      using errcode = '23505';
  end if;
  -- A subject already holding a claim (any live status) cannot reserve a
  -- second legacy identity.
  if exists (select 1 from public.identity_claims
             where neon_user_id = v_subject
               and status in ('reserved', 'completed')) then
    raise exception 'neon subject already holds a claim'
      using errcode = '23505';
  end if;

  insert into public.identity_claims
    (legacy_user_id, neon_user_id, claim_token_hash, proof_hash,
     idempotency_key, expires_at)
  values
    (p_legacy_user_id, v_subject, p_claim_token_hash, p_proof_hash,
     p_idempotency_key, now() + make_interval(secs => p_ttl_seconds))
  returning * into v_existing;
  return v_existing;
end;
$$;

-- complete_identity_claim: binds the reservation to the subject of a LIVE
-- managed-auth session — never to a caller-supplied uuid. The raw session
-- token (from the httpOnly cookie, `token.signature` → `token`) is resolved
-- against neon_auth.session inside the function, so a caller cannot bind a
-- subject they do not hold a valid session for.
create or replace function public.complete_identity_claim(
  p_claim_token_hash bytea,
  p_session_token text
) returns public.identity_claims
language plpgsql security definer
set search_path = public, neon_auth
as $$
declare
  v_claim public.identity_claims;
  v_subject uuid;
begin
  -- The Neon side of the dual-identity proof, verified in-database: live
  -- session + verified email, subject derived — never caller-supplied.
  v_subject := public.claim_session_subject(p_session_token);

  select * into v_claim from public.identity_claims
   where claim_token_hash = p_claim_token_hash
   for update; -- serialize concurrent completion attempts
  if not found then
    raise exception 'unknown claim token' using errcode = 'P0002';
  end if;
  if v_claim.status = 'completed' then
    -- Idempotent ONLY for the same subject; a different subject replaying
    -- a used token is a takeover attempt, not a retry.
    if v_claim.neon_user_id = v_subject then
      return v_claim;
    end if;
    raise exception 'claim token already consumed by another subject'
      using errcode = '23505';
  end if;
  -- Reserved is the ONLY claimable state — rejected/cancelled reservations
  -- are tombstones, never re-completable.
  if v_claim.status <> 'reserved' then
    raise exception 'claim is not in a claimable state (status=%)', v_claim.status
      using errcode = 'P0006';
  end if;
  if v_claim.expires_at < now() then
    raise exception 'claim reservation expired' using errcode = 'P0003';
  end if;
  -- The reservation was bound to a specific subject at reserve time —
  -- a token presented under a DIFFERENT live session is stolen, not used.
  if v_claim.neon_user_id <> v_subject then
    raise exception 'claim token bound to a different subject'
      using errcode = '23505';
  end if;

  update public.identity_claims
     set status = 'completed',
         completed_at = now()
   where id = v_claim.id
  returning * into v_claim;
  return v_claim;
end;
$$;

-- cancel_identity_claim: revokes a live reservation (TTL shortcut —
-- e.g. the user abandoned onboarding or support invalidated a claim).
-- Completed claims cannot be cancelled.
create or replace function public.cancel_identity_claim(
  p_claim_token_hash bytea
) returns public.identity_claims
language plpgsql security definer
set search_path = public
as $$
declare
  v_claim public.identity_claims;
begin
  update public.identity_claims
     set status = 'cancelled'
   where claim_token_hash = p_claim_token_hash
     and status = 'reserved'
  returning * into v_claim;
  if not found then
    raise exception 'no cancellable claim for this token'
      using errcode = 'P0007';
  end if;
  return v_claim;
end;
$$;

-- Service-plane only: no direct execute for user roles. The ceremony's trust
-- boundary is the trusted server path, never an exposed client RPC.
revoke all on function public.claim_session_subject(text)
  from public, anon, authenticated;
revoke all on function public.reserve_identity_claim(uuid, bytea, bytea, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.complete_identity_claim(bytea, text)
  from public, anon, authenticated;
revoke all on function public.cancel_identity_claim(bytea)
  from public, anon, authenticated;
grant execute on function public.claim_session_subject(text) to service_role;
grant execute on function public.reserve_identity_claim(uuid, bytea, bytea, text, text, integer)
  to service_role;
grant execute on function public.complete_identity_claim(bytea, text)
  to service_role;
grant execute on function public.cancel_identity_claim(bytea) to service_role;
