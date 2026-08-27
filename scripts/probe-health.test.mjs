import assert from "node:assert/strict";
import test from "node:test";

import { evaluateHealthProbe } from "./probe-health.mjs";

const healthy = {
  status: 200,
  headers: { "cache-control": "no-store" },
  body: JSON.stringify({
    status: "ok",
    build: "4c33cb4",
    commit: "4c33cb4d874878bc8463088d363ffee0d48c672e",
  }),
};

test("a healthy deployment passes and reports its build", () => {
  const result = evaluateHealthProbe(healthy);
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.equal(result.build, "4c33cb4");
});

test("a non-200 response is unhealthy", () => {
  const result = evaluateHealthProbe({ ...healthy, status: 503 });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("HTTP 200")));
});

test("a cacheable response is unhealthy even when the body says ok", () => {
  /*
   * The failure this guards is silent: a cached 200 keeps answering "ok" from
   * whenever it was stored, so an outage would read as healthy for as long as the
   * entry lives. The body alone can never establish freshness.
   */
  const result = evaluateHealthProbe({
    ...healthy,
    headers: { "cache-control": "public, max-age=300" },
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("no-store")));
});

test("a missing cache-control header is unhealthy", () => {
  const result = evaluateHealthProbe({ ...healthy, headers: {} });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("(absent)")));
});

test("a body that is not JSON is unhealthy", () => {
  const result = evaluateHealthProbe({ ...healthy, body: "<!doctype html>" });
  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, ["body is not JSON"]);
});

test("a status other than ok is unhealthy", () => {
  const result = evaluateHealthProbe({
    ...healthy,
    body: JSON.stringify({ status: "degraded", build: "4c33cb4" }),
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes('status must be "ok"')));
});

test('a "dev" build id is reported: the deployment cannot be traced to a commit', () => {
  const result = evaluateHealthProbe({
    ...healthy,
    body: JSON.stringify({ status: "ok", build: "dev", commit: null }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.build, "dev");
  assert.ok(result.failures.some((line) => line.includes("built without a commit")));
});

test("a build id that is not a commit prefix is reported", () => {
  const result = evaluateHealthProbe({
    ...healthy,
    body: JSON.stringify({ status: "ok", build: "v1.2.3" }),
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("commit prefix")));
});

test("every failure is collected, not just the first", () => {
  const result = evaluateHealthProbe({
    status: 500,
    headers: {},
    body: JSON.stringify({ status: "down" }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.failures.length, 4);
});
