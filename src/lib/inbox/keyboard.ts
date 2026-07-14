/**
 * Inbox keyboard shortcuts (wireframes-inbox § Keyboard desktop power).
 * Pure helpers — no DOM; UI wires keydown separately.
 *
 * j/k navigate · x select · a approve · c capture · n quick add
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
  a: "approve",
  c: "capture",
  n: "quick_add",
};

/** True when key events should type into a field, not hit inbox shortcuts. */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (target == null || typeof target !== "object") return false;
  // Duck-type so unit tests run without a DOM (no HTMLElement in Node).
  const el = target as {
    isContentEditable?: boolean;
    tagName?: string;
    closest?: (selector: string) => unknown;
  };
  if (el.isContentEditable) return true;
  const tag = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (typeof el.closest === "function") {
    try {
      if (el.closest("[contenteditable='true'], [contenteditable=''], [role='textbox']")) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

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

/**
 * Move keyboard focus row index within a list.
 * When current is unset (−1), first next → 0, first prev → last.
 */
export function moveFocusIndex(
  current: number,
  direction: 1 | -1,
  length: number,
): number {
  if (length <= 0) return -1;
  if (current < 0 || current >= length) {
    return direction === 1 ? 0 : length - 1;
  }
  const next = current + direction;
  if (next < 0) return 0;
  if (next >= length) return length - 1;
  return next;
}

/** Ids to approve on `A`: multi-select if any, else focused row. */
export function resolveApproveTargetIds(
  selectedIds: string[],
  focusedId: string | null,
): string[] {
  if (selectedIds.length > 0) return [...selectedIds];
  if (focusedId) return [focusedId];
  return [];
}
