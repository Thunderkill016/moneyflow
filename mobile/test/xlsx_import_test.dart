// XLSX statement import — parity with the web pilot's observed bank
// layouts (src/lib/inbox/xlsx-pilot*.test.ts), the shared row model the
// preview/RPC path consumes, and honest failures for unknown layouts.
// Workbooks are generated in-test by the same `excel` package that reads
// them, so no binary fixtures live in the repo.

import 'dart:typed_data';

import 'package:excel/excel.dart' as xl;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/csv_file_source.dart';
import 'package:moneyflow/domain/csv_import.dart';
import 'package:moneyflow/domain/inbox.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/xlsx_import.dart';
import 'package:moneyflow/features/inbox/inbox_page.dart';

/// Write a one-sheet (or multi-sheet) workbook from plain values:
/// String → text cell, int → int cell, double → double cell, bool → bool
/// cell, xl.CellValue → used verbatim (DateCellValue etc.), null → empty.
Uint8List workbookBytes(
  List<List<Object?>> rows, {
  String sheet = 'Sheet1',
  xl.Excel? into,
}) {
  final excel = into ?? xl.Excel.createExcel();
  final sh = excel[sheet];
  for (var r = 0; r < rows.length; r++) {
    final row = rows[r];
    for (var c = 0; c < row.length; c++) {
      final v = row[c];
      final xl.CellValue? cellValue = switch (v) {
        null => null,
        xl.CellValue cv => cv,
        String s => xl.TextCellValue(s),
        int i => xl.IntCellValue(i),
        double d => xl.DoubleCellValue(d),
        bool b => xl.BoolCellValue(b),
        _ => throw ArgumentError('unsupported fixture cell: $v'),
      };
      if (cellValue != null) {
        sh.updateCell(
          xl.CellIndex.indexByColumnRow(columnIndex: c, rowIndex: r),
          cellValue,
        );
      }
    }
  }
  final bytes = excel.encode();
  if (bytes == null) throw StateError('excel.encode() returned null');
  return Uint8List.fromList(bytes);
}

const acc = AccountSummary(
  id: 'a1',
  name: 'VCB',
  kind: AccountKind.bank,
  currencyCode: 'VND',
  initialBalance: 0,
  balance: 1000000,
);
const catExpense = Category(
  id: 'k1',
  name: 'Ăn uống',
  kind: TransactionKind.expense,
);
const catIncome = Category(
  id: 'k2',
  name: 'Lương',
  kind: TransactionKind.income,
);

