/**
 * Per-row mutation registry.
 *
 * Row-scoped RPCs (delete, restore, update) mark only the ids they touch so
 * one slow request freezes its own row's controls — and its own undo affordance
 * — instead of the whole register. Form-level and bulk mutations keep the
 * hook's global `isMutating` flag.
 *
 * Both helpers return a NEW set: the value lives in React state, so updates
 * must change identity to re-render subscribers.
 */

export function addMutatingIds(
  current: ReadonlySet<string>,
  ids: readonly string[],
): ReadonlySet<string> {
  const next = new Set(current);
  for (const id of ids) next.add(id);
  return next;
}

export function removeMutatingIds(
  current: ReadonlySet<string>,
  ids: readonly string[],
): ReadonlySet<string> {
  if (ids.length === 0) return current;
  const next = new Set(current);
  for (const id of ids) next.delete(id);
  return next;
}
