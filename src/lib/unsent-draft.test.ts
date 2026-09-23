import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LOCAL_DATA_STORAGE_KEYS } from "./delete-account.ts";
import {
  UNSENT_DRAFT_STORAGE_KEY,
  clearUnsentCaptureDraft,
  isUnsentCaptureDraft,
  readUnsentCaptureDraft,
  writeUnsentCaptureDraft,
  type UnsentCaptureDraft,
} from "./unsent-draft.ts";

const dialog = readFileSync(
  "src/components/add-transaction-dialog.tsx",
  "utf8",
);

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

const validDraft: UnsentCaptureDraft = {
  kind: "expense",
  amount: 65_000,
  note: "Bữa trưa",
  payee: "Highlands Coffee",
  categoryId: "category-1",
  accountId: "account-1",
  occurredOn: "2026-09-23",
  savedAt: "2026-09-23T03:05:00.000Z",
};

test("draft validator accepts a well-formed failed capture", () => {
  assert.equal(isUnsentCaptureDraft(validDraft), true);
  // Empty note/payee are legitimate — only the submitted shape matters.
  assert.equal(
    isUnsentCaptureDraft({ ...validDraft, note: "", payee: "" }),
    true,
  );
});

test("draft validator rejects malformed values", () => {
  assert.equal(isUnsentCaptureDraft(null), false);
  assert.equal(isUnsentCaptureDraft("draft"), false);
  assert.equal(isUnsentCaptureDraft({ ...validDraft, kind: "transfer" }), false);
  // Money must stay an integer đồng greater than zero.
  assert.equal(isUnsentCaptureDraft({ ...validDraft, amount: 0 }), false);
  assert.equal(isUnsentCaptureDraft({ ...validDraft, amount: -5 }), false);
  assert.equal(isUnsentCaptureDraft({ ...validDraft, amount: 12.5 }), false);
  assert.equal(
    isUnsentCaptureDraft({ ...validDraft, amount: "65000" }),
    false,
  );
  assert.equal(
    isUnsentCaptureDraft({ ...validDraft, categoryId: "" }),
    false,
  );
  assert.equal(
    isUnsentCaptureDraft({ ...validDraft, accountId: undefined }),
    false,
  );
  assert.equal(
    isUnsentCaptureDraft({ ...validDraft, occurredOn: "23/09/2026" }),
    false,
  );
  assert.equal(
    isUnsentCaptureDraft({ ...validDraft, savedAt: "not-a-date" }),
    false,
  );
  // Field ceilings match the inputs the draft was typed into.
  assert.equal(
    isUnsentCaptureDraft({ ...validDraft, note: "n".repeat(501) }),
    false,
  );
  assert.equal(
    isUnsentCaptureDraft({ ...validDraft, payee: "p".repeat(201) }),
    false,
  );
});

test("write → read → clear round-trips the draft", () => {
  const { storage, map } = mockStorage();
  writeUnsentCaptureDraft(validDraft, storage);
  assert.deepEqual(readUnsentCaptureDraft(storage), validDraft);

  clearUnsentCaptureDraft(storage);
  assert.equal(readUnsentCaptureDraft(storage), null);
  assert.equal(map.has(UNSENT_DRAFT_STORAGE_KEY), false);
});

test("a second failed save overwrites the older draft", () => {
  const { storage } = mockStorage();
  writeUnsentCaptureDraft(validDraft, storage);
  const newer = { ...validDraft, amount: 12_000, savedAt: "2026-09-23T04:00:00.000Z" };
  writeUnsentCaptureDraft(newer, storage);
  assert.deepEqual(readUnsentCaptureDraft(storage), newer);
});

test("malformed stored value is dropped instead of restored", () => {
  const corrupt = mockStorage({ [UNSENT_DRAFT_STORAGE_KEY]: "{not json" });
  assert.equal(readUnsentCaptureDraft(corrupt.storage), null);
  assert.equal(corrupt.map.has(UNSENT_DRAFT_STORAGE_KEY), false);

  const wrongShape = mockStorage({
    [UNSENT_DRAFT_STORAGE_KEY]: JSON.stringify({ kind: "transfer" }),
  });
  assert.equal(readUnsentCaptureDraft(wrongShape.storage), null);
  assert.equal(wrongShape.map.has(UNSENT_DRAFT_STORAGE_KEY), false);
});

test("write refuses an invalid draft and absent storage no-ops", () => {
  const { storage, map } = mockStorage();
  writeUnsentCaptureDraft(
    { ...validDraft, amount: 0 },
    storage,
  );
  assert.equal(map.has(UNSENT_DRAFT_STORAGE_KEY), false);

  assert.equal(readUnsentCaptureDraft(null), null);
  writeUnsentCaptureDraft(validDraft, null);
  clearUnsentCaptureDraft(null);
});

test("account deletion wipes the unsent draft key", () => {
  assert.ok(LOCAL_DATA_STORAGE_KEYS.includes(UNSENT_DRAFT_STORAGE_KEY));
});

test("capture dialog retains the draft only on save failure", () => {
  // The write sits inside the !result.ok branch, after the typed input has
  // passed validation, so only a real failed save produces a draft.
  assert.match(
    dialog,
    /if \(!result\.ok\) \{[\s\S]*?writeUnsentCaptureDraft\(\{[\s\S]*?savedAt: new Date\(\)\.toISOString\(\),[\s\S]*?\}\);[\s\S]*?return;/,
  );
  // A successful save clears it so a posted transaction is never re-offered.
  assert.match(
    dialog,
    /persistPrefs\([\s\S]*?\);\s*clearUnsentCaptureDraft\(\);/,
  );
});

test("capture dialog offers the draft back only into an untouched form", () => {
  assert.match(dialog, /readUnsentCaptureDraft\(\)/);
  assert.match(dialog, /draft && !formTouchedRef\.current/);
  assert.match(dialog, /formTouchedRef\.current = true/);
  // The notice says restored-draft only — no copy may imply it will send itself.
  assert.match(dialog, /Đã khôi phục nháp chưa gửi/);
});
