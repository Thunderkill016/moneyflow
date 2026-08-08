# MoneyFlow Trust Phase 1 — Secure: recent authentication for permanent deletion

**Status:** merged
**Execution state:** merged
**Active role:** planner
**Permission scope:** provider_read
**Owner:** Thunderkill016
**Issue/PR:** #324, replacing stale PR #316
**Last updated:** 2026-08-08

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

**Parent packet:** `docs/plans/active/public-beta-trust.md`  
**Provider prerequisite:** `docs/plans/active/moneyflow-trust-provider-sync.md`  
**Merged PR:** #324  
**Merge commit:** `fd984a18201f1663d3d8c622d51c41dfd650c816`  
**Next.js production deployment:** `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` (`READY`)

Phase 1 implementation is merged, but it is **not deployed end-to-end**. Read-only Supabase inspection after the merge found that production `delete-account` remains Edge Function version 5 and does not contain the current-main recent-auth gate. Production database migration history is also behind several merged MoneyFlow schema migrations required by the current tenant inventory. The task therefore moved backward from the initially inferred `deployed` state to truthful `merged` state under the operating model.

No production DDL, Edge deployment, provider configuration change, destructive deletion or production-data mutation was performed during this correction.

## Outcome

Current-main code requires verified recent interactive authentication before permanent authenticated-account deletion. A stale-but-valid session uses same-account step-up; a fully expired session uses ordinary login and then restarts destructive confirmation. The repository implementation is accepted at merge level, but provider deployment remains blocked by MoneyFlow Trust Provider Sync.

## Repository reconnaissance

### Current behavior

Repository/current-main truth:

- #324 is merged on `main`.
- current `supabase/functions/delete-account/index.ts` imports `evaluateAccountDeletionRecentAuth`;
- current function verifies claims and rejects stale/unsupported AMR before tenant purge;
- current supported recency methods are `password` and `oauth`;
- current tenant inventory includes provenance, rules, reconciliation and financial mutation audit ownership;
- password/Google step-up preserves same-account continuity;
- missing OAuth continuity fails closed and mismatch recovers through ordinary login;
- expired session uses ordinary login; valid-but-stale session uses same-account step-up;
- `XÓA` does not cross an authentication boundary.

Live production-provider truth:

- Vercel Next.js deployment for `fd984a...` is `READY`;
- public/ordinary-login routing for the deletion return path is live;
- Supabase production project `fwpldsdkpzhswpuctbke` is `ACTIVE_HEALTHY`;
- production `delete-account` is still **version 5** with `verify_jwt=true`;
- deployed v5 source verifies `getUser()` then goes to tenant purge and has **no recent-auth claim gate**;
- deployed v5 tenant inventory predates provenance/rules/reconciliation/audit ownership;
- production migration history/catalog is behind current-main database contracts.

Therefore Vercel `READY` is only partial deployment evidence for P1.

### Existing tests and constraints

- Deletion target remains the bearer-token user; no client user ID is accepted.
- Tenant purge remains before Auth identity deletion.
- CAPTCHA remains part of the existing login flow when configured.
- `XÓA` never crosses an authentication boundary.
- Exact-head CI, database, browser/cross-device, CodeQL and secret-history evidence were required before merge.
- Supabase database/function behavior requires independent provider evidence.
- Provider writes require explicit owner approval and rollback scope.

### Similar implementation and recent history

- PR #309 recorded recent-auth as a remaining deletion hardening boundary.
- PR #316 was the first verified candidate on an older baseline and is now closed superseded.
- PR #324 is the current merged implementation.
- PR #321/#322 completed and archived UI migration; this phase does not reopen it.
- Provider Sync was opened after live Supabase inspection disproved the initial Vercel-only deployment assumption.

### Open questions

- [x] Use access-token `iat` as recent-auth proof? No.
- [x] Use verified Supabase `amr` method/timestamp? Yes.
- [x] Which AMR methods authorize deletion now? Only `password` and `oauth`.
- [x] Valid session but stale AMR? Same-account step-up.
- [x] Session expired completely? Ordinary login, then restart deletion confirmation.
- [x] Merge current implementation? Yes, #324 merged.
- [x] Is the Vercel Next.js side live? Yes.
- [x] Is the Supabase destructive authority current? **No.** Production function v5 lacks recent-auth.
- [ ] Complete and owner-approve provider schema/function alignment.
- [ ] Deploy/read back current `delete-account` only after schema prerequisites are aligned.
- [ ] Exercise production-safe authenticated password step-up without destructive deletion.
- [ ] Exercise production-safe authenticated Google step-up/identity continuity without destructive deletion.

## Research

### Research decision

Use verified JWT `amr` timestamps and a narrow `password`/`oauth` allowlist. Reject missing, malformed, unsupported, future or older-than-ten-minutes evidence before admin deletion authority is created. Keep AAL and token issuance separate from recency.

