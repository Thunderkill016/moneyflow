import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/export_files.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/reports/reports_page.dart';

/// A transaction dated inside the current month — the default report
/// period, so the page's own loader resolves with it.
Transaction _tx(String id, {int amount = 45000}) {
  final now = DateTime.now();
  final day = '${now.year}-${now.month.toString().padLeft(2, '0')}-10';
  return Transaction(
    id: id,
    kind: TransactionKind.expense,
    categoryId: 'cat-$id',
    category: 'Ăn uống',
    note: 'Khoản $id',
    accountId: 'acc-1',
    account: 'Tiền mặt',
    amount: amount,
    occurredOn: day,
  );
}

/// The filename the current month period must produce:
/// moneyflow-(month start)-(month end).csv.
String _expectedCsvName() {
  final now = DateTime.now();
  final from = '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
  final last = DateTime(now.year, now.month + 1, 0);
  final to =
      '${last.year}-${last.month.toString().padLeft(2, '0')}-${last.day.toString().padLeft(2, '0')}';
  return 'moneyflow-$from-$to.csv';
}

/// Captured share-sheet call.
class _ShareSpy {
  String? path;
  String? mime;
  var calls = 0;
  Object? error;

  Future<void> call(String p, String m) async {
    calls++;
    path = p;
    mime = m;
    if (error != null) throw error!;
  }
}

Future<void> _pumpReports(
  WidgetTester tester, {
  required Future<List<Transaction>> Function(String from, String to)?
  loadRange,
  required _ShareSpy share,
  Future<Object?> Function()? loadArchive,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: ReportsPage(
        loadTransactions: () async => const [],
        loadRange: loadRange,
        shareFile: share.call,
        tempDir: () async => Directory.systemTemp,
        loadArchive: loadArchive,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _openSheet(WidgetTester tester) async {
  await tester.tap(find.byTooltip('Xuất dữ liệu'));
  await tester.pumpAndSettle();
}

/// The export writes a real file: dart:io completes on the true event
/// loop while the page's continuations queue into the fake-async zone.
/// Neither a bare runAsync wait nor pumpAndSettle alone covers the chain —
/// alternate real time with pumps until the spy fires.
Future<void> _untilShared(WidgetTester tester, _ShareSpy share) async {
  for (var i = 0; i < 100 && share.calls == 0; i++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 10)),
    );
    await tester.pump();
  }
  await tester.pumpAndSettle();
}

