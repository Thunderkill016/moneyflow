/**
 * Inbox keyboard shortcuts (wireframes-inbox § Keyboard desktop power).
 * Pure helpers — no DOM; UI wires keydown separately.
 *
 * j/k navigate · x select · c capture · n quick add
 *
 * Grouped approval intentionally has no direct `a` shortcut: every grouped
 * ledger write must pass through the visible review/confirmation dialog.
 */

export type InboxShortcutAction =
  | "next"
  | "prev"
  | "toggle_select"
  | "approve"
  | "capture"
  | "quick_add";

const KEY_TO_ACTION: Record<string, InboxShortcutAction> = {
  j: "next",
  k: "prev",
  x: "toggle_select",
  c: "capture",
  n: "quick_add",
};

/*
 * Generic editable-target guard and focus-index walk now live in
 * ../keyboard.ts so the ledger layer shares one implementation. Re-exported
 * here to keep the inbox import sites and tests stable.
 */
export { isEditableKeyboardTarget, moveFocusIndex } from "../keyboard.ts";

/**
 * Map a key event (already checked for editable/modifiers) to an inbox action.
 * Case-insensitive letter keys only; ignores meta/ctrl/alt chords.
 */
export function resolveInboxShortcut(
  key: string,
  modifiers?: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean },
): InboxShortcutAction | null {
  if (modifiers?.metaKey || modifiers?.ctrlKey || modifiers?.altKey) {
    return null;
  }
  if (!key || key.length !== 1) return null;
  return KEY_TO_ACTION[key.toLowerCase()] ?? null;
}

/** Legacy selection helper retained for callers/tests; it never posts by itself. */
export function resolveApproveTargetIds(
  selectedIds: string[],
  focusedId: string | null,
): string[] {
  if (selectedIds.length > 0) return [...selectedIds];
  if (focusedId) return [focusedId];
  return [];
}
