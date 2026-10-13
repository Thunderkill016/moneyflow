import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/app.dart';
import 'package:moneyflow/app/biometric_lock.dart';
import 'package:moneyflow/data/quick_action.dart';
import 'package:moneyflow/data/share/share_intent.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Quick-action source double — the platform channel pair replaced by a
/// field for the cold-start action and a controller for warm ones.
class _FakeQuickActions extends QuickActionSource {
  _FakeQuickActions({this.initial});

  /// Value returned by consumeInitialAction — the cold-start extra.
  String? initial;

  final _events = StreamController<String>.broadcast();

  /// Delivers a warm-start action (MainActivity's onNewIntent path).
  void emit(String action) => _events.add(action);

  @override
  Future<String?> consumeInitialAction() async => initial;

  @override
  Stream<String> stream() => _events.stream;
}

/// Share bridge double — keeps every test off the platform channels.
class _NoopShareReceiver implements ShareIntentReceiver {
  const _NoopShareReceiver();

  @override
  Future<String?> consumeInitialShare() async => null;

  @override
  Stream<String> stream() => const Stream<String>.empty();
}

/// Same adapter double as biometric_lock_test's — a real sign-in can't
/// reach the backend here, so the lock prompt result is steered by hand.
class _FakeBiometricService implements BiometricService {
  Future<bool> Function()? onAuthenticate;
  int authCalls = 0;

  @override
  Future<bool> isAvailable() async => true;

  @override
  Future<bool> authenticate({required String reason}) {
    authCalls++;
    final handler = onAuthenticate;
    return handler != null ? handler() : Future.value(true);
  }
}

/// Fails every HttpClient call instantly — drives AuthGate's session
/// restore down its offline path so the signed-in shell (and its
/// biometric gate) can be pumped without a backend.
class _OfflineHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) => _OfflineClient();
}

class _OfflineClient extends Fake implements HttpClient {
  // connectionTimeout= / close() must not throw — only openUrl fails.
  @override
  dynamic noSuchMethod(Invocation invocation) => null;

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) =>
      throw const SocketException('offline (test)');
}

