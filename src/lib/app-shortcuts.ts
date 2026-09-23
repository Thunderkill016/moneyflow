/**
 * Global keyboard shortcuts (Lunch Money / desktop app pattern).
 * Pure helpers — AppShell wires keydown.
 */

/** Navigate here on ⌘K when not already on ledger with a wired searchBar. */
export const TRANSACTIONS_SEARCH_HREF = "/transactions?focus=search" as const;

/** True when URL should autofocus the topbar ledger search (R5 / Lunch Money). */
export function wantsLedgerSearchFocus(
  searchOrQuery: string | { get(name: string): string | null },
): boolean {
  if (typeof searchOrQuery === "string") {
    const raw = searchOrQuery.startsWith("?")
      ? searchOrQuery.slice(1)
      : searchOrQuery;
    const params = new URLSearchParams(raw);
    return params.get("focus") === "search";
  }
  return searchOrQuery.get("focus") === "search";
}

export function isSearchShortcut(event: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}): boolean {
  if (event.altKey) return false;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key !== "k" && key !== "K") return false;
  return Boolean(event.metaKey || event.ctrlKey);
}

/**
 * Bare "/" — the same search intent as ⌘K, but as printable text it needs the
 * stricter editable guard (`isEditableKeyboardTarget`, which also covers the
 * app search fields) so a typed "/" is never swallowed. Modifier chords stay
 * with the browser/app.
 */
export function isSlashSearchShortcut(event: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return event.key === "/";
}

/**
 * Routes whose workspace already binds "/" to its own search field. The
 * ledger workspace focuses its in-toolbar input (not the topbar), so the
 * global handler yields there instead of racing a page-level listener.
 */
export function pathnameOwnsSlashSearch(pathname: string): boolean {
  return pathname === "/transactions";
}

/** Skip hijacking when user is typing in a field other than our search. */
export function shouldIgnoreShortcutTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (tag === "INPUT") {
    const input = target as HTMLInputElement;
    const type = (input.type || "text").toLowerCase();
    // Allow Cmd+K to re-focus our search input; block other inputs (amount, etc.)
    if (input.getAttribute("data-app-search") === "true") return false;
    if (type === "button" || type === "submit" || type === "checkbox" || type === "radio") {
      return false;
    }
    return true;
  }
  return false;
}
