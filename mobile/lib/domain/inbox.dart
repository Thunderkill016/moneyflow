// Inbox review queue — domain types mirroring src/lib/inbox/* and the
// public.inbox_candidates row contract. Money stays integer đồng.
//
// Product law this module serves: pasted/imported/shared text only ever
// becomes a *candidate* — it posts to the ledger only after an explicit
// approve, through the same approve_inbox_candidate RPC the web uses.

import 'models.dart';

/// One pending/reviewed inbox item — the camelCase read model the web's
/// `mapCandidateRow` produces from an `inbox_candidates` row.
class InboxCandidate {
  const InboxCandidate({
    required this.id,
    required this.kind,
    required this.amountMinor,
    required this.merchant,
    required this.note,
    required this.occurredOn,
    required this.source,
    required this.confidence,
    this.possibleDuplicate = false,
    this.possibleTransfer = false,
    this.categoryId,
    this.categoryName,
    this.accountId,
    this.accountName,
    this.rawSnippet,
    this.createdAt,
  });

  final String id;
  final TransactionKind kind;

  /// Integer VND đồng — the row's `amount_minor`.
  final int amountMinor;
  final String merchant;
  final String note;

  /// YYYY-MM-DD.
  final String occurredOn;

  /// Raw enum text (`paste`, `csv`, `notification`, …). Kept as a string so a
  /// newer upstream source value can never break row mapping — the label
  /// helper falls back to the raw text.
  final String source;

  /// `high` | `medium` | `low` — raw text, same forward-compat rationale.
  final String confidence;
  final bool possibleDuplicate;
  final bool possibleTransfer;
  final String? categoryId;
  final String? categoryName;
  final String? accountId;
  final String? accountName;
  final String? rawSnippet;
  final String? createdAt;
}

/// A parsed pasted-SMS line that has not been persisted yet — the input the
/// insert path turns into a pending candidate row.
class InboxPasteDraft {
  const InboxPasteDraft({
    required this.kind,
    required this.amountMinor,
    required this.merchant,
    required this.occurredOn,
    required this.confidence,
    required this.rawSnippet,
    this.uncertainFields = const [],
  });

  final TransactionKind kind;
  final int amountMinor;
  final String merchant;
  final String occurredOn; // YYYY-MM-DD
  final String confidence; // 'high' | 'medium' | 'low'
  final String rawSnippet;

  /// Fields the parser could not prove (amount/date/kind/merchant) —
  /// preview-only like the web's uncertainFields: they explain why a row is
  /// "Cần xem" but are never persisted.
  final List<String> uncertainFields;
}

/// The reviewer's final say — every field maps 1:1 onto an
/// `approve_inbox_candidate` parameter (the web's AtomicInboxApprovalInput).
class InboxApproval {
  const InboxApproval({
    required this.candidateId,
    required this.kind,
    required this.accountId,
    this.categoryId,
    this.destinationAccountId,
    required this.amountMinor,
    required this.occurredOn,
    this.note = '',
    this.payee = '',
    this.allowHeuristicDuplicate = false,
  });

  final String candidateId;
  final TransactionKind kind;
  final String accountId;
  final String? categoryId;
  final String? destinationAccountId;
  final int amountMinor;
  final String occurredOn;
  final String note;
  final String payee;
  final bool allowHeuristicDuplicate;
}

/// Server dry-run verdict — `plan_inbox_candidate` jsonb, the same shape the
/// web parses with `parseInboxDryRunResult`.
class InboxPlan {
  const InboxPlan({
    required this.status,
    required this.reason,
    required this.confidence,
    this.matchedTransactionId,
  });

  /// `would_create` | `duplicate` | `suspected_transfer` | `invalid`.
  final String status;
  final String reason;

  /// 0..1 — PostgREST may encode it as a string; normalized on parse.
  final double confidence;
  final String? matchedTransactionId;
}

const _planStatuses = {
  'would_create',
  'duplicate',
  'suspected_transfer',
  'invalid',
};

/// Decode `plan_inbox_candidate` output; null when the payload is malformed
/// (same fail-closed posture as the web's Zod parse, softened to a retryable
/// "unavailable" instead of an exception).
InboxPlan? parseInboxPlan(Object? value) {
  if (value is! Map) return null;
  final status = value['status'];
  final reason = value['reason'];
  final rawConfidence = value['confidence'];
  final confidence = rawConfidence is num
      ? rawConfidence.toDouble()
      : double.tryParse('$rawConfidence');
  if (status is! String ||
      !_planStatuses.contains(status) ||
      reason is! String ||
      confidence == null ||
      confidence < 0 ||
      confidence > 1) {
    return null;
  }
  final matched = value['matched_transaction_id'];
  return InboxPlan(
    status: status,
    reason: reason,
    confidence: confidence,
    matchedTransactionId: matched is String ? matched : null,
  );
}

