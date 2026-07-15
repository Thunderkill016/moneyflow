/**
 * Global keyboard shortcuts (Lunch Money / desktop app pattern).
 * Pure helpers — AppShell wires keydown.
 */

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
