import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectVoiceKind,
  parseVietnameseMoney,
  suggestVoiceCategory,
} from "./vi-money-parser.ts";

describe("parseVietnameseMoney", () => {
  const cases: Array<[string, number | null]> = [
    // Core price shorthand ("hai chục" at a shop = 20.000đ)
    ["ăn sáng hai chục", 20_000],
    ["hai mươi nghìn", 20_000],
    ["hai chục nghìn", 20_000],
    ["một trăm", 100_000],
    ["một trăm nghìn", 100_000],
    ["trăm rưỡi", 150_000],
    ["hai trăm rưỡi", 250_000],
    // Millions and slang
    ["một triệu", 1_000_000],
    ["hai triệu", 2_000_000],
    ["2 củ", 2_000_000],
    ["một củ rưỡi", 1_500_000],
    ["một chai", 1_000_000],
    ["một xị", 100_000],
    ["hai xị", 200_000],
    ["triệu rưỡi", 1_500_000],
    ["hai triệu rưỡi", 2_500_000],
    // Tens variants
    ["năm chục", 50_000],
    ["ba mươi lăm", 35_000],
    ["ba lăm", 35_000],
    ["hai mươi mốt", 21_000],
    ["hai mốt", 21_000],
    ["hai mươi tư", 24_000],
    ["hai tư", 24_000],
    ["hai mươi lăm", 25_000],
    ["hai lăm", 25_000],
    ["mười", 10_000],
    ["một chục", 10_000],
    ["chục", 10_000],
    ["chín mươi chín", 99_000],
    // Hundreds with linh/lẻ
    ["một trăm lẻ năm", 105_000],
    ["một trăm linh năm", 105_000],
    ["một trăm hai mươi ba", 123_000],
    ["một trăm mười một", 111_000],
    ["năm trăm nghìn", 500_000],
    // Explicit thousands (no shorthand)
    ["một nghìn", 1_000],
    ["nghìn", 1_000],
    // Billions
    ["một tỷ", 1_000_000_000],
    ["hai tỷ ba trăm triệu", 2_300_000_000],
    // Digit forms
    ["20000", 20_000],
    ["20.000", 20_000],
    ["20,000", 20_000],
    ["20k", 20_000],
    ["2tr", 2_000_000],
    ["2,5 triệu", 2_500_000],
    ["cà phê 35", 35_000],
    ["20đ", 20_000],
    // Full sentences
    ["đổ xăng một trăm", 100_000],
    ["tiền điện hai trăm ba mươi", 230_000],
    ["mua sách năm mươi", 50_000],
    ["đi chợ ba trăm", 300_000],
    ["grab hai lăm", 25_000],
    ["tiền nhà ba triệu", 3_000_000],
    ["thuốc một trăm hai", 120_000],
    ["lương tháng mười lăm triệu", 15_000_000],
    // No amount
    ["không có số", null],
    ["ăn sáng", null],
    ["", null],
    ["   ", null],
  ];

  for (const [input, expected] of cases) {
    it(`"${input}" -> ${expected}`, () => {
      const result = parseVietnameseMoney(input);
      assert.equal(result.amount, expected);
    });
  }

  it("normalizes the transcript", () => {
    const result = parseVietnameseMoney("  Ăn SÁNG, hai chục!! ");
    assert.equal(result.transcript, "ăn sáng hai chục");
    assert.equal(result.amount, 20_000);
  });

  it("marks price shorthand", () => {
    assert.equal(parseVietnameseMoney("hai chục").shorthand, true);
    assert.equal(parseVietnameseMoney("hai mươi nghìn").shorthand, false);
    assert.equal(parseVietnameseMoney("2 củ").shorthand, false);
  });

  it("keeps the amount text and the rest separate", () => {
    const result = parseVietnameseMoney("ăn sáng hai chục");
    assert.equal(result.amountText, "hai chục");
    assert.ok(result.rest.includes("ăn sáng"));
    assert.ok(!result.rest.includes("hai chục"));
  });

  it("does not treat 'chai nước' (bottle) as million slang", () => {
    // "2 chai nước" — "chai" is a noun here, not money slang.
    const result = parseVietnameseMoney("mua 2 chai nước");
    // Only the bare "2" is an amount candidate; the key check is that
    // "chai" was NOT rewritten to "triệu" (which would give 2_000_000).
    assert.notEqual(result.amount, 2_000_000);
  });

  it("returns null for zero", () => {
    assert.equal(parseVietnameseMoney("không đồng").amount, null);
  });
});

describe("detectVoiceKind", () => {
  it("detects income hints", () => {
    assert.equal(detectVoiceKind("lương tháng mười lăm triệu"), "income");
    assert.equal(detectVoiceKind("nhận thưởng hai triệu"), "income");
  });
  it("defaults to expense", () => {
    assert.equal(detectVoiceKind("ăn sáng hai chục"), "expense");
    assert.equal(detectVoiceKind("đổ xăng một trăm"), "expense");
  });
});

describe("suggestVoiceCategory", () => {
  const cases: Array<[string, string | null]> = [
    ["ăn sáng", "Ăn uống"],
    ["cà phê ba lăm", "Ăn uống"],
    ["đổ xăng", "Di chuyển"],
    ["tiền điện", "Hóa đơn"],
    ["đi chợ", "Mua sắm"],
    ["mua thuốc", "Sức khỏe"],
    ["đóng học phí", "Giáo dục"],
    ["tiền nhà", "Nhà ở"],
    ["xyz không khớp gì", null],
  ];
  for (const [input, expected] of cases) {
    it(`"${input}" -> ${expected}`, () => {
      assert.equal(suggestVoiceCategory(input), expected);
    });
  }
});
