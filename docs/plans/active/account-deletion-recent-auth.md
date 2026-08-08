# Public Beta Trust Phase 1 — recent authentication for permanent deletion

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #324, replacing stale PR #316
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent packet:** `docs/plans/active/public-beta-trust.md`
**Base main:** `538768401bd5c0aa66523aba2a52e3601f3fadd4`
**Branch:** `agent/public-beta-trust-phase-1-recent-auth`

The owner approved the Public Beta Trust program on 2026-08-08. Phase 1 refreshes the useful security design and tests from PR #316 onto current `main`; it does not merge the stale PR unchanged or overwrite P9–P11 UI ownership and post-#316 account-deletion cleanup changes.

## Outcome

An old valid MoneyFlow session is no longer enough to permanently delete authenticated account data. The delete-account Edge Function requires verified recent interactive authentication through a currently supported MoneyFlow method before any tenant purge. A stale-but-valid session uses same-account step-up; a fully expired session uses ordinary login and then requires the destructive confirmation again.

## Repository reconnaissance

### Current behavior

- Current `main` has the P8 deletion flow, P9–P11 UI ownership, and a newer tenant cleanup list than stale PR #316.
- Current deletion already purges tenant rows transactionally and verifies zero remaining rows before deleting the Auth identity.
- `financial_mutation_audit_events` is now a tenant table and must remain in account cleanup.
- PR #316 passed full CI/database/browser/security evidence on its old exact head but diverged from current main.
- Auth UI source remained compatible with bounded #316 interaction changes, so the refresh reuses those contracts selectively.

### Relevant repository areas

| Area | Decision |
|---|---|
| `supabase/functions/delete-account/index.ts` | patch current file; never replace with stale #316 snapshot |
| `supabase/functions/_shared/account-deletion-recent-auth.ts` | pure recency and supported-method authority |
| `src/app/(auth)/actions.ts` | password/Google step-up and typed failure owner |
| `src/app/auth/callback/route.ts` | Google expected-user continuity owner |
| login/AuthForm/proxy | narrowly expose deletion step-up without weakening normal redirects |
| delete-account page | clear `XÓA` and choose normal login vs same-account step-up |
| #316 tests | reuse only where still valid on current main |

### Existing tests and constraints

- Deletion target remains the bearer-token user; no client user ID is accepted.
- Tenant purge remains before Auth identity deletion.
- CAPTCHA remains part of the existing login flow when configured.
- `XÓA` must not cross any authentication boundary.
- Exact-head CI, database, browser/cross-device, CodeQL and secret-history evidence are required.

### Similar implementation and recent history

- PR #309 recorded recent-auth as a remaining deletion hardening boundary.
- PR #316 designed and verified the first recent-auth candidate on the P8 baseline.
- PR #321/#322 completed and archived UI migration; this phase does not reopen it.

### Open questions

- [x] Use access-token `iat` as recent-auth proof? No.
- [x] Use verified Supabase `amr` method/timestamp? Yes.
- [x] Which AMR methods authorize deletion now? Only `password` and `oauth`.
- [x] If the session is valid but AMR is stale? Same-account step-up.
- [x] If the session has expired completely? Ordinary login, then re-enter deletion confirmation.
- [x] Require provider/dashboard changes? No for repository implementation; provider acceptance is post-merge.

## Research

### Research scope and source selection

Repository/current-main inspection came first. Current Supabase JWT/Auth documentation and OWASP reauthentication guidance were then used to refresh the old #316 policy.

### Questions researched

1. Does current Supabase still expose AMR method plus timestamp?
2. Can JWT issuance time substitute for interactive authentication time?
3. Which AMR values are currently documented?
4. Is AAL the same concept as recent authentication?

### Sources

| Source | Authority | Applied decision | Limitation |
|---|---|---|---|
| Supabase JWT Claims Reference | official | `amr` contains method/timestamp; documented vocabulary is broader than MoneyFlow | MoneyFlow chooses its own deletion allowlist |
| Supabase JWT guide | official | Supabase continuously issues JWTs; use `getClaims()` to verify Supabase JWTs | `iat` therefore does not prove interactive reauth |
| Supabase MFA docs | official | `aal` represents assurance level | not a recency timestamp |
| OWASP Authentication Cheat Sheet | authoritative guidance | sensitive operations should require reauthentication | does not prescribe the ten-minute interval |

