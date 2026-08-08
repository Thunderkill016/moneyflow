# MoneyFlow Trust Phase 1 — Secure: recent authentication for permanent deletion

**Status:** deployed
**Execution state:** deployed
**Active role:** human_owner
**Permission scope:** provider_read
**Owner:** Thunderkill016
**Issue/PR:** #324, replacing stale PR #316
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent packet:** `docs/plans/active/public-beta-trust.md`
**Merged PR:** #324
**Merge commit:** `fd984a18201f1663d3d8c622d51c41dfd650c816`
**Production deployment:** `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9`

Phase 1 is no longer at an owner merge checkpoint. The implementation is merged and the exact commit is deployed to production. The remaining transition is `deployed → accepted`, which requires provider-backed production-safe password + Google step-up evidence on an authenticated account. No destructive real-account deletion is required or claimed.

## Outcome

An old valid MoneyFlow session is no longer sufficient to permanently delete authenticated account data. The delete-account Edge Function requires verified recent interactive authentication through a currently supported MoneyFlow method before tenant purge. A stale-but-valid session uses same-account step-up; a fully expired session uses ordinary login and then requires destructive confirmation again.

Current truth:

- #324 is merged on current `main`;
- the exact merge commit is `READY` on Vercel production;
- ordinary unauthenticated deletion/login routing is production-evidenced;
- live authenticated password + Google provider step-up remains unexecuted in inspected evidence;
- P1 therefore remains active at `deployed`, not `accepted`.

## Repository reconnaissance

### Current behavior

- Current `main` includes the P8 deletion flow, P9–P11 UI ownership and the newest tenant cleanup list.
- `financial_mutation_audit_events` remains in account cleanup.
- #324 refreshed useful #316 design/tests onto current main rather than merging #316 unchanged.
- #316 is now closed as superseded historical evidence.
- The merged deletion path verifies recent interactive AMR before tenant purge.
- Password and Google step-up preserve same-account continuity.
- OAuth callbacks fail closed when expected-user continuity is absent, and mismatches recover through ordinary login rather than a dead-end reauth mode.

### Relevant repository areas

| Area | Current responsibility |
|---|---|
| `supabase/functions/delete-account/index.ts` | destructive authority; verifies claims and recent-auth before tenant purge |
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | pure recency and supported-method policy |
| `src/app/(auth)/actions.ts` | password/Google step-up and typed failure owner |
| `src/app/auth/callback/route.ts` | Google expected-user continuity + fail-closed callback owner |
| login/AuthForm/proxy | bounded deletion step-up reachability |
| delete-account page | clears `XÓA`; separates expired login from stale-session step-up |

### Existing tests and constraints

- Deletion target remains the bearer-token user; no client user ID is accepted.
- Tenant purge remains before Auth identity deletion.
- CAPTCHA remains part of the existing login flow when configured.
- `XÓA` never crosses an authentication boundary.
- Exact-head CI, database, browser/cross-device, CodeQL and secret-history evidence were required before merge.
- Provider behavior still requires provider evidence after deployment.

### Similar implementation and recent history

- PR #309 recorded recent-auth as a remaining deletion hardening boundary.
- PR #316 was the first verified candidate on an older baseline and is now closed superseded.
- PR #324 is the current merged implementation.
- PR #321/#322 completed and archived UI migration; this phase does not reopen it.

### Open questions

- [x] Use access-token `iat` as recent-auth proof? No.
- [x] Use verified Supabase `amr` method/timestamp? Yes.
- [x] Which AMR methods authorize deletion now? Only `password` and `oauth`.
- [x] Valid session but stale AMR? Same-account step-up.
- [x] Session expired completely? Ordinary login, then restart deletion confirmation.
- [x] Merge current implementation? Yes, #324 merged.
- [x] Exact merged deployment READY? Yes.
- [ ] Live password step-up works on the production provider boundary without destructive deletion.
- [ ] Live Google step-up preserves same-account continuity on the production provider boundary without destructive deletion.

## Research

### Research scope and source selection

