import assert from "node:assert/strict";
import test from "node:test";
import {
  clearLocalMoneyFlowStores,
  DELETE_CONFIRM_TEXT,
  isDeleteConfirmValid,
  LOCAL_DATA_STORAGE_KEYS,
  SERVER_DELETE_LIMITATION_VI,
  THEME_STORAGE_KEY,
} from "./delete-account.ts";

function mockStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
    get length() {
      return map.size;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
  return { storage, map };
}

test("isDeleteConfirmValid accepts exact XÓA only", () => {
  assert.equal(DELETE_CONFIRM_TEXT, "XÓA");
  assert.equal(isDeleteConfirmValid("XÓA"), true);
  assert.equal(isDeleteConfirmValid("  XÓA  "), true);
  assert.equal(isDeleteConfirmValid("xóa"), false);
  assert.equal(isDeleteConfirmValid("XOA"), false);
  assert.equal(isDeleteConfirmValid("XÓA "), true);
  assert.equal(isDeleteConfirmValid(""), false);
  assert.equal(isDeleteConfirmValid("DELETE"), false);
});

test("clearLocalMoneyFlowStores removes known product keys and moneyflow-* extras", () => {
  const firstKey = LOCAL_DATA_STORAGE_KEYS[0]!;
  const { storage, map } = mockStorage({
    [firstKey]: "[]",
    "moneyflow-extra-v1": "1",
    [THEME_STORAGE_KEY]: "dark",
    "unrelated-key": "keep",
  });

  const result = clearLocalMoneyFlowStores(storage);

  assert.ok(result.clearedKeys.includes(firstKey));
  assert.ok(result.clearedKeys.includes("moneyflow-extra-v1"));
  assert.equal(map.has(THEME_STORAGE_KEY), true);
  assert.equal(map.has("unrelated-key"), true);
  assert.equal(map.has(firstKey), false);
  assert.equal(result.failedKeys.length, 0);
});

test("clearLocalMoneyFlowStores no-ops with null storage", () => {
  const result = clearLocalMoneyFlowStores(null);
  assert.deepEqual(result, { clearedKeys: [], failedKeys: [] });
});

test("server delete limitation copy is non-empty Vietnamese note", () => {
  assert.ok(SERVER_DELETE_LIMITATION_VI.includes("service_role"));
  assert.ok(SERVER_DELETE_LIMITATION_VI.length > 40);
});

test("LOCAL_DATA_STORAGE_KEYS lists expected product stores", () => {
  assert.ok(LOCAL_DATA_STORAGE_KEYS.includes("moneyflow-inbox-candidates-v1"));
  assert.ok(LOCAL_DATA_STORAGE_KEYS.includes("moneyflow-rules-v1"));
  assert.ok(LOCAL_DATA_STORAGE_KEYS.includes("moneyflow-demo-transactions-v1"));
  assert.ok(LOCAL_DATA_STORAGE_KEYS.includes("moneyflow-demo-commitment-occurrences-v1"));
  assert.ok(LOCAL_DATA_STORAGE_KEYS.includes("moneyflow-demo-income-templates-v1"));
  assert.ok(LOCAL_DATA_STORAGE_KEYS.includes("moneyflow-demo-income-template-occurrences-v1"));
  assert.ok(LOCAL_DATA_STORAGE_KEYS.includes("moneyflow-privacy-prefs-v1"));
  assert.ok(!LOCAL_DATA_STORAGE_KEYS.includes(THEME_STORAGE_KEY));
});
