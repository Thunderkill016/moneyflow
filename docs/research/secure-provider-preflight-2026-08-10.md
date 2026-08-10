# MoneyFlow Trust — Secure provider preflight (2026-08-10)

## Purpose

Capture the fresh read-only production preflight required by the merged MoneyFlow Trust execution roadmap before authenticated Phase 1 Secure acceptance. This record does not claim password or Google/OAuth step-up acceptance and does not authorize any provider write or destructive account operation.

## Scope and authority

- Execution phase: MoneyFlow Trust Phase 1 — Secure acceptance.
- Repository baseline inspected: `main@ca23b1f74cf4b886072e81276f325d87672dcd08` (merged PR #332).
- Permission used: repository branch write plus provider read only.
- No production financial row, Auth identity, provider configuration, secret, migration, Edge source, or branch-protection setting was changed.
- No real account deletion was attempted.

## Fresh production evidence

### GitHub / Vercel

- Current production deployment: `dpl_6BdfXC6i98WaW1f9xWV39ByTAqdn`.
- Deployment target/state: production / `READY`.
- Deployment Git SHA: `ca23b1f74cf4b886072e81276f325d87672dcd08`.
- Production aliases include `mfvn.vercel.app`.
- Vercel runtime-error query for the preceding 24 hours returned no runtime-error entries.
- A direct production fetch of `/login` returned HTTP 200 and rendered both email/password and Google entry points.
- A direct unauthenticated fetch of `/settings/delete-account` was handled by the production auth boundary and rendered the login route with `next=/settings/delete-account`; no destructive authority was reachable anonymously.
- Exact production runtime logs around this read-only probe show the current deployment handling `/login` and `/settings/delete-account` without a serverless error.

### Supabase project / Edge

- Project `fwpldsdkpzhswpuctbke` is `ACTIVE_HEALTHY`.
- Production `delete-account` remains version **6**, status `ACTIVE`, `verify_jwt=true`.
- Provider bundle SHA-256 remains `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`, matching the reviewed rollout evidence.
- Provider read-back still contains `delete-account/index.ts` and `_shared/account-deletion-recent-auth.ts`.
- The live helper still applies MoneyFlow's ten-minute recent-auth policy and accepts only interactive `password` or `oauth` AMR methods; missing, unsupported, future, or stale evidence fails closed before tenant purge.
- Edge-function logs for the preceding 24 hours returned no invocation entries. This is a baseline observation, not authenticated-flow acceptance.

### Auth / API / Postgres baseline

- Current Auth/API logs show normal production session/JWKS/data activity during 2026-08-10; no password/OAuth deletion-reauth event was present in the inspected snapshot, so no such event is claimed as acceptance evidence.
- A PII-free aggregate query of `auth.users` reports **3 total users and 0 users with a non-empty password credential**. No password hash, email, user ID, identity payload, token, or cookie was read into this evidence record.
- Therefore the password acceptance precondition in the current roadmap has no existing production test subject. Creating a password identity solely for acceptance would be a new production Auth write and remains outside the current read-only provider permission.
- Postgres logs in the inspected 24-hour window were dominated by ordinary checkpoint activity; no P0/P1 deletion/auth-related database error cluster was identified in this preflight.
- Vercel likewise showed no runtime-error cluster in the inspected 24-hour window.

### Google/OAuth readiness evidence boundary

- The live login surface presents the Google sign-in path.
- Read-only aggregate Auth metadata shows prior production Google OAuth flow state (`provider_type=google`, `authentication_method=oauth`) and Google identities exist, without reading or recording user emails, tokens, provider tokens, or identity payloads.
- The connected Supabase management actions available in this session do not expose the current hosted Auth config field `external_google_enabled`, so this preflight does **not** upgrade the stronger claim "Google provider is currently enabled" to PASS solely from UI presence or historical flow state.
- Current official Supabase documentation still describes `amr` entries as method + timestamp evidence and includes `password`, `oauth`, and `token_refresh` in the vocabulary. MoneyFlow intentionally keeps the destructive-delete allowlist narrower than the provider vocabulary.

## Result

### S1 — Fresh production preflight

**PASS for repository/deployment/Edge/source/log baseline, with one bounded configuration-observability limitation.**

There is no observed Git/Vercel/Supabase Edge source drift that should stop authenticated acceptance. The current production Next.js deployment is on current `main`, the destructive Edge runtime is still the reviewed v6 bundle, and the unauthenticated deletion route remains gated by login.

The current Google-provider enabled flag could not be read directly through the connected hosted-management action. The live Google entry point plus historical OAuth flow evidence supports proceeding to an actual safe Google flow, but it is not substituted for provider-behavior proof.

## Remaining acceptance gate

The next required evidence is user-authenticated and cannot be manufactured from source, CI, provider read-back, or anonymous HTTP requests:

1. **Password:** the live tenant currently has **zero password-capable users**, so P1-AC16 cannot be exercised under the existing production-read-only boundary. A separate explicit owner decision is required before creating or adding a safe password credential solely for acceptance. If such a test subject is authorized, use a stale same-account session, enter the current password, verify the same identity and fresh `password` AMR, confirm the destructive `XÓA` confirmation is cleared, and stop before deletion.
2. **Google/OAuth:** use the supported same-account Google step-up, verify expected-user continuity and fresh `oauth` AMR, exercise missing-continuity fail-closed behavior, and stop before deletion.
3. Inspect Edge/Auth/API/Postgres/Vercel logs for the exact acceptance window.

No credential, session cookie, access token, password, or provider token is available to this cloud-agent session, and the current packet does not authorize creating a production test identity or changing Auth/provider configuration. Therefore P1-AC16 through P1-AC19 remain open rather than being fabricated as passed.

## Current external research check

Official Supabase documentation reviewed on 2026-08-10:

- JWT Claims Reference: AMR carries authentication method and timestamp; provider vocabulary includes password, OAuth and token refresh.
- Authorization headers / Securing Edge Functions: authenticated Edge calls use a user JWT in the `Authorization` header and the platform/function boundary must verify the caller appropriately.
- Auth changelog: no newly identified hosted Google-social-login or AMR change was found that invalidates the reviewed MoneyFlow recent-auth contract for this preflight.

No new dependency, framework, provider, or security architecture is adopted by this evidence record.
