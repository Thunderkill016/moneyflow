# MoneyFlow capability layer

The capability layer is the typed, viewer-scoped read seam over existing server workspace loaders and pure financial calculators. Each capability has a stable dotted identifier, versioned Zod input/output schemas, no side effects, deterministic ordering, and a `basis` describing the rows and exclusions behind financial amounts.

The generated manifest at `docs/agents/capabilities.json` is the machine-readable catalog for future UI, API and MCP transports. It is generated with `npm run capabilities:emit`, must not be edited manually, and is CI-checked with `npm run check:capabilities`.

Money amounts in capability outputs are `Minor`-branded safe-integer đồng (`src/lib/minor.ts`): construction validates `Number.isSafeInteger` and the emitted JSON Schema declares integer ±2^53-1 bounds, so a float, unsafe or mixed-unit value can never satisfy the contract.

The v0 ledger summary populates `trust` through `src/server/ledger-trust.ts`, the standalone loader over the database `ledger_trust_summary()` contract. It is `null` for demo viewers and withheld (logged, never fabricated) when the contract is unavailable.

## HTTP transport

`POST /api/capabilities/[id]` executes a capability for the authenticated viewer. Authentication is the same seam as the UI: `Authorization: Bearer <supabase access token>` or a session cookie resolves through `getViewer()`, and all loaders keep running under that identity's RLS — there is no service-role or second data path. Responses are `no-store`; failures are `400 invalid_input`/`invalid_json`, `401` + `WWW-Authenticate: Bearer` (including demo viewers, which are never an authenticated identity), `404` unknown capability, `429` + `Retry-After` per-viewer limited, `500` otherwise. The request body is the capability's Zod-validated input object (`{}` is valid where every field is optional).

To add a capability:

1. Add its schemas, metadata and injectable `run(ctx, input, deps)` function under `src/server/capabilities/`.
2. Reuse existing `src/server` loaders and `src/lib` calculators; do not add a parallel data-access or mutation path.
3. Register the definition in `src/server/capabilities/manifest.ts`.
4. Add deterministic tests and golden JSON under `src/server/capabilities/__golden__/`.
5. Regenerate and check the manifest before handoff.
