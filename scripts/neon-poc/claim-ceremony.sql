-- Scratch-only PoC for the dual-identity claim ceremony (#774 round-4).
-- NOT a product migration yet — this is the rehearsal of the design that
-- would become one after review.
--
-- Threat model: under Plan B a registrant receives a fresh Neon UUID. A bare
-- sign-up MUST NOT entitle them to a legacy ledger — nothing proves the
-- registrant controls the old Supabase identity or even the email. The claim
-- is therefore a server-only, single-use, time-limited ceremony binding a
-- VERIFIED old-identity proof to a VERIFIED new Neon subject, unique in both
-- directions, idempotent, and audited.
--
-- Old-identity proof (production): a live Supabase access token verified
-- OFFLINE against cached JWKS (signature + iss + aud + exp + sub), plus a
-- recent-auth check when the project is reachable. PoC substitutes an
-- HMAC-signed artifact from a test-only issuer — the ceremony treats proof
-- verification as an injectable boundary, exactly as production must.

create table if not exists public.identity_claims (
  id uuid primary key default gen_random_uuid(),
  -- exactly one claim per legacy identity, one claim per neon subject
  legacy_user_id uuid not null unique,
  neon_user_id uuid unique, -- null while reserved, set at completion
  -- sha256 of a single-use claim secret; the raw secret never rests in DB
  claim_token_hash bytea not null unique,
  -- sha256 of the verified old-identity proof (audit, not the proof itself)
  proof_hash bytea not null,
  idempotency_key text not null unique,
  status text not null default 'reserved'
    check (status in ('reserved', 'completed', 'rejected')),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null, -- short TTL; no lingering reservations
  completed_at timestamptz,
  audit jsonb not null default '{}'::jsonb
);

-- No row-level visibility for users at all: claims are service-plane state.
alter table public.identity_claims enable row level security;
revoke all on public.identity_claims from public, anon, authenticated;
grant select, insert, update on public.identity_claims to service_role;

-- reserve_identity_claim: called by the server ONLY after the old-identity
-- proof has verified. Creates a single-use reservation bound to a specific
-- legacy uuid. Idempotent on idempotency_key (safe retry of the same call;
-- a DIFFERENT key for an already-claimed legacy id raises a conflict).
create or replace function public.reserve_identity_claim(
  p_legacy_user_id uuid,
  p_proof_hash bytea,       -- sha256 of verified proof artifact
  p_claim_token_hash bytea, -- sha256 of the single-use secret
  p_idempotency_key text,
  p_ttl_seconds integer default 900
) returns public.identity_claims
language plpgsql security definer
set search_path = public
as $$
declare
  v_existing public.identity_claims;
begin
  select * into v_existing from public.identity_claims
   where idempotency_key = p_idempotency_key;
  if found then
    return v_existing; -- true idempotent retry of THIS call
  end if;

  -- A legacy identity already claimed (any status) cannot be re-reserved —
  -- blocks impostor pre-registration and double-claim at the source.
  if exists (select 1 from public.identity_claims
             where legacy_user_id = p_legacy_user_id) then
    raise exception 'legacy identity already has a claim record'
      using errcode = '23505';
  end if;

  insert into public.identity_claims
    (legacy_user_id, claim_token_hash, proof_hash, idempotency_key, expires_at)
  values
    (p_legacy_user_id, p_claim_token_hash, p_proof_hash, p_idempotency_key,
     now() + make_interval(secs => p_ttl_seconds))
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
  -- The Neon side of the dual-identity proof, verified in-database: the
  -- session token must exist AND be unexpired. A forged or stale token
  -- yields no subject.
  select s."userId" into v_subject
    from neon_auth.session s
   where s.token = p_session_token
     and s."expiresAt" > now();
  if v_subject is null then
    raise exception 'no live neon session for the presented token'
      using errcode = 'P0004';
  end if;
  -- The destination subject's email must be verified — an unverified
  -- sign-up is not proof of control over the destination identity.
  if not (select coalesce(u."emailVerified", false)
            from neon_auth."user" u where u.id = v_subject) then
    raise exception 'destination subject email is not verified'
      using errcode = 'P0005';
  end if;

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
  if v_claim.expires_at < now() then
    raise exception 'claim reservation expired' using errcode = 'P0003';
  end if;
  if exists (select 1 from public.identity_claims
             where neon_user_id = v_subject and status = 'completed') then
    raise exception 'neon subject already bound to a legacy identity'
      using errcode = '23505';
  end if;

  update public.identity_claims
     set neon_user_id = v_subject,
         status = 'completed',
         completed_at = now()
   where id = v_claim.id
  returning * into v_claim;
  return v_claim;
end;
$$;

-- Service-plane only: no direct execute for user roles. The ceremony's trust
-- boundary is the trusted server path, never an exposed client RPC.
revoke all on function public.reserve_identity_claim(uuid, bytea, bytea, text, integer)
  from public, anon, authenticated;
revoke all on function public.complete_identity_claim(bytea, text)
  from public, anon, authenticated;
grant execute on function public.reserve_identity_claim(uuid, bytea, bytea, text, integer)
  to service_role;
grant execute on function public.complete_identity_claim(bytea, text)
  to service_role;
