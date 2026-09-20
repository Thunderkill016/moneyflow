import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { describeCapabilities, capabilities, runCapability } from "./registry.ts";
import { FIXED_CONTEXT, fixtureDeps } from "./capability-test-helpers.test.ts";

test("registry ids are unique, sorted and read-only", () => {
  const ids = capabilities.map((capability) => capability.id);
  assert.deepEqual(ids, [...ids].sort());
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(
    capabilities.every((capability) =>
      ["read", "write:proposal", "write:commit"].includes(capability.authorization),
    ),
  );
  const propose = capabilities.find((capability) => capability.id === "candidates.propose");
  assert.equal(propose?.authorization, "write:proposal");
});

test("registry manifest matches the generated capability document", async () => {
  const manifest = describeCapabilities();
  const golden = JSON.parse(
    await readFile(new URL("../../../docs/agents/capabilities.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(manifest, golden);
});

test("registry maps invalid input and output-schema failures to capability errors", async () => {
  await assert.rejects(
    () => runCapability("ledger.summary", { period: "quarter" }, { context: FIXED_CONTEXT, deps: fixtureDeps() }),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "invalid_input",
  );
  await assert.rejects(
    () =>
      runCapability("ledger.summary", { period: "month" }, {
        context: FIXED_CONTEXT,
        deps: {
          loadFinanceWorkspace: async () => ({
            transactions: [],
            accounts: [],
            categories: [],
            totalBalance: Number.NaN,
            today: FIXED_CONTEXT.today,
            dataError: null,
          }),
        },
      }),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "internal",
  );
});