Official Supabase deployment guidance also confirms that Edge Functions require an explicit Supabase deployment and database migrations have their own remote migration history. A Vercel deployment does not perform either operation.

### Adoption review

Not applicable. No dependency, provider, service or framework was added.

## Specification

### Problem

A valid but old authenticated session previously could reach irreversible deletion after typed confirmation without proving recent identity. #324 fixes that in the repository, but production Supabase still runs the older destructive authority. Secure is not complete until provider runtime matches the merged contract.

### User stories

- As a stale-session user, I authenticate again before permanent deletion.
- As a password user, the same account must supply the fresh password session.
- As a Google user, the same account must return from fresh provider authentication.
- As an expired-session user, I log in normally and restart destructive confirmation under the newly authenticated account.
- As the owner, repository merge, Vercel deployment, Supabase schema and Edge Function state are not conflated.

### Acceptance criteria

Repository/merge criteria:

- [x] P1-AC1: recent-auth rejection occurs before `purge_user_tenant_data` in current-main source.
- [x] P1-AC2: only `password` and `oauth` satisfy current deletion recency.
- [x] P1-AC3: token refresh cannot extend deletion authority.
- [x] P1-AC4: bearer-token identity remains the deletion target.
- [x] P1-AC5: password step-up checks current email and resulting user ID.
- [x] P1-AC6: Google uses `max_age=0` plus expected-user callback continuity.
- [x] P1-AC7: reauth mode requires both `reauth=1` and sanitized deletion `next`.
- [x] P1-AC8: `XÓA` is cleared across ordinary login and same-account step-up.
- [x] P1-AC9: expired session routes to ordinary login, not impossible continuity step-up.
- [x] P1-AC10: current cleanup source includes provenance/rules/reconciliation/audit ownership.
- [x] P1-AC11: exact-head CI/database/browser/cross-device/CodeQL/secret-history gates are clean; final Browser rerun was first-pass clean.
- [x] P1-AC12: owner merge completed as `fd984a...`.

Provider/deployment criteria:

- [x] P1-AC13: exact Next.js merge commit is Vercel `READY` and ordinary unauthenticated deletion/login routing is live.
- [ ] P1-AC14: required production database schema is aligned so the current deletion tenant inventory is valid.
- [ ] P1-AC15: production `delete-account` is deployed from current main and read back with the recent-auth gate present.
- [ ] P1-AC16: production-safe authenticated password step-up evidence is recorded without destructive deletion.
- [ ] P1-AC17: production-safe authenticated Google step-up/identity-continuity evidence is recorded without destructive deletion.

P1 may advance `merged → deployed → accepted` only after these provider criteria are evidenced. Repository tests cannot substitute for them.

### Financial and security constraints

- No financial formula is changed by #324.
- No token/password/provider secret or private claim set is persisted in product data or logs.
- Expected-user cookie is short-lived, HttpOnly and callback-scoped; it is a continuity guard, not deletion authority.
- Ten minutes is explicit MoneyFlow policy, not a universal external standard.
- Production acceptance must not delete a real account merely to prove step-up behavior.
- Do not deploy current Edge tenant inventory before required production tables exist.

### Out of scope

- Global MFA policy.
- New login provider.
- Phase 2 backup/restore implementation.
- UI redesign.
- Destructive production account test.

## Implementation plan

### Architecture fit

Supabase Auth remains identity authority; existing login/callback routes own step-up; the delete-account Edge Function remains destructive authority. The current merged function evaluates verified AMR before tenant purge. Provider Sync is now an explicit prerequisite to make that architecture true in production.

### Implemented repository changes

| Area | Change | State |
|---|---|---|
| AMR helper | ten-minute password/oauth-only policy | merged |
| Edge deletion source | verified claims + recent-auth gate before purge | merged, not yet production-deployed |
| Auth actions/callback | same-account password/Google step-up | merged; Next.js side live |
| OAuth callback | explicit reauth marker; missing continuity/mismatch fail closed to ordinary login | merged; Next.js side live |
| login/AuthForm/proxy | exact deletion reauth mode | merged; Next.js side live |
| delete page | expired login vs stale step-up; clear confirmation | merged; Next.js side live |
| provider DB/Edge | align current schema, then deploy current function | blocked pending explicit provider-write approval |

### Data and migration impact

- #324 itself introduced no new migration.
- Provider Sync has discovered previously merged migrations that are absent from production; they require separate rollout review/approval.
- Rollback/forward-fix must be migration-specific; do not manually mark migrations applied to fake alignment.

### Risks and counterexamples

