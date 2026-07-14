import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CASH_WALLET_NAME,
  ONBOARDING_DONE_HREF,
  ONBOARDING_PATH,
  ONBOARDING_QUICK_EXPENSE_HREF,
  ONBOARDING_SKIP_HREF,
  ONBOARDING_STORAGE_KEY,
  TRUST_PROMISES,
  buildCashWalletInput,
  draftFromCashWallet,
  findCashWallet,
  isOnboardingDoneValue,
  isValidCashWalletDraft,
  normalizeCashWalletName,
} from "./onboarding.ts";

test("onboarding storage key and paths are stable (thu chi → insights)", () => {
  assert.equal(ONBOARDING_STORAGE_KEY, "moneyflow-onboarding-done");
  assert.equal(ONBOARDING_PATH, "/onboarding");
  assert.equal(ONBOARDING_SKIP_HREF, "/insights");
  assert.equal(ONBOARDING_DONE_HREF, "/insights");
  assert.equal(ONBOARDING_QUICK_EXPENSE_HREF, "/capture/quick");
  assert.equal(DEFAULT_CASH_WALLET_NAME, "Tiền mặt");
});

test("isOnboardingDoneValue accepts 1/true only", () => {
  assert.equal(isOnboardingDoneValue("1"), true);
  assert.equal(isOnboardingDoneValue("true"), true);
  assert.equal(isOnboardingDoneValue("0"), false);
  assert.equal(isOnboardingDoneValue(""), false);
  assert.equal(isOnboardingDoneValue(null), false);
  assert.equal(isOnboardingDoneValue(undefined), false);
});

test("TRUST_PROMISES cover no bank password and export", () => {
  assert.equal(TRUST_PROMISES.length, 3);
  const joined = TRUST_PROMISES.join(" ");
  assert.match(joined, /mật khẩu|OTP/i);
  assert.match(joined, /Xuất|CSV/i);
  assert.ok(!joined.toLowerCase().includes("paste"));
  assert.ok(!joined.toLowerCase().includes("upload"));
});

test("findCashWallet prefers active cash", () => {
  assert.equal(findCashWallet([]), null);
  assert.equal(
    findCashWallet([
      { id: "b1", name: "MB", kind: "bank" },
      { id: "c1", name: "Tiền mặt", kind: "cash", isArchived: true },
    ]),
    null,
  );
  const cash = findCashWallet([
    { id: "b1", name: "MB", kind: "bank" },
    { id: "c1", name: "Ví túi", kind: "cash", initialBalance: 50_000 },
  ]);
  assert.equal(cash?.id, "c1");
  assert.equal(cash?.name, "Ví túi");
});

test("normalizeCashWalletName and draft helpers", () => {
  assert.equal(normalizeCashWalletName("  "), DEFAULT_CASH_WALLET_NAME);
  assert.equal(normalizeCashWalletName("  Ví nhà  "), "Ví nhà");
  assert.equal(normalizeCashWalletName("x".repeat(100)).length, 80);

  assert.deepEqual(draftFromCashWallet(null), {
    name: DEFAULT_CASH_WALLET_NAME,
    initialBalance: 0,
  });
  assert.deepEqual(
    draftFromCashWallet({ id: "c1", name: "Tiền mặt", kind: "cash", initialBalance: 120_000 }),
    { name: "Tiền mặt", initialBalance: 120_000 },
  );
});

test("isValidCashWalletDraft rejects bad money and empty name", () => {
  assert.equal(isValidCashWalletDraft({ name: "Tiền mặt", initialBalance: 0 }), true);
  assert.equal(isValidCashWalletDraft({ name: "  ok  ", initialBalance: 1_000 }), true);
  assert.equal(isValidCashWalletDraft({ name: "", initialBalance: 0 }), false);
  assert.equal(isValidCashWalletDraft({ name: "  ", initialBalance: 0 }), false);
  assert.equal(isValidCashWalletDraft({ name: "A", initialBalance: -1 }), false);
  assert.equal(isValidCashWalletDraft({ name: "A", initialBalance: 1.5 }), false);
});

test("buildCashWalletInput is cash + integer minor units", () => {
  assert.deepEqual(buildCashWalletInput({ name: "  Ví  ", initialBalance: 500_000 }), {
    name: "Ví",
    kind: "cash",
    initialBalance: 500_000,
  });
  assert.deepEqual(
    buildCashWalletInput({ name: "", initialBalance: -9 }, "acc-1"),
    {
      id: "acc-1",
      name: DEFAULT_CASH_WALLET_NAME,
      kind: "cash",
      initialBalance: 0,
    },
  );
});