/// Duplicate verdicts the web lets a reviewer override explicitly
/// (`REVIEWABLE_DUPLICATE_REASONS`); every other duplicate reason is a hard
/// block because it means "same source identity" — never double-post.
const _overridableDuplicateReasons = {
  'fingerprint_transaction_match',
  'fingerprint_candidate_match',
  'existing_transaction_match',
  'existing_transaction_ambiguous',
};

bool allowsInboxDuplicateOverride(InboxPlan? plan) =>
    plan != null &&
    plan.status == 'duplicate' &&
    _overridableDuplicateReasons.contains(plan.reason);

/// A duplicate verdict that must not produce a new ledger row at all
/// (proven source-identity matches and already-approved candidates).
bool inboxPlanBlocksApproval(InboxPlan? plan) =>
    plan != null &&
    plan.status == 'duplicate' &&
    !allowsInboxDuplicateOverride(plan);

/// Vietnamese verdict text — a scoped port of `dryRunUserMessage` covering
/// the statuses a mobile reviewer can act on; source-lineage reasons fall
/// back to the generic duplicate wording.
String inboxPlanMessage(InboxPlan plan) {
  if (plan.status == 'would_create') return 'Sẵn sàng ghi vào sổ.';
  if (plan.status == 'suspected_transfer') {
    return 'Có dấu hiệu chuyển khoản nội bộ. Hãy chọn đúng hai tài khoản.';
  }
  if (plan.status == 'duplicate') {
    return switch (plan.reason) {
      'already_approved' => 'Mục này đã được duyệt thành giao dịch trước đó.',
      'source_external_id_match' =>
        'Giao dịch này đã được nhập từ cùng mã nguồn.',
      'existing_transaction_match' =>
        'Đã có một giao dịch cùng tài khoản, ngày và số tiền.',
      'existing_transaction_ambiguous' =>
        'Có nhiều giao dịch đã có cùng tài khoản, ngày và số tiền. '
            'MoneyFlow không tự chọn để tránh gắn nhầm.',
      _ => 'Có giao dịch rất giống đã tồn tại. Hãy kiểm tra trước khi duyệt.',
    };
  }
  if (plan.reason == 'source_removed_unmatched') {
    return 'Nguồn báo giao dịch đã bị gỡ nhưng MoneyFlow chưa có danh tính '
        'nguồn tương ứng. Mục này không được tạo thành giao dịch mới.';
  }
  if (plan.reason == 'account_required') return 'Hãy chọn tài khoản.';
  if (plan.reason == 'category_required') return 'Hãy chọn danh mục.';
  return 'Ứng viên chưa đủ điều kiện để ghi sổ.';
}

/// Candidate source → badge text (mirrors SOURCE_LABELS; machine sources keep
/// their raw token, exactly like the web).
String inboxSourceLabel(String source) => switch (source) {
  'voice' => 'giọng nói',
  'notification' => 'thông báo',
  'agent' => 'AI agent',
  'commitment' => 'định kỳ',
  _ => source,
};

String inboxConfidenceLabel(String confidence) => switch (confidence) {
  'high' => 'Khá chắc',
  'medium' => 'Tạm ổn',
  'low' => 'Cần xem',
  _ => confidence,
};

String inboxKindLabel(TransactionKind kind) => switch (kind) {
  TransactionKind.expense => 'Chi',
  TransactionKind.income => 'Thu',
  TransactionKind.transfer => 'Chuyển khoản',
};

/// The candidate's suggested account, resolved like the web's
/// `resolveAccountId`: explicit id wins; otherwise a stored *name* must match
/// exactly one account (ambiguous names resolve to nothing rather than
/// guessing at money movement).
String? resolveInboxAccountId(
  InboxCandidate candidate,
  List<AccountSummary> accounts,
) {
  final byId = candidate.accountId;
  if (byId != null && byId.isNotEmpty) {
    for (final a in accounts) {
      if (a.id == byId) return a.id;
    }
    return null;
  }
  final wanted = candidate.accountName?.trim().toLowerCase();
  if (wanted == null || wanted.isEmpty) return null;
  final matches = [
    for (final a in accounts)
      if (a.name.trim().toLowerCase() == wanted) a,
  ];
  return matches.length == 1 ? matches.first.id : null;
}

/// Same resolution for the suggested category — kind-filtered first so an
/// income-category name can never satisfy an expense draft
/// (`resolveCategoryId` in the web).
String? resolveInboxCategoryId(
  InboxCandidate candidate,
  List<Category> categories,
) {
  final kind = candidate.kind == TransactionKind.income
      ? TransactionKind.income
      : TransactionKind.expense;
  final pool = [
    for (final c in categories)
      if (c.kind == kind) c,
  ];
  final byId = candidate.categoryId;
  if (byId != null && byId.isNotEmpty) {
    for (final c in pool) {
      if (c.id == byId) return c.id;
    }
    return null;
  }
  final wanted = candidate.categoryName?.trim().toLowerCase();
  if (wanted == null || wanted.isEmpty) return null;
  final named = [
    for (final c in categories)
      if (c.name.trim().toLowerCase() == wanted) c,
  ];
  final matchingKind = [
    for (final c in named)
      if (c.kind == kind) c,
  ];
  if (matchingKind.length == 1) return matchingKind.first.id;
  return named.length == 1 ? named.first.id : null;
}