| Risk | Control |
|---|---|
| Vercel READY mistaken for Supabase deployment | separate provider evidence and lifecycle states |
| stale Edge has no recent-auth | do not call P1 deployed until current source is read back from Supabase |
| current Edge references tables absent in production | database alignment must precede Edge deployment |
| password account switch | current email + resulting user ID checks |
| Google account switch | expected-user callback guard |
| missing continuity cookie | explicit reauth callback marker + fail closed |
| mismatch dead-end | ordinary-login recovery |
| expired-session dead-end | separate ordinary-login path |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P1-T1 | reconcile #316/current main/current Supabase auth semantics | compare + research | complete |
| P1-T2 | port bounded Auth/UI/tests | #324 diff | complete |
| P1-T3 | patch current Edge source and narrow AMR policy | source + unit contract | complete |
| P1-T4 | fix expired-session and OAuth continuity/recovery findings | source/browser contracts | complete |
| P1-T5 | exact-head Class 3 gates | CI #2070 + CodeQL/Secret #1173 + clean Browser rerun/cross-device | complete |
| P1-T6 | owner merge | #324 → `fd984a...` | complete |
| P1-T7 | exact Vercel Next.js deployment + ordinary-login production boundary | `dpl_8Eak...` READY + route smoke | complete |
| P1-T8 | provider DB/schema alignment prerequisite | `moneyflow-trust-provider-sync.md` | blocked pending provider-sync planning + owner write approval |
| P1-T9 | deploy/read-back current Supabase `delete-account` | function version/source evidence | blocked by P1-T8 + owner write approval |
| P1-T10 | authenticated production password + Google step-up acceptance | provider evidence | blocked by P1-T9 |
| P1-T11 | final P1 archive + parent acceptance reconciliation | accepted P1 evidence | blocked by P1-T10 |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next action |
|---|---|---|---|---|---|---|
| 2026-08-08 | owner | planner | planned | MoneyFlow Trust approval + #323 | #316 stale | reconcile |
| 2026-08-08 | implementer | evaluator | evaluating | #324 source + fixes | protected exact-head gates | evaluate |
| 2026-08-08 | evaluator | human_owner | ready_for_review | exact-head CI #2070, CodeQL/Secret #1173, clean Browser rerun, clean cross-device | owner merge | owner decides |
| 2026-08-08 | human_owner | CI/production | merged | #324 merged as `fd984a...` | provider deployment truth | verify each provider separately |
| 2026-08-08 | CI/production | planner | merged | Vercel READY, then live Supabase Edge v5 + migration/catalog inspection | Supabase drift blocks deployment/acceptance | complete Provider Sync plan; no provider writes without explicit owner approval |

### Current permission boundary

- Repository implementation is merged.
- Current provider scope: `provider_read` only.
- Forbidden without later explicit owner approval: production DDL, migration application/repair, Edge Function deployment, provider configuration writes, production-data mutation, destructive production deletion.
- Human approval required before any provider write.
- Stop condition: any ambiguity in migration order/state, identity continuity, provider state or rollback strategy.

## Evaluation

### Exact-head merge evidence

Final source head `8add8663d118e5f85717af101480354403cef2f1`:

- CI #2070 / run `31253706324`: success.
- CodeQL #1173 / run `31253706317`: success.
- Secret history #1173 / run `31253706318`: success.
- Policy/static quality/production build/unit + static RLS/fresh Supabase reset + pgTAP: success.
- Cross-device audit: 427 pass + 127 intentional skips, 0 failed/0 flaky.
- First Browser job shell was green but raw evidence contained one unrelated retry-pass; it was rejected.
- Browser rerun on the same exact head: 100/100 passed, 0 retry/flaky, artifact `9020908708`, digest `sha256:d94f7080a1788c430458c342ed52016f2a10008eccfc7d981e850046721ccf81`.
- Aggregate `e2e`: success.

### Production/provider evidence

- Vercel `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is READY for `fd984a...`.
- public and ordinary-login return-path smoke passed.
- explicit one-hour Vercel runtime-error inspection found no errors.
- Supabase `delete-account` production version 5 is ACTIVE but lacks the current recent-auth gate.
- production migration/catalog state is behind current main; see Provider Sync packet.

Therefore **P1 is merged, not deployed**.

### Remaining limitations

- Production Supabase database/function alignment is incomplete.
- Live authenticated production password step-up has not been exercised.
- Live Google-provider step-up/identity continuity has not been exercised.
- No destructive real-user production deletion is required or claimed.

## Delivery record

- PR: #324 — merged.
- Merge commit: `fd984a18201f1663d3d8c622d51c41dfd650c816`.
- Exact-head CI: #2070 success; CodeQL/Secret #1173 success.
- Vercel Next.js deployment: `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` READY.
- Supabase Edge deployment: **not current; production remains v5**.
- Provider Sync: active prerequisite packet.
- Work packet moved to `docs/plans/completed/`: **no**; remain active until P1 is provider-deployed and accepted.
