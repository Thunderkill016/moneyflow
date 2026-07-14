import assert from "node:assert/strict";
import test from "node:test";
import {
  maskAccountLikeDigits,
  maskDigitRun,
  maskSnippetForDisplay,
} from "./mask-account.ts";

test("maskDigitRun keeps last 4 digits", () => {
  // "0123456789012" length 13 → 9 bullets + last 4 "9012"
  assert.equal(maskDigitRun("0123456789012"), "•••••••••9012");
  assert.equal(maskDigitRun("1234"), "1234");
  assert.equal(maskDigitRun("12"), "12");
  assert.equal(maskDigitRun(""), "");
});

test("merchant + formatted VND amount stay readable", () => {
  const samples = [
    "HIGHLANDS COFFEE Q1 45.000đ",
    "GRAB *TRIP 89.000",
    "cafe 45k",
    "LUONG CT +25.000.000",
    "Shopee 1.200.000 VND",
  ];
  for (const s of samples) {
    assert.equal(maskAccountLikeDigits(s), s, `should not change: ${s}`);
  }
});

test("short unformatted amounts under 9 digits stay readable", () => {
  assert.equal(maskAccountLikeDigits("CK ra tiet kiem 2000000"), "CK ra tiet kiem 2000000");
  assert.equal(maskAccountLikeDigits("LUONG 25000000"), "LUONG 25000000");
  assert.equal(maskAccountLikeDigits("cafe 45000"), "cafe 45000");
});

test("money unit suffix protects long digit runs", () => {
  assert.equal(
    maskAccountLikeDigits("Thanh toan 250000000đ Highlands"),
    "Thanh toan 250000000đ Highlands",
  );
  assert.equal(
    maskAccountLikeDigits("amount 1200000000 VND"),
    "amount 1200000000 VND",
  );
});

test("labeled STK / TK is masked, merchant kept", () => {
  const input = "HIGHLANDS STK 0123456789 -45.000 VND";
  const out = maskAccountLikeDigits(input);
  assert.ok(out.includes("HIGHLANDS"), "merchant readable");
  assert.ok(out.includes("45.000"), "amount readable");
  assert.ok(!out.includes("0123456789"), "full STK hidden");
  assert.ok(out.includes("6789"), "tail visible");
  assert.match(out, /STK\s+•+6789/i);
});

test("TK label with separators", () => {
  const out = maskAccountLikeDigits("TK: 0123 456 7890 Grab Food");
  assert.ok(out.includes("Grab Food"));
  assert.ok(!out.includes("0123 456 7890") || out.includes("•"));
  assert.ok(!/\b0123\b/.test(out) || out.includes("•"));
  const digitsLeft = out.replace(/\D/g, "");
  // Only tail digits remain unmasked
  assert.ok(digitsLeft.endsWith("7890") || digitsLeft.endsWith("890"));
  assert.ok(!out.includes("01234567890"));
});

test("continuous 9+ digit STK without label is masked", () => {
  const out = maskAccountLikeDigits("CK den 1900123456789 Highlands");
  assert.ok(out.includes("Highlands"));
  assert.ok(!out.includes("1900123456789"));
  assert.ok(out.includes("6789"));
  assert.equal(maskAccountLikeDigits("CK den 1900123456789 Highlands"), out);
});

test("card-like 4-group pattern is masked", () => {
  const out = maskAccountLikeDigits("The 4111 1111 1111 1111 GRAB");
  assert.ok(out.includes("GRAB"));
  assert.ok(!out.includes("4111 1111 1111 1111"));
  assert.ok(out.includes("1111")); // tail
  assert.ok(out.includes("•"));
});

test("phone-like 10 digits masked as PII", () => {
  const out = maskAccountLikeDigits("Lien he 0901234567 cafe 45k");
  assert.ok(out.includes("cafe 45k"));
  assert.ok(!out.includes("0901234567"));
  assert.ok(out.includes("4567"));
});

test("maskSnippetForDisplay is empty-safe", () => {
  assert.equal(maskSnippetForDisplay(null), "");
  assert.equal(maskSnippetForDisplay(undefined), "");
  assert.equal(maskSnippetForDisplay(""), "");
  assert.equal(
    maskSnippetForDisplay("HIGHLANDS 45k"),
    "HIGHLANDS 45k",
  );
  const masked = maskSnippetForDisplay("STK 123456789012");
  assert.ok(masked.includes("•"));
  assert.ok(!masked.includes("123456789012"));
});

test("does not destroy mixed SMS-like line", () => {
  const input =
    "TK 9704360123456789 -89.000VND luc 10:30 tai GRAB *TRIP. So du 1.234.567VND";
  const out = maskAccountLikeDigits(input);
  assert.ok(out.includes("GRAB"));
  assert.ok(out.includes("89.000") || out.includes("89.000VND"));
  assert.ok(out.includes("1.234.567"));
  assert.ok(!out.includes("9704360123456789"));
});
