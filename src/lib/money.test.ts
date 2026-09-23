import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMoney,
  formatMoneyInput,
  formatMoneyInputFromMinor,
  isFractionAttempt,
  formatMoneyWithKind,
  formatSignedMoney,
  moneyKindPrefix,
  parseMoneyInput,
  parseMoneyInputToMinor,
} from "./money.ts";

test("formatMoney uses integer minor units and VND style", () => {
  assert.equal(formatMoney(1_234_567), "1.234.567 ₫");
  assert.equal(formatMoney(0), "0 ₫");
});

test("formatMoney formats USD minor units (cents) without mixing into VND", () => {
  const usd = formatMoney(20_000, false, "USD"); // $200.00
  assert.match(usd, /200/);
  assert.match(usd, /US\$|USD|\$/);
  assert.ok(!usd.includes("₫"));
});

test("formatSignedMoney is never color-only (+/−)", () => {
  assert.equal(formatSignedMoney(50_000), "+ 50.000 ₫");
  assert.equal(formatSignedMoney(-50_000), "− 50.000 ₫");
  assert.equal(formatSignedMoney(0), "0 ₫");
});

test("moneyKindPrefix distinguishes expense / income / transfer", () => {
  assert.equal(moneyKindPrefix("expense"), "−");
  assert.equal(moneyKindPrefix("income"), "+");
  assert.equal(moneyKindPrefix("transfer"), "↔");
});

test("formatMoneyWithKind pairs kind sign with absolute amount", () => {
  assert.equal(formatMoneyWithKind(45_000, "expense"), "− 45.000 ₫");
  assert.equal(formatMoneyWithKind(45_000, "income"), "+ 45.000 ₫");
  assert.equal(formatMoneyWithKind(45_000, "transfer"), "↔ 45.000 ₫");
});

test("parseMoneyInput strips non-digits (integer major units for input)", () => {
  assert.equal(parseMoneyInput("45.000"), 45000);
  assert.equal(parseMoneyInput(""), 0);
});

test("parseMoneyInputToMinor scales by currency fraction digits", () => {
  assert.equal(parseMoneyInputToMinor("150.000", "VND"), 150_000);
  assert.equal(parseMoneyInputToMinor("200", "USD"), 20_000);
  assert.equal(formatMoneyInputFromMinor(20_000, "USD"), "200");
  assert.equal(formatMoneyInputFromMinor(150_000, "VND"), "150.000");
});

test("parseMoneyInput reads Vietnamese shorthand as exact integer đồng", () => {
  assert.equal(parseMoneyInput("50k"), 50_000);
  assert.equal(parseMoneyInput("50 k"), 50_000);
  assert.equal(parseMoneyInput("1tr5"), 1_500_000);
  assert.equal(parseMoneyInput("1,5tr"), 1_500_000);
  assert.equal(parseMoneyInput("1.5tr"), 1_500_000);
  assert.equal(parseMoneyInput("12,5tr"), 12_500_000);
  assert.equal(parseMoneyInput("1triệu"), 1_000_000);
  assert.equal(parseMoneyInput("1trieu"), 1_000_000);
  assert.equal(parseMoneyInput("1củ"), 1_000_000);
  assert.equal(parseMoneyInput("2tỷ"), 2_000_000_000);
  assert.equal(parseMoneyInput("2tỉ"), 2_000_000_000);
  assert.equal(parseMoneyInput("2ty"), 2_000_000_000);
  // Three-digit groups keep the grouping rule: 1.234 triệu.
  assert.equal(parseMoneyInput("1.234tr"), 1_234_000_000);
  // Fraction longer than the unit is exact only on trailing zeros.
  assert.equal(parseMoneyInput("1tr5000000"), 1_500_000);
});

test("parseMoneyInput rejects malformed shorthand instead of dropping the unit", () => {
  for (const bad of [
    "k50", // unit before the number
    "tr", // unit with no number
    "1tr5x", // trailing noise after the unit fraction
    "1,5tr5", // two fractions at once
    "1.2.3tr", // unparseable number part
    "1tr5đ", // đ after a shorthand unit is not a unit we scale
  ]) {
    assert.ok(Number.isNaN(parseMoneyInput(bad)), `expected NaN for ${bad}`);
  }
});

test("parseMoneyInput leaves plain digits and non-shorthand text alone", () => {
  assert.equal(parseMoneyInput("45.000"), 45_000);
  assert.equal(parseMoneyInput("cat"), 0); // letters stripped, no unit seen
  // A bare `m` is ambiguous (million/minute) and stays unsupported.
  assert.equal(parseMoneyInput("5m"), 5);
});

test("formatMoneyInput keeps shorthand on screen while it is typed", () => {
  assert.equal(formatMoneyInput("50k"), "50k");
  assert.equal(formatMoneyInput("1tr5"), "1tr5");
  assert.equal(formatMoneyInput("2tỷ"), "2tỷ");
  // Half-typed unit tail survives instead of being swallowed.
  assert.equal(formatMoneyInput("1t"), "1t");
  assert.equal(formatMoneyInput("3tr"), "3tr");
});

test("isFractionAttempt does not flag shorthand as a decimal fraction", () => {
  assert.equal(isFractionAttempt("1,5tr"), false);
  assert.equal(isFractionAttempt("50k"), false);
});
