import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  moneyDisplayAriaLabel,
  moneyDisplayText,
  moneyDisplayTone,
} from "./money-display.ts";

test("plain, signed and ledger-kind displays preserve integer VND", () => {
  assert.equal(moneyDisplayText({ amount: 1_234_567 }), "1.234.567 ₫");
  assert.equal(
    moneyDisplayText({ amount: -50_000, mode: "signed" }),
    "− 50.000 ₫",
  );
  assert.equal(
    moneyDisplayText({
      amount: 45_000,
      mode: "kind",
      kind: "expense",
      direction: true,
    }),
    "− ↓ 45.000 ₫",
  );
  assert.equal(
    moneyDisplayText({
      amount: 45_000,
      mode: "kind",
      kind: "transfer",
      direction: true,
    }),
    "↔ 45.000 ₫",
  );
});

test("tone is semantic and never depends on color alone", () => {
  assert.equal(moneyDisplayTone({ amount: 0 }), "neutral");
  assert.equal(moneyDisplayTone({ amount: 10_000, mode: "signed" }), "income");
  assert.equal(moneyDisplayTone({ amount: -10_000, mode: "signed" }), "expense");
  assert.equal(
    moneyDisplayTone({ amount: 10_000, mode: "kind", kind: "transfer" }),
    "transfer",
  );
});

test("accessible labels state financial direction without relying on arrows", () => {
  assert.equal(
    moneyDisplayAriaLabel({
      amount: 45_000,
      mode: "kind",
      kind: "income",
      direction: true,
    }),
    "Thu cộng 45.000 ₫",
  );
  assert.equal(
    moneyDisplayAriaLabel({
      amount: 45_000,
      mode: "kind",
      kind: "expense",
      direction: true,
    }),
    "Chi trừ 45.000 ₫",
  );
  assert.equal(
    moneyDisplayAriaLabel({ amount: 500_000, label: "Số dư tổng" }),
    "Số dư tổng 500.000 ₫",
  );
});

test("MoneyValue CSS keeps values unbroken without clipping or legacy surfaces", () => {
  const css = readFileSync(
    new URL("../components/money-value.module.css", import.meta.url),
    "utf8",
  );
  const component = readFileSync(
    new URL("../components/money-value.tsx", import.meta.url),
    "utf8",
  );

  assert.match(css, /font-variant-numeric:\s*tabular-nums/i);
  assert.match(css, /max-inline-size:\s*100%/i);
  assert.match(css, /white-space:\s*nowrap/i);
  assert.doesNotMatch(css, /white-space:\s*normal/i);
  assert.match(css, /\.neutral\s*\{[^}]*color:\s*inherit/i);
  assert.doesNotMatch(css, /text-overflow:\s*ellipsis/i);
  assert.doesNotMatch(css, /(?:^|\n)\s*overflow:\s*(?:hidden|clip)/i);
  assert.match(component, /data-money="true"/);
  assert.match(component, /data-money-value="true"/);
});
