import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/app.dart';
import 'package:moneyflow/app/delete_history.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/quick_action.dart';
import 'package:moneyflow/data/share/share_intent.dart';
import 'package:moneyflow/domain/history_purge.dart';
import 'package:moneyflow/domain/report.dart' show vnToday;
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:moneyflow/features/settings/settings_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

String _fakeJwt() {
  final payload = {
    'sub': 'u1',
    'exp': (DateTime.now().millisecondsSinceEpoch ~/ 1000) + 900,
  };
  String b64(Object o) =>
      base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${b64({'alg': 'EdDSA'})}.${b64(payload)}.sig';
}

NeonResponse _json(
  int status,
  Object body, {
  Map<String, String> headers = const {},
}) => NeonResponse(status: status, headers: headers, body: jsonEncode(body));

/// URL-pattern fake transport — same harness as delete_account_test:
/// unmatched reads answer an empty list, writes {}. The purge RPC is the
/// only endpoint this suite steers through [override].
class _FakeTransport {
  final requests = <NeonRequest>[];
  NeonResponse? Function(NeonRequest req)? override;

  static const _seedAccount = {
    'id': 'acc-1',
    'name': 'Tiền mặt',
    'kind': 'cash',
    'currency_code': 'VND',
    'initial_balance_minor': 0,
    'is_archived': false,
    'icon': null,
    'color': null,
    'updated_at': '2026-10-20T00:00:00Z',
  };

  static const _seedTx = {
    'id': 'tx-1',
    'kind': 'expense',
    'amount_minor': 45000,
    'occurred_on': '2026-10-20',
  };

  List<NeonRequest> to(String suffix) =>
      requests.where((r) => r.url.path.endsWith(suffix)).toList();

  NeonRequester get requester => (req) async {
    requests.add(req);
    final custom = override?.call(req);
    if (custom != null) return custom;
    final path = req.url.path;
    if (path.endsWith('/get-session')) {
      return _json(
        200,
        {
          'session': {'id': 's1'},
          'user': {'id': 'u1', 'email': 'a@b.c', 'name': 'A'},
        },
        headers: {'set-auth-jwt': _fakeJwt()},
      );
    }
    if (path.endsWith('/list-accounts')) {
      return _json(200, [
        {'providerId': 'credential'},
      ]);
    }
    if (req.method == 'GET' && path.endsWith('/accounts')) {
      return _json(200, [_seedAccount]);
    }
    if (req.method == 'GET' && path.endsWith('/transaction_feed')) {
      return _json(200, [_seedTx]);
    }
    if (path.endsWith('/rpc/delete_transactions_before')) {
      return _json(200, {
        'deleted': 3,
        'locked': 1,
        'before': '2026-06-01',
        'sources': ['manual'],
      });
    }
    return _json(200, req.method == 'GET' ? [] : {});
  };
}

class _NoopShareReceiver implements ShareIntentReceiver {
  const _NoopShareReceiver();
  @override
  Future<String?> consumeInitialShare() async => null;
  @override
  Stream<String> stream() => const Stream<String>.empty();
}

class _NoopQuickActions extends QuickActionSource {
  @override
  Future<String?> consumeInitialAction() async => null;
  @override
  Stream<String> stream() => const Stream<String>.empty();
}

/// Tall surface — the settings ListView lazy-builds rows below the fold.
void _bigViewport(WidgetTester t) {
  t.view.physicalSize = const Size(1400, 4200);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

/// Boots straight into the signed-in shell behind the fake transport.
Future<void> _pumpSignedIn(WidgetTester t, _FakeTransport transport) async {
  _bigViewport(t);
  FlutterSecureStorage.setMockInitialValues({
    'neon.session_token': 'tok.s',
    'neon.user_id': 'u1',
  });
  await t.pumpWidget(
    MaterialApp(
      home: AuthGate(
        allowDemo: true,
        shareReceiver: const _NoopShareReceiver(),
        quickActions: _NoopQuickActions(),
        requester: transport.requester,
      ),
    ),
  );
  await t.pumpAndSettle();
  expect(find.byType(DashboardPage), findsOneWidget);
}

/// Pumps just the dialog over a plain shell — the seam is the spy.
Future<void> _openDialog(WidgetTester t, HistoryPurgeRunner purge) async {
  await t.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (ctx) => TextButton(
          onPressed: () => showDeleteHistoryFlow(ctx, purge: purge),
          child: const Text('open'),
        ),
      ),
    ),
  );
  await t.tap(find.text('open'));
  await t.pumpAndSettle();
}

