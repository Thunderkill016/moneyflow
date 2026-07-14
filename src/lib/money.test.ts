import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMoney,
  formatMoneyInputFromMinor,
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