Repository/current-main inspection came first. Current Supabase JWT/Auth documentation and OWASP reauthentication guidance were used to refresh the old #316 policy.

### Questions researched

1. Does current Supabase expose AMR method plus timestamp?
2. Can JWT issuance time substitute for interactive authentication time?
3. Which AMR values are currently documented?
4. Is AAL the same concept as recent authentication?

### Sources

| Source | Authority | Applied decision | Limitation |
|---|---|---|---|
| Supabase JWT Claims Reference | official | `amr` contains method/timestamp; provider vocabulary is broader than MoneyFlow | MoneyFlow chooses its own deletion allowlist |
| Supabase JWT guide | official | Supabase continuously issues JWTs; use verified claims | `iat` does not prove interactive reauth |
| Supabase MFA docs | official | `aal` represents assurance level | not a recency timestamp |
| OWASP Authentication Cheat Sheet | authoritative guidance | sensitive operations should require reauthentication | does not prescribe MoneyFlow's ten-minute interval |

### Alternatives considered

| Option | Risk | Decision |
|---|---|---|
| merge #316 unchanged | stale tenant cleanup/current-main ancestry | rejected; #324 refreshed it |
| use JWT `iat` | token refresh can look recent without new identity proof | reject |
| accept every Supabase AMR method | silently authorizes unreviewed flows | reject |
| accept only current password + Google OAuth | future methods require explicit review | selected |

### Research decision

Use verified JWT `amr` timestamps and a narrow `password`/`oauth` allowlist. Reject missing, malformed, unsupported, future or older-than-ten-minutes evidence before admin deletion authority is created. Keep AAL and token issuance separate from recency.

### Adoption review

Not applicable. No dependency, provider, service or framework was added.

## Specification

### Problem

A valid but old authenticated session previously could reach irreversible deletion after typed confirmation without proving recent identity. The stale #316 candidate also had recovery/continuity gaps that #324 corrected before merge.

### User stories

- As a stale-session user, I authenticate again before permanent deletion.
- As a password user, the same account must supply the fresh password session.
- As a Google user, the same account must return from fresh provider authentication.
- As an expired-session user, I log in normally and restart destructive confirmation under the newly authenticated account.
- As the owner, token refresh and unrelated Auth methods cannot silently grant deletion authority.

### Acceptance criteria

- [x] P1-AC1: recent-auth rejection occurs before `purge_user_tenant_data`.
- [x] P1-AC2: only `password` and `oauth` satisfy current deletion recency.
- [x] P1-AC3: token refresh cannot extend deletion authority.
- [x] P1-AC4: bearer-token identity remains the deletion target.
- [x] P1-AC5: password step-up checks current email and resulting user ID.
- [x] P1-AC6: Google uses `max_age=0` plus expected-user callback continuity.
- [x] P1-AC7: reauth mode requires both `reauth=1` and sanitized deletion `next`.
- [x] P1-AC8: `XÓA` is cleared across ordinary login and same-account step-up.
- [x] P1-AC9: expired session routes to ordinary login, not impossible continuity step-up.
- [x] P1-AC10: current cleanup including `financial_mutation_audit_events` remains intact.
- [x] P1-AC11: exact-head CI/database/browser/cross-device/CodeQL/secret-history gates are clean; final Browser rerun was first-pass clean.
- [x] P1-AC12a: owner merge completed and exact merge commit is Vercel `READY` production.
- [x] P1-AC12b: unauthenticated production delete-account boundary reaches ordinary login with deletion return path and does not pretend reauth continuity exists.
- [ ] P1-AC12c: production-safe authenticated password step-up evidence is recorded without destructive deletion.
- [ ] P1-AC12d: production-safe authenticated Google step-up/identity-continuity evidence is recorded without destructive deletion.

P1 is accepted only after the final two provider criteria are evidenced or the owner explicitly accepts them as limitations. Neither has been inferred from repository tests.

### Required states

