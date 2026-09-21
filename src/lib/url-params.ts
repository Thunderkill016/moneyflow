/**
 * Removes one query parameter from the current URL without a navigation,
 * preserving every other parameter — used when a deep-link target has been
 * consumed (opened or resolved as missing) so a refresh does not re-open it.
 */
export function clearQueryParam(name: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(name)) return;
  url.searchParams.delete(name);
  window.history.replaceState(null, "", url);
}
