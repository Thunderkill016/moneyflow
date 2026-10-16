import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/app.dart';
import 'package:moneyflow/app/biometric_lock.dart';
import 'package:moneyflow/app/url_opener.dart';
import 'package:moneyflow/data/notifications.dart';
import 'package:moneyflow/data/quick_action.dart';
import 'package:moneyflow/data/settings_prefs.dart';
import 'package:moneyflow/data/share/share_intent.dart';
import 'package:moneyflow/features/auth/welcome_page.dart';
import 'package:moneyflow/features/settings/settings_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Channel doubles — same role as the quick_action/privacy_link fakes:
/// keep every test off the platform channels.
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

/// Same adapter double as biometric_lock_test's — the enable prompt's
/// outcome is steered per test.
class _FakeBiometricService implements BiometricService {
  bool nextAuth = true;
  int authCalls = 0;
  final reasons = <String>[];

  @override
  Future<bool> isAvailable() async => true;

  @override
  Future<bool> authenticate({required String reason}) async {
    authCalls++;
    reasons.add(reason);
    return nextAuth;
  }
}

class _FakeUrlOpener implements UrlOpener {
  final opened = <Uri>[];
  bool nextResult = true;

  @override
  Future<bool> open(Uri uri) async {
    opened.add(uri);
    return nextResult;
  }

  @override
  Future<bool> openInApp(Uri uri) => open(uri);
}

/// Every HttpClient call fails instantly — AuthGate's session restore
/// falls into its offline path so the signed-in shell pumps without a
/// backend (same harness as notification_capture_test/quick_action_test).
class _OfflineHttp extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) => _OfflineClient();
}

class _OfflineClient extends Fake implements HttpClient {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) =>
      throw const SocketException('offline (test)');
}

void _seedSignedOut() {
  SharedPreferences.setMockInitialValues({'mf_seen_welcome': true});
  FlutterSecureStorage.setMockInitialValues({});
}

/// Boot the gate with a stored-but-offline session → signed-in shell.
Future<void> _pumpSignedIn(
  WidgetTester t, {
  _FakeBiometricService? biometric,
  _FakeUrlOpener? urlOpener,
}) async {
  HttpOverrides.global = _OfflineHttp();
  addTearDown(() => HttpOverrides.global = null);
  SharedPreferences.setMockInitialValues({
    'mf_seen_welcome': true,
    'neon.session_token': 'saved-token',
  });
  FlutterSecureStorage.setMockInitialValues({});
  await t.pumpWidget(
    MaterialApp(
      home: AuthGate(
        allowDemo: true,
        shareReceiver: const _NoopShareReceiver(),
        quickActions: _NoopQuickActions(),
        biometric: biometric,
        urlOpener: urlOpener ?? _FakeUrlOpener(),
      ),
    ),
  );
  await t.pumpAndSettle();
}

/// The settings ListView lazy-builds — a tall viewport so rows below the
/// fold exist for finders (tests still scroll-tap nothing).
void _bigViewport(WidgetTester t) {
  t.view.physicalSize = const Size(1400, 4200);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

/// The export writes a real file: dart:io completes on the true event
/// loop while continuations queue into the fake-async zone — alternate
/// real time with pumps until the share spy fires (same alternation the
/// reports export tests use).
Future<void> _untilShared(WidgetTester t, int Function() calls) async {
  for (var i = 0; i < 100 && calls() == 0; i++) {
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 10)),
    );
    await t.pump();
  }
  await t.pumpAndSettle();
}

