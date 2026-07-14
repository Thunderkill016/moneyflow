import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultPrivacyPrefs,
  formatPrivacyActivityAt,
  isPrivacyPrefs,
  isRawRetention,
  rawRetentionLabel,
} from "./privacy-prefs.ts";

test("default privacy prefs: 7 days retention, improve parser off", () => {
  const prefs = defaultPrivacyPrefs();
  assert.equal(prefs.rawRetention, "days_7");
  assert.equal(prefs.improveParser, false);
  assert.equal(prefs.lastExportAt, null);
  assert.equal(prefs.lastDeleteAt, null);
  assert.equal(prefs.updatedAt, null);
  assert.equal(isPrivacyPrefs(prefs), true);
});

test("isRawRetention accepts known values only", () => {
  assert.equal(isRawRetention("delete_now"), true);
  assert.equal(isRawRetention("days_7"), true);
  assert.equal(isRawRetention("days_30"), true);
  assert.equal(isRawRetention("forever"), false);
  assert.equal(isRawRetention(7), false);
  assert.equal(isRawRetention(null), false);
});

test("isPrivacyPrefs rejects incomplete or wrong shapes", () => {
  assert.equal(isPrivacyPrefs(null), false);
  assert.equal(isPrivacyPrefs({}), false);
  assert.equal(
    isPrivacyPrefs({
      rawRetention: "days_7",
      improveParser: true,
      lastExportAt: null,
      lastDeleteAt: null,
      updatedAt: null,
    }),
    true,
  );
  assert.equal(
    isPrivacyPrefs({
      rawRetention: "days_7",
      improveParser: "yes",
      lastExportAt: null,
      lastDeleteAt: null,
      updatedAt: null,
    }),
    false,
  );
  assert.equal(
    isPrivacyPrefs({
      rawRetention: "forever",
      improveParser: false,
      lastExportAt: null,
      lastDeleteAt: null,
      updatedAt: null,
    }),
    false,
  );
});

test("rawRetentionLabel returns Vietnamese labels", () => {
  assert.equal(rawRetentionLabel("delete_now"), "Xóa ngay sau khi parse");
  assert.equal(rawRetentionLabel("days_7"), "Giữ 7 ngày");
  assert.equal(rawRetentionLabel("days_30"), "Giữ 30 ngày");
});

test("formatPrivacyActivityAt handles null and invalid", () => {
  assert.equal(formatPrivacyActivityAt(null), "Chưa có");
  assert.equal(formatPrivacyActivityAt("not-a-date"), "Chưa có");
  const formatted = formatPrivacyActivityAt("2026-07-15T10:00:00.000Z");
  assert.notEqual(formatted, "Chưa có");
  assert.ok(formatted.length > 4);
});
