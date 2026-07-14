import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultPushPrefs,
  formatPushActivityAt,
  isPushDaysAhead,
  isPushPrefs,
  pushDaysAheadLabel,
  PUSH_PREFS_KEY,
  readPushPrefs,
  recordPushNotified,
  savePushPrefs,
  writePushPrefs,
} from "./push-prefs.ts";

function mockStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    storage: {
      getItem(key: string) {
        return map.has(key) ? map.get(key)! : null;
      },
      setItem(key: string, value: string) {
        map.set(key, value);
      },
      removeItem(key: string) {
        map.delete(key);
      },
    },
  };
}

test("default push prefs: disabled, 1 day ahead, names off", () => {
  const prefs = defaultPushPrefs();
  assert.equal(prefs.enabled, false);
  assert.equal(prefs.daysAhead, 1);
  assert.equal(prefs.includeNames, false);
  assert.equal(prefs.lastNotifiedOn, null);
  assert.equal(prefs.lastNotifiedCount, 0);
  assert.equal(prefs.updatedAt, null);
  assert.equal(isPushPrefs(prefs), true);
});

test("isPushDaysAhead accepts 0 | 1 | 3 only", () => {
  assert.equal(isPushDaysAhead(0), true);
  assert.equal(isPushDaysAhead(1), true);
  assert.equal(isPushDaysAhead(3), true);
  assert.equal(isPushDaysAhead(2), false);
  assert.equal(isPushDaysAhead(7), false);
  assert.equal(isPushDaysAhead("1"), false);
});

test("isPushPrefs rejects incomplete or wrong shapes", () => {
  assert.equal(isPushPrefs(null), false);
  assert.equal(isPushPrefs({}), false);
  assert.equal(
    isPushPrefs({
      enabled: true,
      daysAhead: 1,
      includeNames: false,
      lastNotifiedOn: null,
      lastNotifiedCount: 0,
      updatedAt: null,
    }),
    true,
  );
  assert.equal(
    isPushPrefs({
      enabled: true,
      daysAhead: 2,
      includeNames: false,
      lastNotifiedOn: null,
      lastNotifiedCount: 0,
      updatedAt: null,
    }),
    false,
  );
  assert.equal(
    isPushPrefs({
      enabled: "yes",
      daysAhead: 1,
      includeNames: false,
      lastNotifiedOn: null,
      lastNotifiedCount: 0,
      updatedAt: null,
    }),
    false,
  );
});

test("read/write/save round-trip and corrupt wipe", () => {
  const { storage, map } = mockStorage();
  const saved = savePushPrefs(
    { enabled: true, daysAhead: 3, includeNames: true, now: new Date("2026-07-15T10:00:00Z") },
    storage,
  );
  assert.equal(saved.enabled, true);
  assert.equal(saved.daysAhead, 3);
  assert.equal(saved.includeNames, true);
  assert.ok(saved.updatedAt);
  assert.equal(readPushPrefs(storage).enabled, true);

  map.set(PUSH_PREFS_KEY, "{not-json");
  assert.deepEqual(readPushPrefs(storage), defaultPushPrefs());

  writePushPrefs(defaultPushPrefs(), storage);
  assert.equal(readPushPrefs(storage).enabled, false);
});

test("recordPushNotified updates last date and count", () => {
  const { storage } = mockStorage();
  savePushPrefs({ enabled: true, daysAhead: 1, includeNames: false }, storage);
  const next = recordPushNotified("2026-07-15", 2, storage);
  assert.equal(next.lastNotifiedOn, "2026-07-15");
  assert.equal(next.lastNotifiedCount, 2);
  assert.equal(readPushPrefs(storage).lastNotifiedOn, "2026-07-15");
});

test("pushDaysAheadLabel and formatPushActivityAt Vietnamese", () => {
  assert.equal(pushDaysAheadLabel(0), "Chỉ hôm nay / quá hạn");
  assert.equal(pushDaysAheadLabel(1), "Trước 1 ngày");
  assert.equal(pushDaysAheadLabel(3), "Trước 3 ngày");
  assert.equal(formatPushActivityAt(null), "Chưa bật");
  assert.equal(formatPushActivityAt("not-a-date"), "Chưa bật");
  const formatted = formatPushActivityAt("2026-07-15T10:00:00.000Z");
  assert.notEqual(formatted, "Chưa bật");
  assert.ok(formatted.length > 4);
});
