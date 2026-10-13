import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/app.dart';
import 'package:moneyflow/app/url_opener.dart';
import 'package:moneyflow/data/quick_action.dart';
import 'package:moneyflow/data/share/share_intent.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// UrlOpener double — records the URI instead of handing it to a browser
/// that does not exist in a widget test. [nextResult] steers the
/// success/failure path the device would report.
class _FakeUrlOpener implements UrlOpener {
  final opened = <Uri>[];
  bool nextResult = true;

  @override
  Future<bool> open(Uri uri) async {
    opened.add(uri);
    return nextResult;
  }
}

/// Share/quick-action doubles — same role as the quick_action_test
/// fakes: keep every test off the platform channels.
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

/// Boot the gate with no stored session, enter demo, land on the
/// dashboard. Demo carries the same menu item — the signed-in menu is
/// assembled by the same seam.
Future<void> _pumpDemoDashboard(WidgetTester t, UrlOpener opener) async {
  await t.pumpWidget(
    MaterialApp(
      home: AuthGate(
        shareReceiver: const _NoopShareReceiver(),
        quickActions: _NoopQuickActions(),
        urlOpener: opener,
      ),
    ),
  );
  await t.pumpAndSettle();
  await t.tap(find.text('Xem bản demo (không cần đăng nhập)'));
  await t.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    // Session tokens moved to secure storage — the mock keeps AuthGate's
    // restore path off the platform channel.
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('dashboard privacy link', () {
    testWidgets('the menu carries "Chính sách bảo mật" and opens the '
        'hosted policy', (t) async {
      final opener = _FakeUrlOpener();
      await _pumpDemoDashboard(t, opener);

      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      expect(find.text('Chính sách bảo mật'), findsOneWidget);

      await t.tap(find.text('Chính sách bảo mật'));
      await t.pumpAndSettle();
      expect(opener.opened, [Uri.parse(kPrivacyPolicyUrl)]);
    });

    testWidgets('a refused launch surfaces a notice instead of a dead tap', (
      t,
    ) async {
      final opener = _FakeUrlOpener()..nextResult = false;
      await _pumpDemoDashboard(t, opener);

      await t.tap(find.byIcon(Icons.more_vert));
      await t.pumpAndSettle();
      await t.tap(find.text('Chính sách bảo mật'));
      await t.pumpAndSettle();

      expect(opener.opened, [Uri.parse(kPrivacyPolicyUrl)]);
      expect(find.text('Không mở được liên kết — thử lại sau'), findsOneWidget);
    });
  });
}
