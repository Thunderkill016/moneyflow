import assert from "node:assert/strict";
import test from "node:test";
import { routeErrorCode } from "./route-error-code.ts";

test("routeErrorCode uses short digest prefix when present", () => {
  assert.equal(routeErrorCode({ digest: "abcdef0123456789" }), "mf_abcdef01");
});

test("routeErrorCode falls back without exposing message", () => {
  assert.equal(routeErrorCode({}), "mf_500");
});
