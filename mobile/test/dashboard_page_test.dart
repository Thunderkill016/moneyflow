// Dashboard "Cần chú ý" attention card (D5) — verified queues only:
// inbox drafts, posted needs_review rows, overdue commitments and
// paid-different drift, each with a real destination or an honest
// count line. Plus the RealStore reads that feed it.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/domain/inbox.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/report.dart' show vnNow;
import 'package:moneyflow/features/dashboard/dashboard_page.dart';

const config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

String fakeJwt() {
  final payload = {
    'sub': 'u1',
    'exp': (DateTime.now().millisecondsSinceEpoch ~/ 1000) + 900,
  };
  String b64(Object o) =>
      base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${b64({'alg': 'EdDSA'})}.${b64(payload)}.sig';
}

class FakeTransport {
  final requests = <NeonRequest>[];
  final queue = <NeonResponse>[];

  NeonRequester get requester => (req) async {
    requests.add(req);
    assert(queue.isNotEmpty, 'unexpected request: ${req.url}');
    return queue.removeAt(0);
  };

  static NeonResponse json(
    int status,
    Object body, {
    Map<String, String> headers = const {},
  }) => NeonResponse(status: status, headers: headers, body: jsonEncode(body));
}

class Harness {
  final t = FakeTransport();
  late final auth = NeonAuthClient(config: config, requester: t.requester);
  late final api = NeonDataApi(
    config: config,
    auth: auth,
    requester: t.requester,
  );
  late final store = RealStore(api);

  Future<void> signIn() async {
    t.queue.add(
      FakeTransport.json(
        200,
        {
          'token': 't.s',
          'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
        },
        headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
      ),
    );
    await auth.signIn('e', 'p');
    t.queue.add(
      FakeTransport.json(200, {}, headers: {'set-auth-jwt': fakeJwt()}),
    );
  }
}

Map<String, Object?> _feedRow(String id, {String? payee, String? note}) => {
  'id': id,
  'kind': 'expense',
  'amount_minor': 45000,
  'occurred_on': '2026-10-20',
  'account_name': 'Tiền mặt',
  'category_name': 'Ăn uống',
  'payee': payee,
  'note': note ?? '',
};

InboxCandidate _candidate(String id, String merchant, int amount) =>
    InboxCandidate(
      id: id,
      kind: TransactionKind.expense,
      amountMinor: amount,
      merchant: merchant,
      note: '',
      occurredOn: '2026-10-14',
      source: 'paste',
      confidence: 'medium',
    );

RecurringCommitment _commitment({
  required String id,
  required String name,
  int dueDay = 5,
  bool paidThisMonth = false,
  int? paidAmountMinor,
  bool isArchived = false,
}) => RecurringCommitment(
  id: id,
  name: name,
  amountMinor: 350000,
  dueDay: dueDay,
  accountId: 'a1',
  accountName: 'VCB',
  categoryId: 'k1',
  categoryName: 'Hóa đơn',
  isArchived: isArchived,
  paidThisMonth: paidThisMonth,
  paidAmountMinor: paidAmountMinor,
);

Widget _dash({
  int pending = 0,
  List<InboxCandidate> previews = const [],
  NeedsReviewTransactions needsReview = (count: 0, rows: const []),
  List<RecurringCommitment>? commitments,
  bool attentionFails = false,
  VoidCallback? onOpenInbox,
  VoidCallback? onOpenNeedsReview,
  VoidCallback? onOpenPlanning,
  List<Transaction>? summaryRows,
  VoidCallback? onOpenReports,
}) => MaterialApp(
  home: DashboardPage(
    loadAccounts: () async => DemoStore.seedAccounts(),
    loadTransactions: () async => const [],
    // The remainder-card seam pair must both exist for commitments to
    // load — same rule as production wiring.
    loadBudgetRange: commitments == null ? null : (_, _) async => const [],
    loadCommitments: commitments == null ? null : (_) async => commitments,
    loadSummaryTransactions: summaryRows == null
        ? null
        : (_, _) async => (rows: summaryRows, truncated: false),
    onOpenReports: onOpenReports,
    loadWatchItems: () async => const [],
    loadPendingCount: attentionFails
        ? () async => throw StateError('offline')
        : () async => pending,
    loadPendingPreviews: attentionFails
        ? () async => throw StateError('offline')
        : () async => previews,
    loadNeedsReview: attentionFails
        ? () async => throw StateError('offline')
        : () async => needsReview,
    onOpenInbox: onOpenInbox,
    onOpenNeedsReview: onOpenNeedsReview,
    onOpenPlanning: onOpenPlanning,
  ),
);

