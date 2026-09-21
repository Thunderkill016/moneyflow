import assert from "node:assert/strict";
import test from "node:test";

import { runCapability } from "./registry.ts";
import { emitInvocationLog, type InvocationRecord } from "./invocation-log.ts";
import { FIXED_CONTEXT, fixtureDeps } from "./capability-test-helpers.test.ts";

function collector() {
  const records: InvocationRecord[] = [];
  return {
    records,
    onInvocation: (record: InvocationRecord) => {
      records.push(record);
    },
  };
}

test("runCapability emits exactly one invocation record on success", async () => {
  const { records, onInvocation } = collector();
  await runCapability("ledger.summary", { period: "month" }, {
    context: FIXED_CONTEXT,
    deps: fixtureDeps(),
    transport: "api",
    onInvocation,
  });

  assert.equal(records.length, 1);
  const record = records[0]!;
  assert.equal(record.event, "capability_invocation");
  assert.equal(record.capabilityId, "ledger.summary");
  assert.equal(record.version, "1");
  assert.equal(record.viewerId, FIXED_CONTEXT.viewerId);
  assert.equal(record.clientId, null);
  assert.equal(record.transport, "api");
  assert.equal(record.authorization, "read");
  assert.equal(record.status, "ok");
  assert.equal(record.errorCode, undefined);
  assert.equal(typeof record.durationMs, "number");
  assert.ok(record.durationMs >= 0);
});

test("runCapability emits one record on error with the capability error code", async () => {
  const { records, onInvocation } = collector();
  await assert.rejects(
    () =>
      runCapability("ledger.summary", { period: "quarter" }, {
        context: FIXED_CONTEXT,
        deps: fixtureDeps(),
        transport: "mcp",
        onInvocation,
      }),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "invalid_input",
  );

  assert.equal(records.length, 1);
  const record = records[0]!;
  assert.equal(record.status, "error");
  assert.equal(record.errorCode, "invalid_input");
  assert.equal(record.transport, "mcp");
});

test("runCapability emits a record for unknown capabilities too", async () => {
  const { records, onInvocation } = collector();
  await assert.rejects(
    () =>
      runCapability("nope.missing", {}, {
        context: FIXED_CONTEXT,
        transport: "api",
        onInvocation,
      }),
  );

  assert.equal(records.length, 1);
  assert.equal(records[0]!.capabilityId, "nope.missing");
  assert.equal(records[0]!.status, "error");
  assert.equal(records[0]!.errorCode, "not_found");
  assert.equal(records[0]!.authorization, null);
});

test("invocation records never carry input arguments", async () => {
  const { records, onInvocation } = collector();
  const marker = "ZZZ-SECRET-MARKER";
  await runCapability(
    "transactions.search",
    { text: marker },
    {
      context: FIXED_CONTEXT,
      deps: fixtureDeps(),
      transport: "api",
      onInvocation,
    },
  );

  assert.equal(records.length, 1);
  assert.ok(!JSON.stringify(records[0]).includes(marker));
});

test("emitInvocationLog writes a single JSON line", async (t) => {
  const lines: string[] = [];
  t.mock.method(console, "info", (line: string) => {
    lines.push(line);
  });

  emitInvocationLog({
    event: "capability_invocation",
    capabilityId: "ledger.summary",
    version: "1",
    viewerId: "viewer-1",
    clientId: null,
    transport: "api",
    authorization: "read",
    status: "ok",
    durationMs: 3,
  });

  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
  assert.equal(parsed.event, "capability_invocation");
  assert.equal(parsed.capabilityId, "ledger.summary");
});
