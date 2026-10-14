import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/app.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/data/quick_action.dart';
import 'package:moneyflow/data/session_store.dart';
import 'package:moneyflow/data/share/share_intent.dart';
import 'package:moneyflow/features/auth/login_page.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

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

/// URL-pattern fake transport — the gate fires several loaders at once
/// after restore, so a strict queue would make tests order-fragile.
/// Any unmatched read answers an empty list; writes answer {}.
class _FakeTransport {
  final requests = <NeonRequest>[];
  NeonResponse? Function(NeonRequest req)? override;

  /// The server seeds a 'Tiền mặt' wallet on every new account
  /// (handle_new_user) — a signed-in account that can delete itself is
  /// an established one, which also keeps it out of first-run
  /// onboarding.
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

  // One feed row marks the ledger as used — the onboarding gate checks
  // `loadTransactions(limit: 1)`, and these fixtures model an established
  // account, not a fresh seed.
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
    if (path.endsWith('/sign-in/email')) {
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
      return _json(200, [_seedAccount]);
    }
    if (req.method == 'GET' && path.endsWith('/transaction_feed')) {
      return _json(200, [_seedTx]);
    }
    if (path.endsWith('/rpc/delete_my_account')) {
      return _json(200, {'deleted_rows': 9, 'tenant_rows_remaining': 0});
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

Future<void> _pumpGate(WidgetTester t, _FakeTransport transport) async {
  await t.pumpWidget(
    MaterialApp(
      home: AuthGate(
        shareReceiver: const _NoopShareReceiver(),
        quickActions: _NoopQuickActions(),
        requester: transport.requester,
      ),
    ),
  );
  await t.pumpAndSettle();
}

/// Boots straight into the signed-in shell: a stored session token sends
/// _restore through restoreSession, which the fake answers 200.
Future<void> _pumpSignedIn(WidgetTester t, _FakeTransport transport) async {
  FlutterSecureStorage.setMockInitialValues({
    'neon.session_token': 'tok.s',
    'neon.user_id': 'u1',
  });
  await _pumpGate(t, transport);
  expect(find.byType(DashboardPage), findsOneWidget);
}

Future<void> _openDeleteDialog(WidgetTester t) async {
  await t.tap(find.byIcon(Icons.more_vert));
  await t.pumpAndSettle();
  await t.tap(find.text('Xóa tài khoản'));
  await t.pumpAndSettle();
  // Step 1: warning. Advance to the confirm step.
  await t.tap(find.text('Tiếp tục'));
  await t.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({'mf_seen_welcome': true});
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('menu visibility', () {
    testWidgets('demo menu has no "Xóa tài khoản" — no server account', (
      t,
    ) async {
      await _pumpGate(t, _FakeTransport());
      await t.tap(find.text('Xem bản demo (không cần đăng nhập)'));
      await t.pumpAndSettle();

      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      expect(find.text('Xóa tài khoản'), findsNothing);
      // The local wipe stays — its scope label is honest device-only.
      expect(find.text('Xóa dữ liệu demo'), findsOneWidget);
    });

    testWidgets('signed-in menu carries it next to the local wipe', (t) async {
      await _pumpSignedIn(t, _FakeTransport());
      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      expect(find.text('Xóa tài khoản'), findsOneWidget);
      expect(find.text('Xóa dữ liệu trên máy'), findsOneWidget);
    });
  });

  group('confirmation gate', () {
    testWidgets('Xóa vĩnh viễn stays off until XÓA + password', (t) async {
      final transport = _FakeTransport();
      await _pumpSignedIn(t, transport);
      await _openDeleteDialog(t);

      FilledButton submit() => t.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Xóa vĩnh viễn'),
      );
      expect(submit().onPressed, isNull);

      await t.enterText(
        find.widgetWithText(TextField, 'Gõ XÓA để xác nhận'),
        'xoa',
      );
      await t.enterText(find.widgetWithText(TextField, 'Mật khẩu'), 'pw');
      await t.pump();
      expect(submit().onPressed, isNull); // wrong case — not exact

      await t.enterText(
        find.widgetWithText(TextField, 'Gõ XÓA để xác nhận'),
        'XÓA',
      );
      await t.enterText(find.widgetWithText(TextField, 'Mật khẩu'), '');
      await t.pump();
      expect(submit().onPressed, isNull); // empty password still blocks

      await t.enterText(find.widgetWithText(TextField, 'Mật khẩu'), 'pw');
      await t.pump();
      expect(submit().onPressed, isNotNull);
      expect(transport.to('/rpc/delete_my_account'), isEmpty);
    });
  });

  group('success path', () {
    testWidgets('re-auths once, deletes once, wipes and signs out', (t) async {
      final transport = _FakeTransport();
      await _pumpSignedIn(t, transport);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('mf_recent_searches', '["cafe"]');

      await _openDeleteDialog(t);
      await t.enterText(
        find.widgetWithText(TextField, 'Gõ XÓA để xác nhận'),
        'XÓA',
      );
      await t.enterText(find.widgetWithText(TextField, 'Mật khẩu'), 'pw');
      await t.pump();
      await t.tap(find.text('Xóa vĩnh viễn'));
      await t.pumpAndSettle();

      // Order matters: re-auth (sign-in/email) ran BEFORE the delete —
      // the same fresh-auth boundary the web's edge function enforces.
      final signIns = transport.to('/sign-in/email');
      final deletes = transport.to('/rpc/delete_my_account');
      expect(signIns.length, 1);
      expect(deletes.length, 1);
      expect(
        transport.requests.indexOf(signIns.single),
        lessThan(transport.requests.indexOf(deletes.single)),
      );
      // No /sign-out — the identity row is gone already.
      expect(transport.to('/sign-out'), isEmpty);

      // Back on the login gate with every local byte wiped.
      expect(find.byType(LoginPage), findsOneWidget);
      expect(find.text('Tài khoản đã được xóa'), findsOneWidget);
      expect(await SessionStore.read(), isNull);
      expect(prefs.getString('mf_recent_searches'), isNull);
    });
  });

  group('failure paths', () {
    testWidgets('wrong password blocks the delete and stays put', (t) async {
      final transport = _FakeTransport()
        ..override = (req) {
          if (req.url.path.endsWith('/sign-in/email')) {
            return _json(401, {'code': 'INVALID_EMAIL_OR_PASSWORD'});
          }
          return null;
        };
      await _pumpSignedIn(t, transport);
      await _openDeleteDialog(t);
      await t.enterText(
        find.widgetWithText(TextField, 'Gõ XÓA để xác nhận'),
        'XÓA',
      );
      await t.enterText(find.widgetWithText(TextField, 'Mật khẩu'), 'wrong');
      await t.pump();
      await t.tap(find.text('Xóa vĩnh viễn'));
      await t.pumpAndSettle();

      expect(find.text('Mật khẩu không đúng — thử lại.'), findsOneWidget);
      expect(transport.to('/rpc/delete_my_account'), isEmpty);
      // Dialog still open — nothing was deleted.
      expect(find.text('Xóa vĩnh viễn'), findsOneWidget);
    });

    testWidgets('server delete failure shows the error and stays signed in', (
      t,
    ) async {
      final transport = _FakeTransport()
        ..override = (req) {
          if (req.url.path.endsWith('/rpc/delete_my_account')) {
            return _json(500, {'code': 'P0001', 'message': 'boom'});
          }
          return null;
        };
      await _pumpSignedIn(t, transport);
      await _openDeleteDialog(t);
      await t.enterText(
        find.widgetWithText(TextField, 'Gõ XÓA để xác nhận'),
        'XÓA',
      );
      await t.enterText(find.widgetWithText(TextField, 'Mật khẩu'), 'pw');
      await t.pump();
      await t.tap(find.text('Xóa vĩnh viễn'));
      await t.pumpAndSettle();

      expect(
        find.textContaining('Không xóa được tài khoản trên máy chủ'),
        findsOneWidget,
      );
      // Still signed in: back on the dashboard once the dialog closes.
      await t.tap(find.text('Quay lại'));
      await t.pumpAndSettle();
      await t.tap(find.text('Hủy'));
      await t.pumpAndSettle();
      expect(find.byType(DashboardPage), findsOneWidget);
    });
  });

  group('NeonAuthClient.listProviders', () {
    test('returns the provider ids from /list-accounts', () async {
      final transport = _FakeTransport();
      final auth = NeonAuthClient(
        config: _config,
        requester: transport.requester,
      );
      await auth.signIn('a@b.c', 'pw');
      expect(await auth.listProviders(), {'credential'});
      final req = transport.requests.last;
      expect(req.url.path, '/neondb/auth/list-accounts');
      expect(req.method, 'GET');
    });
  });

  group('NeonAuthClient.discardSession', () {
    test('clears the in-memory session without any network call', () async {
      final transport = _FakeTransport();
      final auth = NeonAuthClient(
        config: _config,
        requester: transport.requester,
      );
      await auth.signIn('a@b.c', 'pw');
      final seen = transport.requests.length;
      auth.discardSession();
      expect(auth.session, isNull);
      expect(transport.requests.length, seen);
    });
  });

  group('RealStore.deleteMyAccount', () {
    Future<RealStore> signedInStore(_FakeTransport t) async {
      final auth = NeonAuthClient(config: _config, requester: t.requester);
      await auth.signIn('a@b.c', 'pw');
      return RealStore(
        NeonDataApi(config: _config, auth: auth, requester: t.requester),
      );
    }

    test('POSTs the RPC and returns the deleted row count', () async {
      final transport = _FakeTransport();
      final store = await signedInStore(transport);
      expect(await store.deleteMyAccount(), 9);
      final req = transport.to('/rpc/delete_my_account').single;
      expect(req.method, 'POST');
    });

    test('a non-zero remainder throws instead of reporting success', () async {
      final transport = _FakeTransport()
        ..override = (req) {
          if (req.url.path.endsWith('/rpc/delete_my_account')) {
            return _json(200, {'deleted_rows': 3, 'tenant_rows_remaining': 2});
          }
          return null;
        };
      final store = await signedInStore(transport);
      expect(() => store.deleteMyAccount(), throwsA(isA<StateError>()));
    });
  });
}
