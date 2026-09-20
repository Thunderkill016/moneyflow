# P2 — authenticated capability transports (Bearer API + MCP)

**Status:** specified
**Execution state:** specified
**Active role:** human_owner
**Permission scope:** branch_write (packet/spec only — implementation needs explicit owner go-ahead)
**Owner:** repository owner
**Issue/PR:** [#608](https://github.com/Thunderkill016/moneyflow/issues/608); program follow-up named in PR #605; builds on merged #605 (v0), #606 (ledger trust), #607 (Minor)
**Last updated:** 2026-09-20

Follow `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`. Class 3 — new authentication/security surface on the ledger's read path.

## Outcome

A third-party client — script, integration, or AI agent — can read MoneyFlow financial truth through the existing capability layer over authenticated HTTP, with the same viewer scope, RLS tenant isolation and explainable `basis` that the UI already gets. No second data path, no duplicated arithmetic, no new source of truth.

## Repository reconnaissance

### Current behavior

- The capability layer (`src/server/capabilities/`) exposes three read capabilities — `ledger.summary`, `transactions.search`, `reports.financial` — through `runCapability(id, rawInput, {context, deps})` in `registry.ts`. Only in-process callers exist (tests + future UI).
- Authentication is **cookie-only**: `createClient()` in `src/lib/supabase/server.ts` builds an `@supabase/ssr` client from `cookies()`; `getViewer()` calls `supabase.auth.getClaims()` on it; `requireViewer()` **redirects to `/login`** on failure (`src/server/auth.ts:37`) — UI semantics unusable by an API.
- `createCapabilityContext()` (`context.ts`) calls `requireViewer()` — same redirect problem.
- API surface today is three public routes (`api/health`, `api/client-error`, `api/share-target`). No authenticated JSON API exists.
- `src/lib/rate-limit.ts` provides a process-local sliding-window limiter (`createRateLimiter`, `clientKeyFromHeaders`) already used for import actions; its own doc notes the edge-middleware plan for a shared limiter.
- PR #603 added throttling + HSTS for public POST routes; issue #174 tracks provider controls before public beta.
- Money is `Minor`-branded safe-integer đồng at the capability boundary; manifest `docs/agents/capabilities.json` is generated and CI-checked.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/server/capabilities/` | The contract being transported — registry, Zod I/O, `basis`, manifest | Reuse as-is; transports must not re-derive arithmetic |
| `src/server/auth.ts` + `src/lib/supabase/server.ts` | The single auth seam (cookie today) | Extend to Bearer with care — see decision D1 |
| `src/lib/rate-limit.ts` | Existing soft limiter pattern from #603 | Reuse per-viewer keying for API calls |
| `src/app/api/` | Route-handler conventions (`runtime`, `dynamic`, `cache-control`) | Follow `health/route.ts` no-store pattern |
| `docs/agents/capabilities.json` | Machine-readable catalog — MCP tools should be generated from it | Single source; never hand-write tool definitions |
| `supabase/config.toml` | OAuth server enablement lives here (P2c) | New `[auth.oauth_server]` block |

### Existing tests and constraints

- `npm test` covers 16 capability tests + goldens; `check:capabilities` guards manifest drift.
- `test:ci-policy` (191 tests) guards required-check contracts; new routes may extend CI classification.
- Financial invariants: integer VND, transfers never income/expense, viewer-scoped loaders, no service-role reads of user rows.

### Similar implementation and recent history

- `requireViewer()`→`redirect` pattern is designed for RSC; `client-error/route.ts` shows a JSON route with its own validation/error style.
- Capability `deps` injection already proves loader substitution works — the Bearer path needs the *production* loaders bound to a token-scoped identity, not new loaders.

### Open questions

- [x] Does Supabase support acting as an OAuth 2.1 provider? — Yes, beta (see Research).
- [ ] Owner decisions D1–D6 below.
- [ ] Whether honoring `Authorization: Bearer` inside `createClient()` for non-API requests is acceptable, or Bearer must be API-route-scoped only (D1 sub-decision).

## Research

### Research scope and source selection

- Decision question: which credential model and transport shape expose the capability layer over HTTP without weakening RLS tenant isolation or spec compliance?
- Reference map consulted: not required — primary protocol and provider documentation own this behavior.
- Source budget: four focused sources.
- Expected decision or uncertainty to resolve: Supabase OAuth capability, MCP auth requirements, stateless transport viability on Vercel, token-scoped client mechanics.

### Questions researched

1. What does the current MCP spec require for HTTP authorization? (OAuth 2.1 resource server, RFC 9728, `WWW-Authenticate`)
2. What does Streamable HTTP require of the endpoint? (single POST path, Origin validation, stateless allowed)
3. Can Supabase issue OAuth 2.1 tokens for third-party/agent clients, and do they preserve RLS?
4. What is the minimal correct mounting of an MCP endpoint inside Next.js App Router on serverless?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| [MCP spec — Authorization (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) | Protocol spec, primary | 2026-09-20 | Authorization OPTIONAL but when implemented over HTTP: server is an OAuth 2.1 **resource server**; RFC 9728 Protected Resource Metadata MUST; `WWW-Authenticate` on 401 MUST; Client ID Metadata Documents SHOULD; DCR now MAY | A newer 2026-07-28 revision exists with the same core requirements; conformance target should be pinned at implementation time |
| [MCP spec — Streamable HTTP (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) | Protocol spec, primary | 2026-09-20 | Single endpoint path supporting POST; `Origin` header validation MUST (DNS rebinding → 403); `Accept: application/json + text/event-stream`; notifications → 202; stateless operation supported | Revision behavior changed vs 2025-03-26; pin SDK/spec version at implementation |
| [Supabase — OAuth 2.1 Server](https://supabase.com/docs/guides/auth/oauth-server) + [token security](https://supabase.com/docs/guides/auth/oauth-server/token-security) | Provider docs, primary | 2026-09-20 | Supabase Auth can act as an OAuth 2.1/OIDC provider (beta, all plans): auth-code+PKCE, refresh tokens, discovery+JWKS endpoints; **access tokens are standard Supabase JWTs → RLS applies unchanged**; `client_id` claim enables per-client RLS/app checks; requires enablement, consent UI at configured path, client registration. OAuth `scopes` are identity scopes (openid/email/profile) — they do NOT gate data access | Beta feature; requires owner opt-in in project settings; consent UI is app-owned work |
| [MCP TypeScript SDK — serving over HTTP](https://ts.sdk.modelcontextprotocol.io/v2/serving/http.html) + [WebStandardStreamableHTTPServerTransport](https://ts.sdk.modelcontextprotocol.io/v2/api/@modelcontextprotocol/server/server/streamableHttp.html) | Official SDK docs, primary | 2026-09-20 | `WebStandardStreamableHTTPServerTransport` speaks `Request`/`Response` — fits App Router handlers directly; `sessionIdGenerator: undefined` gives stateless mode (required on serverless — consecutive requests hit different instances); per-request `McpServer` with caller identity closed over is the correct isolation pattern | SDK v2 API surface; verify exact version + `@supabase/ssr` interplay at implementation |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| **Credential model A — Supabase access token as Bearer** | Zero new infra; token is a Supabase JWT → RLS client works via `global.headers.Authorization`; `getClaims(jwt)` verifies identity | ~1h lifetime; client manages refresh itself; no third-party consent story | **Selected for P2a** — first-party/programmatic v0 |
| Credential model B — minted Personal Access Tokens | Familiar API-key UX; revocable | Requires service-role or custom verification → **bypasses RLS**, re-implements tenant isolation in app code; new table + hashing + UI | Rejected — violates the no-parallel-data-path / RLS law |
| **Credential model C — Supabase OAuth 2.1 server** | Spec-correct third-party flow (PKCE, refresh, consent); still Supabase JWTs → RLS preserved; `client_id` claim enables per-client policy | Beta; needs enablement + consent UI + client registration | **Selected for P2c** — the agent/third-party path |
| Transport A — single dispatch `POST /api/capabilities {id,input}` | Smallest surface; one throttle point | Weak REST semantics; unknown-id handling inside body | Rejected |
| **Transport B — `POST /api/capabilities/[id]`** | Stable dotted id in URL; per-capability throttling/audit; 404 for unknown ids | Slightly more routing code | **Selected** |
| Transport C — MCP only | Fewer routes | Blocks non-agent programmatic use; doesn't answer API need | Rejected — both transports, staged |

### Research decision

Staged transports over one auth seam. **P2a**: Bearer verification of existing Supabase JWTs + `POST /api/capabilities/[id]` dispatch. **P2b**: stateless Streamable HTTP MCP endpoint generating tools from the capability registry, with RFC 9728 metadata. **P2c**: Supabase OAuth 2.1 server enablement + consent UI so third-party/agent clients get proper OAuth instead of manual token copying. Rejected: PATs (RLS bypass), MCP-only (doesn't serve plain API consumers), any service-role read path (tenant isolation law).

### Adoption review

- Observed problem: no machine-readable authenticated transport exists over the capability layer.
- Existing or simpler alternatives considered: PATs rejected (RLS bypass); cookie auth for API rejected (CSRF surface + unusable for non-browser clients).
- License/code-reuse compatibility: `@modelcontextprotocol/sdk` (MIT) official implementation; MIT-compatible.
- Secrets, user-data and privacy exposure: tokens arrive as Bearer headers — never logged, never persisted; MCP tools expose the same viewer-scoped data the UI already serves.
- Runtime, bundle, deployment and operational cost: SDK is server-only, route-scoped; stateless mode avoids Redis/session infra; OAuth server is provider-side config, not code weight.
- Owning boundary and maintenance responsibility: `src/app/api/` owns HTTP semantics; `src/server/capabilities/` owns contract; `src/lib/supabase/` owns client construction; Supabase owns OAuth endpoints.
- Migration and rollback: additive routes only; rollback = delete routes / disable OAuth server flag — no schema or data impact.
- Verification plan: unit tests for Bearer seam + dispatch; contract tests for MCP tool generation and RFC 9728 doc; CI static gates; manual authenticated curl + MCP client smoke before merge claim.
- Removal condition if the expected benefit does not appear: if no consumer adopts the API within the beta window, remove routes; capability layer is unaffected.

## Specification

### Problem

Consumers outside the UI — the owner's scripts, future integrations, AI agents — cannot read MoneyFlow truth without scraping loaders or re-deriving arithmetic. Every capability already exists with typed contracts; only the transport is missing. Doing it wrong (PATs, service role, ad-hoc routes) would break the tenant-isolation law the product is built on.

### User stories

- As the owner, I can call `POST /api/capabilities/ledger.summary` with my Supabase access token and get the identical viewer-scoped output the UI sees, so automation never re-derives money.
- As an AI agent (MCP client), I can discover MoneyFlow tools from the registry manifest and call them under the user's own identity, so answers carry `basis` provenance.
- As a third-party client (P2c), I can complete an OAuth 2.1 + PKCE flow and receive refreshable tokens whose data access is still governed by RLS.
- As any caller without a valid token, I get `401` + `WWW-Authenticate`, never a redirect to `/login` and never demo data.

### Acceptance criteria

- [ ] `POST /api/capabilities/[id]` with a valid Supabase JWT returns the same output as `runCapability` for that viewer; invalid/missing token → `401` with `WWW-Authenticate: Bearer`.
- [ ] Every DB query under a Bearer request runs under the token's RLS identity — verified by a test that a token for user B cannot read user A's data through the route.
- [ ] `POST /api/mcp` (or `/mcp`) serves stateless Streamable HTTP; tools are generated from `capabilityDefinitions` — adding a capability adds a tool with no transport code change.
- [ ] `GET /.well-known/oauth-protected-resource` (nested per RFC 9728) advertises the resource + authorization server; 401s carry `WWW-Authenticate` pointing at it.
- [ ] `Origin` validation rejects cross-origin browser POSTs to the MCP endpoint (403); `OPTIONS`/CORS posture is explicit, not accidental.
- [ ] Per-viewer rate limiting reuses `createRateLimiter`; 429 includes `Retry-After`; process-local limitation documented.
- [ ] Demo mode (`NEXT_PUBLIC_APP_MODE` unset/demo) refuses transport auth — no demo data served as authenticated truth.
- [ ] P2c: OAuth consent page at the configured authorization path lets a signed-in user approve/deny a client; issued tokens carry `client_id` and respect RLS.
- [ ] Golden capability outputs byte-identical; manifest regeneration clean; `npm run verify:fast` + build green.

### Required states

- Loading: n/a (API semantics).
- Empty: capabilities already define empty-ledger outputs; transport passes them through.
- Populated: unchanged — transport is a thin pipe.
- Validation/error: `400` invalid input (capability `invalid_input`), `401` missing/bad token, `403` bad Origin (MCP), `404` unknown capability id, `429` throttled, `500` mapped through `CapabilityError` codes.
- Recovery/undo: delete routes / disable OAuth flag; no data migration.
- Long data / large VND: `Minor` safe-integer contract already enforced at the boundary.
- Mobile/tablet/desktop: n/a for transports; P2c consent page follows existing auth-page conventions.
- Accessibility: consent page follows existing auth UI patterns.

### Financial and security constraints

- No service-role reads of user rows anywhere on this path; the token IS the user's JWT — RLS is the enforcement.
- Demo mode must not mint or accept transport identity.
- Tokens are credentials: never logged, never stored, never echoed in errors; error bodies carry no financial data.
- `transactions.search`/`reports.financial` can expose the full ledger — that is acceptable for the user's own token (same data the UI exports), but OAuth clients get this only through explicit consent (P2c) and can later be narrowed via `client_id`-aware policy.
- Rate-limit keys use viewer id (not IP) post-auth; pre-auth failures keyed by `clientKeyFromHeaders`.

### Out of scope

- Mutations / write capabilities (none exist; not introduced).
- PAT minting, token scopes UI, per-client admin console.
- Multi-currency, new financial fields, or any loader arithmetic change.
- SSE resumability / stateful MCP sessions (stateless only on serverless).
- Changing `requireViewer()` redirect semantics for the UI.
- Webhooks, push, sync — acquisition paths unchanged.

## Implementation plan

### Architecture fit

One new HTTP seam in `src/app/api/` delegates everything to the existing registry; one auth seam extension in `src/lib/supabase/`/`src/server/auth.ts` gives route handlers a token-scoped client and viewer. Loader ownership is untouched — the token-scoped `createClient` result flows through the *same* loader functions, so RLS, `requireViewer` and all arithmetic stay single-sourced.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/supabase/server.ts` (or sibling `bearer.ts`) | Token-scoped client factory: `createClientFromToken(jwt)` → `createClient(url, key, {global:{headers:{Authorization:Bearer jwt}}})` | RLS-correct client without cookies |
| `src/server/auth.ts` | `viewerFromBearer(request)` → `getClaims(jwt)` → `Viewer`; returns `null` (no redirect) | API auth semantics, no UI redirect |
| `src/app/api/capabilities/[id]/route.ts` | POST dispatch: Bearer → viewer → `runCapability`; error mapping per spec | P2a transport |
| `src/app/api/mcp/route.ts` | Stateless `WebStandardStreamableHTTPServerTransport`; per-request `McpServer` with viewer closed over; tools from `capabilityDefinitions` | P2b transport |
| `src/app/.well-known/oauth-protected-resource/route.ts` | RFC 9728 metadata document | MCP auth discovery |
| `src/lib/rate-limit.ts` + route wiring | Per-viewer limiter instance + `Retry-After` | Abuse control, reuses #603 pattern |
| `src/app/oauth/consent/` (P2c) | Consent page wired to Supabase OAuth authorization path | Third-party/agent approval UX |
| `supabase/config.toml` (P2c) | `[auth.oauth_server]` block | Provider enablement |
| Tests: `src/lib/` + `src/server/capabilities/` + route-level contract tests | Bearer seam, dispatch mapping, tenant isolation, MCP tool generation, metadata doc | Class 3 evidence |
| `docs/agents/README.md`, `docs/rate-limit.md`, PR memory | Document transport contract + limiter scope | Knowledge gates |

### Data and migration impact

- Schema/migration: none for P2a/P2b. P2c is provider config + UI — no table changes expected (Supabase owns OAuth internals); confirm at implementation.
- Backfill: none.
- Compatibility: additive routes; UI untouched.
- Rollback: remove routes/config flag; zero data impact.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Bearer token honored outside API routes → page renders as token user vs cookie user confusion | Decide explicitly (D1): either accept uniform semantics or gate the token path behind an explicit opt-in used only by route handlers — test asserts the chosen boundary |
| Service-role / PAT path creeps in later | Packet law + code review; no service-role key usage in route code — assert in contract test that client carries the user JWT |
| Token logged in error paths | Error mapper emits codes only; test asserts no token/PII in response or logs |
| Stateless MCP assumed but SDK defaults to sessions | `sessionIdGenerator: undefined` explicit; contract test asserts no `mcp-session-id` requirement |
| DNS-rebinding via MCP endpoint | `Origin` validation middleware; 403 test |
| Demo mode serves demo data as authenticated | Route rejects when `!isSupabaseConfigured()`; test |
| Process-local limiter gives false sense of protection | Document limitation in `docs/rate-limit.md`; per-viewer keying still stops single-user floods |
| OAuth beta API changes under us | Pin spec/doc revision in implementation notes; feature-flag P2c behind config presence |

### Verification plan

- Static: `verify:fast` (knowledge, architecture, capabilities, lint, typecheck, unit).
- Unit/domain: Bearer seam tests (valid/expired/malformed/missing token; demo rejection), dispatch error mapping, limiter behavior, MCP tool generation from registry, RFC 9728 document shape.
- Database: none — no schema change; tenant isolation proven via loader-level test with two fixtures (B cannot read A).
- Browser flow: none for P2a/P2b (no UI); P2c consent page needs one authenticated browser pass.
- Responsive/visual: n/a (P2c page reuses auth conventions).
- Production/manual: authenticated `curl` against preview deployment + one real MCP client (`mcp` inspector or Claude Desktop) smoke before claiming verified.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | P2a — Bearer seam: token client factory + `viewerFromBearer` + tests | Owner approves packet + D1–D6 | Focused diff, unit tests | todo |
| T2 | P2a — `POST /api/capabilities/[id]` + throttling + error mapping + tests | T1 | Route contract tests | todo |
| T3 | P2b — `/api/mcp` stateless endpoint + tools-from-registry + Origin validation | T1 | Contract tests, manifest-driven tool list | todo |
| T4 | P2b — RFC 9728 protected-resource metadata + `WWW-Authenticate` wiring | T3 | Metadata doc test, 401 header test | todo |
| T5 | P2c — Supabase OAuth server enablement + `/oauth/consent` + client registration docs | Owner enables beta + approves UI | Consent flow screenshot/video, token carries `client_id` | todo |
| T6 | Docs (`agents/README`, `rate-limit.md`), PR memory, exact-head verification | T2/T4 minimum | `verify:fast`, CI, curl + MCP smoke | todo |

Stages land as separate PRs (P2a, P2b, P2c) — each independently reviewable and revertible.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-20 | human_owner | researcher | discovery | Owner directive "làm theo khuyến nghị" after decision-matrix proposal in session | — | Recon + research |
| 2026-09-20 | researcher | planner | specified | This packet; MCP spec, Supabase OAuth docs, SDK docs | OAuth server is beta; exact SDK version at impl time | Owner reviews D1–D6 and approves implementation |

### Current permission boundary

- Granted scope: `branch_write` for this packet/spec only.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`, branch `devin/p2-transports-packet`.
- Forbidden writes: `main`, Supabase project settings, OAuth enablement, any runtime code, secrets.
- Human approval required before: implementation (T1+), enabling OAuth server in the Supabase project, registering OAuth clients.
- Rollback or stop condition: packet can be archived; no code or provider state touched.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Packet exists with recon, research, spec, staged plan | This file | pass |

### Research and adoption evidence

- Selected sources still support the final implementation: pending implementation.
- Important source limitations remain respected: OAuth beta flagged; spec revision pinned at impl.
- New tool/dependency/pattern passed the adoption review, or not applicable: SDK adoption reviewed; dependency not yet added.

### Review findings

Pending owner review.

### Remaining limitations

- Process-local rate limiter (documented; shared edge limiter is a separate pre-existing plan).
- OAuth `scopes` cannot express "read-only ledger" granularly; per-client narrowing relies on `client_id`-aware policy if ever needed.
- Supabase OAuth server is beta — provider behavior may change before GA.

## Delivery record

- Branch: `devin/p2-transports-packet`
- PR: pending
- Squash commit: pending owner action
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending completion

---

## Owner decision points (D1–D6)

Recommended defaults marked ✦. Approving the packet with no comment = accept defaults.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Bearer seam wiring | (a) `createClient()` honors `Authorization` header uniformly ✦ — zero loader changes, single auth seam; (b) explicit opt-in `createClientForRequest(request)` only in API routes — stricter, tiny extra wiring | (a) — a valid Bearer JWT *is* authentication; uniform semantics keep one data path. Document that pages ignore/absent header in practice |
| D2 | API surface shape | `POST /api/capabilities/[id]` ✦ vs single dispatch endpoint | per-id — stable ids in URL, per-capability throttle/audit |
| D3 | Token scope granularity v1 | Any valid user token → all 3 read capabilities ✦ vs per-capability scopes now | v1 simple — it's the user's own data; per-client narrowing deferred to `client_id` policy if third parties need it |
| D4 | MCP session model | Stateless `sessionIdGenerator: undefined` ✦ vs Redis-backed sessions | stateless — Vercel-correct, zero new infra; resumability can come later |
| D5 | Audit/invocation logging | Minimal structured log (viewer, capability, status, ms — no payloads) ✦ vs none | minimal — needed for abuse forensics; no financial data logged |
| D6 | Ship order | P2a → P2b → P2c, separate PRs ✦ vs all-at-once | staged — each revertible; P2c gated on owner enabling the beta |
