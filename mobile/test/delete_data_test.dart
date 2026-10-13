import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/app/delete_data.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('wipeLocalData', () {
    test('removes MoneyFlow keys and leaves foreign keys intact', () async {
      SharedPreferences.setMockInitialValues({
        'mf_dashboard_snapshot': '{}',
        'mf_last_capture_account': 'a1',
        'mf_offline_capture_queue': '{}',
        'neon.session_token': 'tok',
        'other_plugin_pref': 'keep',
        'unrelated_key': 'keep',
      });
      final prefs = await SharedPreferences.getInstance();
      final removed = await wipeLocalData(prefs);

      expect(
        removed,
        containsAll(<String>[
          'mf_dashboard_snapshot',
          'mf_last_capture_account',
          'mf_offline_capture_queue',
          'neon.session_token',
        ]),
      );
      expect(prefs.getString('mf_dashboard_snapshot'), isNull);
      expect(prefs.getString('mf_offline_capture_queue'), isNull);
      expect(prefs.getString('neon.session_token'), isNull);
      expect(prefs.getString('other_plugin_pref'), 'keep');
      expect(prefs.getString('unrelated_key'), 'keep');
    });
  });

  group('clearSignOutResidue', () {
    test(
      'clears session residue but keeps scoped + device opt-in keys',
      () async {
        SharedPreferences.setMockInitialValues({
          // Unscoped residue — must go.
          'mf_last_capture_account': 'acc-1',
          'mf_last_capture_category': 'cat-1',
          'mf_recurring_dismissed': '["k1"]',
          'mf_dashboard_snapshot': '{}',
          'mf_offline_capture_queue': '{}',
          // Account-scoped stores — survive for their owner's next session.
          'mf_dashboard_snapshot_u-alice': '{}',
          'mf_offline_capture_queue_u-alice': '{}',
          // Device-level opt-ins — the next sign-in keeps its own choice.
          'mf_biometric_enabled': true,
          'mf_weekly_digest_enabled': true,
          'other_plugin_pref': 'keep',
        });
        final prefs = await SharedPreferences.getInstance();
        final removed = await clearSignOutResidue(prefs);

        for (final key in [
          'mf_last_capture_account',
          'mf_last_capture_category',
          'mf_recurring_dismissed',
          'mf_dashboard_snapshot',
          'mf_offline_capture_queue',
        ]) {
          expect(removed, contains(key), reason: key);
          expect(prefs.getString(key), isNull, reason: key);
        }
        expect(prefs.getString('mf_dashboard_snapshot_u-alice'), isNotNull);
        expect(prefs.getString('mf_offline_capture_queue_u-alice'), isNotNull);
        expect(prefs.getBool('mf_biometric_enabled'), isTrue);
        expect(prefs.getBool('mf_weekly_digest_enabled'), isTrue);
        expect(prefs.getString('other_plugin_pref'), 'keep');
      },
    );
  });

  group('showDeleteDataDialog', () {
    Future<void> pumpOpener(WidgetTester t) async {
      await t.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => FilledButton(
              onPressed: () => showDeleteDataDialog(
                context,
                title: 'Xóa dữ liệu demo',
                body: 'body',
              ),
              child: const Text('open'),
            ),
          ),
        ),
      );
      await t.tap(find.text('open'));
      await t.pumpAndSettle();
    }

    testWidgets('Xóa stays disabled until the exact confirm text', (t) async {
      await pumpOpener(t);
      expect(find.text('Gõ XÓA để xác nhận'), findsOneWidget);

      FilledButton delete() =>
          t.widget<FilledButton>(find.widgetWithText(FilledButton, 'Xóa'));
      expect(delete().onPressed, isNull);

      await t.enterText(find.byType(TextField), 'xoa');
      await t.pump();
      expect(delete().onPressed, isNull);

      await t.enterText(find.byType(TextField), 'XÓA');
      await t.pump();
      expect(delete().onPressed, isNotNull);
    });
  });
}
