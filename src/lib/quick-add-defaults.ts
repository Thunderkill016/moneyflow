import type {
  AccountOption,
  CategoryOption,
  Transaction,
  TransactionKind,
} from "./transactions/contracts.ts";
import type { QuickAddPreset } from "./quick-add-prefs.ts";

export type StableLedgerPresetInput = {
  transactions: Transaction[];
  kind: TransactionKind;
  accounts: AccountOption[];
  categories: CategoryOption[];
};

/**
 * Pick a capture default only when recent trustworthy ledger history is stable.
 *
 * A single unusual transaction must not hijack the next Ghi default, so this
 * helper requires the same account/category pair to appear in at least two of
 * the three most recent eligible transactions for the requested kind.
 *
 * "Recent" follows the ledger's canonical ordering: transaction date first,
 * then creation timestamp and id as deterministic tie-breakers. This prevents a
 * newly-entered backdated row from becoming more recent than today's activity.
 *
 * Transfers, split expenses and review-needed rows are deliberately excluded:
 * they either have different financial semantics or are not trustworthy enough
 * to train a default. Current account/category options are also authoritative,
 * so archived/deleted references cannot be promoted back into the form.
 */
export function deriveStableLedgerPreset({
  transactions,
  kind,
  accounts,
  categories,
}: StableLedgerPresetInput): QuickAddPreset | null {
  const validAccountIds = new Set(accounts.map((account) => account.id));
  const validCategoryIds = new Set(
    categories
      .filter((category) => category.kind === kind)
      .map((category) => category.id),
  );

  const recent = transactions
    .filter(
      (transaction) =>
        transaction.kind === kind &&
        !transaction.splits?.length &&
        transaction.reviewStatus !== "needs_review" &&
        validAccountIds.has(transaction.accountId) &&
        validCategoryIds.has(transaction.categoryId),
    )
    .sort(
      (a, b) =>
        b.occurredOn.localeCompare(a.occurredOn) ||
        b.occurredAt.localeCompare(a.occurredAt) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 3);

  if (recent.length < 3) return null;

  const counts = new Map<string, { count: number; preset: QuickAddPreset }>();
  for (const transaction of recent) {
    const key = `${transaction.accountId}\u0000${transaction.categoryId}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      if (existing.count >= 2) return existing.preset;
      continue;
    }
    counts.set(key, {
      count: 1,
      preset: {
        kind,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
      },
    });
  }

  return null;
}
