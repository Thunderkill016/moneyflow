# Security hardening after production red-team

**Status:** ready_for_review  
**Execution state:** ready_for_review  
**Active role:** human owner  
**Permission scope:** branch_write  
**Owner:** GPT-5.6 Thinking; human owner controls merge, deployment, provider writes, and acceptance  
**Issue/PR:** #173  
**Last updated:** 2026-08-01

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

MoneyFlow rejects oversized and binary abuse at the public Web Share Target, applies a materially stricter browser policy, removes account-enumeration hints, enforces a 12–72 character application password boundary, and continuously proves that one authenticated user cannot read or mutate another user's financial objects through RLS, views, or exposed RPCs.

The implementation is synchronized with current `main` and has passed the complete static, database, and browser matrix. Provider settings remain unchanged and are tracked separately in #174.

## Repository reconnaissance

### Original verified gaps

- `/api/share-target` parsed multipart data before enforcing a total body limit and could decode unsupported binary files as text.
- The previous CSP covered only a small subset of browser capabilities.
- Registration and password update accepted eight-character passwords at the application boundary.
- Registration failures could expose more provider detail than necessary.
- Cross-tenant ownership was verified manually but did not have one repeatable adversarial database suite.
- Dependency security updates depended on manual review.

### Current authorities

| Area | Authority |
|---|---|
| Declared share-body rejection | `src/proxy.ts` |
| Stream, multipart, file, and text limits | `src/lib/inbox/share-target-security.ts` |
| Share Target bridge | `src/app/api/share-target/route.ts` |
| Browser security policy | `src/lib/security-headers.ts` through `next.config.ts` |
| Public Auth mutation boundary | `src/app/(auth)/actions.ts` |
| Password contract | `src/lib/auth-password-policy.ts` |
| Catalog and cross-tenant evidence | `supabase/tests/database/security_catalog.test.sql` and `cross_tenant_rpc.test.sql` |
| Import-provenance ownership evidence | the provenance pgTAP suites already on `main` |
| Provider checklist | `docs/configuration.md` and issue #174 |

### Main synchronization

The branch originally diverged from `main@f5f4376`. It was advanced without force-push through two GitHub-generated merge commits:

1. `501f040f9d9255e055af59b3b3fafb72eae7b7d7`, bringing in the reference-map and operating-contract work;
2. `173f399204e465f2cc154203f4e527faed2c7e68`, bringing in `main@f4240f44c793c2c0ac9e387cc7bb241d1d24075b`, including transaction authorities and atomic Inbox provenance.

A direct `main...agent/security-hardening-red-team` comparison after synchronization contains only the intended 18 security/documentation files. No current-main feature is reintroduced as a PR change.

### Post-sync review finding

The security implementation and tests remained compatible with the provenance model. The only stale artifact found was `docs/security-rls-check.md`, which omitted `transaction_import_provenance` and the provenance-specific ownership suites. That document was reconciled before handoff.

### Constraints

- No financial calculation, transfer behavior, ledger schema, or UI hierarchy change.
- No service-role key in application/browser code.
- No CI workflow permission, branch protection, or `CODEOWNERS` change.
- No provider, production schema, or persistent production-data write.
- Runtime imports under `src/lib/**` remain relative with explicit `.ts` extensions.

## Research

### Decision question

What is the smallest security slice that bounds the public Share Target, strengthens browser and Auth boundaries, and makes tenant isolation repeatable without introducing a new runtime service or pretending repository code configures providers?

### Focused sources

| Source | Authority/type | Date reviewed | What it establishes | Limit |
|---|---|---|---|---|
| Next.js official CSP guidance and security advisories | Primary framework source | 2026-08-01 | Development/production CSP differences; nonce CSP affects rendering and caching; patched-version review | Does not prove MoneyFlow authorization |
| Supabase Auth password, CAPTCHA, rate-limit, advisor, and live catalog evidence | Primary platform source | 2026-08-01 | App validation does not replace provider controls; effective grants and RLS require runtime verification | Provider state is outside repository CI |
| Vercel Firewall/WAF official guidance | Primary deployment source | 2026-08-01 | Edge rate limiting belongs before application compute and supports staged logging/publication | Publishing rules is a provider write |
| Current MoneyFlow migrations and pgTAP suites | Repository authority | 2026-08-01 | Exact tenant/RPC/provenance ownership contracts | Local tests do not prove live provider settings |

### Decisions

