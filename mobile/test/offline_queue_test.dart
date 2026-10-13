import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/offline_queue.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:moneyflow/features/capture/capture_submit.dart';
import 'package:moneyflow/features/capture/queue_banner.dart';
import 'package:shared_preferences/shared_preferences.dart';

CaptureIntent _intent({
  String key = 'idem-1',
  TransactionKind kind = TransactionKind.expense,
  String? transactionId,
}) => CaptureIntent(
  kind: kind,
  accountId: 'acc-cash',
  destinationAccountId: kind == TransactionKind.transfer ? 'acc-bank' : null,
  categoryId: kind == TransactionKind.transfer ? null : 'cat-food',
  amount: 100000,
  occurredOn: '2026-11-02',
  note: 'bún bò',
  payee: 'quán A',
  idempotencyKey: key,
  transactionId: transactionId,
  expectedUpdatedAt: transactionId == null ? null : '2026-11-01T02:00:00Z',
);

/// A capture with every populated field — exercises the full codec.
CaptureIntent _kitchenSinkIntent() => CaptureIntent(
  kind: TransactionKind.expense,
  accountId: 'acc-1',
  destinationAccountId: 'acc-2',
  categoryId: 'cat-9',
  amount: 125000,
  occurredOn: '2026-11-02',
  note: 'ghi chú có dấu',
  payee: 'quán ăn',
  idempotencyKey: 'idem-full',
  repeatMonthly: true,
  dueDay: 14,
  commitmentName: 'tiền nhà',
  transactionId: 'tx-7',
  expectedUpdatedAt: '2026-11-01T02:00:00Z',
  splitLines: const [
    (categoryId: 'c1', amount: 100000),
    (categoryId: 'c2', amount: 25000),
  ],
);

