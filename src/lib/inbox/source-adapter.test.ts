import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeSourceExternalId,
  normalizeStrictSourceAmount,
  normalizeStrictSourceDate,
  persistableSourceExternalId,
  SOURCE_EXTERNAL_ID_MAX_LENGTH,
} from "./source-adapter.ts";

test("canonical source identity includes the proven institution namespace", () => {
  const vcb = canonicalizeSourceExternalId({
    value: "txn-123",
    evidence: "confirmed",
    stability: "source-stable",
    scope: { kind: "institution", institutionKey: "vietcombank" },
  });
  const acb = canonicalizeSourceExternalId({
    value: "txn-123",
    evidence: "confirmed",
    stability: "source-stable",
    scope: { kind: "institution", institutionKey: "acb" },
  });

  assert.equal(vcb, "mf-src-v1|institution|vietcombank|txn-123");
  assert.equal(acb, "mf-src-v1|institution|acb|txn-123");
  assert.notEqual(vcb, acb);
});

test("account-scoped source ids cannot alias across accounts", () => {
  const first = canonicalizeSourceExternalId({
    value: "same-id",
    evidence: "confirmed",
    stability: "source-stable",
    scope: {
      kind: "account",
      institutionKey: "example-bank",
      accountKey: "opaque-account-a",
      accountKeyPersistence: "safe",
    },
  });
  const second = canonicalizeSourceExternalId({
    value: "same-id",
    evidence: "confirmed",
    stability: "source-stable",
    scope: {
      kind: "account",
      institutionKey: "example-bank",
      accountKey: "opaque-account-b",
      accountKeyPersistence: "safe",
    },
  });

  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first, second);
});

test("identity fails closed when evidence, stability, namespace safety, or length is insufficient", () => {
  assert.equal(
    canonicalizeSourceExternalId({
      value: "display-ref",
      evidence: "observed-but-unverified",
      stability: "display-only",
      scope: { kind: "institution", institutionKey: "bank" },
    }),
    undefined,
  );
  assert.equal(
    canonicalizeSourceExternalId({
      value: "txn-1",
      evidence: "confirmed",
      stability: "source-stable",
      scope: {
        kind: "account",
        institutionKey: "bank",
        accountKey: "raw-account-number",
        accountKeyPersistence: "unsafe",
      },
    }),
    undefined,
  );
  assert.equal(
    canonicalizeSourceExternalId({
      value: "txn-1",
      evidence: "confirmed",
      stability: "source-stable",
      scope: { kind: "institution", institutionKey: "Bank Name With Spaces" },
    }),
    undefined,
  );
  assert.equal(
    canonicalizeSourceExternalId({
      value: "x".repeat(SOURCE_EXTERNAL_ID_MAX_LENGTH),
      evidence: "confirmed",
      stability: "source-stable",
      scope: { kind: "institution", institutionKey: "bank" },
    }),
    undefined,
  );
});

test("persistence guard never truncates identity and malformed Unicode fails closed", () => {
  const prefix = "stable-";
  assert.equal(persistableSourceExternalId(`  ${prefix}id  `), `${prefix}id`);
  assert.equal(
    persistableSourceExternalId("x".repeat(SOURCE_EXTERNAL_ID_MAX_LENGTH + 1)),
    undefined,
  );
  assert.equal(
    canonicalizeSourceExternalId({
      value: "\ud800",
      evidence: "confirmed",
      stability: "source-stable",
      scope: { kind: "institution", institutionKey: "bank" },
    }),
    undefined,
  );
});

test("identity encoding prevents delimiter-shaped source values from aliasing namespaces", () => {
  const value = canonicalizeSourceExternalId({
    value: "id|account|other",
    evidence: "confirmed",
    stability: "source-stable",
    scope: { kind: "institution", institutionKey: "bank" },
  });
  assert.equal(value, "mf-src-v1|institution|bank|id%7Caccount%7Cother");
});

test("strict text dates require explicit format and valid calendar dates", () => {
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: "2026-09-05",
      format: "iso-date",
      calendarSemantics: "date-only",
    }),
    { ok: true, date: "2026-09-05" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: "05/09/2026",
      format: "dmy-date",
      calendarSemantics: "date-only",
    }),
    { ok: true, date: "2026-09-05" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: "01/02/2026",
      format: "unknown",
      calendarSemantics: "date-only",
    }),
    { ok: false, reason: "unknown_date_format" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: "2026-02-30",
      format: "iso-date",
      calendarSemantics: "date-only",
    }),
    { ok: false, reason: "invalid_calendar_date" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: "",
      format: "iso-date",
      calendarSemantics: "date-only",
    }),
    { ok: false, reason: "missing_date" },
  );
});

test("Excel date normalization requires a known epoch and rejects the 1900 leap bug", () => {
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: 59,
      format: "excel-serial",
      dateSystem: "1900",
      calendarSemantics: "date-only",
    }),
    { ok: true, date: "1900-02-28" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: 60,
      format: "excel-serial",
      dateSystem: "1900",
      calendarSemantics: "date-only",
    }),
    { ok: false, reason: "excel_1900_leap_bug" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: 61,
      format: "excel-serial",
      dateSystem: "1900",
      calendarSemantics: "date-only",
    }),
    { ok: true, date: "1900-03-01" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: 0,
      format: "excel-serial",
      dateSystem: "1904",
      calendarSemantics: "date-only",
    }),
    { ok: true, date: "1904-01-01" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: 45_000,
      format: "excel-serial",
      calendarSemantics: "date-only",
    }),
    { ok: false, reason: "missing_excel_date_system" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: 45_000.5,
      format: "excel-serial",
      dateSystem: "1900",
      calendarSemantics: "date-only",
    }),
    { ok: false, reason: "ambiguous_excel_datetime" },
  );
  assert.deepEqual(
    normalizeStrictSourceDate({
      value: Number.MAX_SAFE_INTEGER,
      format: "excel-serial",
      dateSystem: "1900",
      calendarSemantics: "date-only",
    }),
    { ok: false, reason: "invalid_excel_serial" },
  );
});

test("strict amount normalization requires safe integer VND and explicit direction", () => {
  assert.deepEqual(
    normalizeStrictSourceAmount({
      value: 45_000,
      currency: "VND",
      direction: "debit",
      amountSemantics: "absolute",
    }),
    { ok: true, amount: 45_000, kind: "expense" },
  );
  assert.deepEqual(
    normalizeStrictSourceAmount({
      value: 25_000_000,
      currency: "vnd",
      direction: "credit",
      amountSemantics: "absolute",
    }),
    { ok: true, amount: 25_000_000, kind: "income" },
  );
  assert.deepEqual(
    normalizeStrictSourceAmount({
      value: 45_000.5,
      currency: "VND",
      direction: "debit",
      amountSemantics: "absolute",
    }),
    { ok: false, reason: "invalid_amount" },
  );
  assert.deepEqual(
    normalizeStrictSourceAmount({
      value: 45_000,
      currency: "USD",
      direction: "debit",
      amountSemantics: "absolute",
    }),
    { ok: false, reason: "unsupported_currency" },
  );
  assert.deepEqual(
    normalizeStrictSourceAmount({
      value: 45_000,
      currency: "VND",
      direction: "unknown",
      amountSemantics: "absolute",
    }),
    { ok: false, reason: "ambiguous_direction" },
  );
  assert.deepEqual(
    normalizeStrictSourceAmount({
      value: 45_000,
      currency: "VND",
      direction: "debit",
      amountSemantics: "unknown",
    }),
    { ok: false, reason: "ambiguous_amount_semantics" },
  );
});
