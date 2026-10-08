/**
 * Paged reads for the server Inbox tables.
 *
 * The Inbox list used to read with a single `.limit(1000)` query, so the
 * settings/export download silently dropped every candidate (and batch) past
 * row 1000. These helpers page through the whole table with `.range()` like
 * the transaction feeds already do (`readAllPages` in `../paginated-read.ts`),
 * keeping the legacy-column fallback for old production schemas.
 *
 * Tenant isolation is unchanged: the caller builds the page reader from the
 * viewer's authenticated Supabase client, and RLS (`*_select_own` policies)
 * still restricts every page to the viewer's own rows.
 */

import { readAllPages, type PageResult } from "../paginated-read.ts";

/**
 * Page width matches the old row ceiling, so a list of <=1000 rows resolves
 * in exactly one request — the same single round-trip the old
 * `.limit(1000)` read made.
 */
export const INBOX_PAGED_READ_PAGE_SIZE = 1000;

/**
 * Read one page of inbox rows. `columns` selects either the current column
 * set (with provenance/measurement columns) or the legacy base column set.
 * The caller adds the stable ordering; the last key must be unique (e.g. id)
 * so offset pages neither skip nor duplicate rows.
 */
export type InboxPageReader = (
  from: number,
  to: number,
  columns: string,
) => PromiseLike<PageResult<unknown>>;

/**
 * Read every row of an inbox table, paging until a short page.
 *
 * When the first page fails with a missing-column error (old schema without
 * the provenance/measurement columns), the whole read is retried against the
 * legacy base column set — the same fallback the old single-query read did.
 * Any other error aborts the read and is returned as-is, exactly like
 * `readAllPages`.
 */
export async function readInboxRowsPaged(
  readPage: InboxPageReader,
  ruleColumns: string,
  baseColumns: string,
  isMissingColumnError: (error: unknown) => boolean,
): Promise<PageResult<unknown>> {
  const withRuleColumns = await readAllPages(
    (from, to) => readPage(from, to, ruleColumns),
    INBOX_PAGED_READ_PAGE_SIZE,
  );
  if (withRuleColumns.error && isMissingColumnError(withRuleColumns.error)) {
    return readAllPages(
      (from, to) => readPage(from, to, baseColumns),
      INBOX_PAGED_READ_PAGE_SIZE,
    );
  }
  return withRuleColumns;
}
