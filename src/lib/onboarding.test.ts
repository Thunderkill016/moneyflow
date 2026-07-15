import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  DEFAULT_CASH_WALLET_CURRENCY,
  DEFAULT_CASH_WALLET_NAME,
  ONBOARDING_DONE_HREF,
  ONBOARDING_PATH,
  ONBOARDING_PRIMARY_CTA,
  ONBOARDING_QUICK_EXPENSE_HREF,
  ONBOARDING_SECONDARY_CTA,
  ONBOARDING_SKIP_HREF,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEY,
  TRUST_PROMISES,
  buildCashWalletInput,
  draftFromCashWallet,
  findCashWallet,
  formatOnboardingProgressLabel,
  isOnboardingDoneValue,
  isOnboardingExitHref,
  isValidCashWalletDraft,
  isValidOnboardingStep,
  normalizeCashWalletName,
} from "./onboarding.ts";

test("onboarding storage key and paths are stable (thu chi → insights)", () => {
  assert.equal(ONBOARDING_STORAGE_KEY, "moneyflow-onboarding-done");
  assert.equal(ONBOARDING_PATH, "/onboarding");
  assert.equal(ONBOARDING_SKIP_HREF, "/insights");
  assert.equal(ONBOARDING_DONE_HREF, "/insights");
  assert.equal(ONBOARDING_QUICK_EXPENSE_HREF, "/capture/quick");
  assert.equal(DEFAULT_CASH_WALLET_NAME, "Tiền mặt");
  assert.equal(DEFAULT_CASH_WALLET_CURRENCY, "VND");
});

test("R2: onboarding exit hrefs never route to /inbox", () => {
  const exits = [ONBOARDING_SKIP_HREF, ONBOARDING_DONE_HREF, ONBOARDING_QUICK_EXPENSE_HREF];
  for (const href of exits) {
    assert.ok(!href.startsWith("/inbox"), `exit must not be inbox: ${href}`);
    assert.equal(isOnboardingExitHref(href), true, `allowed exit: ${href}`);
  }
  assert.equal(isOnboardingExitHref("/inbox"), false);
  assert.equal(isOnboardingExitHref("/inbox/foo"), false);
  assert.equal(isOnboardingExitHref("/capture/paste"), false);
  assert.equal(isOnboardingExitHref("/capture/upload"), false);
});

test("R2: progress labels are clear 1/3–3/3", () => {
  assert.equal(ONBOARDING_STEP_COUNT, 3);
  assert.equal(ONBOARDING_STEPS.length, 3);
  assert.equal(formatOnboardingProgressLabel(1), "Bước 1/3");
  assert.equal(formatOnboardingProgressLabel(2), "Bước 2/3");
  assert.equal(formatOnboardingProgressLabel(3), "Bước 3/3");
  assert.equal(isValidOnboardingStep(1), true);
  assert.equal(isValidOnboardingStep(3), true);
  assert.equal(isValidOnboardingStep(0), false);
  assert.equal(isValidOnboardingStep(4), false);
  assert.equal(ONBOARDING_STEPS[0]!.title.length > 0, true);
  assert.equal(ONBOARDING_STEPS[1]!.title.length > 0, true);
  assert.equal(ONBOARDING_STEPS[2]!.title.length > 0, true);
});

test("R2: step 3 CTA copy is Ghi chi đầu + Vào tổng quan", () => {
  assert.equal(ONBOARDING_PRIMARY_CTA, "Ghi chi đầu");
  assert.equal(ONBOARDING_SECONDARY_CTA, "Vào tổng quan");
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

test("normalizeCashWalletName and draft helpers default VN cash", () => {
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

test("buildCashWalletInput is cash + VND + integer minor units", () => {
  assert.deepEqual(buildCashWalletInput({ name: "  Ví  ", initialBalance: 500_000 }), {
    name: "Ví",
    kind: "cash",
    currencyCode: "VND",
    initialBalance: 500_000,
  });
  assert.deepEqual(
    buildCashWalletInput({ name: "", initialBalance: -9 }, "acc-1"),
    {
      id: "acc-1",
      name: DEFAULT_CASH_WALLET_NAME,
      kind: "cash",
      currencyCode: "VND",
      initialBalance: 0,
    },
  );
});

test("R2: onboarding UI uses progress labels, VN wallet, CTAs, never /inbox", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/onboarding-flow.tsx"),
    "utf8",
  );
  assert.match(source, /formatOnboardingProgressLabel/);
  assert.match(source, /ONBOARDING_STEPS/);
  assert.match(source, /DEFAULT_CASH_WALLET_CURRENCY|currencyCode.*VND|₫ VND|VND/);
  assert.match(source, /ONBOARDING_PRIMARY_CTA|Ghi chi đầu/);
  assert.match(source, /ONBOARDING_SECONDARY_CTA|Vào tổng quan/);
  assert.doesNotMatch(source, /router\.(push|replace)\(\s*["']\/inbox/);
  assert.doesNotMatch(source, /href=\s*["']\/inbox/);
});
