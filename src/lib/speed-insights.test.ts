import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeSpeedInsightsUrl } from "@/lib/speed-insights";

test("removes query strings and fragments from performance URLs", () => {
  assert.equal(
    sanitizeSpeedInsightsUrl(
      "https://mfvn.vercel.app/transactions?focus=search&q=salary#latest",
    ),
    "https://mfvn.vercel.app/transactions",
  );
});

test("blocks sensitive auth, share, and import paths", () => {
  const blocked = [
    "https://mfvn.vercel.app/auth/callback?code=secret",
    "https://mfvn.vercel.app/update-password?token=secret",
    "https://mfvn.vercel.app/capture/share?text=private",
    "https://mfvn.vercel.app/imports/private-batch/preview",
  ];

  for (const url of blocked) assert.equal(sanitizeSpeedInsightsUrl(url), null);
});

test("rejects malformed URLs instead of sending uncertain data", () => {
  assert.equal(sanitizeSpeedInsightsUrl("not-a-url"), null);
});
