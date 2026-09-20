import assert from "node:assert/strict";
import test from "node:test";

import { bearerToken } from "./bearer.ts";

test("bearerToken extracts a well-formed credential", () => {
  assert.equal(bearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(bearerToken("bearer token123"), "token123");
  assert.equal(bearerToken("  Bearer   spaced-token  "), "spaced-token");
});

test("bearerToken rejects absent, wrong-scheme and malformed headers", () => {
  assert.equal(bearerToken(null), null);
  assert.equal(bearerToken(""), null);
  assert.equal(bearerToken("Basic dXNlcjpwYXNz"), null);
  assert.equal(bearerToken("Bearer"), null);
  assert.equal(bearerToken("Bearer "), null);
  assert.equal(bearerToken("Bearer one two"), null);
  assert.equal(bearerToken("Bearerless token"), null);
});
