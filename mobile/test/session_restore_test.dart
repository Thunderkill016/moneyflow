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

  group('boot probe is time-bounded', () {
    testWidgets('a never-answering /get-session drops the spinner into the '
        'offline shell within the probe budget — stored token kept', (t) async {
      FlutterSecureStorage.setMockInitialValues({
        'neon.session_token': 'tok.sig',
        'neon.user_id': 'u1',
      });
      var getSessionCalls = 0;
      await t.pumpWidget(
        MaterialApp(
          home: AuthGate(
            shareReceiver: const _NoShare(),
            quickActions: _NoQuick(),
            requester: (req) async {
              // The dead-network worst case: the boot probe never
              // answers. The gate's own budget — not the transport's
              // ~40s connect+inactivity stack — bounds the spinner.
              // Later probes (the lazy JWT fetch under the offline
              // shell) fail fast so data loaders can error out.
              if (req.url.path.endsWith('/get-session')) {
                getSessionCalls++;
                if (getSessionCalls == 1) {
                  await Completer<void>().future;
                }
                return _res(500, 'dead');
              }
              return _res(200, req.method == 'GET' ? '[]' : '{}');
            },
          ),
        ),
      );
      await t.pump();
      // Past the "slow network" hint delay the boot screen admits it
      // is still working instead of sitting silent.
      await t.pump(const Duration(seconds: 3));
      expect(find.textContaining('Mạng đang chậm'), findsOneWidget);
      expect(find.byType(DashboardPage), findsNothing);

      // Past the 8s probe budget the trusted-offline path renders the
      // cached shell — the token stays put for lazy re-validation. No
      // pumpAndSettle: on a dead network the dashboard's loaders keep
      // scheduling work legitimately — what matters is the gate itself
      // stopped spinning.
      await t.pump(const Duration(seconds: 6));
      await t.pump();
      expect(find.byType(DashboardPage), findsOneWidget);
      expect(find.byType(LoginPage), findsNothing);
      expect((await SessionStore.read())?.token, 'tok.sig');
    });
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
