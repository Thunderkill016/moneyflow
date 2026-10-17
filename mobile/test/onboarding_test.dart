// First-run onboarding — widget coverage for the page's step machine,
// and gate-level coverage for the show-once trigger (sign-up always
// qualifies; sign-in/restore only when the ledger is still empty).

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/app.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/quick_action.dart';
import 'package:moneyflow/data/share/share_intent.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:moneyflow/features/onboarding/onboarding_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

Future<void> _pumpGate(WidgetTester t, _FakeTransport transport) async {
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
}

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

Map<String, Object?> _accountRow(
  String id,
  String name, {
  int initialBalance = 0,
}) => {
  'id': id,
  'name': name,
  'kind': 'cash',
  'currency_code': 'VND',
  'initial_balance_minor': initialBalance,
  'is_archived': false,
  'icon': null,
  'color': null,
  'updated_at': '2026-10-20T00:00:00Z',
};

/// Minimal transaction_feed row — `loadTransactions` only needs the row
/// to decode; every other column reads through `as String?`-style
/// fallbacks in `_txFromRow`.
Map<String, Object?> _txRow(String id) => {
  'id': id,
  'kind': 'expense',
  'amount_minor': 45000,
  'occurred_on': '2026-10-20',
};

/// Fake transport with a mutable accounts table — create/update RPCs
/// mutate it so "the wallet shows on the dashboard" is a real read-back,
/// not a scripted coincidence. Unmatched reads answer [].
class _FakeTransport {
  final requests = <NeonRequest>[];
  final accounts = <Map<String, Object?>>[];
  final transactions = <Map<String, Object?>>[];
  var _nextId = 0;

  List<NeonRequest> to(String suffix) =>
      requests.where((r) => r.url.path.endsWith(suffix)).toList();

  NeonRequester get requester => (req) async {
    requests.add(req);
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
    if (path.endsWith('/sign-in/email') || path.endsWith('/sign-up/email')) {
      return _json(
        200,
        {
          'token': 'tok',
          'user': {'id': 'u1', 'email': 'a@b.c', 'name': 'A'},
        },
        headers: {
          'set-cookie': '${NeonAuthClient.sessionCookieName}=fresh.tok',
        },
      );
    }
    if (req.method == 'GET' && path.endsWith('/accounts')) {
      return _json(200, accounts);
    }
    if (req.method == 'GET' && path.endsWith('/transaction_feed')) {
      return _json(200, transactions);
    }
    if (path.endsWith('/rpc/create_financial_account')) {
      final body = req.body as Map<String, dynamic>;
      final row = _accountRow(
        'acc-${++_nextId}',
        body['p_name'] as String,
        initialBalance: body['p_initial_balance_minor'] as int,
      );
      accounts.add(row);
      return _json(200, row['id'] as String);
    }
    if (path.endsWith('/rpc/update_financial_account')) {
      final body = req.body as Map<String, dynamic>;
      final id = body['p_account_id'] as String;
      final row = accounts.firstWhere((a) => a['id'] == id);
      row['name'] = body['p_name'];
      row['initial_balance_minor'] = body['p_initial_balance_minor'];
      return _json(200, {});
    }
    return _json(200, req.method == 'GET' ? [] : {});
  };
}

