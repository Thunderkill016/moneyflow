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

export type FrequentLedgerPattern = QuickAddPreset & {
  count: number;
};

export type FrequentLedgerPatternsInput = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
};

const FREQUENT_PATTERN_WINDOW = 12;
const FREQUENT_PATTERN_MINIMUM_SUPPORT = 2;
const FREQUENT_PATTERN_LIMIT = 2;

function compareLedgerRecency(a: Transaction, b: Transaction): number {
  return (
    b.occurredOn.localeCompare(a.occurredOn) ||
    b.occurredAt.localeCompare(a.occurredAt) ||
    b.id.localeCompare(a.id)
  );
}

function eligibleReviewedTransactions({
  transactions,
  accounts,
  categories,
}: FrequentLedgerPatternsInput): Transaction[] {
  const validAccountIds = new Set(accounts.map((account) => account.id));
  const validCategoryKinds = new Map(
    categories.map((category) => [category.id, category.kind]),
  );

  return transactions.filter(
    (transaction) =>
      (transaction.kind === "expense" || transaction.kind === "income") &&
      !transaction.splits?.length &&
      transaction.reviewStatus === "reviewed" &&
      validAccountIds.has(transaction.accountId) &&
      validCategoryKinds.get(transaction.categoryId) === transaction.kind,
  );
}

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
 * Only explicitly reviewed rows can train a default. Missing review metadata is
 * treated as unknown here rather than silently promoted to trusted evidence.
 * Transfers and split expenses are also excluded because they carry different
 * financial semantics. Current account/category options remain authoritative,
 * so archived/deleted references cannot be promoted back into the form.
 */
export function deriveStableLedgerPreset({
  transactions,
  kind,
  accounts,
  categories,
}: StableLedgerPresetInput): QuickAddPreset | null {
  const recent = eligibleReviewedTransactions({ transactions, accounts, categories })
    .filter((transaction) => transaction.kind === kind)
    .sort(compareLedgerRecency)
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

/**
 * Return a small set of repeated, trustworthy capture contexts.
 *
 * Patterns never include amount, note or date. They only expose exact
 * kind/account/category combinations the user has already reviewed at least
 * twice in the recent ledger window. Frequency wins; the most recent matching
 * row and then the structural key make ordering deterministic.
 */
export function deriveFrequentLedgerPatterns({
  transactions,
  accounts,
  categories,
}: FrequentLedgerPatternsInput): FrequentLedgerPattern[] {
  const recent = eligibleReviewedTransactions({ transactions, accounts, categories })
    .sort(compareLedgerRecency)
    .slice(0, FREQUENT_PATTERN_WINDOW);
  const patterns = new Map<
    string,
    { pattern: FrequentLedgerPattern; firstIndex: number }
  >();

  for (const [index, transaction] of recent.entries()) {
    const key = `${transaction.kind}\u0000${transaction.accountId}\u0000${transaction.categoryId}`;
    const existing = patterns.get(key);
    if (existing) {
      existing.pattern.count += 1;
      continue;
    }
    patterns.set(key, {
      firstIndex: index,
      pattern: {
        kind: transaction.kind as TransactionKind,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        count: 1,
      },
    });
  }

  return [...patterns.entries()]
    .filter(([, candidate]) => candidate.pattern.count >= FREQUENT_PATTERN_MINIMUM_SUPPORT)
    .sort(
      ([keyA, a], [keyB, b]) =>
        b.pattern.count - a.pattern.count ||
        a.firstIndex - b.firstIndex ||
        keyA.localeCompare(keyB),
    )
    .slice(0, FREQUENT_PATTERN_LIMIT)
    .map(([, candidate]) => candidate.pattern);
}
