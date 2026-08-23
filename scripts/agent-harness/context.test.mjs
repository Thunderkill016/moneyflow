import assert from "node:assert/strict";
import test from "node:test";

import { HarnessCapabilityError, HarnessContext } from "./context.mjs";

test("registers and resolves named capability providers", async () => {
  const ctx = new HarnessContext();
  const provider = { id: "codex" };
  ctx.provide("agent", "codex", provider);

  assert.equal(ctx.resolve("agent", "codex"), provider);
  assert.deepEqual(ctx.list("agent"), ["codex"]);

  await ctx.dispose();
  assert.throws(
    () => ctx.resolve("agent", "codex"),
    (error) => error instanceof HarnessCapabilityError && error.code === "PROVIDER_UNAVAILABLE",
  );
});

test("provider conflicts fail loudly instead of shadowing", async () => {
  const ctx = new HarnessContext();
  ctx.provide("agent", "codex", { id: 1 });
  assert.throws(
    () => ctx.provide("agent", "codex", { id: 2 }),
    (error) => error instanceof HarnessCapabilityError && error.code === "PROVIDER_CONFLICT",
  );
  await ctx.dispose();
});

test("missing providers fail loudly", async () => {
  const ctx = new HarnessContext();
  assert.throws(
    () => ctx.resolve("agent", "missing"),
    (error) => error instanceof HarnessCapabilityError && error.code === "PROVIDER_UNAVAILABLE",
  );
  await ctx.dispose();
});

test("a failing plugin rolls back registrations from its mount attempt", async () => {
  const ctx = new HarnessContext();
  await assert.rejects(
    ctx.use(async (pluginContext) => {
      pluginContext.provide("agent", "temporary", { id: "temporary" });
      throw new Error("plugin failed");
    }),
    /plugin failed/u,
  );
  assert.deepEqual(ctx.list("agent"), []);
  await ctx.dispose();
});

test("owned effects dispose in reverse registration order", async () => {
  const ctx = new HarnessContext();
  const order = [];
  ctx.effect(() => order.push("first"));
  ctx.effect(() => order.push("second"));
  await ctx.dispose();
  assert.deepEqual(order, ["second", "first"]);
});