/// Failure paths also cross real IO — give the export a beat to fail.
Future<void> _settleExport(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 20)),
    );
    await tester.pump();
  }
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('the export sheet offers CSV for the shown period', (
    tester,
  ) async {
    final share = _ShareSpy();
    await _pumpReports(
      tester,
      loadRange: (f, t) async => [_tx('a')],
      share: share,
    );
    await _openSheet(tester);
    expect(find.text('Xuất CSV kỳ này'), findsOneWidget);
    expect(find.text(_expectedCsvName()), findsOneWidget);
    // No archive loader wired (demo shape) — no JSON item.
    expect(find.text('Sao lưu toàn bộ (JSON)'), findsNothing);
  });

  testWidgets('CSV export refetches, writes the file and shares it', (
    tester,
  ) async {
    final share = _ShareSpy();
    var rangeCalls = 0;
    await _pumpReports(
      tester,
      loadRange: (f, t) async {
        rangeCalls++;
        return [_tx('a'), _tx('b', amount: 32000)];
      },
      share: share,
    );
    expect(rangeCalls, 1); // the report's own load

    await _openSheet(tester);
    await tester.tap(find.text('Xuất CSV kỳ này'));
    await _untilShared(tester, share);

    // A second fetch — the export never reuses the on-screen rows.
    expect(rangeCalls, 2);
    expect(share.calls, 1);
    expect(share.mime, 'text/csv;charset=utf-8');
    expect(share.path, endsWith(_expectedCsvName()));
    // Byte-level check: readAsString/utf8.decode skip the BOM, so the
    // prefix must be asserted on raw bytes.
    final bytes = File(share.path!).readAsBytesSync();
    expect(bytes.sublist(0, 3), [0xEF, 0xBB, 0xBF]);
    final written = utf8.decode(bytes.sublist(3));
    expect(written, contains('"Chi tiêu"'));
    expect(written, endsWith('\r\n'));
  });

  testWidgets('an empty period disables CSV with an honest label', (
    tester,
  ) async {
    final share = _ShareSpy();
    await _pumpReports(
      tester,
      loadRange: (f, t) async => const [],
      share: share,
    );
    await _openSheet(tester);
    // The body empty-state card carries the same wording — the sheet's
    // subtitle is the second occurrence.
    expect(find.text('Không có giao dịch trong kỳ này'), findsWidgets);
    final tile = tester.widget<ListTile>(
      find.widgetWithText(ListTile, 'Xuất CSV kỳ này'),
    );
    expect(tile.enabled, isFalse);

    await tester.tap(find.text('Xuất CSV kỳ này'));
    await _settleExport(tester);
    expect(share.calls, 0);
  });

  testWidgets('a period emptied since load reports empty instead of a file', (
    tester,
  ) async {
    final share = _ShareSpy();
    var calls = 0;
    await _pumpReports(
      tester,
      loadRange: (f, t) async {
        calls++;
        return calls == 1 ? [_tx('a')] : const [];
      },
      share: share,
    );
    await _openSheet(tester);
    await tester.tap(find.text('Xuất CSV kỳ này'));
    await tester.pumpAndSettle();
    expect(share.calls, 0);
    expect(find.text('Không có giao dịch trong kỳ này'), findsOneWidget);
  });

  testWidgets('JSON backup writes the archive document and shares it', (
    tester,
  ) async {
    final share = _ShareSpy();
    final archive = {
      'archive_id': 'ar-1',
      'tables': {
        'transactions': [
          {'id': 'tx-1'},
        ],
      },
    };
    await _pumpReports(
      tester,
      loadRange: (f, t) async => [_tx('a')],
      share: share,
      loadArchive: () async => archive,
    );
    await _openSheet(tester);
    expect(find.text('Sao lưu toàn bộ (JSON)'), findsOneWidget);
    await tester.tap(find.text('Sao lưu toàn bộ (JSON)'));
    await _untilShared(tester, share);

    expect(share.calls, 1);
    expect(share.mime, 'application/json;charset=utf-8');
    expect(share.path, matches(RegExp(r'moneyflow-backup-\d{8}\.json$')));
    final body = utf8.decode(File(share.path!).readAsBytesSync());
    expect(body, endsWith('\n'));
    expect((jsonDecode(body) as Map)['archive_id'], 'ar-1');
  });

  testWidgets('a non-document archive answer fails honestly', (tester) async {
    final share = _ShareSpy();
    await _pumpReports(
      tester,
      loadRange: (f, t) async => [_tx('a')],
      share: share,
      loadArchive: () async => 'opaque-blob',
    );
    await _openSheet(tester);
    await tester.tap(find.text('Sao lưu toàn bộ (JSON)'));
    await tester.pumpAndSettle();
    expect(share.calls, 0);
    expect(find.text('Không xuất được file'), findsOneWidget);
  });

  testWidgets('a failed write/share surfaces the honest snackbar', (
    tester,
  ) async {
    final share = _ShareSpy()..error = Exception('no sheet');
    await _pumpReports(
      tester,
      loadRange: (f, t) async => [_tx('a')],
      share: share,
    );
    await _openSheet(tester);
    await tester.tap(find.text('Xuất CSV kỳ này'));
    await _untilShared(tester, share);
    expect(share.calls, 1); // the sheet was invoked — it threw
    expect(find.text('Không xuất được file'), findsOneWidget);
  });

  testWidgets('a failed range load still offers the CSV attempt', (
    tester,
  ) async {
    // The export refetches on its own — a stale report failure must not
    // silently disable a path that could still succeed.
    final share = _ShareSpy();
    var calls = 0;
    await _pumpReports(
      tester,
      loadRange: (f, t) async {
        calls++;
        if (calls == 1) throw Exception('offline');
        return [_tx('a')];
      },
      share: share,
    );
    await _openSheet(tester);
    final tile = tester.widget<ListTile>(
      find.widgetWithText(ListTile, 'Xuất CSV kỳ này'),
    );
    expect(tile.enabled, isTrue);
    await tester.tap(find.text('Xuất CSV kỳ này'));
    await _untilShared(tester, share);
    expect(share.calls, 1);
  });

  test('writeExportFile lands the body under the injected dir', () async {
    final dir = Directory.systemTemp.createTempSync('mf-export-test');
    addTearDown(() => dir.deleteSync(recursive: true));
    final file = await writeExportFile(
      'moneyflow-test.csv',
      '\uFEFF"a"\r\n',
      tempDir: () async => dir,
    );
    expect(file.path, '${dir.path}/moneyflow-test.csv');
    // BOM lives on the raw bytes — the UTF-8 decoders skip it on read.
    final bytes = file.readAsBytesSync();
    expect(bytes.sublist(0, 3), [0xEF, 0xBB, 0xBF]);
    expect(utf8.decode(bytes.sublist(3)), '"a"\r\n');
  });
}
