import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMoney,
  formatMoneyWithKind,
  formatSignedMoney,
  moneyKindPrefix,
  parseMoneyInput,
} from "./money.ts";

test("formatMoney uses integer minor units and VND style", () => {
  assert.equal(formatMoney(1_234_567), "1.234.567 ₫");
  assert.equal(formatMoney(0), "0 ₫");
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

test("parseMoneyInput strips non-digits (integer minor units)", () => {
  assert.equal(parseMoneyInput("45.000"), 45000);
  assert.equal(parseMoneyInput(""), 0);
});
