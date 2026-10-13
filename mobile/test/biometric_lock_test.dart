import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/biometric_lock.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Test double for the platform-channel-backed [DeviceBiometricService].
/// `onAuthenticate` controls each prompt's result (true / false / error /
/// pending Completer) without touching local_auth.
class _FakeBiometricService implements BiometricService {
  _FakeBiometricService({this.available = true});

  bool available;
  Future<bool> Function()? onAuthenticate;

  int availabilityCalls = 0;
  int authCalls = 0;
  final reasons = <String>[];

  @override
  Future<bool> isAvailable() async {
    availabilityCalls++;
    return available;
  }

  @override
  Future<bool> authenticate({required String reason}) {
    authCalls++;
    reasons.add(reason);
    final handler = onAuthenticate;
    return handler != null ? handler() : Future.value(true);
  }
}

const _child = Text('App content');

Future<void> _pumpGate(
  WidgetTester tester, {
  required BiometricService service,
  bool enabled = true,
}) => tester.pumpWidget(
  MaterialApp(
    home: BiometricGate(enabled: enabled, service: service, child: _child),
  ),
);

void main() {
  group('BiometricGate', () {
    testWidgets('shows child immediately when the lock is disabled', (
      tester,
    ) async {
      final service = _FakeBiometricService();
      await _pumpGate(tester, service: service, enabled: false);
      await tester.pump();

      expect(find.text('App content'), findsOneWidget);
      expect(find.text('Mở khóa MoneyFlow'), findsNothing);
      // Disabled skips the probe entirely — no platform calls at all.
      expect(service.availabilityCalls, 0);
      expect(service.authCalls, 0);
    });

    testWidgets(
      'locks when enabled + available, auto-prompts once, success shows child',
      (tester) async {
        final service = _FakeBiometricService();
        // Pending prompt: keeps the gate locked while we assert the lock UI.
        final prompt = Completer<bool>();
        service.onAuthenticate = () => prompt.future;

        await _pumpGate(tester, service: service);
        await tester.pumpAndSettle();

        expect(find.text('Mở khóa MoneyFlow'), findsOneWidget);
        expect(find.text('Mở khóa'), findsOneWidget);
        expect(find.text('App content'), findsNothing);
        // First frame auto-attempted — no tap needed.
        expect(service.authCalls, 1);
        expect(service.reasons, ['Mở khóa MoneyFlow']);

        prompt.complete(true);
        await tester.pumpAndSettle();

        expect(find.text('App content'), findsOneWidget);
        expect(find.text('Mở khóa MoneyFlow'), findsNothing);
      },
    );

    testWidgets(
      'failed authenticate stays locked; tapping Mở lại re-attempts',
      (tester) async {
        final service = _FakeBiometricService();
        var attempts = 0;
        service.onAuthenticate = () => Future.value(++attempts > 1);

        await _pumpGate(tester, service: service);
        await tester.pumpAndSettle();

        // First (auto) attempt failed → retry label replaces the unlock one.
        expect(service.authCalls, 1);
        expect(find.text('Mở lại'), findsOneWidget);
        expect(find.text('App content'), findsNothing);

        await tester.tap(find.text('Mở lại'));
        await tester.pumpAndSettle();

        expect(service.authCalls, 2);
        expect(find.text('App content'), findsOneWidget);
      },
    );

    testWidgets('thrown authenticate error stays locked with retry', (
      tester,
    ) async {
      final service = _FakeBiometricService();
      service.onAuthenticate = () =>
          Future.error(StateError('user canceled the prompt'));

      await _pumpGate(tester, service: service);
      await tester.pumpAndSettle();

      expect(service.authCalls, 1);
      expect(find.text('Mở lại'), findsOneWidget);
      expect(find.text('App content'), findsNothing);
    });

    testWidgets('unavailable service falls through to the child', (
      tester,
    ) async {
      final service = _FakeBiometricService(available: false);
      await _pumpGate(tester, service: service);
      await tester.pumpAndSettle();

      // Fail-open: no biometrics on the device must not lock the user out.
      expect(find.text('App content'), findsOneWidget);
      expect(find.text('Mở khóa MoneyFlow'), findsNothing);
      expect(service.authCalls, 0);
    });
  });

  group('onUnlocked', () {
    Future<void> pumpWithCallback(
      WidgetTester tester,
      _FakeBiometricService service,
      void Function() onUnlocked, {
      bool enabled = true,
    }) => tester.pumpWidget(
      MaterialApp(
        home: BiometricGate(
          enabled: enabled,
          service: service,
          onUnlocked: onUnlocked,
          child: _child,
        ),
      ),
    );

    testWidgets('fires at first frame when the lock is disabled', (
      tester,
    ) async {
      var calls = 0;
      await pumpWithCallback(
        tester,
        _FakeBiometricService(),
        () => calls++,
        enabled: false,
      );
      await tester.pumpAndSettle();
      // Disabled = unlocked from the start — deep links may drain.
      expect(calls, 1);
    });

    testWidgets('silent while locked, fires once after a successful auth', (
      tester,
    ) async {
      var calls = 0;
      final service = _FakeBiometricService();
      final prompt = Completer<bool>();
      service.onAuthenticate = () => prompt.future;

      await pumpWithCallback(tester, service, () => calls++);
      await tester.pumpAndSettle();
      expect(find.text('Mở khóa MoneyFlow'), findsOneWidget);
      expect(calls, 0);

      prompt.complete(true);
      await tester.pumpAndSettle();
      expect(calls, 1);
    });

    testWidgets('fires on fail-open when the service is unavailable', (
      tester,
    ) async {
      var calls = 0;
      await pumpWithCallback(
        tester,
        _FakeBiometricService(available: false),
        () => calls++,
      );
      await tester.pumpAndSettle();
      expect(calls, 1);
    });
  });

  group('BiometricPrefs', () {
    TestWidgetsFlutterBinding.ensureInitialized();

    test('defaults to disabled', () async {
      SharedPreferences.setMockInitialValues({});

      expect(await BiometricPrefs.loadBiometricEnabled(), isFalse);
    });

    test('round-trips the flag through shared_preferences', () async {
      SharedPreferences.setMockInitialValues({});

      await BiometricPrefs.saveBiometricEnabled(true);
      expect(await BiometricPrefs.loadBiometricEnabled(), isTrue);

      await BiometricPrefs.saveBiometricEnabled(false);
      expect(await BiometricPrefs.loadBiometricEnabled(), isFalse);
    });
  });
}
