import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DEFAULT_NOTIFICATION_PATH,
  safeNotificationPath,
} from "./push-client.ts";

const ORIGIN = "https://mfvn.vercel.app";

test("safeNotificationPath preserves normalized same-origin paths", () => {
  assert.equal(
    safeNotificationPath("/commitments?tab=due#today", ORIGIN),
    "/commitments?tab=due#today",
  );
  assert.equal(safeNotificationPath("/settings/notifications", ORIGIN), "/settings/notifications");
});

test("safeNotificationPath blocks cross-origin and backslash normalization", () => {
  assert.equal(new URL("/\\evil.example", ORIGIN).origin, "https://evil.example");
  assert.equal(safeNotificationPath("/\\evil.example", ORIGIN), DEFAULT_NOTIFICATION_PATH);
  assert.equal(safeNotificationPath("/%5cevil.example", ORIGIN), DEFAULT_NOTIFICATION_PATH);
  assert.equal(safeNotificationPath("/%2f%2fevil.example", ORIGIN), DEFAULT_NOTIFICATION_PATH);
  assert.equal(safeNotificationPath("//evil.example", ORIGIN), DEFAULT_NOTIFICATION_PATH);
  assert.equal(safeNotificationPath("https://evil.example/path", ORIGIN), DEFAULT_NOTIFICATION_PATH);
});

test("safeNotificationPath rejects malformed and control-character URLs", () => {
  assert.equal(safeNotificationPath("/%E0%A4%A", ORIGIN), DEFAULT_NOTIFICATION_PATH);
  assert.equal(safeNotificationPath("/\tevil.example", ORIGIN), DEFAULT_NOTIFICATION_PATH);
  assert.equal(safeNotificationPath("javascript:alert(1)", ORIGIN), DEFAULT_NOTIFICATION_PATH);
  assert.equal(safeNotificationPath(null, ORIGIN), DEFAULT_NOTIFICATION_PATH);
});

test("both notification delivery paths use the sanitized URL", () => {
  const source = readFileSync("src/lib/push-client.ts", "utf8");
  assert.match(source, /const safeUrl = safeNotificationPath\(payload\.url, window\.location\.origin\)/);
  assert.match(source, /data:\s*\{\s*url:\s*safeUrl\s*\}/);
  assert.match(source, /window\.location\.assign\(safeUrl\)/);
  assert.doesNotMatch(source, /window\.location\.assign\(payload\.url\)/);
});
