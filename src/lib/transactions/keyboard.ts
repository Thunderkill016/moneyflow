/**
 * Ledger keyboard shortcuts — mirrors the inbox keyboard layer
 * (wireframes-inbox § Keyboard desktop power) adapted to the transaction
 * workspace. Pure helpers — no DOM; the workspace wires keydown separately.
 *
 * j/k navigate · Enter/e edit · x select · Delete/Backspace delete
 * n add · / search · Esc clears search → selection → row focus
 *
 * Destructive keys never mutate directly: `delete` only opens the existing
 * confirm dialog, and `edit` follows the row's own click path (split rows get
 * the explanatory notice, recurring rows route to /commitments).
 */
export type LedgerShortcutAction =
  | "next"
  | "prev"
  | "edit"
  | "toggle_select"
  | "delete"
  | "add"
  | "search";

const LETTER_TO_ACTION: Record<string, LedgerShortcutAction> = {
  j: "next",
  k: "prev",
  e: "edit",
  x: "toggle_select",
  n: "add",
  "/": "search",
};

const NAMED_KEY_TO_ACTION: Record<string, LedgerShortcutAction> = {
  Enter: "edit",
  Delete: "delete",
  Backspace: "delete",
};

/**
 * Map a key event (already checked for editable/modifiers) to a ledger action.
 * Letter keys are case-insensitive; meta/ctrl/alt chords stay with the
 * browser/app (⌘K search, ⌘Backspace, etc.) so they resolve to null.
 */
export function resolveLedgerShortcut(
  key: string,
  modifiers?: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean },
): LedgerShortcutAction | null {
  if (modifiers?.metaKey || modifiers?.ctrlKey || modifiers?.altKey) {
    return null;
  }
  if (!key) return null;
  if (key.length === 1) return LETTER_TO_ACTION[key.toLowerCase()] ?? null;
  return NAMED_KEY_TO_ACTION[key] ?? null;
}

export type LedgerEscapeTarget = "search" | "selection" | "row_focus";

/**
 * Esc peels the innermost transient state first: an active search (the field
 * is focused or a query is present), then the bulk selection, then the
 * focused row. Returns null when nothing is left to clear.
 */
export function resolveLedgerEscape(state: {
  searchActive: boolean;
  hasSelection: boolean;
  hasRowFocus: boolean;
}): LedgerEscapeTarget | null {
  if (state.searchActive) return "search";
  if (state.hasSelection) return "selection";
  if (state.hasRowFocus) return "row_focus";
  return null;
}
