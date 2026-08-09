# MoneyFlow Trust Phase 1 — Secure: recent authentication for permanent deletion

**Status:** active
**Execution state:** evaluating
**Risk class:** 3
**Workstream:** moneyflow-trust-secure
**Packet role:** supporting
**Active role:** evaluator
**Permission scope:** branch_write + provider_read
**Owner:** Thunderkill016
**Issue/PR:** #324, replacing stale PR #316
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent packet:** `docs/plans/active/public-beta-trust.md`
**Current execution packet:** `docs/plans/active/moneyflow-trust-secure-acceptance.md`
**Provider prerequisite:** `docs/plans/active/moneyflow-trust-provider-sync.md`
**Merged PR:** #324
**Merge commit:** `fd984a18201f1663d3d8c622d51c41dfd650c816`
**Current main audited:** `cfbff67171421d5f2ee70460b5e81edc59e8a6b1`
**Next.js production deployment:** `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` (`READY`)
**Supabase production Edge:** `delete-account` **v6 ACTIVE**, `verify_jwt=true`

## Outcome

MoneyFlow's irreversible authenticated-account deletion now has the current recent-auth source deployed at both relevant runtime boundaries: the Next.js reauthentication/callback flow and the Supabase `delete-account` destructive authority.

The production Edge bundle now contains the ten-minute `password|oauth` AMR evaluator and current tenant cleanup inventory. Phase 1 is nevertheless **not accepted yet**: production-safe password and supported OAuth/Google step-up/continuity behavior must still be exercised without deleting a real account.

This packet now serves as supporting implementation/provider evidence for the Secure workstream. It is not a generic-`Go` target; current execution authority is in `moneyflow-trust-secure-acceptance.md`.

## Repository reconnaissance

### Current behavior

Repository/current-main truth:

- #324 is merged.
- `supabase/functions/delete-account/index.ts` imports `evaluateAccountDeletionRecentAuth`.
- the Edge source verifies user identity and JWT claims before destructive authority;
- only current interactive AMR methods `password` and `oauth` can satisfy the ten-minute deletion recency window;
- token refresh, missing/unsupported AMR, future timestamps and stale AMR cannot grant deletion authority;
- tenant cleanup inventory includes provenance, rules, reconciliation and financial mutation audit ownership;
- tenant purge completes and zero-row inspection passes before Auth identity deletion;
- password step-up preserves same-account identity;
- Google/OAuth uses fresh provider authentication plus expected-user continuity;
- missing OAuth continuity fails closed and account mismatch recovers through ordinary login;
- fully expired sessions use ordinary login; valid-but-stale sessions use same-account step-up;
- typed `XÓA` does not cross an authentication boundary.

Live provider truth after the 2026-08-09 owner-approved Edge rollout:

- Vercel Next.js deployment for the merged implementation remains `READY`;
- production Supabase database/schema/ACL prerequisites are aligned for the current deletion inventory;
- production `delete-account` is **v6 ACTIVE** with `verify_jwt=true`;
- provider bundle SHA-256: `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`;
- provider read-back includes `delete-account/index.ts` and `_shared/account-deletion-recent-auth.ts`;
- read-back source includes recent-auth evaluation before `purge_user_tenant_data` and the current tenant cleanup inventory;
- no destructive real-user deletion or production financial-row mutation was used as deployment evidence;
- immediate Edge log query returned no runtime events, so it is not authenticated-flow acceptance evidence.

### Existing tests and constraints

- Deletion target is bearer-token identity; no client-provided user ID is accepted.
- Tenant purge remains before Auth identity deletion.
- CAPTCHA remains part of the existing login flow when configured.
- Expected-user continuity is a guard, not deletion authority.
- Exact-head CI/database/browser/cross-device/CodeQL/secret-history evidence was required before #324 merged.
- Provider behavior requires independent provider evidence.
- Destructive production deletion is not required for acceptance.

### Open questions

- [x] Use access-token `iat` as recent-auth proof? No.
- [x] Use verified Supabase `amr` method/timestamp? Yes.
- [x] Which AMR methods authorize deletion now? Only `password` and `oauth`.
- [x] Valid session but stale AMR? Same-account step-up.
- [x] Session expired completely? Ordinary login, then restart deletion confirmation.
- [x] Is current Supabase destructive authority deployed? Yes: v6 ACTIVE, `verify_jwt=true`.
- [ ] Does a production-safe password step-up produce the expected recent AMR and same-account identity behavior?
- [ ] Does a production-safe Google/OAuth step-up preserve expected-user continuity?
- [ ] Do stale/missing-continuity recovery paths fail closed in provider-backed authenticated flows?