/// Step 1 → step 2, then tick one scope, pick today, type the guard —
/// the state every submit test starts from.
Future<void> _armConfirm(WidgetTester t) async {
  await t.tap(find.text('Tiếp tục'));
  await t.pumpAndSettle();
  await _finishArm(t);
}

/// Scope + date + typed guard — for tests already on the confirm step.
Future<void> _finishArm(WidgetTester t) async {
  await t.tap(find.text('Nhập tay'));
  await t.pumpAndSettle();
  await t.tap(find.text('Chưa chọn ngày'));
  await t.pumpAndSettle();
  // The picker opens on today (vnToday) — "Chọn" accepts it.
  await t.tap(find.text('Chọn'));
  await t.pumpAndSettle();
  await t.enterText(
    find.widgetWithText(TextField, 'Gõ XÓA để xác nhận'),
    'XÓA',
  );
  await t.pump();
}

FilledButton _submit(WidgetTester t) =>
    t.widget<FilledButton>(find.widgetWithText(FilledButton, 'Xóa vĩnh viễn'));

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({'mf_seen_welcome': true});
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('domain', () {
    test('source keys match the RPC buckets exactly', () {
      expect(HistoryPurgeSource.values.map(historyPurgeSourceKey).toSet(), {
        'manual',
        'notification',
        'import',
      });
      for (final s in HistoryPurgeSource.values) {
        expect(historyPurgeSourceLabel(s), isNotEmpty);
      }
    });

    test('parseHistoryPurgeReport reads the RPC shape', () {
      final r = parseHistoryPurgeReport({
        'deleted': 3,
        'locked': 1,
        'before': '2026-06-01',
        'sources': ['manual'],
      });
      expect((r.deleted, r.locked, r.before), (3, 1, '2026-06-01'));
    });

    test('parseHistoryPurgeReport fails closed on a malformed shape', () {
      expect(() => parseHistoryPurgeReport(null), throwsStateError);
      expect(() => parseHistoryPurgeReport('ok'), throwsStateError);
      expect(
        () => parseHistoryPurgeReport({'deleted': '3', 'locked': 0}),
        throwsStateError,
      );
      expect(() => parseHistoryPurgeReport({'deleted': 3}), throwsStateError);
      expect(
        () => parseHistoryPurgeReport({'deleted': 3, 'locked': 0}),
        throwsStateError,
      );
    });
  });

  group('dialog', () {
    testWidgets('warning shows consequences before any confirm affordance', (
      t,
    ) async {
      var calls = 0;
      await _openDialog(t, ({required before, required sources}) async {
        calls++;
        return (deleted: 0, locked: 0, before: '2026-06-01');
      });

      expect(find.text('Xóa lịch sử trước ngày'), findsOneWidget);
      expect(find.textContaining('không vào thùng rác'), findsOneWidget);
      expect(find.text('Xóa vĩnh viễn'), findsNothing); // step 1 has none
      expect(find.text('Tiếp tục'), findsOneWidget);

      await t.tap(find.text('Hủy'));
      await t.pumpAndSettle();
      expect(calls, 0);
    });

    testWidgets('Xóa vĩnh viễn stays off until date + scope + XÓA', (t) async {
      await _openDialog(t, ({required before, required sources}) async {
        return (deleted: 0, locked: 0, before: '2026-06-01');
      });
      await t.tap(find.text('Tiếp tục'));
      await t.pumpAndSettle();
      expect(_submit(t).onPressed, isNull);

      // Typed guard alone is not enough — no date, no scope.
      await t.enterText(
        find.widgetWithText(TextField, 'Gõ XÓA để xác nhận'),
        'XÓA',
      );
      await t.pump();
      expect(_submit(t).onPressed, isNull);

      // A wrong phrase never unlocks either.
      await t.enterText(
        find.widgetWithText(TextField, 'Gõ XÓA để xác nhận'),
        'xoá bỏ',
      );
      await t.pump();
      expect(_submit(t).onPressed, isNull);

      // Already on the confirm step — only the field work remains.
      await _finishArm(t);
      expect(_submit(t).onPressed, isNotNull);
    });

    testWidgets('submit passes the picked cutoff and scope once', (t) async {
      String? seenBefore;
      Set<HistoryPurgeSource>? seenSources;
      await _openDialog(t, ({required before, required sources}) async {
        seenBefore = before;
        seenSources = sources;
        return (deleted: 2, locked: 0, before: '2026-06-01');
      });
      await _armConfirm(t);

      await t.tap(find.text('Xóa vĩnh viễn'));
      await t.pumpAndSettle();

      expect(seenBefore, vnToday());
      expect(seenSources, {HistoryPurgeSource.manual});
      expect(find.text('Xóa lịch sử trước ngày'), findsNothing);
    });

    testWidgets('in-flight locks every control until the seam answers', (
      t,
    ) async {
      final gate = Completer<HistoryPurgeReport>();
      var calls = 0;
      await _openDialog(t, ({required before, required sources}) {
        calls++;
        return gate.future;
      });
      await _armConfirm(t);

      await t.tap(find.text('Xóa vĩnh viễn'));
      await t.pump();
      expect(calls, 1);
      expect(find.text('Đang xóa…'), findsOneWidget);
      // The busy label owns the submit slot — it is disabled, and a
      // second tap on it cannot double-fire.
      expect(
        t
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Đang xóa…'),
            )
            .onPressed,
        isNull,
      );
      expect(
        t
            .widget<TextButton>(find.widgetWithText(TextButton, 'Quay lại'))
            .onPressed,
        isNull,
      );
      await t.tap(find.text('Đang xóa…'));
      await t.pump();
      expect(calls, 1);

      gate.complete((deleted: 5, locked: 2, before: '2026-06-01'));
      await t.pumpAndSettle();
      expect(find.text('Xóa lịch sử trước ngày'), findsNothing);
    });

    testWidgets('a seam failure stays open with an honest error', (t) async {
      await _openDialog(t, ({required before, required sources}) async {
        throw StateError('boom');
      });
      await _armConfirm(t);

      await t.tap(find.text('Xóa vĩnh viễn'));
      await t.pumpAndSettle();

      expect(find.textContaining('Không xóa được'), findsOneWidget);
      expect(find.text('Xóa lịch sử trước ngày'), findsOneWidget);
      // The dialog recovers — submit is armed again for a retry.
      expect(_submit(t).onPressed, isNotNull);
    });
  });

  group('settings row', () {
    testWidgets('the row rides the seam — absent hides it honestly', (t) async {
      _bigViewport(t);
      await t.pumpWidget(
        const MaterialApp(home: SettingsPage(onDeleteLocalData: _noopDelete)),
      );
      await t.pumpAndSettle();
      expect(find.text('Xóa lịch sử trước ngày'), findsNothing);

      var taps = 0;
      await t.pumpWidget(
        MaterialApp(
          home: SettingsPage(
            onDeleteLocalData: _noopDelete,
            onDeleteHistoryBefore: () async => taps++,
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Xóa lịch sử trước ngày'), findsOneWidget);
      await t.tap(find.text('Xóa lịch sử trước ngày'));
      await t.pumpAndSettle();
      expect(taps, 1);
    });
  });

  group('signed-in flow', () {
    testWidgets('demo settings never show the purge row', (t) async {
      _bigViewport(t);
      await t.pumpWidget(const MoneyFlowApp(allowDemo: true));
      await t.pumpAndSettle();
      await t.tap(find.text('Xem bản demo (không cần đăng nhập)'));
      await t.pumpAndSettle();
      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      await t.tap(find.text('Cài đặt'));
      await t.pumpAndSettle();

      expect(find.text('Xóa lịch sử trước ngày'), findsNothing);
      expect(find.text('Xóa dữ liệu demo'), findsOneWidget);
    });

    testWidgets('settings row drives the real RPC and discloses the report', (
      t,
    ) async {
      final transport = _FakeTransport();
      await _pumpSignedIn(t, transport);

      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      await t.tap(find.text('Cài đặt'));
      await t.pumpAndSettle();

      await t.tap(find.text('Xóa lịch sử trước ngày'));
      await t.pumpAndSettle();
      await _armConfirm(t);
      await t.tap(find.text('Xóa vĩnh viễn'));
      await t.pumpAndSettle();

      final calls = transport.to('/rpc/delete_transactions_before');
      expect(calls, hasLength(1));
      expect(calls.single.method, 'POST');
      expect(calls.single.body, {
        'p_before': vnToday(),
        'p_sources': ['manual'],
      });

      // Report disclosure: 3 deleted, 1 schedule-linked survivor kept.
      expect(
        find.textContaining('Đã xóa vĩnh viễn 3 giao dịch trước 01/06/2026'),
        findsOneWidget,
      );
      expect(
        find.textContaining('1 giao dịch gắn lịch/công nợ được giữ lại'),
        findsOneWidget,
      );
    });
  });
}

Future<void> _noopDelete() async {}
