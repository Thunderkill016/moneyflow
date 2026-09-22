/**
 * Shared keyboard helpers for workspace shortcut layers.
 * Pure helpers — no DOM dependency beyond duck-typed EventTarget; UI wires
 * keydown separately. First used by the inbox and ledger workspaces.
 */

/** True when key events should type into a field, not hit shortcuts. */
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
 * True when an activation key (Enter) should run the focused control's native
 * click instead of a workspace row action — e.g. focus sits on a row's own
 * edit/delete button or a link. Editable targets count as interactive.
 */
export function isInteractiveKeyboardTarget(
  target: EventTarget | null,
): boolean {
  if (isEditableKeyboardTarget(target)) return true;
  if (target == null || typeof target !== "object") return false;
  const el = target as { closest?: (selector: string) => unknown };
  if (typeof el.closest !== "function") return false;
  try {
    return Boolean(
      el.closest(
        "button, a, summary, [role='button'], [role='link'], [role='checkbox'], [role='radio'], [role='switch'], [role='tab'], [role='option'], [role='menuitem']",
      ),
    );
  } catch {
    return false;
  }
}

/** True when focus sits in an app search field (`data-app-search`). */
export function isAppSearchTarget(target: EventTarget | null): boolean {
  if (target == null || typeof target !== "object") return false;
  const el = target as { closest?: (selector: string) => unknown };
  if (typeof el.closest !== "function") return false;
  try {
    return Boolean(el.closest("[data-app-search='true']"));
  } catch {
    return false;
  }
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