/// Boot the real app widget — the same MaterialApp MoneyFlow ships —
/// down the demo path to the settings surface.
Future<void> _openDemoSettings(WidgetTester t) async {
  await t.pumpWidget(const MoneyFlowApp(allowDemo: true));
  await t.pumpAndSettle();
  await t.tap(find.text('Xem bản demo (không cần đăng nhập)'));
  await t.pumpAndSettle();
  await t.tap(find.byIcon(Icons.more_vert));
  await t.pumpAndSettle();
  await t.tap(find.text('Cài đặt'));
  await t.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    _seedSignedOut();
    // The notifier is a static — reset between tests so a dark pick in
    // one case never bleeds into the next.
    SettingsPrefs.themeMode.value = ThemeMode.system;
  });

  group('SettingsPrefs', () {
    test('theme mode defaults to dark and round-trips', () async {
      // Dark-mode-first is the neon-green direction (2026-10-16).
      expect(await SettingsPrefs.loadThemeMode(), ThemeMode.dark);
      await SettingsPrefs.saveThemeMode(ThemeMode.light);
      expect(await SettingsPrefs.loadThemeMode(), ThemeMode.light);
      await SettingsPrefs.saveThemeMode(ThemeMode.system);
      expect(await SettingsPrefs.loadThemeMode(), ThemeMode.system);
    });

    test('an unrecognised stored mode falls back to dark', () async {
      SharedPreferences.setMockInitialValues({'mf_theme_mode': 'neon'});
      expect(await SettingsPrefs.loadThemeMode(), ThemeMode.dark);
    });

    test('digest time defaults to 19:00 and round-trips', () async {
      final d = await SettingsPrefs.loadDigestTime();
      expect((d.hour, d.minute), (19, 0));

      await SettingsPrefs.saveDigestTime(hour: 8, minute: 30);
      final loaded = await SettingsPrefs.loadDigestTime();
      expect((loaded.hour, loaded.minute), (8, 30));
    });

    test('an out-of-range stored time reads as the default', () async {
      SharedPreferences.setMockInitialValues({
        'mf_weekly_digest_minutes': 24 * 60,
      });
      final d = await SettingsPrefs.loadDigestTime();
      expect((d.hour, d.minute), (19, 0));
    });
  });

  group('sections', () {
    testWidgets('signed-in seams render every section and row', (t) async {
      _bigViewport(t);
      await t.pumpWidget(
        MaterialApp(
          home: SettingsPage(
            biometricEnabled: false,
            onSetBiometricEnabled: (_) async => true,
            digestEnabled: false,
            onSetDigestEnabled: (_) async {},
            onDigestScheduleChanged: () async {},
            loadArchive: () async => {'accounts': []},
            onDeleteLocalData: () async {},
            onDeleteAccount: () async {},
            onOpenPrivacyPolicy: () {},
            onReplayWelcome: () {},
          ),
        ),
      );
      await t.pumpAndSettle();

      for (final label in [
        'Giao diện',
        'Bảo mật',
        'Nhắc nhở',
        'Dữ liệu',
        'Giới thiệu',
        'Hệ thống',
        'Sáng',
        'Tối',
        'Khóa sinh trắc',
        'Tóm tắt tuần',
        'Giờ gửi tóm tắt',
        'Sao lưu (JSON)',
        'Xóa dữ liệu trên máy',
        'Xóa tài khoản',
        'Phiên bản',
        'Chính sách bảo mật',
        'Xem lại màn chào',
        '1.0.0+1',
      ]) {
        expect(find.text(label), findsWidgets, reason: label);
      }
    });

    testWidgets('the demo variant hides auth-only rows honestly', (t) async {
      _bigViewport(t);
      await t.pumpWidget(
        MaterialApp(
          home: SettingsPage(
            onDeleteLocalData: () async {},
            deleteLocalDataLabel: 'Xóa dữ liệu demo',
            onOpenPrivacyPolicy: () {},
            onReplayWelcome: () {},
          ),
        ),
      );
      await t.pumpAndSettle();

      // Device-level surface stays: theme, the demo wipe, about rows.
      expect(find.text('Giao diện'), findsOneWidget);
      expect(find.text('Dữ liệu'), findsOneWidget);
      expect(find.text('Giới thiệu'), findsOneWidget);
      expect(find.text('Xóa dữ liệu demo'), findsOneWidget);
      expect(find.text('Chính sách bảo mật'), findsOneWidget);
      expect(find.text('Xem lại màn chào'), findsOneWidget);

      // Nothing account-backed may pretend to exist in demo.
      expect(find.text('Bảo mật'), findsNothing);
      expect(find.text('Khóa sinh trắc'), findsNothing);
      expect(find.text('Nhắc nhở'), findsNothing);
      expect(find.text('Tóm tắt tuần'), findsNothing);
      expect(find.text('Giờ gửi tóm tắt'), findsNothing);
      expect(find.text('Sao lưu (JSON)'), findsNothing);
      expect(find.text('Xóa tài khoản'), findsNothing);
      expect(find.text('Xóa dữ liệu trên máy'), findsNothing);
    });
  });

  group('theme radios', () {
    testWidgets('picking a mode persists and publishes it', (t) async {
      await t.pumpWidget(const MaterialApp(home: SettingsPage()));
      await t.pumpAndSettle();

      // Dark is already selected (dark-first default), so start from
      // Sáng — a radio's onChanged never re-fires on its current value.
      await t.tap(find.text('Sáng'));
      await t.pumpAndSettle();

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('mf_theme_mode'), 'light');
      expect(SettingsPrefs.themeMode.value, ThemeMode.light);

      await t.tap(find.text('Tối'));
      await t.pumpAndSettle();
      expect(prefs.getString('mf_theme_mode'), 'dark');
      expect(SettingsPrefs.themeMode.value, ThemeMode.dark);

      await t.tap(find.text('Hệ thống'));
      await t.pumpAndSettle();
      expect(prefs.getString('mf_theme_mode'), 'system');
      expect(SettingsPrefs.themeMode.value, ThemeMode.system);
    });

    testWidgets('the seeded mode drives the group selection', (t) async {
      SharedPreferences.setMockInitialValues({'mf_theme_mode': 'light'});
      await t.pumpWidget(const MaterialApp(home: SettingsPage()));
      await t.pumpAndSettle();

      final group = t.widget<RadioGroup<ThemeMode>>(
        find.byType(RadioGroup<ThemeMode>),
      );
      expect(group.groupValue, ThemeMode.light);
    });

    testWidgets('a pick on the demo settings applies to the real app', (
      t,
    ) async {
      _bigViewport(t);
      await _openDemoSettings(t);
      await t.tap(find.text('Tối'));
      await t.pumpAndSettle();

      final app = t.widget<MaterialApp>(find.byType(MaterialApp).first);
      expect(app.themeMode, ThemeMode.dark);
    });
  });

  group('switches', () {
    testWidgets('biometric applies only when the seam allows', (t) async {
      var allowed = false;
      Future<bool> seam(bool enabled) async => allowed;

      await t.pumpWidget(
        MaterialApp(home: SettingsPage(onSetBiometricEnabled: seam)),
      );
      await t.pumpAndSettle();

      final toggle = find.widgetWithText(SwitchListTile, 'Khóa sinh trắc');
      // A refused proof (cancelled prompt) keeps the switch off — never
      // show armed when the lock never armed.
      await t.tap(toggle);
      await t.pumpAndSettle();
      expect(t.widget<SwitchListTile>(toggle).value, isFalse);

      allowed = true;
      await t.tap(toggle);
      await t.pumpAndSettle();
      expect(t.widget<SwitchListTile>(toggle).value, isTrue);
    });

    testWidgets('digest toggle reports through the seam', (t) async {
      bool? got;
      await t.pumpWidget(
        MaterialApp(
          home: SettingsPage(
            onSetDigestEnabled: (v) async {
              got = v;
            },
          ),
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.widgetWithText(SwitchListTile, 'Tóm tắt tuần'));
      await t.pumpAndSettle();
      expect(got, isTrue);
    });
  });

  group('digest time', () {
    testWidgets('the picker persists the pick and re-arms', (t) async {
      var rearmed = 0;
      await t.pumpWidget(
        MaterialApp(
          home: SettingsPage(
            onSetDigestEnabled: (_) async {},
            onDigestScheduleChanged: () async {
              rearmed++;
            },
          ),
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.text('Giờ gửi tóm tắt'));
      await t.pumpAndSettle();
      expect(find.byType(TimePickerDialog), findsOneWidget);

      await t.tap(find.text('OK'));
      await t.pumpAndSettle();

      // Confirming the default 19:00 still persists the pick and re-arms.
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getInt('mf_weekly_digest_minutes'), 19 * 60);
      expect(rearmed, 1);
    });
  });

  group('data rows', () {
    testWidgets('archive export loads, writes and hands to the share seam', (
      t,
    ) async {
      final shared = <(String, String)>[];
      // Sync only: awaiting real IO inside the fake-async zone never
      // completes (that's what the reports export tests dodge too).
      final temp = Directory.systemTemp.createTempSync('mf_settings_test');
      addTearDown(() => temp.deleteSync(recursive: true));
      await t.pumpWidget(
        MaterialApp(
          home: SettingsPage(
            loadArchive: () async => {
              'accounts': [
                {'id': 'a1'},
              ],
            },
            tempDir: () async => temp,
            shareFile: (path, mime) async {
              shared.add((path, mime));
            },
          ),
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.text('Sao lưu (JSON)'));
      await _untilShared(t, () => shared.length);

      expect(shared, hasLength(1));
      expect(shared.single.$2, 'application/json;charset=utf-8');
      final file = File(shared.single.$1);
      expect(file.existsSync(), isTrue);
      expect(file.readAsStringSync(), contains('"accounts"'));
    });

    testWidgets('a failed archive says so instead of pretending', (t) async {
      var shared = 0;
      await t.pumpWidget(
        MaterialApp(
          home: SettingsPage(
            loadArchive: () async => throw StateError('rpc down'),
            shareFile: (_, _) async {
              shared++;
            },
          ),
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.text('Sao lưu (JSON)'));
      await t.pumpAndSettle();

      expect(shared, 0);
      expect(find.text('Không xuất được file'), findsOneWidget);
    });

    testWidgets('delete rows call their host seams', (t) async {
      var wiped = 0, deleted = 0;
      await t.pumpWidget(
        MaterialApp(
          home: SettingsPage(
            onDeleteLocalData: () async {
              wiped++;
            },
            onDeleteAccount: () async {
              deleted++;
            },
          ),
        ),
      );
      await t.pumpAndSettle();

      await t.tap(find.text('Xóa dữ liệu trên máy'));
      await t.pumpAndSettle();
      await t.tap(find.text('Xóa tài khoản'));
      await t.pumpAndSettle();
      expect(wiped, 1);
      expect(deleted, 1);
    });
  });

  group('about rows', () {
    testWidgets('privacy link goes through the host seam', (t) async {
      var opened = 0;
      await t.pumpWidget(
        MaterialApp(home: SettingsPage(onOpenPrivacyPolicy: () => opened++)),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Chính sách bảo mật'));
      await t.pumpAndSettle();
      expect(opened, 1);
    });
  });

  group('app wiring — signed-in', () {
    testWidgets('menu carries Cài đặt; switches write the real prefs', (
      t,
    ) async {
      _bigViewport(t);
      final bio = _FakeBiometricService();
      await _pumpSignedIn(t, biometric: bio);

      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      expect(find.text('Cài đặt'), findsOneWidget);
      await t.tap(find.text('Cài đặt'));
      await t.pumpAndSettle();

      // The archive row renders — export_user_archive is live on both
      // backends now, so the flag defaults on.
      expect(find.text('Sao lưu (JSON)'), findsOneWidget);
      // Server-side deletion is wired (delete_my_account RPC) — the row
      // renders and rides the real danger flow.
      expect(find.text('Xóa tài khoản'), findsOneWidget);

      // Biometric ON runs the real enable path: proof prompt, pref,
      // then the gate re-locks behind the pushed page.
      await t.tap(find.widgetWithText(SwitchListTile, 'Khóa sinh trắc'));
      await t.pumpAndSettle();
      expect(await BiometricPrefs.loadBiometricEnabled(), isTrue);
      expect(bio.reasons, contains('Bật khóa MoneyFlow'));

      // Digest ON persists the opt-in (the re-arm is best-effort — the
      // fake transport keeps it from throwing anywhere).
      await t.tap(find.widgetWithText(SwitchListTile, 'Tóm tắt tuần'));
      await t.pumpAndSettle();
      expect(await NotificationPrefs.loadWeeklyDigestEnabled(), isTrue);
    });

    testWidgets('a refused biometric proof keeps the pref off', (t) async {
      _bigViewport(t);
      final bio = _FakeBiometricService()..nextAuth = false;
      await _pumpSignedIn(t, biometric: bio);

      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      await t.tap(find.text('Cài đặt'));
      await t.pumpAndSettle();

      await t.tap(find.widgetWithText(SwitchListTile, 'Khóa sinh trắc'));
      await t.pumpAndSettle();
      expect(await BiometricPrefs.loadBiometricEnabled(), isFalse);
      expect(find.text('Không xác thực được — chưa bật khóa'), findsOneWidget);
    });

    testWidgets('privacy link reaches the hosted policy URL', (t) async {
      _bigViewport(t);
      final opener = _FakeUrlOpener();
      await _pumpSignedIn(t, urlOpener: opener);

      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      await t.tap(find.text('Cài đặt'));
      await t.pumpAndSettle();
      await t.tap(find.text('Chính sách bảo mật'));
      await t.pumpAndSettle();

      expect(opener.opened, [Uri.parse(kPrivacyPolicyUrl)]);
    });

    testWidgets('replay welcome pushes the page and re-marks on finish', (
      t,
    ) async {
      _bigViewport(t);
      await _pumpSignedIn(t);
      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      await t.tap(find.text('Cài đặt'));
      await t.pumpAndSettle();

      await t.tap(find.text('Xem lại màn chào'));
      await t.pumpAndSettle();

      expect(find.byType(WelcomePage), findsOneWidget);
      expect(await WelcomePrefs.loadSeen(), isFalse);

      await t.tap(find.text('Bắt đầu'));
      await t.pumpAndSettle();
      expect(find.byType(WelcomePage), findsNothing);
      expect(await WelcomePrefs.loadSeen(), isTrue);
      // Back at the signed-in shell — the replay never dropped the gate.
      expect(find.byIcon(Icons.more_vert), findsOneWidget);
    });
  });

  group('app wiring — demo', () {
    testWidgets(
      'settings hides account rows and replays welcome via the gate',
      (t) async {
        _bigViewport(t);
        await _openDemoSettings(t);

        expect(find.text('Cài đặt'), findsOneWidget);
        expect(find.text('Khóa sinh trắc'), findsNothing);
        expect(find.text('Tóm tắt tuần'), findsNothing);
        expect(find.text('Sao lưu (JSON)'), findsNothing);
        expect(find.text('Xóa tài khoản'), findsNothing);
        expect(find.text('Xóa dữ liệu demo'), findsOneWidget);

        await t.tap(find.text('Xem lại màn chào'));
        await t.pumpAndSettle();
        expect(find.byType(WelcomePage), findsOneWidget);
        expect(await WelcomePrefs.loadSeen(), isFalse);

        // The real gate replay: "Xem demo" lands back on the demo shell.
        await t.tap(find.text('Xem demo'));
        await t.pumpAndSettle();
        expect(find.byType(WelcomePage), findsNothing);
        expect(find.text('demo'), findsOneWidget);
        expect(await WelcomePrefs.loadSeen(), isTrue);
      },
    );

    testWidgets('month digest switch fires its own opt-in seam', (t) async {
      bool? setTo;
      await t.pumpWidget(
        MaterialApp(
          home: SettingsPage(
            digestEnabled: false,
            onSetDigestEnabled: (_) async {},
            monthDigestEnabled: false,
            onSetMonthDigestEnabled: (v) async => setTo = v,
            onDigestScheduleChanged: () async {},
            onDeleteLocalData: () async {},
            onOpenPrivacyPolicy: () {},
            onReplayWelcome: () {},
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Tổng kết tháng'), findsOneWidget);
      // Both digests share the one fire-time row — its subtitle names
      // the real fire day once the opt-in flips on.
      await t.tap(find.text('Tổng kết tháng'));
      await t.pumpAndSettle();
      expect(setTo, isTrue);
    });
  });
}
