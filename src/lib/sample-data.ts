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
  Transaction,
  TransactionKind,
  TransactionReviewStatus,
  TransactionSplitLine,
  UpdateMoneyTransactionInput,
  UpdateTransferInput,
} from "./transactions/contracts.ts";

export { categories, categoryMeta } from "./transactions/category-presentation.ts";