- Keep a static CSP for this slice; disclose `'unsafe-inline'` rather than performing an unplanned nonce/dynamic-rendering migration.
- Exclude `'unsafe-eval'` from production and allow it only for development tooling.
- Byte-count chunked request bodies before multipart parsing; a `Content-Length` check alone is insufficient.
- Decode only bounded, known text types/extensions; preserve unsupported file metadata without calling `File.text()`.
- Use Vercel Firewall for future edge rate limiting; reject an in-memory serverless limiter.
- Enforce 12–72 characters in the application while keeping Supabase minimum length, CAPTCHA, rate limits, and leaked-password protection as separate provider work.

### Adoption review

No dependency, provider, service, framework, or architecture layer is added. The implementation uses existing Next.js, Web Streams, Supabase/PostgreSQL, Zod, pgTAP, and GitHub Dependabot capabilities. Rollback is a branch revert; provider rollback is not required because no provider value changed.

## Specification

### User stories

- Another authenticated account cannot read or mutate my financial data even when it knows object UUIDs.
- A public Share Target request cannot make the application buffer an unbounded body or decode arbitrary binary input as text.
- The browser blocks unneeded origins and capabilities while existing MoneyFlow flows still render.
- Public Auth responses do not reveal whether an email is registered.
- Dependency security updates are surfaced continuously.

### Acceptance criteria

- [x] Declared Share Target requests above 12 MiB return 413 before rewrite/parser work.
- [x] Chunked bodies are byte-counted and aborted above the same total limit.
- [x] Reconstructed parser requests remove stale transport headers.
- [x] Each file is capped at 2 MiB; text fields are bounded; unsupported binary files are not decoded.
- [x] Only multipart requests carrying a boundary enter the parser.
- [x] CSP owns default, script, script attributes, connections, forms, frames, objects, workers, media, images, fonts, and manifest sources.
- [x] Production excludes `'unsafe-eval'`; development permits it only for framework tooling.
- [x] Registration/update require 12–72 characters and visible guidance matches.
- [x] Login, registration, and reset responses remain account-enumeration safe.
- [x] Two-user pgTAP attacks cover 25 foreign-object read/mutation paths.
- [x] Catalog tests prove grants, definer execution, `auth.uid()`, pinned search path, and security-invoker views.
- [x] Current import-provenance RLS/RPC suites still pass after branch synchronization.
- [x] Dependabot monitors npm and GitHub Actions weekly.
- [x] Synchronized implementation and documentation pass the complete CI matrix.
- [ ] Human owner reviews and merges the final diff.
- [ ] Exact production deployment receives the post-merge smoke.

### Security and product constraints

- Existing passwords remain valid for login; the stronger rule applies to registration and password update.
- Production simulations use deterministic synthetic data inside one transaction and end with rollback.
- No brute-force, credential-stuffing, destructive, or availability test against production.
- CAPTCHA, provider password minimum, leaked-password protection, and firewall publication are not represented as repository-delivered work.
- Demo mode and all financial behavior remain unchanged.

### Out of scope

- Full nonce or SRI CSP migration.
- CAPTCHA UI/provider enforcement; tracked by #175 and #174.
- Supabase Auth or Vercel Firewall publication.
- Paid leaked-password protection.
- Financial schema, reconciliation, AI, bank sync, or unrelated cleanup.

## Implementation plan

### Application boundaries

| File/area | Change |
|---|---|
| `src/lib/inbox/share-target-security.ts` | Total/per-file/text limits, multipart validation, text allow-list, and byte-counting stream |
| `src/proxy.ts` | Earliest 413 for declared oversized `/capture/share` POSTs |
| `src/app/api/share-target/route.ts` | Bounded stream parsing, transport-header cleanup, 413/415 behavior, and safe file decoding |
| `src/lib/security-headers.ts`, `next.config.ts` | One CSP/header owner with production/development separation |
| Auth action/form/policy files | 12–72 character contract and neutral public responses |

### Continuous evidence

| Area | Change |
|---|---|
| `security_catalog.test.sql` | Effective relation grants, definer execution/configuration, and view security |
| `cross_tenant_rpc.test.sql` | 25 attacks under two forged JWT subjects, all rolled back |
| Provenance suites from `main` | Candidate/account/category isolation, atomicity, idempotency, and balanced transfer resolution |
| `.github/dependabot.yml` | Weekly npm and GitHub Actions monitoring |
| Security/configuration docs | Provider boundaries, current table/RPC model, and verification procedure |

### Data, rollout, and rollback

- Schema/migration/backfill: none.
- Persistent production data: none.
- Provider configuration: none.
- Code rollback: revert the squash commit.
- Deployment rollback: restore the prior Vercel production deployment if post-merge smoke finds a regression.
- Provider work is a later separately approved operation with its own rollback.

### Known limitations

