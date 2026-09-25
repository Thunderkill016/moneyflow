/**
 * @deprecated Compatibility surface while type/presentation imports migrate.
 *
 * This module owns no contracts, presentation metadata or demo values. Runtime
 * demo fixtures must be imported from `./demo/transaction-fixtures.ts` so
 * production/core modules cannot acquire them through an ambiguous barrel.
 */
export type {
  AccountOption,
  BulkTransactionCategoryInput,
  BulkTransactionReviewInput,
  CategoryOption,
  CreateSplitExpenseInput,
  CreateTransactionInput,
  CreateTransferInput,
  DeletedTransaction,
  GoalOption,
  Transaction,
  TransactionKind,
  TransactionReviewStatus,
  TransactionSplitLine,
  UpdateMoneyTransactionInput,
  UpdateTransferInput,
} from "./transactions/contracts.ts";

export {
  categories,
  CATEGORY_COLORS,
  categoryMeta,
  categoryMetaFor,
  categoryMetaIndex,
  isCategoryColor,
  resolveCategoryMeta,
  type CategoryColor,
  type CategoryMetaIndex,
  type CategoryPresentationMeta,
} from "./transactions/category-presentation.ts";