Future<void> _pumpPage(
  WidgetTester t, {
  bool hasCashWallet = false,
  Future<String?> Function()? onWalletStep,
  VoidCallback? onQuickExpense,
  VoidCallback? onDone,
}) async {
  await t.pumpWidget(
    MaterialApp(
      theme: ThemeData(useMaterial3: true),
      home: OnboardingPage(
        hasCashWallet: hasCashWallet,
        onWalletStep: onWalletStep ?? () async => 'Tiền mặt',
        onQuickExpense: onQuickExpense ?? () {},
        onDone: onDone ?? () {},
      ),
    ),
  );
  await t.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({'mf_seen_welcome': true});
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('OnboardingPage steps', () {
    testWidgets('navigates forward and backward through all three steps', (
      t,
    ) async {
      await _pumpPage(t);

      // Step 1 — trust promises.
      expect(find.text('Bạn kiểm soát dữ liệu'), findsOneWidget);
      expect(find.text('Bước 1/3 · Cam kết của MoneyFlow'), findsOneWidget);
      expect(find.text('Không hỏi mật khẩu / OTP ngân hàng'), findsOneWidget);
      expect(find.text('Xuất dữ liệu (CSV) bất cứ lúc nào'), findsOneWidget);
      expect(find.text('Có thể xóa dữ liệu bất cứ lúc nào'), findsOneWidget);

      await t.tap(find.text('Tiếp'));
      await t.pumpAndSettle();

      // Step 2 — wallet (create variant: no seeded cash wallet).
      expect(find.text('Xác nhận ví tiền mặt'), findsOneWidget);
      expect(find.text('Bước 2/3 · Ví tiền mặt'), findsOneWidget);
      expect(find.text('Tạo ví tiền mặt'), findsOneWidget);

      // Backwards reachability — every step.
      await t.tap(find.text('Quay lại'));
      await t.pumpAndSettle();
      expect(find.text('Bạn kiểm soát dữ liệu'), findsOneWidget);
      await t.tap(find.text('Tiếp'));
      await t.pumpAndSettle();

      await t.tap(find.text('Tạo ví tiền mặt'));
      await t.pumpAndSettle();

      // Step 3 — first-expense nudge with the wallet summary.
      expect(find.text('Ghi chi tiêu đầu tiên?'), findsOneWidget);
      expect(find.text('Bước 3/3 · Ghi chi đầu tiên'), findsOneWidget);
      expect(find.textContaining('Ví: Tiền mặt · VND'), findsOneWidget);
      expect(find.textContaining('ăn trưa 45k'), findsOneWidget);
      // No skip link on the last step — the two real exits stand.
      expect(find.text('Để sau — vào Tổng quan'), findsNothing);

      await t.tap(find.text('Quay lại chỉnh ví'));
      await t.pumpAndSettle();
      expect(find.text('Bước 2/3 · Ví tiền mặt'), findsOneWidget);
    });

    testWidgets('"Để sau" skips from step 1', (t) async {
      var done = 0;
      await _pumpPage(t, onDone: () => done++);
      await t.tap(find.text('Để sau — vào Tổng quan'));
      expect(done, 1);
    });

    testWidgets('"Để sau" skips from step 2', (t) async {
      var done = 0;
      await _pumpPage(t, onDone: () => done++);
      await t.tap(find.text('Tiếp'));
      await t.pumpAndSettle();
      await t.tap(find.text('Để sau — vào Tổng quan'));
      expect(done, 1);
    });

    testWidgets('wallet seam cancel stays on step 2; confirm variant '
        'labels when a cash wallet exists', (t) async {
      var calls = 0;
      await _pumpPage(
        t,
        hasCashWallet: true,
        onWalletStep: () async {
          calls++;
          return null; // cancelled dialog — no write landed
        },
      );
      await t.tap(find.text('Tiếp'));
      await t.pumpAndSettle();

      expect(find.text('Xác nhận ví'), findsWidgets);
      expect(find.textContaining('Bạn đã có ví tiền mặt'), findsOneWidget);

      await t.tap(find.widgetWithText(FilledButton, 'Xác nhận ví'));
      await t.pumpAndSettle();
      expect(calls, 1);
      // Cancelled — still step 2, never advanced to a fake summary.
      expect(find.text('Bước 2/3 · Ví tiền mặt'), findsOneWidget);
      expect(find.text('Ghi chi tiêu đầu tiên?'), findsNothing);
    });

    testWidgets('"Ghi chi đầu" reaches the capture seam', (t) async {
      var done = 0;
      var quick = 0;
      await _pumpPage(
        t,
        onDone: () => done++,
        onQuickExpense: () => quick++,
        onWalletStep: () async => 'Ví A',
      );
      await t.tap(find.text('Tiếp'));
      await t.pumpAndSettle();
      await t.tap(find.text('Tạo ví tiền mặt'));
      await t.pumpAndSettle();

      await t.tap(find.text('Ghi chi đầu'));
      expect(quick, 1);
      expect(done, 0);
    });

    testWidgets('"Vào tổng quan" finishes on step 3', (t) async {
      var done = 0;
      await _pumpPage(
        t,
        onDone: () => done++,
        onWalletStep: () async => 'Ví A',
      );
      await t.tap(find.text('Tiếp'));
      await t.pumpAndSettle();
      await t.tap(find.text('Tạo ví tiền mặt'));
      await t.pumpAndSettle();
      await t.tap(find.text('Vào tổng quan'));
      expect(done, 1);
    });
  });

  group('gate trigger', () {
    testWidgets('sign-up enters onboarding; confirming the seeded wallet '
        'lands on the dashboard with it listed', (t) async {
      // Tall viewport — the register form scrolls on 800×600 and lazy
      // sliver children below the fold don't exist for finders.
      t.view.physicalSize = const Size(1080, 2400);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      final transport = _FakeTransport()
        // The server seeds 'Tiền mặt' on sign-up — step 2 confirms it.
        ..accounts.add(_accountRow('acc-seed', 'Tiền mặt'));
      await _pumpGate(t, transport);
      expect(find.text('Đăng nhập'), findsWidgets);

      await t.tap(find.text('Chưa có tài khoản? Đăng ký'));
      await t.pumpAndSettle();
      // The register form scrolls on a small viewport — lazy ListView
      // children off the fold aren't built until scrolled into view.
      for (final (label, value) in [
        ('Họ và tên', 'Nguyen'),
        ('Email', 'a@b.c'),
        ('Mật khẩu', 'password1234'),
        ('Nhập lại mật khẩu', 'password1234'),
      ]) {
        final field = find.widgetWithText(TextField, label);
        await t.ensureVisible(field);
        await t.enterText(field, value);
      }
      final submit = find.widgetWithText(FilledButton, 'Tạo tài khoản');
      await t.ensureVisible(submit);
      await t.tap(submit);
      await t.pumpAndSettle();

      expect(find.byType(OnboardingPage), findsOneWidget);
      expect(find.text('Bạn kiểm soát dữ liệu'), findsOneWidget);

      await t.tap(find.text('Tiếp'));
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(FilledButton, 'Xác nhận ví'));
      await t.pumpAndSettle();

      // The shared account form in confirm mode — prefilled seed name.
      expect(find.byType(AlertDialog), findsOneWidget);
      expect(find.text('Xác nhận ví tiền mặt'), findsWidgets);
      expect(
        t
            .widget<TextField>(
              find
                  .descendant(
                    of: find.byType(AlertDialog),
                    matching: find.byType(TextField),
                  )
                  .first,
            )
            .controller
            ?.text,
        'Tiền mặt',
      );
      await t.tap(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.widgetWithText(FilledButton, 'Xác nhận ví'),
        ),
      );
      await t.pumpAndSettle();

      expect(transport.to('/rpc/update_financial_account'), hasLength(1));
      expect(find.textContaining('Ví: Tiền mặt · VND'), findsOneWidget);

      await t.tap(find.text('Vào tổng quan'));
      await t.pumpAndSettle();

      expect(find.byType(DashboardPage), findsOneWidget);
      expect(find.text('Tiền mặt'), findsWidgets);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('mf_onboarded_u1'), isTrue);
    });

    testWidgets('empty-ledger sign-in shows the flow; a created wallet '
        'reaches the dashboard; "Ghi chi đầu" opens capture', (t) async {
      final transport = _FakeTransport(); // no accounts at all
      await _pumpGate(t, transport);

      await t.enterText(find.widgetWithText(TextField, 'Email'), 'a@b.c');
      await t.enterText(
        find.widgetWithText(TextField, 'Mật khẩu'),
        'password123',
      );
      await t.tap(find.text('Đăng nhập'));
      await t.pumpAndSettle();

      expect(find.byType(OnboardingPage), findsOneWidget);
      await t.tap(find.text('Tiếp'));
      await t.pumpAndSettle();
      expect(find.text('Tạo ví tiền mặt'), findsWidgets);

      await t.tap(find.widgetWithText(FilledButton, 'Tạo ví tiền mặt'));
      await t.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
      await t.enterText(
        find.widgetWithText(TextField, 'Số dư ban đầu'),
        '50000',
      );
      await t.tap(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.widgetWithText(FilledButton, 'Tạo ví'),
        ),
      );
      await t.pumpAndSettle();

      expect(transport.to('/rpc/create_financial_account'), hasLength(1));
      expect(find.textContaining('Ví: Tiền mặt · VND'), findsOneWidget);

      await t.tap(find.text('Ghi chi đầu'));
      await t.pumpAndSettle();
      // The held quick-capture drain opened the real capture form over
      // the fresh shell.
      expect(find.byType(CapturePage), findsOneWidget);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('mf_onboarded_u1'), isTrue);

      // Back out of capture — the dashboard lists the created wallet.
      await t.pageBack();
      await t.pumpAndSettle();
      expect(find.byType(DashboardPage), findsOneWidget);
      expect(find.text('Tiền mặt'), findsWidgets);
    });

    testWidgets('an established ledger bypasses the flow and marks done', (
      t,
    ) async {
      // Established = real activity (a transaction exists), not just the
      // seeded wallet the server creates at sign-up.
      final transport = _FakeTransport()
        ..accounts.add(_accountRow('acc-1', 'Ví chính'))
        ..transactions.add(_txRow('tx-1'));
      FlutterSecureStorage.setMockInitialValues({
        'neon.session_token': 'tok.s',
        'neon.user_id': 'u1',
      });
      await _pumpGate(t, transport);

      expect(find.byType(OnboardingPage), findsNothing);
      expect(find.byType(DashboardPage), findsOneWidget);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('mf_onboarded_u1'), isTrue);
    });

    testWidgets(
      'a seeded wallet alone is not ledger use — the flow still shows',
      (t) async {
        // The reviewed bug: a restored session with only the server's
        // seeded cash wallet and zero transactions used to mark itself
        // onboarded. It must show the flow and leave the flag unset.
        final transport = _FakeTransport()
          ..accounts.add(_accountRow('acc-seed', 'Tiền mặt'));
        FlutterSecureStorage.setMockInitialValues({
          'neon.session_token': 'tok.s',
          'neon.user_id': 'u1',
        });
        await _pumpGate(t, transport);

        expect(find.byType(OnboardingPage), findsOneWidget);
        expect(find.byType(DashboardPage), findsNothing);
        final prefs = await SharedPreferences.getInstance();
        expect(prefs.getBool('mf_onboarded_u1'), isNot(true));
      },
    );

    testWidgets('a done flag skips the flow on the next session', (t) async {
      SharedPreferences.setMockInitialValues({
        'mf_seen_welcome': true,
        'mf_onboarded_u1': true,
      });
      FlutterSecureStorage.setMockInitialValues({
        'neon.session_token': 'tok.s',
        'neon.user_id': 'u1',
      });
      // Pref unset is the only case that even reads accounts; with it
      // set an empty ledger still lands straight on the shell.
      await _pumpGate(t, _FakeTransport());
      expect(find.byType(OnboardingPage), findsNothing);
      expect(find.byType(DashboardPage), findsOneWidget);
    });

    testWidgets('demo never routes through onboarding', (t) async {
      // Tall viewport — the demo button sits below the fold at 800×600.
      t.view.physicalSize = const Size(1080, 2400);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      await _pumpGate(t, _FakeTransport());
      await t.tap(find.text('Xem bản demo (không cần đăng nhập)'));
      await t.pumpAndSettle();

      expect(find.byType(OnboardingPage), findsNothing);
      expect(find.text('demo'), findsOneWidget);
    });
  });
}
