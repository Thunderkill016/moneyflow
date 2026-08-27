import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClientErrorReport,
  MAX_FIELD_CHARS,
  MAX_REPORT_BYTES,
  reportTooLarge,
  sanitizeIncomingReport,
} from "./client-error-report.ts";

/*
 * A client error report is the first thing this product sends anywhere about
 * what a user was doing. In a finance app that makes it the highest-risk string
 * in the codebase: it is written to logs, and logs are retained far longer than
 * a browser console.
 */

const STATEMENT =
  "TK 0011004567890|GD: -250,000VND luc 14-08-2026 09:12|SD: 3,450,000VND|ND: THANH TOAN GRAB";

test("a statement in an error message is redacted, not shortened", () => {
  const report = buildClientErrorReport("capture", new Error(STATEMENT), "/capture/paste");

  assert.ok(!report.message.includes("0011004567890"), "account number must not survive");
  assert.ok(!report.message.includes("250,000"), "an amount must not survive");
  assert.equal(report.message, "[redacted]");
});

test("the route is a pathname, never a query string", () => {
  /*
   * This product puts category names, account names and date windows in query
   * strings, so a full URL would carry the user's own data into a log.
   */
  const report = buildClientErrorReport(
    "reports",
    new Error("boom"),
    "/transactions?category=Ăn uống&account=MB Bank&from=2026-08-01",
  );

  assert.equal(report.route, "/transactions");
  assert.ok(!report.route?.includes("Ăn uống"));
  assert.ok(!report.route?.includes("MB Bank"));
});

test("an ordinary error still carries enough to act on", () => {
  // Redaction is worthless if it redacts everything: the report must remain useful.
  const error = Object.assign(new TypeError("Cannot read properties of undefined"), {
    digest: "1234567890",
  });
  const report = buildClientErrorReport("dashboard", error, "/dashboard");

  assert.equal(report.name, "TypeError");
  assert.match(report.message, /Cannot read properties/u);
  assert.equal(report.digest, "1234567890");
  assert.equal(report.context, "dashboard");
});

test("a non-Error value does not crash the reporter", () => {
  const report = buildClientErrorReport("x", { weird: true }, "/");
  assert.equal(report.name, "NonError");
});

/*
 * The server half. The client sanitises before sending and the server does not
 * trust that, because the route is public: anything at all can be posted to it,
 * and whatever is posted lands in retained logs.
 */

test("the server re-sanitises rather than trusting the client", () => {
  const hostile = {
    context: "capture",
    name: "Error",
    message: STATEMENT,
    note: STATEMENT,
    route: "/transactions?category=Ăn uống",
  };

  const report = sanitizeIncomingReport(hostile);
  assert.ok(report);
  assert.equal(report!.message, "[redacted]");
  assert.equal(report!.route, "/transactions");
  assert.ok(!JSON.stringify(report).includes("0011004567890"));
});

test("a long blob is replaced, not merely truncated", () => {
  /*
   * My first expectation here was a truncation to MAX_FIELD_CHARS. The real
   * behaviour is safer: `looksLikeFinancialRaw` treats anything over 240
   * characters as unsafe to write down and replaces it outright, so a 5,000
   * character field cannot arrive as a 300 character excerpt of someone's
   * statement.
   */
  const long = "a".repeat(5_000);
  const report = sanitizeIncomingReport({ context: long, name: long, message: long });

  assert.ok(report);
  assert.equal(report!.context, "[redacted]");
  assert.equal(report!.message, "[redacted]");
  assert.ok(report!.name.length < MAX_FIELD_CHARS);
});

test("junk is dropped instead of logged", () => {
  for (const junk of [null, undefined, "string", 42, [], {}, { context: "x" }]) {
    assert.equal(sanitizeIncomingReport(junk), null, `${JSON.stringify(junk)} must be dropped`);
  }
});

test("an oversized body is refused before it is parsed", () => {
  assert.equal(reportTooLarge(String(MAX_REPORT_BYTES + 1)), true);
  assert.equal(reportTooLarge(String(MAX_REPORT_BYTES)), false);
  // A missing header is not proof of size, so it is allowed through to the
  // length check on the body itself rather than refused outright.
  assert.equal(reportTooLarge(null), false);
});
