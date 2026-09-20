# MoneyFlow capability layer

The capability layer is the typed, viewer-scoped read seam over existing server workspace loaders and pure financial calculators. Each capability has a stable dotted identifier, versioned Zod input/output schemas, no side effects, deterministic ordering, and a `basis` describing the rows and exclusions behind financial amounts.

The generated manifest at `docs/agents/capabilities.json` is the machine-readable catalog for future UI, API and MCP transports. It is generated with `npm run capabilities:emit`, must not be edited manually, and is CI-checked with `npm run check:capabilities`.

The v0 ledger summary populates `trust` through `src/server/ledger-trust.ts`, the standalone loader over the database `ledger_trust_summary()` contract. It is `null` for demo viewers and withheld (logged, never fabricated) when the contract is unavailable.

To add a capability:

1. Add its schemas, metadata and injectable `run(ctx, input, deps)` function under `src/server/capabilities/`.
2. Reuse existing `src/server` loaders and `src/lib` calculators; do not add a parallel data-access or mutation path.
3. Register the definition in `src/server/capabilities/manifest.ts`.
4. Add deterministic tests and golden JSON under `src/server/capabilities/__golden__/`.
5. Regenerate and check the manifest before handoff.
