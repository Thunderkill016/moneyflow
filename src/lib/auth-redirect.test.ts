import assert from "node:assert/strict";
import test from "node:test";
import { POST_AUTH_REDIRECT, safeNextPath } from "./auth-redirect.ts";

test("POST_AUTH_REDIRECT is insights (Tổng quan thu chi)", () => {
  assert.equal(POST_AUTH_REDIRECT, "/insights");
  assert.ok(!POST_AUTH_REDIRECT.startsWith("/inbox"));
});

test("safeNextPath defaults to POST_AUTH_REDIRECT", () => {
  assert.equal(safeNextPath(null), POST_AUTH_REDIRECT);
  assert.equal(safeNextPath(undefined), POST_AUTH_REDIRECT);
  assert.equal(safeNextPath(""), POST_AUTH_REDIRECT);
  assert.equal(safeNextPath(null), "/insights");
});

test("safeNextPath allows same-origin relative paths", () => {
  assert.equal(safeNextPath("/transactions"), "/transactions");
  assert.equal(safeNextPath("/accounts?tab=1"), "/accounts?tab=1");
  assert.equal(safeNextPath("/onboarding"), "/onboarding");
  assert.equal(safeNextPath("/insights"), "/insights");
});

test("safeNextPath rejects open redirects", () => {
  assert.equal(safeNextPath("//evil.example"), POST_AUTH_REDIRECT);
  assert.equal(safeNextPath("https://evil.example"), POST_AUTH_REDIRECT);
  assert.equal(safeNextPath("javascript:alert(1)"), POST_AUTH_REDIRECT);
});

test("R2: safeNextPath never lands new session on /inbox", () => {
  assert.equal(safeNextPath("/inbox"), POST_AUTH_REDIRECT);
  assert.equal(safeNextPath("/inbox/"), POST_AUTH_REDIRECT);
  assert.equal(safeNextPath("/inbox?x=1"), POST_AUTH_REDIRECT);
  assert.equal(safeNextPath("/inbox/foo"), POST_AUTH_REDIRECT);
});
