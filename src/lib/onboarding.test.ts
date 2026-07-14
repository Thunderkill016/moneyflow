import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTURE_METHOD_HREF,
  ONBOARDING_PATH,
  ONBOARDING_SKIP_HREF,
  ONBOARDING_STORAGE_KEY,
  captureHref,
  isOnboardingDoneValue,
} from "./onboarding.ts";

test("onboarding storage key and paths are stable", () => {
  assert.equal(ONBOARDING_STORAGE_KEY, "moneyflow-onboarding-done");
  assert.equal(ONBOARDING_PATH, "/onboarding");
  assert.equal(ONBOARDING_SKIP_HREF, "/");
});

test("isOnboardingDoneValue accepts 1/true only", () => {
  assert.equal(isOnboardingDoneValue("1"), true);
  assert.equal(isOnboardingDoneValue("true"), true);
  assert.equal(isOnboardingDoneValue("0"), false);
  assert.equal(isOnboardingDoneValue(""), false);
  assert.equal(isOnboardingDoneValue(null), false);
  assert.equal(isOnboardingDoneValue(undefined), false);
});

test("captureHref maps methods to capture routes", () => {
  assert.equal(captureHref("paste"), "/capture/paste");
  assert.equal(captureHref("upload"), "/capture/upload");
  assert.equal(captureHref("quick"), "/capture/quick");
  assert.deepEqual(CAPTURE_METHOD_HREF, {
    paste: "/capture/paste",
    upload: "/capture/upload",
    quick: "/capture/quick",
  });
});
