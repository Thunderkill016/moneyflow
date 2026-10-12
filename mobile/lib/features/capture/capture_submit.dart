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
}) async {
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