### Alternatives considered

| Option | Risk | Decision |
|---|---|---|
| merge #316 unchanged | stale tenant cleanup/current-main ancestry | reject |
| use JWT `iat` | refresh can create a new token without new identity proof | reject |
| accept every Supabase AMR method | silently authorizes flows not reviewed by MoneyFlow | reject |
| accept only current password + Google OAuth | later methods require explicit review | selected |

### Research decision

Use verified JWT `amr` timestamps and a narrow `password`/`oauth` allowlist. Reject missing, malformed, unsupported, future or older-than-ten-minutes evidence before admin deletion authority is created. Keep AAL and token issuance separate from recency.

### Adoption review

Not applicable. No dependency, provider, service or framework is added.

## Specification

### Problem

A valid but old authenticated session can currently reach an irreversible deletion after typed confirmation without proving recent identity. The old #316 candidate also treated a fully expired session as same-account step-up, even though same-account continuity requires a current identity to compare against.

### User stories

- As a stale-session user, I authenticate again before permanent deletion.
- As a password user, the same account must supply the fresh password session.
- As a Google user, the same account must return from fresh provider authentication.
- As an expired-session user, I log in normally and restart destructive confirmation under the newly authenticated account.
- As the owner, token refresh and unrelated Auth methods cannot silently grant deletion authority.

### Acceptance criteria

- [ ] P1-AC1: recent-auth rejection occurs before `purge_user_tenant_data`.
- [ ] P1-AC2: only `password` and `oauth` satisfy current deletion recency.
- [ ] P1-AC3: token refresh cannot extend deletion authority.
- [ ] P1-AC4: bearer-token identity remains the deletion target.
- [ ] P1-AC5: password step-up checks current email and resulting user ID.
- [ ] P1-AC6: Google uses `max_age=0` plus expected-user callback continuity.
- [ ] P1-AC7: reauth mode requires both `reauth=1` and sanitized deletion `next`.
- [ ] P1-AC8: `XÓA` is cleared across ordinary login and same-account step-up.
- [ ] P1-AC9: expired session routes to ordinary login, not an impossible continuity step-up.
- [ ] P1-AC10: current cleanup including `financial_mutation_audit_events` remains intact.
- [ ] P1-AC11: exact-head CI/database/browser/cross-device/CodeQL/secret-history gates are clean with no hidden flaky retry.
- [ ] P1-AC12: after owner merge and READY deployment, production-safe password + Google step-up evidence is recorded without destructive real-user deletion.

### Required states

- Fresh password/OAuth: deletion may proceed to the existing destructive authority.
- Stale valid session: return `recent_auth_required` before purge and enter same-account step-up.
- Expired session: return `requiresLogin`, use normal login, and restart confirmation.
- Account mismatch: reject and clear continuity state.
- Provider/callback failure: clear expected-user cookie and remain non-destructive.
- Demo: unchanged browser-local behavior.

### Financial and security constraints

- No financial formula, schema, RLS, grant or provider configuration changes.
- No token/password/provider secret or private claim set is persisted in product data or logs.
- Expected-user cookie is short-lived, HttpOnly and callback-scoped; it is a continuity guard, not deletion authority.
- Ten minutes is an explicit MoneyFlow policy, not a universal external standard.

### Out of scope

- Global MFA policy.
- New login provider.
- Provider configuration writes.
- Destructive production account test.
- Backup/restore Phase 2.
- UI redesign.

## Implementation plan

### Architecture fit

Supabase Auth remains identity authority; existing login/callback routes own step-up; the delete-account Edge Function remains destructive authority. A pure helper evaluates verified AMR evidence before the current tenant purge path.

### Planned changes

| Area | Change | Reason |
|---|---|---|
| AMR helper | ten-minute password/oauth-only policy | least privilege for current product |
| Edge deletion | `getClaims()` + recent-auth gate before purge | server enforcement |
| Auth actions/callback | same-account password/Google step-up | identity continuity |
| login/AuthForm/proxy | exact deletion reauth mode | safe reachability |
| delete page | separate expired login vs stale step-up; clear confirmation | correct recovery state |
| tests | recency, cleanup preservation, continuity and browser presentation | regression evidence |

