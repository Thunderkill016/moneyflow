import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:moneyflow/fintech/fintech_models.dart';
import 'package:moneyflow/fintech/fintech_shell.dart';
import 'package:moneyflow/fintech/fintech_store.dart';
import 'package:moneyflow/fintech/quick_capture_sheet.dart';

void main() {
  group('VND formatting & Vietnamese NLP quick parser', () {
    test('formatVnd formats full and compact VND amounts cleanly', () {
      expect(formatVnd(45000), '45.000 ₫');
      expect(formatVnd(15000000), '15.000.000 ₫');
      expect(formatVnd(45000, signed: true, kind: TxKind.expense), '- 45.000 ₫');
      expect(formatVnd(25000000, signed: true, kind: TxKind.income), '+ 25.000.000 ₫');
      expect(formatVnd(15000000, compact: true), '15tr');
      expect(formatVnd(6580000, compact: true), '6,6tr');
      expect(formatVnd(45000, compact: true), '45k');
    });

    test('parseVietnameseQuickInput parses natural voice phrases', () {
      final breakfast = parseVietnameseQuickInput('ăn sáng phở bò 55k');
      expect(breakfast.amount, 55000);
      expect(breakfast.kind, TxKind.expense);
      expect(breakfast.categoryId, 'food');

      final coffee = parseVietnameseQuickInput('Cà phê Highlands 49 nghìn momo');
      expect(coffee.amount, 49000);
      expect(coffee.categoryId, 'coffee');
      expect(coffee.walletId, 'momo');

      final salary = parseVietnameseQuickInput('Nhận lương 25 triệu vcb');
      expect(salary.amount, 25000000);
      expect(salary.kind, TxKind.income);
      expect(salary.categoryId, 'salary');
      expect(salary.walletId, 'vcb');

      final bareNumber = parseVietnameseQuickInput('Bún riêu 45');
      expect(bareNumber.amount, 45000);
      expect(bareNumber.categoryId, 'food');
    });
  });

  group('FintechStore state and balance math', () {
    test('addTransaction and deleteTransaction maintain exact wallet balances', () async {
      final store = FintechStore(persist: false, nowOverride: DateTime(2026, 11, 14, 10, 0));
      final initialTotal = store.totalBalance;
      final initialVcb = store.walletById('vcb').balance;

      final expense = FinTx(
        id: 't-1',
        kind: TxKind.expense,
        amount: 120000,
        categoryId: 'food',
        walletId: 'vcb',
        note: 'Bữa tối',
        timestamp: DateTime(2026, 11, 14, 19, 0),
      );
      await store.addTransaction(expense);
      expect(store.walletById('vcb').balance, initialVcb - 120000);
      expect(store.totalBalance, initialTotal - 120000);

      // Transfers preserve totalBalance across wallets
      final transfer = FinTx(
        id: 't-2',
        kind: TxKind.transfer,
        amount: 500000,
        categoryId: 'transfer',
        walletId: 'vcb',
        toWalletId: 'momo',
        note: 'Nạp MoMo',
        timestamp: DateTime(2026, 11, 14, 19, 5),
      );
      await store.addTransaction(transfer);
      expect(store.totalBalance, initialTotal - 120000);

      await store.deleteTransaction('t-1');
      expect(store.totalBalance, initialTotal);
    });
  });

  group('FintechApp widget flows on 360x733 mobile viewport', () {
    testWidgets('Home Bento renders, 3s capture adds tx, all 4 tabs render without overflow',
        (tester) async {
      tester.view.physicalSize = const Size(360, 733);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final store = FintechStore(
        persist: false,
        nowOverride: DateTime(2026, 11, 14, 18, 30),
      );
      await tester.pumpWidget(FintechApp(store: store));
      await tester.pumpAndSettle();

      // Home Bento checks
      expect(find.text('TỔNG TÀI SẢN'), findsOneWidget);
      expect(find.text('68.450.000 ₫'), findsOneWidget);
      expect(find.text('Nhịp chi 7 ngày'), findsOneWidget);
      expect(find.text('Hạn mức tháng'), findsOneWidget);
      expect(find.text('Vietcombank'), findsOneWidget);

      // Open 3-second Capture via center '+' button
      await tester.tap(find.byIcon(Icons.add_rounded));
      await tester.pumpAndSettle();

      expect(find.text('SỐ TIỀN CHI'), findsOneWidget);
      expect(find.text('000'), findsOneWidget);

      // Enter 45 + 000 via custom numpad and save
      await tester.tap(find.text('4'));
      await tester.pump();
      await tester.tap(find.text('5'));
      await tester.pump();
      await tester.tap(find.text('000'));
      await tester.pump();

      expect(find.text('45.000 ₫'), findsOneWidget);

      await tester.tap(find.text('Cà phê'));
      await tester.pump();
      await tester.tap(find.text('Lưu giao dịch'));
      await tester.pumpAndSettle();

      expect(store.totalBalance, 68450000 - 45000);

      // Verify Voice quick mode and Bill Scanner mode open cleanly
      await tester.tap(find.byIcon(Icons.add_rounded));
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byType(QuickCaptureSheet),
          matching: find.byTooltip('Nói để ghi'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Mẫu câu 1 chạm'), findsOneWidget);

      await tester.tap(
        find.descendant(
          of: find.byType(QuickCaptureSheet),
          matching: find.byTooltip('Quét hóa đơn'),
        ),
      );
      await tester.pump();
      expect(find.text('Highlands Coffee'), findsOneWidget);

      // Dismiss capture sheet
      Navigator.of(tester.element(find.text('Highlands Coffee'))).pop();
      await tester.pumpAndSettle();

      // Switch across all remaining tabs cleanly
      await tester.tap(find.text('Ví & Thẻ'));
      await tester.pumpAndSettle();
      expect(find.text('TỔNG SỐ DƯ CÁC VÍ'), findsOneWidget);

      await tester.tap(find.text('Phân tích'));
      await tester.pumpAndSettle();
      expect(find.text('Cơ cấu chi tiêu'), findsOneWidget);
      expect(find.text('Dòng tiền 6 tháng'), findsOneWidget);

      await tester.tap(find.text('Sổ thu chi'));
      await tester.pumpAndSettle();
      expect(find.text('Hôm nay'), findsOneWidget);
    });
  });
}