void main() {
  group('bank layouts — parity with the web pilot', () {
    test('VCB shape: preamble + ghi nợ/ghi có split', () {
      // Same synthetic shape as xlsx-pilot-vcb-layout.test.ts.
      final bytes = workbookBytes([
        ['SAO KÊ TÀI KHOẢN'],
        [
          'Ngày giao dịch',
          'Số tham chiếu',
          'Số tiền ghi nợ',
          'Số tiền ghi có',
          'Mô tả',
        ],
        ['25/11/2025', '9432 - 00001', 22000, '', 'Phí mẫu'],
        ['25/11/2025', '9733 - 00002', '', 1409751, 'Lãi mẫu'],
      ]);

      final r = parseXlsxStatement(
        bytes,
        fileName: 'synthetic-vcb-shape.xlsx',
        today: '2026-09-11',
      );

      expect(r.ok, isTrue);
      expect(r.columnMap.date, 0);
      expect(r.columnMap.amount, isNull);
      expect(r.columnMap.debit, 2);
      expect(r.columnMap.credit, 3);
      expect(r.columnMap.desc, 4);
      expect(r.rows.length, 2);
      expect(r.rows[0].kind, TransactionKind.expense);
      expect(r.rows[0].amountMinor, 22000);
      expect(r.rows[0].occurredOn, '2025-11-25');
      expect(r.rows[0].rowIndex, 3); // real worksheet row, preamble kept
      expect(r.rows[1].kind, TransactionKind.income);
      expect(r.rows[1].amountMinor, 1409751);
    });

    test('ACB shape: rút ra/gửi vào columns, Số dư never the amount', () {
      // Same synthetic shape as xlsx-pilot-acb-layout.test.ts.
      final bytes = workbookBytes([
        ['SAO KÊ TÀI KHOẢN'],
        [
          'Ngày',
          'Số GD',
          'Nội dung giao dịch',
          'Số tiền rút ra',
          'Số tiền gửi vào',
          'Số dư',
        ],
        ['05/09/2026', '1001', 'Thanh toán mẫu', 125000, '', 875000],
        ['06/09/2026', '1002', 'Hoàn tiền mẫu', '', 50000, 925000],
      ]);

      final r = parseXlsxStatement(
        bytes,
        fileName: 'synthetic-acb-shape.xlsx',
        today: '2026-09-11',
      );

      expect(r.ok, isTrue);
      expect(r.columnMap.date, 0);
      expect(r.columnMap.amount, isNull);
      expect(r.columnMap.desc, 2);
      expect(r.columnMap.debit, 3);
      expect(r.columnMap.credit, 4);
      expect(r.rows[0].kind, TransactionKind.expense);
      expect(r.rows[0].amountMinor, 125000);
      expect(r.rows[0].occurredOn, '2026-09-05');
      expect(r.rows[0].uncertainFields.contains('kind'), isFalse);
      expect(r.rows[1].kind, TransactionKind.income);
      expect(r.rows[1].amountMinor, 50000);
    });

    test('VCB public shape: standalone Thay đổi +/- direction column', () {
      // Same shape as the "public VCB-style" web pilot test.
      final bytes = workbookBytes([
        ['SAO KÊ TÀI KHOẢN'],
        ['Ngày thực hiện: 26/10/2019'],
        ['Số dư đầu kỳ', 3700511],
        ['Ngày giao dịch', 'Số tham chiếu', 'Thay đổi', 'Số tiền', 'Mô tả'],
        [
          '25/10/2019',
          'DD4400 - 046045',
          '+',
          332,
          'GIAO DICH TRA LAI TU DONG',
        ],
        ['25/10/2019', '9713 - 0045853', '-', 24173, 'POS SAMPLE'],
        ['26/10/2019', '9401 - 0001000000', '-', 2300, 'THU PHI DICH VU MAU'],
      ]);

      final r = parseXlsxStatement(
        bytes,
        fileName: 'vcb-public-shape.xlsx',
        today: '2026-09-11',
      );

      expect(r.ok, isTrue);
      expect(r.columnMap.amount, 3);
      expect(r.columnMap.debit, isNull);
      expect(r.columnMap.credit, isNull);
      expect(r.rows.length, 3);
      expect(r.rows[0].amountMinor, 332);
      expect(r.rows[0].kind, TransactionKind.income);
      expect(r.rows[0].occurredOn, '2019-10-25');
      expect(r.rows[0].uncertainFields.contains('kind'), isFalse);
      expect(r.rows[1].amountMinor, 24173);
      expect(r.rows[1].kind, TransactionKind.expense);
      expect(r.rows[2].amountMinor, 2300);
      expect(r.rows[2].kind, TransactionKind.expense);
    });

    test('VietinBank eFAST bilingual headers use the pilot roles', () {
      // Same shape as the "public VietinBank eFAST" web pilot test.
      final bytes = workbookBytes([
        ['LỊCH SỬ GIAO DỊCH - TRANSACTION HISTORY'],
        ['VietinBank eFAST'],
        ['2. Chi tiết lịch sử giao dịch/ Transaction history detail'],
        [
          'STT/ No',
          'Ngày hạch toán/ Accounting date',
          'Nợ/ Debit',
          'Có/ Credit',
          'Số dư TK/ Account Balance',
          'Số giao dịch/ Transaction number',
          'Số tài khoản đối ứng/ Corresponsive account',
          'Tên tài khoản đối ứng/ Corresponsive name',
          'Mã định danh TK thụ hưởng/ To virtual account',
          'Mô tả giao dịch/ Transaction description',
          'Ngày phát sinh giao dịch/ Transaction date',
        ],
        [
          1,
          '31-03-2026 23:06:16',
          300,
          0,
          834051,
          '1944',
          '',
          '',
          '',
          'VAT',
          '30-03-2026 23:06:16',
        ],
        [
          2,
          '31-03-2026 01:46:59',
          0,
          151,
          837351,
          '1942',
          '',
          '',
          '',
          'Tra lai tai khoan DDA',
          '31-03-2026 01:46:59',
        ],
      ]);

      final r = parseXlsxStatement(
        bytes,
        fileName: 'vietinbank-public-shape.xlsx',
        today: '2026-09-11',
      );

      expect(r.ok, isTrue);
      expect(r.columnMap.date, 10); // transaction date, not accounting
      expect(r.columnMap.amount, isNull);
      expect(r.columnMap.debit, 2);
      expect(r.columnMap.credit, 3);
      expect(r.columnMap.desc, 9);
      expect(r.rows.length, 2);
      expect(r.rows[0].occurredOn, '2026-03-30');
      expect(r.rows[0].kind, TransactionKind.expense);
      expect(r.rows[0].amountMinor, 300);
      expect(r.rows[1].kind, TransactionKind.income);
      expect(r.rows[1].amountMinor, 151);
    });

    test('ACB public shape prefers Ngày giao dịch over Ngày hiệu lực', () {
      final bytes = workbookBytes([
        ['SAO KÊ TÀI KHOẢN'],
        ['Thời gian sao kê', '05 / 2026'],
        [
          'Ngày hiệu lực',
          'Ngày giao dịch',
          'Số GD',
          'Nội dung giao dịch',
          'Ghi nợ',
          'Ghi có',
          'Số dư',
        ],
        [
          '04/05/2026',
          '02/05/2026 14:31:00',
          '9462',
          'Thanh toán mẫu',
          34060,
          '',
          288000,
        ],
        [
          '05/05/2026',
          '05/05/2026 09:15:00',
          '9463',
          'Hoàn tiền mẫu',
          '',
          50000,
          338000,
        ],
      ]);

      final r = parseXlsxStatement(
        bytes,
        fileName: 'acb-public-shape.xlsx',
        today: '2026-09-11',
      );

      expect(r.ok, isTrue);
      expect(r.columnMap.date, 1);
      expect(r.rows.length, 2);
      expect(r.rows[0].occurredOn, '2026-05-02');
      expect(r.rows[0].kind, TransactionKind.expense);
      expect(r.rows[1].occurredOn, '2026-05-05');
      expect(r.rows[1].kind, TransactionKind.income);
    });
  });

  group('cell decoding and generic headers', () {
    test('Vietnamese headers + single signed amount column', () {
      final bytes = workbookBytes([
        ['Ngày', 'Mô tả', 'Số tiền'],
        ['12/07/2026', 'Highlands Coffee', -45000],
        ['12/07/2026', 'LUONG CT', 25000000],
      ]);

      final r = parseXlsxStatement(bytes, today: '2026-07-15');

      expect(r.ok, isTrue);
      expect(r.columnMap.date, 0);
      expect(r.columnMap.desc, 1);
      expect(r.columnMap.amount, 2);
      expect(r.rows.length, 2);
      expect(r.rows[0].kind, TransactionKind.expense);
      expect(r.rows[0].amountMinor, 45000);
      expect(r.rows[1].kind, TransactionKind.income);
      expect(r.rows[1].amountMinor, 25000000);
    });

    test('English headers map through the generic tiers', () {
      final bytes = workbookBytes([
        ['Transaction Date', 'Description', 'Debit', 'Credit'],
        ['2026-07-10', 'Circle K convenience', 156000, ''],
        ['2026-07-09', 'Refund Shopee', '', 45000],
      ]);

      final r = parseXlsxStatement(bytes, today: '2026-07-15');

      expect(r.ok, isTrue);
      expect(r.columnMap.debit, 2);
      expect(r.columnMap.credit, 3);
      expect(r.rows[0].kind, TransactionKind.expense);
      expect(r.rows[0].amountMinor, 156000);
      expect(r.rows[1].kind, TransactionKind.income);
      expect(r.rows[1].amountMinor, 45000);
    });

    test('real date cells read as YYYY-MM-DD', () {
      final bytes = workbookBytes([
        ['Ngày', 'Mô tả', 'Số tiền'],
        [xl.DateCellValue(year: 2026, month: 7, day: 12), 'Cafe sáng', 45000],
        [
          xl.DateTimeCellValue(
            year: 2026,
            month: 7,
            day: 11,
            hour: 9,
            minute: 15,
          ),
          'Grab',
          89000,
        ],
      ]);

      final r = parseXlsxStatement(bytes, today: '2026-07-15');

      expect(r.ok, isTrue);
      expect(r.rows[0].occurredOn, '2026-07-12');
      expect(r.rows[0].uncertainFields.contains('date'), isFalse);
      expect(r.rows[1].occurredOn, '2026-07-11');
    });

    test('grouped amount strings keep integer đồng', () {
      final bytes = workbookBytes([
        ['Ngày', 'Mô tả', 'Số tiền'],
        ['12/07/2026', 'Dot separators', '1.234.567'],
        ['12/07/2026', 'Comma separators', '1,234,567'],
      ]);

      final r = parseXlsxStatement(bytes, today: '2026-07-15');

      expect(r.ok, isTrue);
      expect(r.rows.length, 2);
      expect(r.rows[0].amountMinor, 1234567);
      expect(r.rows[1].amountMinor, 1234567);
    });

    test('a fractional numeric cell is skipped, never coerced', () {
      final bytes = workbookBytes([
        ['Ngày', 'Mô tả', 'Số tiền'],
        ['12/07/2026', 'Legit row', 45000],
        ['12/07/2026', 'Float money', 45.5],
      ]);

      final r = parseXlsxStatement(bytes, today: '2026-07-15');

      expect(r.ok, isTrue);
      expect(r.rows.length, 1);
      expect(r.rows[0].amountMinor, 45000);
      expect(r.skippedRows, 1);
    });

    test('reference hyphens are not inferred as direction', () {
      // Same assertion as the web pilot: an unsigned amount with no
      // direction column stays an uncertain expense.
      final bytes = workbookBytes([
        ['Ngày giao dịch', 'Số tham chiếu', 'Số tiền', 'Mô tả'],
        ['25/10/2019', '9713 - 0045853', 24173, 'POS SAMPLE'],
      ]);

      final r = parseXlsxStatement(bytes, today: '2026-09-11');

      expect(r.ok, isTrue);
      expect(r.rows[0].kind, TransactionKind.expense);
      expect(r.rows[0].uncertainFields.contains('kind'), isTrue);
    });
  });

  group('sheet discovery and honest failures', () {
    test('the transactions table is found on a later sheet', () {
      final excel = xl.Excel.createExcel();
      workbookBytes([
        ['Ghi chú nội bộ'],
        ['Trường A', 'Trường B'],
        ['x', 'y'],
      ], into: excel);
      workbookBytes(
        [
          ['Ngày', 'Mô tả', 'Số tiền'],
          ['12/07/2026', 'Cafe', 45000],
        ],
        sheet: 'Sao kê',
        into: excel,
      );
      final encoded = excel.encode()!;

      final r = parseXlsxStatement(
        Uint8List.fromList(encoded),
        today: '2026-07-15',
      );

      expect(r.ok, isTrue);
      expect(r.rows.length, 1);
      expect(r.rows[0].amountMinor, 45000);
    });

    test('a workbook with no statement layout fails honestly', () {
      final bytes = workbookBytes([
        ['Báo cáo mẫu'],
        ['Trường A', 'Trường B', 'Trường C'],
        ['x', 'y', 'z'],
      ]);

      final r = parseXlsxStatement(bytes, fileName: 'random.xlsx');

      expect(r.ok, isFalse);
      expect(r.error, kXlsxFormatError);
      expect(r.rows, isEmpty);
    });

    test('bytes that are not a workbook fail honestly', () {
      final r = parseXlsxStatement(
        Uint8List.fromList('Ngày,Mô tả,Số tiền\n1/1/2026,x,5'.codeUnits),
        fileName: 'not-really.xlsx',
      );

      expect(r.ok, isFalse);
      expect(r.error, kXlsxFormatError);
    });

    test('empty bytes fail before decode', () {
      final r = parseXlsxStatement(Uint8List(0), fileName: 'e.xlsx');
      expect(r.ok, isFalse);
      expect(r.error, 'File Excel trống hoặc không đọc được.');
    });

    test('header found but no parseable rows reports the row error', () {
      final bytes = workbookBytes([
        ['Ngày', 'Mô tả', 'Số tiền'],
        ['12/07/2026', 'cafe', 'không số'],
      ]);

      final r = parseXlsxStatement(bytes, today: '2026-07-15');

      expect(r.ok, isFalse);
      expect(r.error, contains('Không trích được giao dịch hợp lệ'));
      expect(r.error, contains('sheet'));
    });
  });

  group('InboxPage wiring — xlsx rides the same sheet', () {
    InboxCandidate row() => InboxCandidate(
      id: 'c1',
      kind: TransactionKind.expense,
      amountMinor: 22000,
      merchant: 'Phí mẫu',
      note: '',
      occurredOn: '2025-11-25',
      source: 'xlsx',
      confidence: 'high',
      accountId: 'a1',
      accountName: 'VCB',
      categoryId: 'k1',
      categoryName: 'Ăn uống',
    );

    testWidgets('pick .xlsx → preview → import lands candidates', (t) async {
      t.view.physicalSize = const Size(1080, 2400);
      t.view.devicePixelRatio = 1.0;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);

      final bytes = workbookBytes([
        ['SAO KÊ TÀI KHOẢN'],
        ['Ngày giao dịch', 'Số tiền ghi nợ', 'Số tiền ghi có', 'Mô tả'],
        ['25/11/2025', 22000, '', 'Phí mẫu'],
        ['25/11/2025', '', 1409751, 'Lãi mẫu'],
      ]);

      var loads = 0;
      CsvImportBatch? sent;
      await t.pumpWidget(
        MaterialApp(
          home: InboxPage(
            loadCandidates: () async {
              loads++;
              return loads == 1 ? const [] : [row()];
            },
            loadAccounts: () async => [acc],
            loadCategories: () async => [catExpense, catIncome],
            onPlan: (_) async => null,
            onApprove: (_) async {},
            onReject: (_) async {},
            pickCsvFile: () async =>
                PickedCsvFile(name: 'sao-ke.xlsx', bytes: bytes),
            onImportCsv: (b) async {
              sent = b;
              return const CsvImportResult(batchId: 'b1', candidateCount: 2);
            },
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Nhập file CSV/Excel'));
      await t.pumpAndSettle();
      expect(find.text('Nhập CSV hoặc Excel'), findsWidgets);

      await t.tap(find.text('Chọn file CSV hoặc Excel (.xlsx)'));
      await t.pumpAndSettle();
      expect(find.textContaining('2 dòng sẽ nhập'), findsOneWidget);

      await t.tap(find.text('Nhập 2 mục vào Cần xem'));
      await t.pumpAndSettle();

      expect(sent, isNotNull);
      expect(sent!.fileName, 'sao-ke.xlsx');
      expect(sent!.rows.length, 2);
      expect(sent!.rows[0].kind, TransactionKind.expense);
      expect(sent!.rows[1].kind, TransactionKind.income);
      expect(find.text('Đã tạo 2 mục chờ duyệt'), findsOneWidget);
    });

    testWidgets('a bad .xlsx shows the format error, never imports', (t) async {
      var called = false;
      await t.pumpWidget(
        MaterialApp(
          home: InboxPage(
            loadCandidates: () async => const [],
            loadAccounts: () async => [acc],
            loadCategories: () async => [catExpense, catIncome],
            onPlan: (_) async => null,
            onApprove: (_) async {},
            onReject: (_) async {},
            pickCsvFile: () async => PickedCsvFile(
              name: 'random.xlsx',
              bytes: workbookBytes([
                ['Trường A', 'Trường B'],
                ['x', 'y'],
              ]),
            ),
            onImportCsv: (_) async {
              called = true;
              return const CsvImportResult(batchId: 'b', candidateCount: 0);
            },
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Nhập file CSV/Excel'));
      await t.pumpAndSettle();
      await t.tap(find.text('Chọn file CSV hoặc Excel (.xlsx)'));
      await t.pumpAndSettle();
      expect(find.text(kXlsxFormatError), findsOneWidget);
      expect(called, isFalse);
    });
  });
}