## Research

### Research decision

Use verified JWT `amr` timestamps and a narrow `password`/`oauth` allowlist. Reject missing, malformed, unsupported, future or older-than-ten-minutes evidence before admin deletion authority is created. Keep AAL and token issuance separate from recency.

Current Supabase Edge documentation confirms that Edge Functions deploy independently to the Supabase project and authenticated user functions should retain JWT verification. The 2026 Supabase breaking-change changelog was reviewed before the v6 rollout; no hosted Edge breaking change required altering this contract.

### Adoption review

Not applicable. No dependency, provider, service or framework was added.

## Specification

### Problem

The original vulnerability boundary was a valid-but-old session reaching irreversible deletion without proving recent identity. #324 fixed this in source, and the current source is now live in Supabase Edge v6. What remains is behavioral acceptance against real provider-backed password/OAuth authentication and continuity semantics.

### User stories

- As a stale-session user, I authenticate again before permanent deletion.
- As a password user, the same account must supply the fresh password session.
- As a Google user, the same account must return from fresh provider authentication.
- As an expired-session user, I log in normally and restart destructive confirmation under the newly authenticated account.
- As the owner, source deployment evidence and authenticated provider behavior remain distinct claims.

### Acceptance criteria

Repository/deployment criteria:

- [x] P1-AC1: recent-auth rejection occurs before `purge_user_tenant_data` in current-main source.
- [x] P1-AC2: only `password` and `oauth` satisfy current deletion recency.
- [x] P1-AC3: token refresh cannot extend deletion authority.
- [x] P1-AC4: bearer-token identity remains the deletion target.
- [x] P1-AC5: password step-up checks current email and resulting user ID.
- [x] P1-AC6: Google uses fresh provider authentication plus expected-user callback continuity.
- [x] P1-AC7: reauth mode requires both `reauth=1` and sanitized deletion `next`.
- [x] P1-AC8: `XÓA` is cleared across ordinary login and same-account step-up.
- [x] P1-AC9: expired session routes to ordinary login, not impossible continuity step-up.
- [x] P1-AC10: current cleanup source includes provenance/rules/reconciliation/audit ownership.
- [x] P1-AC11: #324 exact-head CI/database/browser/cross-device/CodeQL/secret-history gates were clean.
- [x] P1-AC12: owner merge completed as `fd984a...`.
- [x] P1-AC13: Next.js production deployment is `READY`.
- [x] P1-AC14: required production database/schema/ACL prerequisites are aligned.
- [x] P1-AC15: production `delete-account` v6 is deployed/read back with `verify_jwt=true`, recent-auth helper/evaluator and current tenant inventory.

Provider-behavior criteria:

- [ ] P1-AC16: production-safe authenticated password step-up evidence is recorded without destructive deletion.
- [ ] P1-AC17: production-safe authenticated Google/OAuth step-up and expected-user continuity evidence is recorded without destructive deletion.
- [ ] P1-AC18: stale/missing-continuity recovery paths are provider-evidenced fail-closed.
- [ ] P1-AC19: relevant Edge/Auth/API/Postgres logs show no new acceptance-blocking error cluster.

P1 may be marked accepted only after P1-AC16–19 are evidenced or explicitly recorded as owner-accepted limitations without fabricating pass evidence.

### Financial and security constraints

- No financial formula is changed by #324.
- No token/password/provider secret or private claim set is persisted in product data or memory.
- Expected-user cookie is short-lived, HttpOnly and callback-scoped; it is a continuity guard, not deletion authority.
- Ten minutes is explicit MoneyFlow policy, not a universal external standard.
- Production acceptance must not delete a real account merely to prove step-up behavior.
- Keep `verify_jwt=true` on the destructive Edge Function.

### Out of scope

- Global MFA policy.
- New login provider.
- Phase 2 backup/restore implementation.
- UI redesign.
- Destructive production-account test.

## Implementation plan

### Architecture fit

Supabase Auth remains identity authority; existing login/callback routes own step-up; the Supabase Edge Function remains destructive authority. The current production v6 function evaluates verified AMR before tenant purge.

### Implemented/deployed state

