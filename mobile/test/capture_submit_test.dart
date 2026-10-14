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

CaptureIntent _editIntent({
  TransactionKind kind = TransactionKind.expense,
  bool repeatMonthly = false,
}) => CaptureIntent(
  kind: kind,
  accountId: 'acc-cash',
  destinationAccountId: kind == TransactionKind.transfer ? 'acc-bank' : null,
  categoryId: kind == TransactionKind.transfer ? null : 'cat-food',
  amount: 100000,
  occurredOn: '2026-10-12',
  idempotencyKey: 'idem-1',
  repeatMonthly: repeatMonthly,
  transactionId: 'tx-1',
  expectedUpdatedAt: '2026-10-12T01:00:00Z',
);

Future<void> _noCommitment({
  required String name,
  required int amountMinor,
  required int dueDay,
  required String accountId,
  required String categoryId,
}) async => throw StateError('edit must never create a commitment');

CaptureIntent _splitIntent({String? transactionId}) => CaptureIntent(
  kind: TransactionKind.expense,
  accountId: 'acc-cash',
  amount: 70000,
  occurredOn: '2026-10-12',
  idempotencyKey: 'idem-split',
  splitLines: const [
    (categoryId: 'cat-food', amount: 45000),
    (categoryId: 'cat-transport', amount: 25000),
  ],
  repeatMonthly: true, // must be ignored: a split has no single category
  transactionId: transactionId,
);

void main() {
  group('submitCaptureIntent split', () {
    test('routes to createSplit only and never makes a commitment', () async {
      final calls = <String>[];
      await submitCaptureIntent(
        intent: _splitIntent(),
        createTransaction: (_) async => calls.add('create-tx'),
        createTransfer: (_) async => calls.add('create-transfer'),
        createCommitment: _noCommitment,
        createSplit: (i) async =>
            calls.add('split:${i.splitLines.length}:${i.amount}'),
      );
      expect(calls, ['split:2:70000']);
    });

    test('without a createSplit path it fails instead of posting', () async {
      var created = 0;
      await expectLater(
        submitCaptureIntent(
          intent: _splitIntent(),
          createTransaction: (_) async => created++,
          createTransfer: (_) async => created++,
          createCommitment: _noCommitment,
        ),
        throwsA(isA<StateError>()),
      );
      expect(created, 0);
    });

    test('a split can never be an edit', () async {
      await expectLater(
        submitCaptureIntent(
          intent: _splitIntent(transactionId: 'tx-1'),
          createTransaction: (_) async {},
          createTransfer: (_) async {},
          createCommitment: _noCommitment,
          createSplit: (_) async {},
          updateTransaction: (_) async {},
        ),
        throwsA(isA<StateError>()),
      );
    });
  });

  group('submitCaptureIntent edit mode', () {
    test('expense edit routes to updateTransaction only', () async {
      final calls = <String>[];
      await submitCaptureIntent(
        intent: _editIntent(),
        createTransaction: (_) async => calls.add('create-tx'),
        createTransfer: (_) async => calls.add('create-transfer'),
        createCommitment: _noCommitment,
        updateTransaction: (i) async =>
            calls.add('update-tx:${i.transactionId}'),
        updateTransfer: (_) async => calls.add('update-transfer'),
      );
      expect(calls, ['update-tx:tx-1']);
    });

    test('transfer edit routes to updateTransfer only', () async {
      final calls = <String>[];
      await submitCaptureIntent(
        intent: _editIntent(kind: TransactionKind.transfer),
        createTransaction: (_) async => calls.add('create-tx'),
        createTransfer: (_) async => calls.add('create-transfer'),
        createCommitment: _noCommitment,
        updateTransaction: (_) async => calls.add('update-tx'),
        updateTransfer: (i) async =>
            calls.add('update-transfer:${i.expectedUpdatedAt}'),
      );
      expect(calls, ['update-transfer:2026-10-12T01:00:00Z']);
    });

    test(
      'edit never creates a commitment even if repeatMonthly leaks',
      () async {
        await submitCaptureIntent(
          intent: _editIntent(repeatMonthly: true),
          createTransaction: (_) async {},
          createTransfer: (_) async {},
          createCommitment: _noCommitment,
          updateTransaction: (_) async {},
        );
      },
    );

    test('edit without an update path fails loudly, not as a create', () async {
      var created = 0;
      await expectLater(
        submitCaptureIntent(
          intent: _editIntent(),
          createTransaction: (_) async => created++,
          createTransfer: (_) async => created++,
          createCommitment: _noCommitment,
        ),
        throwsA(isA<StateError>()),
      );
      expect(created, 0);
    });

    test('update failure propagates (stale_write reaches the form)', () async {
      await expectLater(
        submitCaptureIntent(
          intent: _editIntent(),
          createTransaction: (_) async {},
          createTransfer: (_) async {},
          createCommitment: _noCommitment,
          updateTransaction: (_) async => throw Exception('stale_write'),
        ),
        throwsA(isA<Exception>()),
      );
    });
  });

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

  group('submitErrorMessage', () {
    test('DemoReadOnly surfaces the read-only demo notice', () {
      expect(
        submitErrorMessage(const DemoReadOnly()),
        'Demo chỉ xem — đăng nhập để ghi khoản',
      );
    });
  });
}
