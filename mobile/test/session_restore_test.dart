import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/app.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/quick_action.dart';
import 'package:moneyflow/data/session_store.dart';
import 'package:moneyflow/data/share/share_intent.dart';
import 'package:moneyflow/features/auth/login_page.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _NoShare implements ShareIntentReceiver {
  const _NoShare();
  @override
  Future<String?> consumeInitialShare() async => null;
  @override
  Stream<String> stream() => const Stream<String>.empty();
}

class _NoQuick extends QuickActionSource {
  @override
  Future<String?> consumeInitialAction() async => null;
  @override
  Stream<String> stream() => const Stream<String>.empty();
}

NeonResponse _res(int status, [String body = '']) =>
    NeonResponse(status: status, headers: const {}, body: body);

/// Boots the gate with a stored session and a /get-session that answers
/// [getSession]; every other call is an empty 200.
Future<void> _boot(WidgetTester t, NeonResponse Function() getSession) async {
  FlutterSecureStorage.setMockInitialValues({
    'neon.session_token': 'tok.sig',
    'neon.user_id': 'u1',
  });
  await t.pumpWidget(
    MaterialApp(
      home: AuthGate(
        shareReceiver: const _NoShare(),
        quickActions: _NoQuick(),
        requester: (req) async => req.url.path.endsWith('/get-session')
            ? getSession()
            : _res(200, req.method == 'GET' ? '[]' : '{}'),
      ),
    ),
  );
  await t.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({'mf_seen_welcome': true});
  });

  group('stored session survives transient auth-server failures', () {
    for (final status in [500, 502, 503, 504, 429, 408]) {
      testWidgets('HTTP $status on launch keeps the session and the shell', (
        t,
      ) async {
        await _boot(t, () => _res(status, 'upstream hiccup'));
        expect(find.byType(DashboardPage), findsOneWidget);
        expect(find.byType(LoginPage), findsNothing);
        expect((await SessionStore.read())?.token, 'tok.sig');
      });
    }
  });

  group('a session the server really rejected is cleared', () {
    testWidgets('HTTP 401 signs out and wipes the token', (t) async {
      await _boot(t, () => _res(401, '{}'));
      expect(find.byType(LoginPage), findsOneWidget);
      expect(await SessionStore.read(), isNull);
    });

    testWidgets('200 with no session in the body signs out', (t) async {
      await _boot(t, () => _res(200, 'null'));
      expect(find.byType(LoginPage), findsOneWidget);
      expect(await SessionStore.read(), isNull);
    });
  });
}
