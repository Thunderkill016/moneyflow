// Bulk-selection rules — mirror the guards in the
// bulk_update_transaction_category / set_transaction_review_status_bulk
// RPCs so the UI explains a blocked action instead of failing on submit.

import 'models.dart';

/// RPC cap (transaction_selection_limit).
const maxBulkSelection = 100;

/// Why [selected] cannot take one shared category, or null when it can.
/// Rules: transfers have no category, split rows are locked, and every
/// row must be the same kind (an expense category can't go on income).
String? bulkCategoryBlocker(List<Transaction> selected) {
  if (selected.isEmpty) return 'Chọn ít nhất một giao dịch';
  if (selected.any((t) => t.kind == TransactionKind.transfer)) {
    return 'Khoản chuyển không có danh mục';
  }
  if (selected.any((t) => t.isSplit)) {
    return 'Khoản chia danh mục không đổi hàng loạt được';
  }
  if (selected.map((t) => t.kind).toSet().length > 1) {
    return 'Chỉ đổi danh mục cho các khoản cùng loại (chi hoặc thu)';
  }
  return null;
}

/// The shared kind of a selection that passed [bulkCategoryBlocker].
TransactionKind? bulkCategoryKind(List<Transaction> selected) =>
    bulkCategoryBlocker(selected) == null ? selected.first.kind : null;

/// Review counts shown on the "Cần xem lại" filter chip.
int needsReviewCount(Iterable<Transaction> txs) => txs
    .where((t) => t.reviewStatus == TransactionReviewStatus.needsReview)
    .length;