- Fresh password/OAuth: deletion may proceed to existing destructive authority.
- Stale valid session: return `recent_auth_required` before purge and enter same-account step-up.
- Expired session: return `requiresLogin`, use normal login and restart confirmation.
- Missing OAuth reauth continuity: fail closed, sign out and use ordinary login recovery.
- Account mismatch: reject, clear continuity state and recover through ordinary login.
- Provider/callback failure: remain non-destructive.
- Demo: unchanged browser-local behavior.

### Financial and security constraints

- No financial formula, schema, RLS, grant or provider configuration change in #324.
- No token/password/provider secret or private claim set is persisted in product data or logs.
- Expected-user cookie is short-lived, HttpOnly and callback-scoped; it is a continuity guard, not deletion authority.
- Ten minutes is explicit MoneyFlow policy, not a universal external standard.
- Production acceptance must not delete a real account merely to prove step-up behavior.

### Out of scope

- Global MFA policy.
- New login provider.
- Provider configuration writes.
- Destructive production account test.
- Backup/restore Phase 2 implementation.
- UI redesign.

## Implementation plan

### Architecture fit

Supabase Auth remains identity authority; existing login/callback routes own step-up; the delete-account Edge Function remains destructive authority. A pure helper evaluates verified AMR evidence before the current tenant purge path.

### Implemented changes

| Area | Change | Reason |
|---|---|---|
| AMR helper | ten-minute password/oauth-only policy | least privilege for current product |
| Edge deletion | verified claims + recent-auth gate before purge | server enforcement |
| Auth actions/callback | same-account password/Google step-up | identity continuity |
| OAuth callback | explicit reauth marker; missing continuity/mismatch fail closed to ordinary login | eliminate cross-account and dead-end recovery findings |
| login/AuthForm/proxy | exact deletion reauth mode | safe reachability |
| delete page | separate expired login vs stale step-up; clear confirmation | correct recovery state |
| tests | recency, cleanup preservation, callback continuity, browser presentation | regression evidence |

### Data and migration impact

- Schema/migration/backfill: none.
- Provider setting: none.
- Rollback: revert #324; no data migration rollback required.

### Risks and counterexamples

| Risk | Control |
|---|---|
| stale #316 Edge loses newer cleanup | #324 patched current main and preserved cleanup |
| fresh token refresh looks like reauth | `token_refresh` excluded and tested |
| unsupported Auth method grants deletion | password/oauth-only allowlist |
| password account switch | current email + resulting user ID checks |
| Google account switch | callback expected-user guard |
| missing continuity cookie | explicit reauth callback marker + fail closed |
| mismatch dead-end | ordinary-login recovery |
| expired session dead-end | separate ordinary-login path |
| raw query activates step-up elsewhere | exact deletion `next` required |

### Verification plan

- Static/unit/database/browser/security: complete before merge on exact #324 head.
- Production deployment identity/routing/runtime error check: complete after merge.
- Provider acceptance: pending authenticated password and Google production-safe step-up.
- No destructive account deletion is necessary for acceptance.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P1-T1 | reconcile #316/current main/current Supabase | compare + research | complete |
| P1-T2 | port bounded Auth/UI/tests | #324 diff | complete |
| P1-T3 | patch current Edge and narrow AMR policy | source + unit contract | complete |
| P1-T4 | fix expired-session and OAuth continuity/recovery findings | source/browser contracts | complete |
| P1-T5 | exact-head Class 3 gates | CI #2070 + CodeQL/Secret #1173 + raw browser/cross-device evidence | complete |
| P1-T6 | owner merge | #324 → `fd984a18201f1663d3d8c622d51c41dfd650c816` | complete |
| P1-T7 | exact merged deployment + ordinary-login production boundary | `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` READY + route smoke | complete |
| P1-T8 | authenticated production password + Google step-up acceptance | provider evidence | blocked by explicit owner/provider boundary |
| P1-T9 | final P1 archive + parent acceptance reconciliation | accepted P1 evidence | blocked by P1-T8 |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | planned | MoneyFlow Trust approval + #323 | #316 stale | reconcile |
| 2026-08-08 | implementer | evaluator | evaluating | #324 source + fixes | protected exact-head gates | evaluate |
| 2026-08-08 | evaluator | human_owner | ready_for_review | exact-head CI #2070, CodeQL/Secret #1173, clean Browser rerun, clean cross-device | owner merge | owner decides |
| 2026-08-08 | human_owner | CI/production | merged | #324 merged as `fd984a...` | exact deployment | verify deployment |
| 2026-08-08 | CI/production | human_owner | deployed | Vercel `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` READY; public/ordinary-login smoke; no runtime errors in explicit 1h inspection | authenticated provider step-up not executed | owner may authorize production-safe password/Google step-up evidence |