- Production CSP still permits framework inline scripts; it is stronger than the old policy but not a strict nonce CSP.
- Local pgTAP does not exercise the full external JWT gateway.
- Application password validation does not constrain direct Supabase Auth API calls.
- Vercel Firewall and Supabase Auth provider controls remain incomplete until #174 is executed.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Run rollback-safe production red-team | none | 25/25 foreign-object attacks blocked | done |
| T2 | Bound Share Target input | T1 | helper, route, proxy, and unit tests | done |
| T3 | Centralize CSP/security headers | T1 | policy owner and environment tests | done |
| T4 | Harden Auth copy and password boundary | T1 | policy/action/source tests | done |
| T5 | Add catalog and cross-tenant pgTAP | T1 | fresh-reset database runs | done |
| T6 | Add dependency monitoring | none | Dependabot configuration | done |
| T7 | Synchronize current `main` without history rewrite | T1–T6 | merge commits `501f...` and `173f...`; branch is behind by zero | done |
| T8 | Evaluate synchronized diff | T7 | 18-file compare; code review; stale RLS doc corrected | done |
| T9 | Run exact synchronized-head CI | T8 | CI #778 / run `30697958962` passed | done |
| T10 | Human merge and production acceptance | T9 | owner review, exact deployment, affected-flow smoke | blocked on owner |

## Evaluation

### Review findings

- **Scope:** direct compare with current `main` is limited to the intended 18 files.
- **Financial correctness:** no calculation, schema, transfer, or ledger mutation implementation changed.
- **Tenant safety:** original 25-case suite and current provenance suites coexist and pass on the synchronized branch.
- **Share boundary:** declared and chunked bodies are bounded before unbounded parser work; unsupported binary files are never decoded as text.
- **Authentication:** public errors are neutral; provider parity remains explicitly unverified.
- **Browser policy:** external origins and capabilities are materially restricted; inline-script limitation is disclosed.
- **Maintainability:** policy logic is centralized in pure modules with tests; no new service or management layer exists.
- **Documentation:** the RLS guide now includes `transaction_import_provenance` and the current provenance attack suites.

### Verification evidence

CI #778 / run `30697958962` on head `c45694c0b1e66120271aa8ddb686d8b072164aa9` passed:

- project knowledge, deployment, CSS ownership, and architecture contracts;
- lint and typecheck;
- unit tests and static RLS checks;
- production build;
- fresh Supabase reset and every pgTAP suite;
- expense-path browser smoke;
- production cross-device UI audit;
- Playwright evidence upload.

This handoff commit changes only this packet. Its exact-head CI must remain green before merge; the PR body records that final run without another source commit.

### Stop conditions

Stop and move backward if:

- final CI exposes a real application/database/browser regression;
- the PR diff expands beyond the recorded security scope;
- provider publication becomes necessary before merge;
- a fix would weaken RLS, financial invariants, or current import provenance;
- current `main` moves materially again before owner review.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-07-31 | researcher/planner | implementer | implementing | production-safe baseline, sources, specification | implementation unverified | implement focused branch |
| 2026-07-31 | implementer | evaluator/CI | evaluating | security code, tests, PR #173 | original exact-head CI required | run and review CI |
| 2026-07-31 | evaluator | human owner | ready_for_review | CI #677 on old base | base later changed materially | do not merge until synchronized |
| 2026-08-01 | human owner | evaluator | evaluating | instruction to continue next task | branch behind current main | synchronize without force-push |
| 2026-08-01 | evaluator | CI | evaluating | current-main merge, 18-file diff, corrected RLS guide | synchronized CI required | run exact-head matrix |
| 2026-08-01 | evaluator | human owner | ready_for_review | CI #778 complete success and this evidence-only handoff | exact handoff-head CI and production smoke remain | verify final CI; review and decide merge |

### Current permission boundary

- Allowed: read repository/provider metadata and write only `agent/security-hardening-red-team` plus PR #173.
- Forbidden: direct `main` write, merge without owner instruction, force-push, provider mutation, production-data mutation, and unrelated work.
- Human approval is required for merge, deployment acceptance, Supabase Auth changes, CAPTCHA enforcement, and Vercel Firewall publication.

## Rollout

After an owner-approved merge:

1. identify the squash commit and exact Vercel production deployment;
2. verify production CSP/security headers on the canonical origin;
3. run login, registration validation, neutral reset, refresh, logout, and recovery smoke without exposing real account data;
4. exercise a normal multipart Share Target payload;
5. verify oversized declared/chunked and unsupported media requests return the expected bounded responses;
6. inspect Vercel runtime errors;
7. archive this packet only after the affected production flow is accepted.

Provider controls in #174 are deployed separately after the application code is live. CAPTCHA remains disabled until #175 is safely integrated and the client/provider tokens are configured in the correct environments.