| Area | Change | State |
|---|---|---|
| AMR helper | ten-minute password/oauth-only policy | merged + provider read-back |
| Edge deletion source | verified claims + recent-auth gate before purge | merged + production v6 ACTIVE |
| Auth actions/callback | same-account password/Google step-up | merged; Next.js side live |
| OAuth callback | explicit reauth marker; missing continuity/mismatch fail closed | merged; Next.js side live |
| login/AuthForm/proxy | exact deletion reauth mode | merged; Next.js side live |
| delete page | expired login vs stale step-up; clear confirmation | merged; Next.js side live |
| provider DB/ACL | current tenant inventory prerequisites | production aligned |

### Next acceptance sequence

1. exercise password reauthentication on a production-safe same account without submitting a destructive deletion;
2. exercise supported OAuth/Google step-up with expected-user continuity;
3. exercise/observe stale or missing-continuity recovery without destructive deletion;
4. inspect Edge/Auth/API/Postgres logs around those exact flows;
5. reconcile provider packet, parent and current memory;
6. mark/archive P1 accepted only if evidence supports it;
7. unlock P2 Recover.

### Risks and counterexamples

| Risk | Control |
|---|---|
| v6 ACTIVE mistaken for behavior acceptance | require provider-backed authenticated flow evidence |
| password account switch | current email + resulting user ID checks |
| Google account switch | expected-user callback guard |
| missing continuity cookie | explicit reauth callback marker + fail closed |
| mismatch dead-end | ordinary-login recovery |
| expired-session dead-end | separate ordinary-login path |
| destructive smoke accidentally deletes user | never submit confirmed deletion for acceptance proof |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P1-T1 | reconcile #316/current source/auth semantics | compare + research | complete |
| P1-T2 | implement bounded Auth/UI/Edge/tests | #324 | complete |
| P1-T3 | exact-head Class 3 gates | CI #2070 + CodeQL/Secret #1173 + browser/cross-device | complete |
| P1-T4 | owner merge | #324 → `fd984a...` | complete |
| P1-T5 | exact Vercel Next.js deployment | `dpl_8Eak...` READY | complete |
| P1-T6 | provider DB/schema/ACL prerequisite | Provider Sync #325–#329 | complete |
| P1-T7 | deploy/read back current Supabase `delete-account` | v6 ACTIVE + source bundle | complete |
| P1-T8 | authenticated production password acceptance | provider evidence | todo |
| P1-T9 | authenticated Google/OAuth continuity acceptance | provider evidence | todo |
| P1-T10 | post-flow logs + final P1 archive/reconciliation | provider evidence | blocked by P1-T8/T9 |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next action |
|---|---|---|---|---|---|---|
| 2026-08-08 | human owner | CI/production | `merged` | #324 merged | provider truth | reconcile providers |
| 2026-08-09 | provider evaluator | human owner | `evaluating` | DB/ACL aligned; live Edge v5 | Edge write | owner decision |
| 2026-08-09 | human owner | provider evaluator | `evaluating` | explicit `Gô`; Edge v6 ACTIVE/read-back | authenticated acceptance | run safe password/Google flows |

### Current permission boundary

- Repository implementation and current Edge deployment are complete.
- Current provider scope returns to `provider_read` after the consumed Edge approval.
- Forbidden without new explicit approval: destructive production deletion, provider secret/config writes, production financial-data mutation and Phase 2 implementation.

## Evaluation

### Exact-head merge evidence

Final #324 source head `8add8663d118e5f85717af101480354403cef2f1` passed CI #2070, CodeQL/Secret #1173, database/browser/cross-device gates; clean Browser rerun was 100/100 with 0 retry/flaky.

### Production/provider evidence

- Vercel `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is READY for the merged Next.js implementation.
- Supabase database/schema/ACL prerequisites are production-aligned.
- Pre-rollout Edge was v5 ACTIVE, `verify_jwt=true`, without recent-auth/current inventory.
- Owner separately approved Edge deployment with `Gô`.
- Post-rollout `delete-account` is **v6 ACTIVE**, `verify_jwt=true`, bundle SHA-256 `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`.
- Provider read-back contains the current entrypoint and shared recent-auth helper.
- Immediate Edge logs contained no runtime events; this does not prove authenticated behavior.

Therefore **P1 is deployed at source/runtime level but not yet accepted**.

### Remaining limitations

- Live authenticated production password step-up has not yet been exercised.
- Live Google-provider step-up/identity continuity has not yet been exercised.
- Stale/missing-continuity provider behavior has not yet been captured.
- No destructive real-user production deletion is required or claimed.