void _expectSameIntent(CaptureIntent a, CaptureIntent b) {
  expect(b.kind, a.kind);
  expect(b.accountId, a.accountId);
  expect(b.destinationAccountId, a.destinationAccountId);
  expect(b.categoryId, a.categoryId);
  expect(b.amount, a.amount);
  expect(b.occurredOn, a.occurredOn);
  expect(b.note, a.note);
  expect(b.payee, a.payee);
  expect(b.idempotencyKey, a.idempotencyKey);
  expect(b.repeatMonthly, a.repeatMonthly);
  expect(b.dueDay, a.dueDay);
  expect(b.commitmentName, a.commitmentName);
  expect(b.transactionId, a.transactionId);
  expect(b.expectedUpdatedAt, a.expectedUpdatedAt);
  expect(b.splitLines, a.splitLines);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;
  late OfflineCaptureQueue queue;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    queue = OfflineCaptureQueue(prefs);
  });

  group('QueuedCapture codec', () {
    test('round-trips every populated field', () {
      final intent = _kitchenSinkIntent();
      final decoded = QueuedCapture.fromJson(
        QueuedCapture(intent: intent, enqueuedAtMs: 123456).toJson(),
      );
      expect(decoded.enqueuedAtMs, 123456);
      _expectSameIntent(intent, decoded.intent);
    });

    test('round-trips through jsonEncode/jsonDecode', () {
      final intent = _intent(key: 'idem-json');
      final decoded = QueuedCapture.fromJson(
        jsonDecode(
              jsonEncode(
                QueuedCapture(intent: intent, enqueuedAtMs: 1).toJson(),
              ),
            )
            as Map<String, Object?>,
      );
      _expectSameIntent(intent, decoded.intent);
    });

    test('a malformed entry throws FormatException', () {
      expect(
        () => QueuedCapture.fromJson({'kind': 'mystery'}),
        throwsA(isA<FormatException>()),
      );
    });
  });

  group('OfflineCaptureQueue', () {
    test('enqueue persists and restores across instances', () async {
      await queue.enqueue(_intent(key: 'k1'));
      await queue.enqueue(_intent(key: 'k2'));

      final restored = OfflineCaptureQueue(prefs);
      expect(restored.pendingCount, 2);
      expect(restored.pending.map((i) => i.intent.idempotencyKey), [
        'k1',
        'k2',
      ]);
      _expectSameIntent(
        _kitchenSinkIntent(),
        QueuedCapture.fromJson(
          QueuedCapture(intent: _kitchenSinkIntent(), enqueuedAtMs: 1).toJson(),
        ).intent,
      );
    });

    test('a corrupt persisted entry is dropped, the rest survive', () async {
      await queue.enqueue(_intent(key: 'good'));
      // Corrupt the blob by hand: one bad item between two good ones.
      final bad =
          jsonDecode(prefs.getString(offlineQueueStorageKey)!)
              as Map<String, Object?>;
      (bad['items'] as List).insert(0, {'kind': 42});
      await prefs.setString(offlineQueueStorageKey, jsonEncode(bad));

      final restored = OfflineCaptureQueue(prefs);
      expect(restored.pendingCount, 1);
      expect(restored.pending.single.intent.idempotencyKey, 'good');
    });

    test('the cap refuses the 21st intent with OfflineQueueFull', () async {
      for (var i = 0; i < offlineQueueMaxPending; i++) {
        await queue.enqueue(_intent(key: 'k$i'));
      }
      expect(queue.pendingCount, offlineQueueMaxPending);
      await expectLater(
        queue.enqueue(_intent(key: 'one-too-many')),
        throwsA(isA<OfflineQueueFull>()),
      );
      // The newest intent is refused; all 20 held intents stay put.
      expect(queue.pendingCount, offlineQueueMaxPending);
      expect(
        queue.pending.any((i) => i.intent.idempotencyKey == 'one-too-many'),
        isFalse,
      );
    });

    test('remove drops only the matching idempotency key', () async {
      await queue.enqueue(_intent(key: 'k1'));
      await queue.enqueue(_intent(key: 'k2'));
      await queue.enqueue(_intent(key: 'k3'));
      await queue.remove('k2');
      expect(queue.pending.map((i) => i.intent.idempotencyKey), ['k1', 'k3']);
      final restored = OfflineCaptureQueue(prefs);
      expect(restored.pendingCount, 2);
    });
  });

  group('account scoping', () {
    test('a scoped queue writes its own key, not the unscoped one', () async {
      final alice = OfflineCaptureQueue(prefs, userId: 'u-alice');
      await alice.enqueue(_intent(key: 'held-alice'));

      expect(prefs.getString('mf_offline_capture_queue_u-alice'), isNotNull);
      expect(prefs.getString(offlineQueueStorageKey), isNull);
    });

    test('one account never sees another account’s held captures', () async {
      final alice = OfflineCaptureQueue(prefs, userId: 'u-alice');
      await alice.enqueue(_intent(key: 'held-alice'));

      final bob = OfflineCaptureQueue(prefs, userId: 'u-bob');
      expect(bob.pendingCount, 0);
      final unscoped = OfflineCaptureQueue(prefs);
      expect(unscoped.pendingCount, 0);
      // Alice's own re-bind still sees them.
      final aliceAgain = OfflineCaptureQueue(prefs, userId: 'u-alice');
      expect(aliceAgain.pendingCount, 1);
    });

    test(
      'pre-scoping unscoped captures adopt into the bound account',
      () async {
        // Written by a pre-scoping build: the blob sits under the bare key.
        final legacy = OfflineCaptureQueue(prefs);
        await legacy.enqueue(_intent(key: 'held-legacy'));

        final alice = OfflineCaptureQueue(prefs, userId: 'u-alice');
        expect(alice.pendingCount, 1);
        expect(alice.pending.single.intent.idempotencyKey, 'held-legacy');
        // The adoption re-persists under the scoped key and sweeps the
        // legacy one — a second account can never inherit them.
        await pumpEventQueue();
        expect(prefs.getString(offlineQueueStorageKey), isNull);
        expect(prefs.getString('mf_offline_capture_queue_u-alice'), isNotNull);
      },
    );

    test('a scoped re-bind does not re-adopt cleared legacy keys', () async {
      final alice = OfflineCaptureQueue(prefs, userId: 'u-alice');
      await alice.enqueue(_intent(key: 'held-alice'));
      // Sign-out removed the unscoped key — binding an unscoped store
      // must not resurrect Alice's captures.
      await prefs.remove(offlineQueueStorageKey);
      final unscoped = OfflineCaptureQueue(prefs);
      expect(unscoped.pendingCount, 0);
    });
  });

  group('isQueueableSubmitFailure', () {
    test('transport failures queue', () {
      expect(isQueueableSubmitFailure(const SocketException('down')), isTrue);
      expect(isQueueableSubmitFailure(const HttpException('down')), isTrue);
      expect(isQueueableSubmitFailure(const HandshakeException('tls')), isTrue);
      expect(isQueueableSubmitFailure(TimeoutException('t')), isTrue);
    });

    test('server 5xx queues', () {
      expect(
        isQueueableSubmitFailure(NeonAuthException(500, 'internal')),
        isTrue,
      );
      expect(
        isQueueableSubmitFailure(NeonAuthException(503, 'unavailable')),
        isTrue,
      );
    });

    test('HTTP 4xx business errors never queue', () {
      for (final status in [400, 401, 403, 404, 409, 422]) {
        expect(
          isQueueableSubmitFailure(
            NeonAuthException(status, 'invalid_transaction_entries'),
          ),
          isFalse,
          reason: 'status $status',
        );
      }
      expect(
        isQueueableSubmitFailure(NeonAuthException(400, 'stale_write')),
        isFalse,
      );
    });

    test('programmer/data errors never queue', () {
      expect(isQueueableSubmitFailure(StateError('bad')), isFalse);
      expect(isQueueableSubmitFailure(const FormatException('bad')), isFalse);
      expect(isQueueableSubmitFailure(Exception('stale_write')), isFalse);
    });
  });

  group('submitOrQueue', () {
    test(
      'an offline failure holds the intent and throws CaptureQueued',
      () async {
        await expectLater(
          submitOrQueue(
            _intent(key: 'held'),
            queue,
            (_) async => throw const SocketException('no route'),
          ),
          throwsA(isA<CaptureQueued>()),
        );
        expect(queue.pendingCount, 1);
        // The SAME idempotency key is preserved for replay — never re-keyed.
        expect(queue.pending.single.intent.idempotencyKey, 'held');
      },
    );

    test('a business failure propagates and holds nothing', () async {
      await expectLater(
        submitOrQueue(
          _intent(),
          queue,
          (_) async =>
              throw NeonAuthException(400, 'invalid_transaction_entries'),
        ),
        throwsA(isA<NeonAuthException>()),
      );
      expect(queue.pendingCount, 0);
    });

    test(
      'CommitmentFailed propagates without queueing — the tx landed',
      () async {
        await expectLater(
          submitOrQueue(
            _intent(),
            queue,
            (_) async => throw const CommitmentFailed(),
          ),
          throwsA(isA<CommitmentFailed>()),
        );
        expect(queue.pendingCount, 0);
      },
    );

    test('a successful submit holds nothing', () async {
      await submitOrQueue(_intent(), queue, (_) async {});
      expect(queue.pendingCount, 0);
    });

    test('a full queue reports OfflineQueueFull, not CaptureQueued', () async {
      for (var i = 0; i < offlineQueueMaxPending; i++) {
        await queue.enqueue(_intent(key: 'k$i'));
      }
      await expectLater(
        submitOrQueue(
          _intent(key: 'overflow'),
          queue,
          (_) async => throw const SocketException('still down'),
        ),
        throwsA(isA<OfflineQueueFull>()),
      );
    });
  });

  group('drainQueuedCaptures', () {
    test(
      'replays FIFO through the same submit and empties the queue',
      () async {
        for (final k in ['k1', 'k2', 'k3']) {
          await queue.enqueue(_intent(key: k));
        }
        final order = <String>[];
        final report = await drainQueuedCaptures(queue, (intent) async {
          order.add(intent.idempotencyKey);
        });
        expect(order, ['k1', 'k2', 'k3']);
        expect(report.sent, 3);
        expect(report.dropped, isEmpty);
        expect(report.stoppedOffline, isFalse);
        expect(queue.pendingCount, 0);
        expect(queue.lastAttemptAtMs, isNotNull);
      },
    );

    test('a transport failure stops the pass and keeps the rest', () async {
      for (final k in ['k1', 'k2', 'k3']) {
        await queue.enqueue(_intent(key: k));
      }
      final attempted = <String>[];
      final report = await drainQueuedCaptures(queue, (intent) async {
        attempted.add(intent.idempotencyKey);
        if (intent.idempotencyKey == 'k2') {
          throw const SocketException('still down');
        }
      });
      // k2's failure ends the pass — k3 is not even attempted.
      expect(attempted, ['k1', 'k2']);
      expect(report.sent, 1);
      expect(report.stoppedOffline, isTrue);
      expect(queue.pending.map((i) => i.intent.idempotencyKey), ['k2', 'k3']);
      expect(queue.draining, isFalse);
    });

    test('a business rejection drops the entry and keeps going', () async {
      for (final k in ['k1', 'k2', 'k3']) {
        await queue.enqueue(_intent(key: k));
      }
      final report = await drainQueuedCaptures(queue, (intent) async {
        if (intent.idempotencyKey == 'k2') {
          throw NeonAuthException(400, 'stale_write');
        }
      });
      expect(report.sent, 2);
      expect(report.stoppedOffline, isFalse);
      expect(report.dropped.single.entry.intent.idempotencyKey, 'k2');
      expect((report.dropped.single.error as NeonAuthException).status, 400);
      expect(queue.pendingCount, 0);
    });

    test('CommitmentFailed counts as a sent partial and is removed', () async {
      await queue.enqueue(_intent(key: 'k1'));
      final report = await drainQueuedCaptures(
        queue,
        (_) async => throw const CommitmentFailed(),
      );
      expect(report.sent, 1);
      expect(report.partialCommitments, 1);
      expect(queue.pendingCount, 0);
    });

    test('a second drain while draining is a no-op', () async {
      await queue.enqueue(_intent(key: 'k1'));
      late Future<QueueDrainReport> inner;
      final hold = Completer<void>();
      // Start a drain that blocks inside submit; a nested drain call must
      // report zero activity instead of double-submitting.
      final first = drainQueuedCaptures(queue, (intent) async {
        if (queue.draining) {
          inner = drainQueuedCaptures(queue, (_) async {
            fail('re-entrant drain must not submit');
          });
        }
        await hold.future;
      });
      await Future<void>.delayed(Duration.zero);
      hold.complete();
      await first;
      final innerReport = await inner;
      expect(innerReport.sent, 0);
    });
  });

  group('QueuedCapturesBanner', () {
    Future<void> pump(
      WidgetTester t,
      OfflineCaptureQueue queue, {
      VoidCallback? onRetry,
    }) => t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: QueuedCapturesBanner(queue: queue, onRetry: onRetry ?? () {}),
        ),
      ),
    );

    testWidgets('hidden when empty, shows count and retry when held', (
      t,
    ) async {
      await pump(t, queue);
      expect(find.text('Gửi lại'), findsNothing);

      await queue.enqueue(_intent(key: 'k1'));
      await t.pump();
      expect(find.text('1 khoản chờ gửi'), findsOneWidget);
      expect(find.text('Sẽ gửi lại khi có mạng'), findsOneWidget);
      expect(find.text('Gửi lại'), findsOneWidget);
    });

    testWidgets('Gửi lại invokes the retry callback', (t) async {
      var taps = 0;
      await queue.enqueue(_intent(key: 'k1'));
      await pump(t, queue, onRetry: () => taps++);
      await t.tap(find.text('Gửi lại'));
      expect(taps, 1);
    });

    testWidgets('disappears when the queue drains', (t) async {
      await queue.enqueue(_intent(key: 'k1'));
      await pump(t, queue);
      expect(find.text('1 khoản chờ gửi'), findsOneWidget);

      await drainQueuedCaptures(queue, (_) async {});
      await t.pump();
      expect(find.text('1 khoản chờ gửi'), findsNothing);
      // After a drain pass the queue is empty — the hint is gone too.
      expect(find.text('Gửi lại'), findsNothing);
    });

    testWidgets('shows the last-attempt hint after a failed pass', (t) async {
      await queue.enqueue(_intent(key: 'k1'));
      await drainQueuedCaptures(
        queue,
        (_) async => throw const SocketException('down'),
      );
      await pump(t, queue);
      expect(find.text('1 khoản chờ gửi'), findsOneWidget);
      expect(find.textContaining('Thử lại lúc'), findsOneWidget);
    });
  });
}
