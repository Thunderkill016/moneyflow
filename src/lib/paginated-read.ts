export const PAGINATED_READ_PAGE_SIZE = 500;

export type PageResult<T> = {
  data: T[] | null;
  error: unknown | null;
};

export async function readAllPages<T>(
  readPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = PAGINATED_READ_PAGE_SIZE,
): Promise<PageResult<T>> {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new Error("invalid_page_size");
  }

  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await readPage(from, from + pageSize - 1);
    if (result.error) return { data: null, error: result.error };
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}
