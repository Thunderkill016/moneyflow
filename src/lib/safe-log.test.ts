import assert from "node:assert/strict";
import test from "node:test";
import {
  looksLikeFinancialRaw,
  logClientError,
  redactForLog,
  safeUserNotice,
  serializeErrorForLog,
} from "./safe-log.ts";

test("looksLikeFinancialRaw: short UI copy is safe", () => {
  assert.equal(looksLikeFinancialRaw("Đã đưa 3 mục vào Inbox"), false);
  assert.equal(looksLikeFinancialRaw("Không phân tích được CSV."), false);
});

test("looksLikeFinancialRaw: multi-line statement is unsafe", () => {
  const statement = [
    "Date,Description,Amount",
    "2026-01-01,HIGHLANDS,45000",
    "2026-01-02,GRAB FOOD,89000",
    "2026-01-03,TRANSFER,1200000",
  ].join("\n");
  assert.equal(looksLikeFinancialRaw(statement), true);
});

test("looksLikeFinancialRaw: long blob is unsafe", () => {
  assert.equal(looksLikeFinancialRaw("x".repeat(300)), true);
});

test("redactForLog strips raw_snippet and long text", () => {
  const redacted = redactForLog({
    count: 2,
    raw_snippet: "HIGHLANDS COFFEE Q1 45.000đ | 2026-01-01",
    ok: true,
  }) as Record<string, unknown>;
  assert.equal(redacted.count, 2);
  assert.equal(redacted.ok, true);
  assert.equal(redacted.raw_snippet, "[redacted]");
});

test("serializeErrorForLog omits stack and redacts raw messages", () => {
  const err = new Error(
    [
      "parse failed on:",
      "01/01 cafe 45k",
      "02/01 grab 89k",
      "03/01 transfer 1.200.000",
    ].join("\n"),
  );
  (err as Error & { digest?: string }).digest = "abc123digest";
  const summary = serializeErrorForLog(err);
  assert.equal(summary.name, "Error");
  assert.equal(summary.message, "redacted_error_message");
  assert.equal(summary.digest, "abc123digest");
  assert.equal(summary.stack, false);
  assert.equal("stack" in summary && summary.stack === false, true);
});

test("safeUserNotice blocks raw toast copy", () => {
  const raw = [
    "Date,Amount",
    "2026-01-01,45000",
    "2026-01-02,89000",
  ].join("\n");
  const notice = safeUserNotice(raw);
  assert.equal(notice.includes("45000"), false);
  assert.match(notice, /không hiển thị|Đã xử lý/i);
  assert.equal(
    safeUserNotice("Đã đưa 2 mục vào Inbox — chưa ghi sổ."),
    "Đã đưa 2 mục vào Inbox — chưa ghi sổ.",
  );
});

test("logClientError does not throw", () => {
  // Smoke: gated console sink; must not rethrow.
  logClientError("test", new Error("ok short message"));
  logClientError("test", {
    rawSnippet: "should not matter",
    text: "a\nb\nc\nd",
  });
});
