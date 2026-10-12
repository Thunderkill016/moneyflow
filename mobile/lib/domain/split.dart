// Split-expense line rules — mirrors the create_split_expense RPC so the
// form fails fast with a human message instead of a raw server error.

typedef SplitLine = ({String categoryId, int amount});

/// RPC limit (too_many_split_lines).
const maxSplitLines = 12;

/// Draft line as typed: category/amount may still be missing.
typedef SplitDraft = ({String? categoryId, int? amount});

/// First human-readable problem with [drafts], or null when they form a
/// valid split. Rules: 2–12 lines, every line has a category and a
/// positive amount, and categories are distinct.
String? validateSplit(List<SplitDraft> drafts) {
  if (drafts.length < 2) return 'Chia khoản cần ít nhất 2 dòng';
  if (drafts.length > maxSplitLines) {
    return 'Tối đa $maxSplitLines dòng cho một khoản chia';
  }
  final seen = <String>{};
  for (final d in drafts) {
    if (d.categoryId == null) return 'Chọn danh mục cho mọi dòng';
    if (d.amount == null || d.amount! <= 0) {
      return 'Số tiền mỗi dòng phải lớn hơn 0';
    }
    if (!seen.add(d.categoryId!)) return 'Mỗi danh mục chỉ dùng một dòng';
  }
  return null;
}

/// Sum of line amounts in đồng — the transaction's total.
int splitTotal(Iterable<SplitLine> lines) =>
    lines.fold(0, (sum, l) => sum + l.amount);
