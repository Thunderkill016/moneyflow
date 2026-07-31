import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SHARE_FILE_BYTES,
  MAX_SHARE_REQUEST_BYTES,
  declaredShareRequestTooLarge,
  isMultipartFormData,
  isSupportedSharedTextFile,
  limitShareRequestBody,
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
  assert.equal(
    declaredShareRequestTooLarge(String(MAX_SHARE_REQUEST_BYTES)),
    false,
  );
  assert.equal(
    declaredShareRequestTooLarge(String(MAX_SHARE_REQUEST_BYTES + 1)),
    true,
  );
});

test("share target accepts only bounded multipart requests", () => {
  assert.equal(
    isMultipartFormData("multipart/form-data; boundary=abc123"),
    true,
  );
  assert.equal(isMultipartFormData("multipart/form-data"), false);
  assert.equal(isMultipartFormData("application/x-www-form-urlencoded"), false);
  assert.equal(isMultipartFormData(null), false);
});

test("share target reads only bounded text-like files", () => {
  assert.equal(
    isSupportedSharedTextFile({
      name: "statement.csv",
      type: "text/csv",
      size: 10,
    }),
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
    isSupportedSharedTextFile({
      name: "payload.exe",
      type: "text/plain",
      size: 10,
    }),
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
    isSupportedSharedTextFile({
      name: "statement.csv",
      type: "text/csv",
      size: 0,
    }),
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

test("share target streams a chunked request only within its byte cap", async () => {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4, 5]));
      controller.close();
    },
  });
  const limited = limitShareRequestBody(source, 5);
  const reader = limited.stream.getReader();
  const received: number[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    received.push(...value);
  }

  assert.deepEqual(received, [1, 2, 3, 4, 5]);
  assert.equal(limited.wasTooLarge(), false);
});

test("share target aborts a chunked request as soon as the cap is crossed", async () => {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.enqueue(new Uint8Array([4, 5, 6]));
      controller.close();
    },
  });
  const limited = limitShareRequestBody(source, 5);
  const reader = limited.stream.getReader();

  await assert.rejects(async () => {
    while (!(await reader.read()).done) {
      // Consume until the transform rejects the over-limit chunk.
    }
  }, /share_request_too_large/);
  assert.equal(limited.wasTooLarge(), true);
});