### Current permission boundary

- Repository/product implementation is merged.
- Current provider scope for agent work: `provider_read` only.
- Forbidden without a later explicit owner action: provider configuration writes, creating/mutating a production account for acceptance, destructive production deletion, production financial-data mutation, branch/ruleset changes.
- Human approval required before any provider/production write.
- Stop condition: identity-continuity ambiguity, provider state requiring mutation, or any temptation to infer live provider acceptance from repository/browser evidence.

## Evaluation

### Exact-head acceptance evidence

Final source head `8add8663d118e5f85717af101480354403cef2f1`:

- CI #2070 / run `31253706324`: success.
- CodeQL #1173 / run `31253706317`: success.
- Secret history #1173 / run `31253706318`: success.
- Policy/static quality/production build/unit + static RLS/fresh Supabase reset + pgTAP: success.
- Cross-device audit: 427 pass + 127 intentional skips, 0 failed/0 flaky.
- First Browser job shell was green but raw evidence contained one unrelated retry-pass; it was not accepted.
- Browser job rerun on the same exact head: **100/100 passed, 0 retry/flaky**, artifact `9020908708`, digest `sha256:d94f7080a1788c430458c342ed52016f2a10008eccfc7d981e850046721ccf81`.
- Aggregate `e2e`: success after clean Browser rerun.

### Production evidence

Merged commit `fd984a18201f1663d3d8c622d51c41dfd650c816`:

- Vercel deployment `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9`: `READY`, target `production`.
- `mfvn.vercel.app` aliases this deployment.
- `/` returned 200.
- ordinary `/login?next=/settings/delete-account` returned 200 with `reauth=0` when no authenticated continuity exists.
- unauthenticated `/settings/delete-account` reached the ordinary login boundary with the deletion return path.
- explicit Vercel runtime-error inspection for the prior hour returned no runtime errors.

This does **not** prove the authenticated password or Google provider step-up path. That evidence remains P1-T8.

### Research and adoption evidence

- Current Supabase documentation supports verified AMR method/timestamp evidence and distinguishes `iat`, `aal` and `amr`.
- MoneyFlow allowlist is deliberately narrower than provider vocabulary.
- No external code or new dependency was adopted.

### Review findings

- Correctness: expired-session dead-end fixed before initial acceptance.
- Security: missing OAuth continuity fails closed; cross-account mismatch cannot inherit deletion authority.
- Recovery: mismatch returns to ordinary login instead of a broken reauth mode.
- Current-main preservation: newest tenant cleanup retained.
- Flake policy: first Browser retry-pass was rejected and rerun cleanly on the same head.
- Scope: recent-auth only; backup/restore implementation remains Phase 2 and is dependency-blocked.

### Remaining limitations

- Live authenticated production password step-up has not been exercised in inspected evidence.
- Live Google-provider step-up/identity continuity has not been exercised in inspected evidence.
- No destructive real-user production deletion is required or claimed.

## Delivery record

- PR: #324 — merged.
- Merge commit: `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- Exact-head CI: #2070 success; CodeQL/Secret #1173 success.
- Production deployment: `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` READY.
- Production routing/runtime smoke: complete for non-authenticated boundary.
- Provider-backed authenticated step-up: pending.
- Work packet moved to `docs/plans/completed/`: **no**; remain active until P1 is accepted.
