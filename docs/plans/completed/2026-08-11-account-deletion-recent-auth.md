# MoneyFlow Trust Phase 1 — Secure: recent authentication for permanent deletion

**Status:** completed
**Execution state:** accepted
**Active role:** none
**Permission scope:** historical record
**Owner:** Thunderkill016
**Merged implementation PR:** #324
**Acceptance evidence date:** 2026-08-11
**Accepted against main:** `18836e2ebdc63711113f248826b00cd541a0a530`

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent program:** `docs/plans/active/public-beta-trust.md`
**Provider prerequisite:** `docs/plans/completed/2026-08-11-moneyflow-trust-provider-sync.md`
**Production Vercel deployment:** `dpl_Ha9j2HWPx4PfrpjLc1jpfcPgFvNi` (`READY`, exact Git SHA `18836e2ebdc63711113f248826b00cd541a0a530`)
**Production Supabase Edge:** `delete-account` v6 `ACTIVE`, `verify_jwt=true`
**Provider bundle SHA-256:** `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`

## Outcome

P1 Secure is accepted with one explicit owner-accepted limitation.

Provider-backed production evidence now proves both supported interactive paths used by MoneyFlow account-deletion reauthentication:

- password reauthentication succeeds for the same account and returns to `/settings/delete-account` without destructive deletion;
- Google/OAuth reauthentication succeeds for the same account, preserves expected-user continuity through the callback, and returns to `/settings/delete-account` without destructive deletion.

Missing-continuity behavior was exercised credential-free in production and failed closed. Stale-AMR and real account-mismatch destructive/provider probes were deliberately not executed because doing so safely would require either a real authenticated stale destructive boundary or another real identity. On 2026-08-11 the owner explicitly accepted that named limitation and accepted the deterministic fail-closed tests/source evidence for those two cases instead of destructive production testing.

No account deletion was performed for acceptance.

## Final provider-behavior evidence

### Password recent authentication — P1-AC16

Result: **PASS — provider-backed**.

Production evidence window on 2026-08-11:

- initial password authentication completed successfully;
- the deletion reauthentication path then performed a second successful password authentication;
- both authentications resolved to the same provider user identity;
- server-side user verification succeeded around the reauthentication boundary;
- browser returned to `/settings/delete-account`;
- no `delete-account` Edge invocation was observed.

The credentials themselves were never copied into repository artifacts or agent memory.

### Google/OAuth continuity — P1-AC17

Result: **PASS — provider-backed**.

Production evidence window on 2026-08-11:

- ordinary Google login completed successfully;
- deletion reauthentication initiated OAuth with callback state scoped to `/settings/delete-account` and `reauth=1`;
- a second Google PKCE authentication completed successfully;
- the ordinary login and reauthentication resolved to the same provider user identity;
- server-side user verification succeeded after callback;
- browser returned to `/settings/delete-account`;
- no `delete-account` Edge invocation was observed.

This proves same-account continuity for the supported Google deletion-reauth path; an ordinary Google login alone was not treated as continuity evidence.

### Fail-closed continuity — P1-AC18

Result: **ACCEPTED WITH NAMED LIMITATION**.

Provider-backed production evidence:

- deletion reauth callback with missing continuity state failed closed to ordinary login/recovery;
- invalid non-credential callback code followed the same safe recovery path;
- `reauth=1` without the deletion `next` did not activate the deletion-specific continuity branch;
- unauthenticated `/settings/delete-account` redirected to ordinary login while preserving the intended next path.

Deterministic source/test evidence on exact `main@18836e2`:

- 35/35 recent-auth assertions pass;
- only `password` and `oauth` are accepted interactive AMR methods;
- `token_refresh` cannot extend deletion authority;
- recency is computed from the AMR entry timestamp, not access-token `iat`;
- missing, malformed, unsupported, future-dated and stale AMR fail closed before tenant purge authority.

Not executed in production:

- stale-AMR path through a potentially destructive server action;
- real account-mismatch path requiring a second real identity.

Owner decision on 2026-08-11: accept those two unexecuted provider cases as a named limitation, backed by deterministic fail-closed tests/source evidence, rather than risk destructive or identity-manipulating production tests.

### Post-flow logs — P1-AC19

Result: **PASS for the accepted provider flows**.

Correlated provider/runtime review covered Auth, API, Postgres, Edge and Vercel around the exact interaction windows:

- Auth recorded successful password and Google PKCE authentications for the accepted flows;
- API showed the expected auth/user and ordinary application requests;
- Postgres showed no acceptance-blocking error cluster in the relevant window;
- Supabase Edge logs showed no `delete-account` invocation;
- Vercel runtime showed the expected login/callback/delete-account route traffic and no acceptance-blocking runtime error cluster.

A Vercel `POST /settings/delete-account` observed after the Google callback was not treated as proof of destructive execution: the destructive authority lives in the Supabase Edge function, and no corresponding Edge invocation was present.

## Acceptance criteria

Repository/deployment criteria:

- [x] P1-AC1 recent-auth rejection occurs before `purge_user_tenant_data`.
- [x] P1-AC2 only `password` and `oauth` satisfy current deletion recency.
- [x] P1-AC3 token refresh cannot extend deletion authority.
- [x] P1-AC4 bearer-token identity remains the deletion target.
- [x] P1-AC5 password step-up checks current identity continuity.
- [x] P1-AC6 Google uses fresh provider authentication plus expected-user callback continuity.
- [x] P1-AC7 deletion reauth mode requires both marker and sanitized deletion next path.
- [x] P1-AC8 typed `XÓA` does not cross the authentication boundary.
- [x] P1-AC9 expired session uses ordinary login.
- [x] P1-AC10 current cleanup inventory remains complete for the reviewed schema.
- [x] P1-AC11 #324 exact-head repository gates were clean.
- [x] P1-AC12 #324 merged.
- [x] P1-AC13 current Next.js production deployment is `READY` on exact `18836e2`.
- [x] P1-AC14 production database/schema/ACL prerequisites remain aligned.
- [x] P1-AC15 production `delete-account` v6 is live/read back with `verify_jwt=true` and current recent-auth helper.

Provider-behavior criteria:

- [x] P1-AC16 production-safe password step-up provider evidence recorded.
- [x] P1-AC17 production-safe Google/OAuth same-account continuity provider evidence recorded.
- [x] P1-AC18 fail-closed acceptance recorded with the explicit stale-AMR/account-mismatch provider-test limitation above.
- [x] P1-AC19 correlated provider/runtime log review found no acceptance-blocking cluster for the accepted flows.

## Security interpretation

MoneyFlow uses verified JWT `amr` method/timestamp for recency and keeps the allowlist narrower than the provider's full AMR vocabulary. `token_refresh` is explicitly not interactive deletion authorization. AAL and access-token issuance time are not substitutes for recent interactive authentication.

The accepted limitation does not weaken the implementation contract; it only records that two destructive/identity-risk production probes were intentionally not executed.

## Safety record

Acceptance performed no:

- real account deletion;
- production financial-row mutation for testing;
- Auth admin identity creation/deletion;
- provider secret/config write;
- Edge deployment/config write;
- credential/token/cookie/JWT capture in durable repository memory.

## Delivery decision

P1 Secure is accepted. P2 Recover may now be specified/implemented as the next MoneyFlow Trust phase. This packet is historical after acceptance and must not be reopened as an active plan unless a new security regression or requirement is discovered.
