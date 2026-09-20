# MoneyFlow capability layer

The capability layer is the typed, viewer-scoped read seam over existing server workspace loaders and pure financial calculators. Each capability has a stable dotted identifier, versioned Zod input/output schemas, no side effects, deterministic ordering, and a `basis` describing the rows and exclusions behind financial amounts.

The generated manifest at `docs/agents/capabilities.json` is the machine-readable catalog for future UI, API and MCP transports. It is not hand-edited. Run `npm run capabilities:emit` after changing a capability definition, then `npm run check:capabilities` to verify that the committed manifest is current.

To add a capability:

1. Add its schemas, metadata and injectable `run(ctx, input, deps)` function under `src/server/capabilities/`.
2. Reuse existing `src/server` loaders and `src/lib` calculators; do not add a parallel data-access or mutation path.
3. Register the definition in `src/server/capabilities/manifest.ts`.
4. Add deterministic tests and golden JSON under `src/server/capabilities/__golden__/`.
5. Regenerate and check the manifest before handoff.