Future<void> _pumpGate(
  WidgetTester t, {
  required _FakeQuickActions quick,
  BiometricService? biometric,
}) => t.pumpWidget(
  MaterialApp(
    home: AuthGate(
      shareReceiver: const _NoopShareReceiver(),
      quickActions: quick,
      biometric: biometric,
    ),
  ),
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    // These tests drive the login→demo path directly — the first-run
    // welcome gate is covered by welcome_test.dart, so mark it seen.
    SharedPreferences.setMockInitialValues({'mf_seen_welcome': true});
    // Session tokens live in secure storage now — an empty mock keeps the
    // AuthGate restore path off the platform channel, and tests seeding
    // 'neon.session_token' in prefs exercise the real migration instead.
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('quick=capture routing', () {
    testWidgets(
      'cold-start action waits for a surface, then opens capture in demo',
      (t) async {
        final quick = _FakeQuickActions(initial: kQuickActionCapture);
        await _pumpGate(t, quick: quick);
        await t.pumpAndSettle();

        // No stored session → login; the action is still held.
        expect(find.byType(CapturePage), findsNothing);

        await t.tap(find.text('Xem bản demo (không cần đăng nhập)'));
        await t.pumpAndSettle();

        expect(find.byType(CapturePage), findsOneWidget);
        expect(find.text('Ghi khoản'), findsOneWidget);
        // Demo seeds drove the form — the frequent-category row rendered.
        expect(find.text('Mục hay dùng'), findsOneWidget);
      },
    );

    testWidgets('warm action in demo opens the capture form', (t) async {
      final quick = _FakeQuickActions();
      await _pumpGate(t, quick: quick);
      await t.pumpAndSettle();
      await t.tap(find.text('Xem bản demo (không cần đăng nhập)'));
      await t.pumpAndSettle();
      expect(find.byType(CapturePage), findsNothing);

      quick.emit(kQuickActionCapture);
      await t.pumpAndSettle();

      expect(find.byType(CapturePage), findsOneWidget);
      expect(find.text('Ghi khoản'), findsOneWidget);
    });

    testWidgets('an unrecognised action value is ignored', (t) async {
      final quick = _FakeQuickActions(initial: 'not-an-action');
      await _pumpGate(t, quick: quick);
      await t.pumpAndSettle();
      await t.tap(find.text('Xem bản demo (không cần đăng nhập)'));
      await t.pumpAndSettle();

      quick.emit('something-else');
      await t.pumpAndSettle();

      expect(find.byType(CapturePage), findsNothing);
    });

    testWidgets('biometric lock gates the cold-start action until unlock', (
      t,
    ) async {
      HttpOverrides.global = _OfflineHttpOverrides();
      addTearDown(() => HttpOverrides.global = null);
      SharedPreferences.setMockInitialValues({
        'neon.session_token': 'saved-token',
        'mf_biometric_enabled': true,
      });
      final bio = _FakeBiometricService();
      // A pending prompt keeps the gate locked while we assert.
      final prompt = Completer<bool>();
      bio.onAuthenticate = () => prompt.future;
      final quick = _FakeQuickActions(initial: kQuickActionCapture);
      await _pumpGate(t, quick: quick, biometric: bio);
      await t.pumpAndSettle();

      // Offline restore signed in, the lock is up, and nothing opened
      // over it — the action is still held.
      expect(find.text('Mở khóa MoneyFlow'), findsOneWidget);
      expect(find.text('Ghi khoản'), findsNothing);
      expect(bio.authCalls, 1);

      prompt.complete(true);
      await t.pumpAndSettle();

      // The capture route landed only after the unlock — the loader
      // fails offline, but the pushed route itself is the proof.
      expect(find.text('Ghi khoản'), findsOneWidget);
      expect(
        find.text('Không tải được dữ liệu — thử lại khi có mạng'),
        findsOneWidget,
      );
    });

    testWidgets('a warm action while locked still waits for unlock', (t) async {
      HttpOverrides.global = _OfflineHttpOverrides();
      addTearDown(() => HttpOverrides.global = null);
      SharedPreferences.setMockInitialValues({
        'neon.session_token': 'saved-token',
        'mf_biometric_enabled': true,
      });
      final bio = _FakeBiometricService();
      final prompt = Completer<bool>();
      bio.onAuthenticate = () => prompt.future;
      final quick = _FakeQuickActions();
      await _pumpGate(t, quick: quick, biometric: bio);
      await t.pumpAndSettle();
      expect(find.text('Mở khóa MoneyFlow'), findsOneWidget);

      // A tap landing while the lock is up must not open the form.
      quick.emit(kQuickActionCapture);
      await t.pumpAndSettle();
      expect(find.text('Ghi khoản'), findsNothing);

      prompt.complete(true);
      await t.pumpAndSettle();
      expect(find.text('Ghi khoản'), findsOneWidget);
    });
  });

  group('demo capture', () {
    testWidgets('a save attempt shows the read-only demo notice', (t) async {
      final quick = _FakeQuickActions();
      await _pumpGate(t, quick: quick);
      await t.pumpAndSettle();
      await t.tap(find.text('Xem bản demo (không cần đăng nhập)'));
      await t.pumpAndSettle();
      quick.emit(kQuickActionCapture);
      await t.pumpAndSettle();
      expect(find.byType(CapturePage), findsOneWidget);

      // Minimal valid form: quick amount, account, mục hay dùng category.
      await t.tap(find.widgetWithText(ActionChip, '100k'));
      await t.pumpAndSettle();
      await t.tap(find.text('Tài khoản'));
      await t.pumpAndSettle();
      await t.tap(find.text('Tiền mặt').last);
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(ChoiceChip, 'Ăn uống'));
      await t.pumpAndSettle();

      await t.scrollUntilVisible(
        find.text('Lưu'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await t.tap(find.text('Lưu'));
      await t.pumpAndSettle();

      // Nothing is written and nothing claims to be — the form stays
      // open with the same notice every other demo write path shows.
      expect(find.text('Demo chỉ xem — đăng nhập để ghi khoản'), findsWidgets);
      expect(find.byType(CapturePage), findsOneWidget);
    });
  });
}
