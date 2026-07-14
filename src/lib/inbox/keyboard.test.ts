import assert from "node:assert/strict";
import test from "node:test";
import {
  isEditableKeyboardTarget,
  moveFocusIndex,
  resolveApproveTargetIds,
  resolveInboxShortcut,
} from "./keyboard.ts";

test("resolveInboxShortcut maps j/k/x/a/c/n", () => {
  assert.equal(resolveInboxShortcut("j"), "next");
  assert.equal(resolveInboxShortcut("J"), "next");
  assert.equal(resolveInboxShortcut("k"), "prev");
  assert.equal(resolveInboxShortcut("x"), "toggle_select");
  assert.equal(resolveInboxShortcut("a"), "approve");
  assert.equal(resolveInboxShortcut("c"), "capture");
  assert.equal(resolveInboxShortcut("n"), "quick_add");
  assert.equal(resolveInboxShortcut("z"), null);
  assert.equal(resolveInboxShortcut("Enter"), null);
});

test("resolveInboxShortcut ignores modifier chords", () => {
  assert.equal(resolveInboxShortcut("j", { metaKey: true }), null);
  assert.equal(resolveInboxShortcut("a", { ctrlKey: true }), null);
  assert.equal(resolveInboxShortcut("c", { altKey: true }), null);
});

test("moveFocusIndex wraps ends without looping past list", () => {
  assert.equal(moveFocusIndex(-1, 1, 5), 0);
  assert.equal(moveFocusIndex(-1, -1, 5), 4);
  assert.equal(moveFocusIndex(0, -1, 5), 0);
  assert.equal(moveFocusIndex(4, 1, 5), 4);
  assert.equal(moveFocusIndex(2, 1, 5), 3);
  assert.equal(moveFocusIndex(2, -1, 5), 1);
  assert.equal(moveFocusIndex(0, 1, 0), -1);
});

test("resolveApproveTargetIds prefers selection then focus", () => {
  assert.deepEqual(resolveApproveTargetIds(["a", "b"], "c"), ["a", "b"]);
  assert.deepEqual(resolveApproveTargetIds([], "c"), ["c"]);
  assert.deepEqual(resolveApproveTargetIds([], null), []);
});

test("isEditableKeyboardTarget rejects null and non-fields; detects INPUT", () => {
  assert.equal(isEditableKeyboardTarget(null), false);
  assert.equal(isEditableKeyboardTarget({} as EventTarget), false);
  assert.equal(
    isEditableKeyboardTarget({ tagName: "INPUT" } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isEditableKeyboardTarget({ tagName: "DIV", isContentEditable: false } as unknown as EventTarget),
    false,
  );
});
