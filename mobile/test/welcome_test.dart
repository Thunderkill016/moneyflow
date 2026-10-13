import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/app.dart';
import 'package:moneyflow/data/quick_action.dart';
import 'package:moneyflow/data/share/share_intent.dart';
import 'package:moneyflow/features/auth/welcome_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Share/quick-action doubles — same seams quick_action_test stubs so
/// the gate boots with no platform channels.
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

Future<void> _pumpGate(WidgetTester t) => t.pumpWidget(
  MaterialApp(
    home: AuthGate(
      shareReceiver: const _NoopShareReceiver(),
      quickActions: _NoopQuickActions(),
    ),
  ),
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('first-run welcome', () {
    testWidgets('shows on first launch, "Bắt đầu" routes to login', (t) async {
      await _pumpGate(t);
      await t.pumpAndSettle();

      expect(find.byType(WelcomePage), findsOneWidget);
      expect(find.text('MoneyFlow'), findsOneWidget);
      expect(find.text('Bắt đầu'), findsOneWidget);
      expect(find.text('Xem demo'), findsOneWidget);

      await t.tap(find.text('Bắt đầu'));
      await t.pumpAndSettle();

      expect(find.byType(WelcomePage), findsNothing);
      expect(find.text('Đăng nhập'), findsWidgets);
      expect(await WelcomePrefs.loadSeen(), isTrue);
    });

    testWidgets('the second launch skips straight to login', (t) async {
      await _pumpGate(t);
      await t.pumpAndSettle();
      await t.tap(find.text('Bắt đầu'));
      await t.pumpAndSettle();

      // A fresh gate over the same prefs — the app restart the flag is
      // built for.
      await _pumpGate(t);
      await t.pumpAndSettle();

      expect(find.byType(WelcomePage), findsNothing);
      expect(find.text('Đăng nhập'), findsWidgets);
    });

    testWidgets('"Xem demo" enters the demo shell and marks the flag', (
      t,
    ) async {
      await _pumpGate(t);
      await t.pumpAndSettle();

      await t.tap(find.text('Xem demo'));
      await t.pumpAndSettle();

      expect(find.byType(WelcomePage), findsNothing);
      // Demo shell is up — the mode label and seeded dashboard render.
      expect(find.text('demo'), findsOneWidget);
      expect(find.text('Tổng số dư'), findsOneWidget);
      expect(await WelcomePrefs.loadSeen(), isTrue);
    });

    testWidgets('a pre-seeded flag boots straight past welcome', (t) async {
      SharedPreferences.setMockInitialValues({'mf_seen_welcome': true});
      await _pumpGate(t);
      await t.pumpAndSettle();

      expect(find.byType(WelcomePage), findsNothing);
      expect(find.text('Đăng nhập'), findsWidgets);
    });
  });
}
