// Capture submit orchestration — pure async wiring, store-agnostic so the
// transaction→commitment sequence is unit-testable without a RealStore.
// app.dart injects the Data API calls; tests inject spies.

import 'capture_page.dart' show CaptureIntent;
import '../../domain/models.dart' show TransactionKind;

/// The transaction was saved but the recurring-commitment create failed —
/// the page surfaces this as an honest partial save, not a full failure.
class CommitmentFailed implements Exception {
  const CommitmentFailed();
}

/// The intent was held in the offline queue after a transport failure —
/// the page pops with `CaptureResult.queued` so the shell can tell the
/// user the write was kept, not lost.
class CaptureQueued implements Exception {
  const CaptureQueued();
}

/// The offline queue is full — surfaced as a normal submit error so a
/// held write is never silently displaced by a newer one.
class OfflineQueueFull implements Exception {
  const OfflineQueueFull(this.limit);

  /// The queue cap that refused the enqueue.
  final int limit;
}

/// A save attempt inside read-only demo mode — the form stays open and
/// shows the demo notice instead of a misleading retry hint.
class DemoReadOnly implements Exception {
  const DemoReadOnly();
}

/// Honest message for a failed capture submit — shared by the form's
/// inline error and the queue-replay drop report so the same failure is
/// described the same way in both places.
String submitErrorMessage(Object e) {
  final msg = e.toString();
  if (e is DemoReadOnly) {
    return 'Demo chỉ xem — đăng nhập để ghi khoản';
  }
  if (e is OfflineQueueFull) {
    return 'Đã giữ tối đa ${e.limit} khoản chờ gửi — kết nối mạng để '
        'gửi bớt rồi thử lại';
  }
  if (msg.contains('stale_write')) {
    return 'Khoản này vừa thay đổi — thoát rồi mở lại để sửa bản mới';
  }
  if (msg.contains('recurring_payment_locked')) {
    return 'Khoản trả định kỳ không sửa được — xóa rồi ghi lại';
  }
  if (msg.contains('transaction_kind_locked')) {
    return 'Không đổi được kiểu của khoản chuyển';
  }
  if (msg.contains('refund_requires_income_kind')) {
    return 'Hoàn tiền chỉ ghi ở khoản Thu — chuyển kiểu hoặc bỏ chọn';
  }
  if (msg.contains('refund_requires_expense_category')) {
    return 'Hoàn tiền cần một danh mục chi — chọn danh mục chi';
  }
  return 'Không lưu được — thử lại';
}

/// One submit path for every capture surface — transaction vs transfer
/// routes to the matching RPC; the intent's idempotency key guards replays.
/// When [CaptureIntent.repeatMonthly] is set, a monthly commitment is
/// created after the transaction — reusing the existing upsert_commitment
/// contract (Money Manager's "Lặp lại" inline pattern).
Future<void> submitCaptureIntent({
  required CaptureIntent intent,
  required Future<void> Function(CaptureIntent intent) createTransaction,
  required Future<void> Function(CaptureIntent intent) createTransfer,
  required Future<void> Function({
    required String name,
    required int amountMinor,
    required int dueDay,
    required String accountId,
    required String categoryId,
  })
  createCommitment,
  Future<void> Function(CaptureIntent intent)? updateTransaction,
  Future<void> Function(CaptureIntent intent)? updateTransfer,
  Future<void> Function(CaptureIntent intent)? createSplit,
}) async {
  // A split is a create-only expense across categories: it never edits,
  // never recurs (no single category to commit against).
  if (intent.splitLines.isNotEmpty) {
    if (intent.transactionId != null || createSplit == null) {
      throw StateError('split intent without a create-split path');
    }
    await createSplit(intent);
    return;
  }
  // Edit mode: an intent carrying a transactionId updates in place —
  // it never creates, and never spawns a commitment.
  if (intent.transactionId != null) {
    final update = intent.kind == TransactionKind.transfer
        ? updateTransfer
        : updateTransaction;
    if (update == null) throw StateError('edit intent without an update path');
    await update(intent);
    return;
  }
  if (intent.kind == TransactionKind.transfer) {
    await createTransfer(intent);
  } else {
    await createTransaction(intent);
  }
  // Transfers and uncategorized captures can't become commitments — the
  // form hides the checkbox for transfers, this is belt-and-braces.
  if (!intent.repeatMonthly || intent.categoryId == null) return;
  try {
    await createCommitment(
      name: intent.commitmentName,
      amountMinor: intent.amount,
      dueDay: intent.dueDay,
      accountId: intent.accountId,
      categoryId: intent.categoryId!,
    );
  } catch (_) {
    throw const CommitmentFailed();
  }
}
