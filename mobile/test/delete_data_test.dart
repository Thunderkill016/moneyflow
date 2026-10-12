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
          'neon.session_token',
        ]),
      );
      expect(prefs.getString('mf_dashboard_snapshot'), isNull);
      expect(prefs.getString('neon.session_token'), isNull);
      expect(prefs.getString('other_plugin_pref'), 'keep');
      expect(prefs.getString('unrelated_key'), 'keep');
    });
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