void main() {
  group('attention card (D5)', () {
    testWidgets('hidden when nothing verified needs attention', (t) async {
      await t.pumpWidget(_dash());
      await t.pumpAndSettle();
      expect(find.textContaining('chờ duyệt'), findsNothing);
      expect(find.textContaining('cần xem lại'), findsNothing);
      expect(find.textContaining('cam kết'), findsNothing);
    });

    testWidgets('inbox row shows count + merchant lines and taps through', (
      t,
    ) async {
      var opened = 0;
      await t.pumpWidget(
        _dash(
          pending: 5,
          previews: [
            _candidate('c1', 'PHO NGON', 45000),
            _candidate('c2', 'GRAB', 32000),
          ],
          onOpenInbox: () => opened++,
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('5 mục chờ duyệt'), findsOneWidget);
      expect(find.text('PHO NGON · 45.000 ₫'), findsOneWidget);
      expect(find.text('GRAB · 32.000 ₫'), findsOneWidget);
      expect(find.text('và 3 mục khác'), findsOneWidget);
      expect(find.textContaining('Chưa vào sổ'), findsOneWidget);

      await t.tap(find.text('5 mục chờ duyệt'));
      await t.pumpAndSettle();
      expect(opened, 1);
    });

    testWidgets(
      'needs-review row shows posted rows and opens the filtered feed',
      (t) async {
        var opened = 0;
        await t.pumpWidget(
          _dash(
            needsReview: (
              count: 4,
              rows: [
                const Transaction(
                  id: 't1',
                  kind: TransactionKind.expense,
                  categoryId: 'k1',
                  category: 'Di chuyển',
                  note: '',
                  accountId: 'a1',
                  account: 'Tiền mặt',
                  amount: 32000,
                  occurredOn: '2026-10-20',
                  payee: 'GRAB',
                  reviewStatus: TransactionReviewStatus.needsReview,
                ),
                const Transaction(
                  id: 't2',
                  kind: TransactionKind.expense,
                  categoryId: 'k2',
                  category: 'Ăn uống',
                  note: 'Cơm trưa',
                  accountId: 'a1',
                  account: 'Tiền mặt',
                  amount: 55000,
                  occurredOn: '2026-10-19',
                  reviewStatus: TransactionReviewStatus.needsReview,
                ),
              ],
            ),
            onOpenNeedsReview: () => opened++,
          ),
        );
        await t.pumpAndSettle();

        expect(find.text('4 khoản trong sổ cần xem lại'), findsOneWidget);
        expect(find.text('GRAB · 32.000 ₫'), findsOneWidget);
        // No payee → the note carries the line.
        expect(find.text('Cơm trưa · 55.000 ₫'), findsOneWidget);
        expect(find.text('và 2 khoản khác'), findsOneWidget);

        await t.tap(find.text('4 khoản trong sổ cần xem lại'));
        await t.pumpAndSettle();
        expect(opened, 1);
      },
    );

    testWidgets('commitment rows come from verified states only', (t) async {
      var opened = 0;
      final today = vnNow();
      // Drift is deterministic: paid with a different recorded amount.
      // Overdue needs a past dueDay inside the viewed month — only
      // possible when the month has already started (day ≥ 2).
      final overduePossible = today.day >= 2;
      await t.pumpWidget(
        _dash(
          commitments: [
            _commitment(
              id: 'cm-drift',
              name: 'Tiền nhà',
              paidThisMonth: true,
              paidAmountMinor: 400000,
            ),
            if (overduePossible)
              _commitment(id: 'cm-over', name: 'Internet', dueDay: 1),
          ],
          onOpenPlanning: () => opened++,
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('1 cam kết trả khác số tiền'), findsOneWidget);
      expect(find.text('Tiền nhà · Đã trả khác: 400.000 ₫'), findsOneWidget);
      if (overduePossible) {
        expect(find.text('1 cam kết quá hạn'), findsOneWidget);
        expect(
          find.text('Internet · Quá hạn ${today.day - 1} ngày'),
          findsOneWidget,
        );
      }
      await t.tap(find.text('1 cam kết trả khác số tiền'));
      await t.pumpAndSettle();
      expect(opened, 1);
    });

    testWidgets('archived + paid commitments never surface as work', (t) async {
      await t.pumpWidget(
        _dash(
          commitments: [
            _commitment(
              id: 'cm-arch',
              name: 'Netflix',
              paidThisMonth: true,
              paidAmountMinor: 999000,
              isArchived: true,
            ),
          ],
        ),
      );
      await t.pumpAndSettle();
      expect(find.textContaining('cam kết'), findsNothing);
    });

    testWidgets('a failed attention read hides the card, keeps the page', (
      t,
    ) async {
      await t.pumpWidget(_dash(attentionFails: true));
      await t.pumpAndSettle();
      expect(find.text('Tổng số dư'), findsOneWidget);
      expect(find.textContaining('chờ duyệt'), findsNothing);
      expect(t.takeException(), isNull);
    });

    testWidgets('a row without a destination shows count, no chevron', (
      t,
    ) async {
      await t.pumpWidget(
        _dash(
          pending: 3,
          previews: [_candidate('c1', 'PHO NGON', 45000)],
          // no onOpenInbox — the count stays, the chevron disappears.
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('3 mục chờ duyệt'), findsOneWidget);
      expect(find.byIcon(Icons.chevron_right), findsNothing);
    });
  });

  group('RealStore attention reads', () {
    test(
      'loadNeedsReviewTransactions counts all flags, previews newest',
      () async {
        final h = Harness();
        await h.signIn();
        // The id read returns the whole flagged backlog (3) while the
        // feed read carries only the preview-limit rows (2).
        h.t.queue.add(
          FakeTransport.json(200, [
            {'id': 't3'},
            {'id': 't2'},
            {'id': 't1'},
          ]),
        );
        h.t.queue.add(
          FakeTransport.json(200, [
            _feedRow('t3', payee: 'GRAB'),
            _feedRow('t1', note: 'Cơm trưa'),
          ]),
        );

        final res = await h.store.loadNeedsReviewTransactions(previewLimit: 2);

        final idsReq = h.t.requests[h.t.requests.length - 2];
        expect(idsReq.url.path, '/neondb/rest/v1/transaction_review_feed');
        expect(idsReq.url.queryParameters['review_status'], 'eq.needs_review');
        expect(idsReq.url.queryParameters['order'], 'occurred_on.desc,id.desc');
        final feedReq = h.t.requests.last;
        expect(feedReq.url.path, '/neondb/rest/v1/transaction_feed');
        expect(feedReq.url.queryParameters['id'], 'in.(t3,t2)');

        expect(res.count, 3);
        expect(res.rows.length, 2);
        expect(
          res.rows.every(
            (t) => t.reviewStatus == TransactionReviewStatus.needsReview,
          ),
          isTrue,
        );
        expect(res.rows.first.payee, 'GRAB');
      },
    );

    test(
      'an empty flagged set short-circuits — one request, zero rows',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, const []));

        final res = await h.store.loadNeedsReviewTransactions();

        expect(res.count, 0);
        expect(res.rows, isEmpty);
        expect(
          h.t.requests
              .where((r) => r.url.path.endsWith('/transaction_feed'))
              .length,
          0,
        );
      },
    );

    test(
      'loadPendingInboxPreviews caps the read at the preview limit',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(
          FakeTransport.json(200, [
            {
              'id': 'c1',
              'kind': 'expense',
              'amount_minor': 45000,
              'merchant': 'PHO NGON',
              'note': '',
              'occurred_on': '2026-10-14',
              'source': 'paste',
              'confidence': 'medium',
              'status': 'pending',
            },
          ]),
        );

        final rows = await h.store.loadPendingInboxPreviews(limit: 2);

        final req = h.t.requests.last;
        expect(req.url.path, '/neondb/rest/v1/inbox_candidates');
        expect(req.url.queryParameters['status'], 'eq.pending');
        expect(req.url.queryParameters['limit'], '2');
        expect(rows.single.merchant, 'PHO NGON');
      },
    );
  });

  group('month summary card (D9)', () {
    String day(int d) {
      final n = vnNow();
      return '${n.year}-${n.month.toString().padLeft(2, '0')}-'
          '${d.toString().padLeft(2, '0')}';
    }

    testWidgets('shows month-to-date totals, top category, compare', (t) async {
      var reportsOpened = 0;
      await t.pumpWidget(
        _dash(
          summaryRows: [
            Transaction(
              id: 'a',
              kind: TransactionKind.expense,
              categoryId: 'k1',
              category: 'Ăn uống',
              note: '',
              accountId: 'a1',
              account: 'Tiền mặt',
              amount: 300000,
              occurredOn: day(1),
            ),
            Transaction(
              id: 'b',
              kind: TransactionKind.income,
              categoryId: 'k2',
              category: 'Lương',
              note: '',
              accountId: 'a1',
              account: 'Tiền mặt',
              amount: 5000000,
              occurredOn: day(1),
            ),
          ],
          onOpenReports: () => reportsOpened++,
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Tóm tắt tháng này'), findsOneWidget);
      expect(
        find.textContaining('Thu 5.000.000 ₫ · Chi 300.000 ₫'),
        findsOneWidget,
      );
      expect(find.textContaining('Còn lại 4.700.000 ₫'), findsOneWidget);
      expect(find.textContaining('Nhiều nhất: Ăn uống'), findsOneWidget);
      await t.tap(find.text('Xem báo cáo tháng →'));
      await t.pumpAndSettle();
      expect(reportsOpened, 1);
    });

    testWidgets('a quiet month renders no card', (t) async {
      await t.pumpWidget(_dash(summaryRows: const []));
      await t.pumpAndSettle();
      expect(find.text('Tóm tắt tháng này'), findsNothing);
    });

    testWidgets('a truncated read hides the card', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: DashboardPage(
            loadAccounts: () async => const [],
            loadTransactions: () async => const [],
            loadSummaryTransactions: (_, _) async =>
                (rows: const <Transaction>[], truncated: true),
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Tóm tắt tháng này'), findsNothing);
    });
  });
}
