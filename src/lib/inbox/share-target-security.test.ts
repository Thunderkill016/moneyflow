import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SHARE_FILE_BYTES,
  MAX_SHARE_REQUEST_BYTES,
  declaredShareRequestTooLarge,
  isSupportedSharedTextFile,
  nextSharePayloadSize,
  parseDeclaredContentLength,
} from "./share-target-security.ts";

test("share target parses only safe integer Content-Length values", () => {
  assert.equal(parseDeclaredContentLength(null), null);
  assert.equal(parseDeclaredContentLength(""), null);
  assert.equal(parseDeclaredContentLength("12.5"), null);
  assert.equal(parseDeclaredContentLength("-1"), null);
  assert.equal(parseDeclaredContentLength("not-a-number"), null);
  assert.equal(parseDeclaredContentLength(" 42 "), 42);
});

test("share target rejects declared requests above the total cap", () => {
  assert.equal(declaredShareRequestTooLarge(String(MAX_SHARE_REQUEST_BYTES)), false);
  assert.equal(
    declaredShareRequestTooLarge(String(MAX_SHARE_REQUEST_BYTES + 1)),
    true,
  );
});

test("share target reads only bounded text-like files", () => {
  assert.equal(
    isSupportedSharedTextFile({ name: "statement.csv", type: "text/csv", size: 10 }),
    true,
  );
  assert.equal(
    isSupportedSharedTextFile({
      name: "statement.csv",
      type: "application/octet-stream",
      size: 10,
    }),
    true,
  );
  assert.equal(
    isSupportedSharedTextFile({ name: "notes.txt", type: "", size: 10 }),
    true,
  );
  assert.equal(
    isSupportedSharedTextFile({ name: "payload.exe", type: "text/plain", size: 10 }),
    true,
    "trusted text MIME may use an unusual filename",
  );
  assert.equal(
    isSupportedSharedTextFile({
      name: "payload.bin",
      type: "application/octet-stream",
      size: 10,
    }),
    false,
  );
  assert.equal(
    isSupportedSharedTextFile({ name: "statement.csv", type: "text/csv", size: 0 }),
    false,
  );
  assert.equal(
    isSupportedSharedTextFile({
      name: "statement.csv",
      type: "text/csv",
      size: MAX_SHARE_FILE_BYTES + 1,
    }),
    false,
  );
});

test("share target rejects cumulative overflow and unsafe arithmetic", () => {
  assert.deepEqual(nextSharePayloadSize(0, 10), {
    totalBytes: 10,
    tooLarge: false,
  });
  assert.equal(
    nextSharePayloadSize(MAX_SHARE_REQUEST_BYTES - 1, 1).tooLarge,
    false,
  );
  assert.equal(
    nextSharePayloadSize(MAX_SHARE_REQUEST_BYTES, 1).tooLarge,
    true,
  );
  assert.equal(nextSharePayloadSize(-1, 1).tooLarge, true);
  assert.equal(nextSharePayloadSize(Number.MAX_SAFE_INTEGER, 1).tooLarge, true);
});