### Data and migration impact

- Schema/migration/backfill: none.
- Provider setting: none.
- Rollback: revert this focused PR; no data migration rollback needed.

### Risks and counterexamples

| Risk | Control |
|---|---|
| stale #316 Edge loses new cleanup table | current-main patch + source regression |
| fresh token refresh looks like reauth | `token_refresh` excluded and tested |
| unsupported Auth method grants deletion | password/oauth-only allowlist |
| password account switch | current email + resulting user ID checks |
| Google account switch | callback expected-user guard |
| expired session dead-ends in step-up | separate ordinary-login path + browser/source tests |
| raw query activates step-up elsewhere | require exact deletion `next` in page/actions/proxy |

### Verification plan

- Static: project knowledge, CI policy, CSS/architecture, lint, typecheck.
- Unit: recent-auth policy and source/continuity contracts.
- Database: fresh reset + pgTAP selected because this is Class 3 destructive-boundary work.
- Browser: focused recent-auth presentation plus standard smoke.
- Responsive: selected Chromium/WebKit matrix.
- Security: CodeQL + secret-history.
- Production: owner-controlled post-merge provider-safe step-up smoke.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P1-T1 | reconcile #316/current main/current Supabase | compare + research | complete |
| P1-T2 | port bounded Auth/UI/tests | PR #324 diff | complete |
| P1-T3 | patch current Edge and narrow AMR policy | source + unit contract | complete |
| P1-T4 | fix expired-session vs stale-session recovery | source/browser contracts | complete |
| P1-T5 | exact-head full Class 3 gates | CI/artifacts/logs | evaluating |
| P1-T6 | independent security/current-main review | review findings | blocked |
| P1-T7 | owner merge checkpoint | explicit owner decision | blocked |
| P1-T8 | production/provider-safe acceptance | exact READY deployment | blocked |
| P1-T9 | parent/current-memory/archive reconciliation | lifecycle record | blocked |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | planned | Public Beta Trust approval + PR #323 | #316 stale | reconcile |
| 2026-08-08 | planner | implementer | implementing | current main + official research | provider evidence unavailable | port |
| 2026-08-08 | implementer | evaluator | evaluating | PR #324; expired-session finding fixed | exact-head gates | evaluate CI/raw retries |

### Current permission boundary

- Granted: branch code/test/docs and exact-head verification.
- Repository: `Thunderkill016/moneyflow`.
- Provider access before merge: research/read only.
- Forbidden without later explicit owner action: direct main, provider config writes, destructive production deletion, branch/ruleset changes.
- Human approval required before: feature merge and provider/production mutation.
- Stop condition: unexplained flaky/retry, identity-continuity ambiguity, or unexpected financial/schema/provider change.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| current cleanup list preserved | branch Edge source | pass |
| AMR policy matches current product support | official docs + unit policy | pass candidate |
| expired vs stale authentication separated | source/browser contracts | pass candidate |
| exact-head full gates | CI #2057 successor | pending |
| provider-backed password/Google | post-merge production | pending |

### Research and adoption evidence

- Current Supabase documentation supports verified AMR method/timestamp evidence and distinguishes `iat`, `aal` and `amr`.
- The MoneyFlow allowlist is deliberately narrower than the provider vocabulary.
- No external code or new dependency was adopted.

### Review findings

- Correctness: initial refresh exposed and fixed the expired-session dead-end before acceptance.
- Security/ownership: Edge remains destructive authority and bearer identity remains target authority.
- UI/UX/accessibility: existing Auth/Delete owners are reused; no redesign introduced.
- Maintainability: one shared route/cookie owner and one pure AMR policy owner.
- Scope: recent-auth only.

### Remaining limitations

- PR #324 is candidate until owner-approved merge.
- Provider-backed production step-up is not yet evidenced.
- The current CI attempt found only packet trailing whitespace so far; exact-head rerun is required after this documentation fix.

## Delivery record

- Branch: `agent/public-beta-trust-phase-1-recent-auth`
- PR: #324
- Squash commit: pending
- CI run: pending exact-head rerun
- Production deployment: pending owner merge
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: no
