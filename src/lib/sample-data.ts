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
  CATEGORY_ICON_NAMES,
  categoryMeta,
  categoryMetaFor,
  categoryMetaIndex,
  isCategoryColor,
  isCategoryIconName,
  PICKABLE_CATEGORY_ICONS,
  resolveCategoryMeta,
  type CategoryColor,
  type CategoryIconName,
  type CategoryMetaIndex,
  type CategoryPresentationMeta,
  type PickableCategoryIcon,
} from "./transactions/category-presentation.ts";
