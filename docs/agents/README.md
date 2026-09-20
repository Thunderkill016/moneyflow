# MoneyFlow capability layer

The capability layer is the typed, viewer-scoped read seam over existing server workspace loaders and pure financial calculators. Each capability has a stable dotted identifier, versioned Zod input/output schemas, no side effects, deterministic ordering, and a `basis` describing the rows and exclusions behind financial amounts.

The generated manifest at `docs/agents/capabilities.json` is the machine-readable catalog for future UI, API and MCP transports. It is generated with `npm run capabilities:emit`, must not be edited manually, and is CI-checked with `npm run check:capabilities`.

Money amounts in capability outputs are `Minor`-branded safe-integer đồng (`src/lib/minor.ts`): construction validates `Number.isSafeInteger` and the emitted JSON Schema declares integer ±2^53-1 bounds, so a float, unsafe or mixed-unit value can never satisfy the contract.

The v0 ledger summary populates `trust` through `src/server/ledger-trust.ts`, the standalone loader over the database `ledger_trust_summary()` contract. It is `null` for demo viewers and withheld (logged, never fabricated) when the contract is unavailable.

## HTTP transport

`POST /api/capabilities/[id]` executes a capability for the authenticated viewer. Authentication is the same seam as the UI: `Authorization: Bearer <supabase access token>` or a session cookie resolves through `getViewer()`, and all loaders keep running under that identity's RLS — there is no service-role or second data path. Responses are `no-store`; failures are `400 invalid_input`/`invalid_json`, `401` + `WWW-Authenticate: Bearer` (including demo viewers, which are never an authenticated identity), `404` unknown capability, `429` + `Retry-After` per-viewer limited, `500` otherwise. The request body is the capability's Zod-validated input object (`{}` is valid where every field is optional).

`POST /api/mcp` serves the same registry as a Model Context Protocol endpoint (Streamable HTTP, stateless — `sessionIdGenerator: undefined`, JSON responses). Each capability is registered as one tool named with underscores (`ledger.summary` → `ledger_summary`), so the tool catalog is always the registry. `GET/POST/DELETE` are all exported per the transport spec; `Origin` is validated against the request host (DNS-rebinding guard, 403); unauthenticated calls get `401` + `WWW-Authenticate` pointing at `/.well-known/oauth-protected-resource` (RFC 9728), which advertises Supabase Auth (`<project>.supabase.co/auth/v1`) as the authorization server.

Interactive clients (Claude Desktop, other MCP agents) authenticate end-to-end through Supabase's OAuth 2.1 server: the client calls the project's `oauth/authorize` endpoint, Supabase validates the request and sends the browser to `/oauth/consent`, the app's consent screen. `/oauth/consent` requires a signed-in non-demo viewer (unauthenticated users go through `/login?next=…` and return), shows the client name, requested scopes and destination host, and only on an explicit Approve/Deny does the server action call `supabase.auth.oauth.approveAuthorization`/`denyAuthorization` — Supabase mints the authorization code; the app never does. Issued access tokens are standard Supabase JWTs (with `client_id`), so both `/api/capabilities` and `/api/mcp` serve them through the same Bearer seam under the same RLS. OAuth clients are registered manually in the Supabase dashboard (`Authentication → OAuth Server → Clients`); dynamic registration is disabled. Local `supabase/config.toml` mirrors this via `[auth.oauth_server]`.

To add a capability:

1. Add its schemas, metadata and injectable `run(ctx, input, deps)` function under `src/server/capabilities/`.
2. Reuse existing `src/server` loaders and `src/lib` calculators; do not add a parallel data-access or mutation path.
3. Register the definition in `src/server/capabilities/manifest.ts`.
4. Add deterministic tests and golden JSON under `src/server/capabilities/__golden__/`.
5. Regenerate and check the manifest before handoff.