/// Human message for a failed `approve_inbox_candidate` call — a port of the
/// web action's `approvalErrorMessage` substring table (the Data API surfaces
/// the raised SQLSTATE detail in the response body, so substring matching on
/// `toString()` hits the same tokens).
String inboxApprovalErrorMessage(Object error) {
  final message = error.toString();
  if (message.contains('source_observation_unchanged')) {
    return 'Nguồn không thay đổi so với bằng chứng gốc nên không cần ghi nhận '
        'một cập nhật nguồn mới.';
  }
  if (message.contains('changed_source_match_required') ||
      message.contains('source_lifecycle_review_match_required') ||
      message.contains('candidate_not_source_observation') ||
      message.contains('candidate_not_source_lifecycle_observation')) {
    return 'Cập nhật nguồn không còn khớp với giao dịch đã kiểm tra. '
        'Hãy tải lại và đối chiếu lại.';
  }
  if (message.contains('source_observation_changed')) {
    return 'Nguồn gửi lại cùng mã giao dịch nhưng bằng chứng đã thay đổi. '
        'MoneyFlow không khôi phục hoặc ghi đè trong thao tác này.';
  }
  if (message.contains('source_external_id_duplicate')) {
    return 'Giao dịch này đã được nhập từ cùng mã nguồn.';
  }
  if (message.contains('source_provenance_not_found')) {
    return 'Không tìm thấy bằng chứng nguồn chuẩn cho giao dịch này. '
        'Hãy tải lại và kiểm tra lại.';
  }
  if (message.contains('deleted_source_match_required') ||
      message.contains('transaction_not_deleted') ||
      message.contains('candidate_not_restoreable') ||
      message.contains('transaction_restore_race')) {
    return 'Giao dịch đã xóa không còn đủ điều kiện để khôi phục từ nguồn '
        'này. Hãy tải lại và kiểm tra lại.';
  }
  if (message.contains('transaction_deleted')) {
    return 'Giao dịch đã bị xóa. Hãy tải lại danh sách.';
  }
  if (message.contains('existing_transaction_match_ambiguous')) {
    return 'Có nhiều giao dịch đã có cùng tài khoản, ngày và số tiền. '
        'MoneyFlow không tự chọn để tránh gắn nhầm.';
  }
  if (message.contains('existing_transaction_match_required') ||
      message.contains('transaction_not_eligible') ||
      message.contains('transaction_already_provenanced')) {
    return 'Giao dịch đã có không còn đủ điều kiện để gắn nguồn. '
        'Hãy tải lại và kiểm tra lại.';
  }
  if (message.contains('candidate_not_attachable')) {
    return 'Nguồn này không dùng được thao tác gắn vào giao dịch đã có.';
  }
  if (message.contains('candidate_duplicate')) {
    return 'Có giao dịch rất giống đã tồn tại. Kiểm tra kỹ trước khi duyệt.';
  }
  if (message.contains('candidate_requires_transfer_review')) {
    return 'Mục này có dấu hiệu chuyển khoản nội bộ. '
        'Hãy chọn loại chuyển tiền và hai tài khoản.';
  }
  if (message.contains('candidate_not_found') ||
      message.contains('candidate_not_pending')) {
    return 'Mục này không còn ở trạng thái chờ duyệt. Hãy tải lại danh sách.';
  }
  if (message.contains('currency_mismatch')) {
    return 'Chỉ chuyển được giữa hai tài khoản cùng loại tiền.';
  }
  if (message.contains('account_not_found') ||
      message.contains('transaction_not_found')) {
    return 'Tài khoản hoặc giao dịch không hợp lệ — hãy tải lại.';
  }
  if (message.contains('category_kind_mismatch') ||
      message.contains('category_archived')) {
    return 'Danh mục không hợp lệ cho loại giao dịch đã chọn.';
  }
  if (message.contains('idempotency_key_in_use')) {
    return 'Yêu cầu ghi sổ đã được dùng cho một giao dịch khác. '
        'Hãy tải lại và thử lại.';
  }
  if (message.contains('payee_too_long')) {
    return 'Tên người nhận/nơi chi quá dài (tối đa 200 ký tự).';
  }
  if (message.contains('different_accounts_required')) {
    return 'Hai tài khoản chuyển phải khác nhau.';
  }
  return 'Không thể duyệt mục này. Hãy kiểm tra dữ liệu rồi thử lại.';
}
