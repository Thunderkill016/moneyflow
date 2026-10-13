import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/datetime_label.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/activity/trash_page.dart';

DeletedTransaction _item({String id = 't1', String note = 'Cà phê'}) =>
    DeletedTransaction(
      transaction: Transaction(
        id: id,
        kind: TransactionKind.expense,
        categoryId: 'c1',
        category: 'Ăn uống',
        note: note,
        accountId: 'a1',
        account: 'Tiền mặt',
        amount: 45000,
        occurredOn: '2026-09-10',
      ),
      deletedAt: '2026-09-13T03:04:05Z',
    );

void main() {
  group('formatDeletedAtLabel', () {
    test('renders Vietnam time (UTC+7) as HH:MM · DD/MM/YYYY', () {
      // 03:04Z + 7h = 10:04 same day.
      expect(
        formatDeletedAtLabel('2026-09-13T03:04:05Z'),
        '10:04 · 13/09/2026',
      );
      // 22:30Z + 7h crosses midnight into the next VN day.
      expect(
        formatDeletedAtLabel('2026-09-13T22:30:00Z'),
        '05:30 · 14/09/2026',
      );
    });

    test('unparseable input yields an empty label', () {
      expect(formatDeletedAtLabel('not-a-date'), '');
    });
  });

  group('TrashPage', () {
    testWidgets('lists deleted rows and restores via callback', (t) async {
      final restored = <String>[];
      await t.pumpWidget(
        MaterialApp(
          home: TrashPage(
            loadDeleted: () async => [_item()],
            onRestore: (id) async => restored.add(id),
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Cà phê'), findsOneWidget);
      expect(
        find.textContaining('Đã xóa lúc 10:04 · 13/09/2026'),
        findsOneWidget,
      );

      await t.tap(find.text('Khôi phục'));
      await t.pumpAndSettle();

      expect(restored, ['t1']);
      expect(find.text('Đã khôi phục'), findsOneWidget);
    });

    testWidgets('empty trash shows the honest empty state', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: TrashPage(
            loadDeleted: () async => const [],
            onRestore: (_) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Thùng rác trống'), findsOneWidget);
    });

    testWidgets('a failed load shows the retry surface, not a spinner', (
      t,
    ) async {
      var loads = 0;
      await t.pumpWidget(
        MaterialApp(
          home: TrashPage(
            loadDeleted: () async {
              loads++;
              throw Exception('network');
            },
            onRestore: (_) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Không tải được thùng rác'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);

      await t.tap(find.text('Thử lại'));
      await t.pumpAndSettle();
      expect(loads, 2);
    });

    testWidgets('failed restore keeps the row and shows an error', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: TrashPage(
            loadDeleted: () async => [_item()],
            onRestore: (_) async => throw Exception('network'),
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Khôi phục'));
      await t.pumpAndSettle();
      expect(find.text('Không khôi phục được — thử lại'), findsOneWidget);
      expect(find.text('Cà phê'), findsOneWidget);
    });
  });
}
