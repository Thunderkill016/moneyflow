import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:moneyflow/features/capture/capture_submit.dart';

CaptureIntent _intent({
  TransactionKind kind = TransactionKind.expense,
  bool repeatMonthly = false,
  String? categoryId = 'cat-food',
  int dueDay = 12,
  String commitmentName = 'Bún bò',
}) => CaptureIntent(
  kind: kind,
  accountId: 'acc-cash',
  destinationAccountId: kind == TransactionKind.transfer ? 'acc-bank' : null,
  categoryId: categoryId,
  amount: 100000,
  occurredOn: '2026-10-12',
  idempotencyKey: 'idem-1',
  repeatMonthly: repeatMonthly,
  dueDay: dueDay,
  commitmentName: commitmentName,
);

void main() {
  group('submitCaptureIntent', () {
    test(
      'expense routes to createTransaction, no commitment by default',
      () async {
        var txCalls = 0, transferCalls = 0, commitmentCalls = 0;
        await submitCaptureIntent(
          intent: _intent(),
          createTransaction: (_) async => txCalls++,
          createTransfer: (_) async => transferCalls++,
          createCommitment:
              ({
                required name,
                required amountMinor,
                required dueDay,
                required accountId,
                required categoryId,
              }) async => commitmentCalls++,
        );
        expect(txCalls, 1);
        expect(transferCalls, 0);
        expect(commitmentCalls, 0);
      },
    );

    test(
      'transfer routes to createTransfer and never creates commitment',
      () async {
        var txCalls = 0, transferCalls = 0, commitmentCalls = 0;
        await submitCaptureIntent(
          intent: _intent(
            kind: TransactionKind.transfer,
            categoryId: null,
            repeatMonthly: true, // even if set, transfers can't recur
          ),
          createTransaction: (_) async => txCalls++,
          createTransfer: (_) async => transferCalls++,
          createCommitment:
              ({
                required name,
                required amountMinor,
                required dueDay,
                required accountId,
                required categoryId,
              }) async => commitmentCalls++,
        );
        expect(txCalls, 0);
        expect(transferCalls, 1);
        expect(commitmentCalls, 0);
      },
    );

    test(
      'repeatMonthly creates the commitment after the transaction saves',
      () async {
        final calls = <String>[];
        ({
          String name,
          int amountMinor,
          int dueDay,
          String accountId,
          String categoryId,
        })?
        commitment;
        await submitCaptureIntent(
          intent: _intent(repeatMonthly: true),
          createTransaction: (_) async => calls.add('tx'),
          createTransfer: (_) async => calls.add('transfer'),
          createCommitment:
              ({
                required name,
                required amountMinor,
                required dueDay,
                required accountId,
                required categoryId,
              }) async {
                calls.add('commitment');
                commitment = (
                  name: name,
                  amountMinor: amountMinor,
                  dueDay: dueDay,
                  accountId: accountId,
                  categoryId: categoryId,
                );
              },
        );
        // Ordering matters — the transaction must land first.
        expect(calls, ['tx', 'commitment']);
        expect(commitment!.name, 'Bún bò');
        expect(commitment!.amountMinor, 100000);
        expect(commitment!.dueDay, 12);
        expect(commitment!.accountId, 'acc-cash');
        expect(commitment!.categoryId, 'cat-food');
      },
    );

    test(
      'commitment failure after a successful tx throws CommitmentFailed',
      () async {
        var txCalls = 0;
        await expectLater(
          submitCaptureIntent(
            intent: _intent(repeatMonthly: true),
            createTransaction: (_) async => txCalls++,
            createTransfer: (_) async => throw StateError('unreached'),
            createCommitment:
                ({
                  required name,
                  required amountMinor,
                  required dueDay,
                  required accountId,
                  required categoryId,
                }) async => throw Exception('network'),
          ),
          throwsA(isA<CommitmentFailed>()),
        );
        // The transaction still landed — the failure is honestly partial.
        expect(txCalls, 1);
      },
    );

    test('transaction failure propagates and skips the commitment', () async {
      var commitmentCalls = 0;
      await expectLater(
        submitCaptureIntent(
          intent: _intent(repeatMonthly: true),
          createTransaction: (_) async => throw Exception('offline'),
          createTransfer: (_) async {},
          createCommitment:
              ({
                required name,
                required amountMinor,
                required dueDay,
                required accountId,
                required categoryId,
              }) async => commitmentCalls++,
        ),
        throwsA(isA<Exception>()),
      );
      expect(commitmentCalls, 0);
    });
  });
}
