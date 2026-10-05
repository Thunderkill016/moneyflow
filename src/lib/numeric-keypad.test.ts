import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendKeypadDigit,
  backspaceKeypad,
  clearKeypad,
} from "./numeric-keypad.ts";

describe("appendKeypadDigit", () => {
  it("builds a digit string from taps", () => {
    let value = "";
    for (const digit of ["5", "0", "0", "0", "0"]) {
      value = appendKeypadDigit(value, digit);
    }
    assert.equal(value, "50000");
  });

  it("appends 00 as two zeros", () => {
    assert.equal(appendKeypadDigit("5", "00"), "500");
    assert.equal(appendKeypadDigit("12", "00"), "1200");
  });

  it("ignores a leading 00", () => {
    assert.equal(appendKeypadDigit("", "00"), "");
  });

  it("strips leading zeros", () => {
    assert.equal(appendKeypadDigit("0", "5"), "5");
    assert.equal(appendKeypadDigit("", "0"), "0");
    assert.equal(appendKeypadDigit("0", "0"), "0");
  });

  it("ignores non-digit keys", () => {
    assert.equal(appendKeypadDigit("50", "x"), "50");
    assert.equal(appendKeypadDigit("50", ""), "50");
  });

  it("caps the digit count", () => {
    const long = "9".repeat(20);
    assert.equal(appendKeypadDigit(long, "1").length, 15);
  });

  it("works on formatted input (strips grouping separators)", () => {
    assert.equal(appendKeypadDigit("50.000", "0"), "500000");
  });

  it("appends to the numeric meaning of shorthand drafts", () => {
    assert.equal(appendKeypadDigit("50k", "0"), "500000");
  });
});

describe("backspaceKeypad", () => {
  it("removes the last digit", () => {
    assert.equal(backspaceKeypad("50000"), "5000");
    assert.equal(backspaceKeypad("5"), "");
    assert.equal(backspaceKeypad(""), "");
  });

  it("works on formatted input", () => {
    assert.equal(backspaceKeypad("50.000"), "5000");
  });
});

describe("clearKeypad", () => {
  it("returns an empty string", () => {
    assert.equal(clearKeypad(), "");
  });
});
