import type {
  AccountOption,
  CategoryOption,
  Transaction,
  TransactionKind,
} from "./transactions/contracts.ts";
import type { QuickAddPreset } from "./quick-add-prefs.ts";
import { normalizeSearchText } from "./search-text.ts";

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

/**
 * Distinct recorded payees for datalist autocompletion. Sorted by Vietnamese
 * collation so the suggestion order is stable and readable.
 */
export function derivePayeeSuggestions(transactions: Transaction[]): string[] {
  const seen = new Set<string>();
  for (const transaction of transactions) {
    const value = transaction.payee?.trim();
    if (value) seen.add(value);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, "vi"));
}

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

export type PayeeCategorySuggestion = {
  categoryId: string;
  categoryName: string;
  /** The stored payee spelling the suggestion was derived from. */
  matchedPayee: string;
};

export type PayeeCategorySuggestionInput = FrequentLedgerPatternsInput & {
  /** The payee currently typed into the capture form. */
  payee: string;
  kind: TransactionKind;
};

/**
 * The category a reviewed ledger row last carried for this exact payee.
 *
 * Matching folds diacritics and case through `normalizeSearchText` — "grab"
 * finds "Grab", "com minh duc" finds "Cơm Minh Đức" — but only on the whole
 * name: a partial "Gra" must not pre-empt the reader's own category choice.
 *
 * When several reviewed rows share the payee under different categories, the
 * MOST RECENT one wins (the canonical ledger ordering). Recency is the
 * simpler honest rule: it reflects how the user files the payee today, while
 * a frequency vote would quietly resurrect a category the user has already
 * moved away from. Only the trusted set can answer — reviewed, unsplit,
 * kind-matched rows whose account and category references still resolve.
 *
 * The result is an offer, never a default: callers render it as a tappable
 * suggestion and must not apply it without an explicit tap.
 */
export function derivePayeeCategorySuggestion({
  transactions,
  payee,
  kind,
  accounts,
  categories,
}: PayeeCategorySuggestionInput): PayeeCategorySuggestion | null {
  const folded = normalizeSearchText(payee);
  if (!folded) return null;
  const match = eligibleReviewedTransactions({ transactions, accounts, categories })
    .filter((transaction) => transaction.kind === kind)
    .sort(compareLedgerRecency)
    .find(
      (transaction) => normalizeSearchText(transaction.payee ?? "") === folded,
    );
  if (!match) return null;
  // Eligibility already proved the category exists with the right kind; the
  // lookup only supplies the display name.
  const category = categories.find((item) => item.id === match.categoryId);
  if (!category) return null;
  return {
    categoryId: category.id,
    categoryName: category.name,
    matchedPayee: (match.payee ?? "").trim(),
  };
}
