// CSV statement import — parser/plan parity with the web
// (src/lib/inbox/parse-csv.ts + direct-csv-import.ts), the
// prepare_direct_csv_candidates_with_rules payload contract, and the
// inbox sheet's pick → preview → commit flow. Candidates only ever land
// pending; nothing in this path posts to the ledger.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/csv_file_source.dart';
import 'package:moneyflow/data/share/inbox_paste_parser.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/domain/csv_import.dart';
import 'package:moneyflow/domain/inbox.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/inbox/inbox_page.dart';

const config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

String fakeJwt() {
  final payload = {
    'sub': 'u1',
    'exp': (DateTime.now().millisecondsSinceEpoch ~/ 1000) + 900,
  };
  String b64(Object o) =>
      base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${b64({'alg': 'EdDSA'})}.${b64(payload)}.sig';
}

class FakeTransport {
  final requests = <NeonRequest>[];
  final queue = <NeonResponse>[];

  NeonRequester get requester => (req) async {
    requests.add(req);
    assert(queue.isNotEmpty, 'unexpected request: ${req.url}');
    return queue.removeAt(0);
  };

  static NeonResponse json(
    int status,
    Object body, {
    Map<String, String> headers = const {},
  }) => NeonResponse(status: status, headers: headers, body: jsonEncode(body));
}

class Harness {
  final t = FakeTransport();
  late final auth = NeonAuthClient(config: config, requester: t.requester);
  late final api = NeonDataApi(
    config: config,
    auth: auth,
    requester: t.requester,
  );
  late final store = RealStore(api);

  Future<void> signIn() async {
    t.queue.add(
      FakeTransport.json(
        200,
        {
          'token': 't.s',
          'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
        },
        headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
      ),
    );
    await auth.signIn('e', 'p');
    t.queue.add(
      FakeTransport.json(200, {}, headers: {'set-auth-jwt': fakeJwt()}),
    );
  }
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

/// The same fixture as src/lib/inbox/fixtures/sample-bank.csv.
const sampleBankCsv =
    'Ngày,Mô tả,Số tiền\n'
    '12/07/2026,Highlands Coffee,-45000\n'
    '12/07/2026,LUONG CT,+25000000\n'
    '11/07/2026,GRAB *TRIP,89000\n'
    '10/07/2026,CK noi bo,2000000\n';

/// The same fixture as src/lib/inbox/fixtures/sample-generic.csv.
const sampleGenericCsv =
    'Date,Description,Amount\n'
    '2026-07-10,Circle K convenience,156000\n'
    '2026-07-09,Shopee order #9912,"-320.000"\n'
    '2026-07-08,Refund Shopee,+45000\n';

void main() {
  group('parser — parity with parse-csv.ts', () {
    test('parseCsvMatrix handles quotes and commas', () {
      final matrix = parseCsvMatrix('a,b,"c,d"\n1,2,"3,4"\n');
      expect(matrix[0], ['a', 'b', 'c,d']);
      expect(matrix[1], ['1', '2', '3,4']);
    });

    test('UTF-8 BOM is stripped like file.text() + parseCsvMatrix', () {
      final matrix = parseCsvMatrix('\uFEFFNgày,Số tiền\n10/07/2026,5000\n');
      expect(matrix[0], ['Ngày', 'Số tiền']);
    });

    test('amount cell: separators, paren negative, k unit → đồng', () {
      expect(parseCsvAmountCell('45.000').amount, 45000);
      expect(parseCsvAmountCell('45,000').amount, 45000);
      expect(parseCsvAmountCell('1 200 000').amount, 1200000);
      expect(parseCsvAmountCell('-120000').amount, 120000);
      expect(parseCsvAmountCell('-120000').signedNegative, isTrue);
      expect(parseCsvAmountCell('(320.000)').amount, 320000);
      expect(parseCsvAmountCell('(320.000)').signedNegative, isTrue);
      expect(parseCsvAmountCell('45k').amount, 45000);
      expect(parseCsvAmountCell('0').amount, isNull);
      expect(parseCsvAmountCell('').amount, isNull);
    });

    test('amount cell: a 20+-digit run is rejected, not a crash', () {
      // audit P1-2: the number regex allows unbounded runs and int.parse
      // throws past int64 — a card/account serial in an amount column
      // must fall to null like every other non-amount.
      for (final cell in [
        '99999999999999999999',
        '123456789012345678901234567890',
        '99999999999999999999 VND',
        '-99999999999999999999',
      ]) {
        final r = parseCsvAmountCell(cell);
        expect(r.amount, isNull, reason: '$cell must not parse or throw');
      }
      // int64-max parses as a number but exceeds the JS ceiling — still
      // not a VND amount.
      expect(parseCsvAmountCell('9223372036854775807').amount, isNull);
      // …while the JS-safe ceiling boundary still works.
      expect(parseCsvAmountCell('9007199254740991').amount, 9007199254740991);
    });

    test('date cell: ISO / DMY / missing year borrows today', () {
      var r = parseCsvDateCell('2026-07-12', '2026-07-15');
      expect(r.date, '2026-07-12');
      expect(r.found, isTrue);
      r = parseCsvDateCell('12/07/2026', '2026-07-15');
      expect(r.date, '2026-07-12');
      expect(r.found, isTrue);
      r = parseCsvDateCell('11/07', '2026-07-15');
      expect(r.date, '2026-07-11');
      expect(r.found, isTrue);
      r = parseCsvDateCell('', '2026-07-15');
      expect(r.found, isFalse);
      expect(r.date, '2026-07-15');
    });

    test('date cell: impossible calendar days are not found', () {
      // The reviewed hole: 31/02 regex-matched but cannot exist — it
      // must flag the row (found: false), never produce 2026-02-31 or
      // normalize into March.
      for (final raw in [
        '31/02/2026',
        '2026-02-31',
        '30/02/2026',
        '29/02/2026', // 2026 is not a leap year
        '2026.02.30',
        '31/02', // borrowed-year form
        '13/13/2026',
      ]) {
        final r = parseCsvDateCell(raw, '2026-07-15');
        expect(r.found, isFalse, reason: '$raw must not parse as certain');
        expect(r.date, '2026-07-15', reason: '$raw must fall back to today');
      }
      // …while real leap/calendar days still parse.
      expect(parseCsvDateCell('29/02/2024', '2026-07-15').date, '2024-02-29');
      expect(parseCsvDateCell('28/02/2026', '2026-07-15').found, isTrue);
    });

    test('column map: Vietnamese headers and debit/credit layouts', () {
      final vn = mapCsvColumns(['Ngày', 'Mô tả', 'Số tiền']);
      expect(vn.map.date, 0);
      expect(vn.map.desc, 1);
      expect(vn.map.amount, 2);
      expect(vn.confidence, greaterThanOrEqualTo(0.7));

      final dc = mapCsvColumns(['Date', 'Narration', 'Debit', 'Credit']);
      expect(dc.map.date, 0);
      expect(dc.map.desc, 1);
      expect(dc.map.debit, 2);
      expect(dc.map.credit, 3);
    });

    test('export-shaped header maps through the loose tier', () {
      // The columns transactionsToCsv emits — "Số tiền (VND)" isn't an
      // exact header match but the loose amount tier catches it.
      final m = mapCsvColumns([
        'Ngày',
        'Loại',
        'Ghi chú',
        'Danh mục',
        'Tài khoản nguồn',
        'Tài khoản đích',
        'Số tiền (VND)',
      ]);
      expect(m.map.date, 0);
      expect(m.map.desc, 2);
      expect(m.map.amount, 6);
    });

    test('sample-bank.csv → 4 rows with integer money and kinds', () {
      final r = parseCsvStatement(
        sampleBankCsv,
        fileName: 'sample-bank.csv',
        today: '2026-07-15',
      );
      expect(r.ok, isTrue);
      expect(r.rows.length, 4);
      expect(r.rows[0].amountMinor, 45000);
      expect(r.rows[0].kind, TransactionKind.expense);
      expect(r.rows[0].occurredOn, '2026-07-12');
      expect(r.rows[0].merchant.toLowerCase(), contains('highlands'));
      expect(r.rows[1].amountMinor, 25000000);
      expect(r.rows[1].kind, TransactionKind.income);
      expect(r.rows[2].amountMinor, 89000);
      expect(r.rows[3].kind, TransactionKind.transfer);
      expect(r.rows.every((row) => row.amountMinor > 0), isTrue);
      expect(r.columnMap.date, 0);
      expect(r.columnMap.desc, 1);
      expect(r.columnMap.amount, 2);
    });

    test('sample-generic.csv quoted amounts', () {
      final r = parseCsvStatement(
        sampleGenericCsv,
        fileName: 'sample-generic.csv',
        today: '2026-07-15',
      );
      expect(r.ok, isTrue);
      expect(r.rows.length, 3);
      expect(r.rows[0].amountMinor, 156000);
      expect(r.rows[1].amountMinor, 320000);
      expect(r.rows[1].kind, TransactionKind.expense);
      expect(r.rows[2].kind, TransactionKind.income);
      expect(r.rows[2].amountMinor, 45000);
    });

    test('bad files fail before anything uploads', () {
      expect(
        parseCsvStatement('   ').error,
        'File trống hoặc không đọc được nội dung.',
      );
      expect(
        parseCsvStatement('Ngày,Mô tả,Số tiền\n').error,
        'File chỉ có tiêu đề, không có dòng giao dịch.',
      );
      // A single-column file never finds an amount column.
      expect(
        parseCsvStatement('Ghi chú\năn trưa\n').error,
        'Không nhận ra cột số tiền. Kiểm tra file có cột Amount / Số tiền.',
      );
      // Columns mapped but no row carries a parseable amount.
      final noAmount = parseCsvStatement(
        'Ngày,Mô tả,Số tiền\n12/07/2026,cafe,không số\n',
        today: '2026-07-15',
      );
      expect(noAmount.ok, isFalse);
      expect(noAmount.error, contains('Không trích được giao dịch hợp lệ'));
      expect(noAmount.skippedRows, 1);
    });
  });

  group('plan + batch — parity with direct-csv-import.ts', () {
    test('transfers are skipped, money rows resolve per-kind category', () {
      final parsed = parseCsvStatement(
        sampleBankCsv,
        fileName: 'sample-bank.csv',
        today: '2026-07-15',
      );
      final plan = planCsvImport(
        parsed.rows,
        accountId: 'a1',
        expenseCategoryId: 'k1',
        incomeCategoryId: 'k2',
        accounts: [acc],
        categories: [catExpense, catIncome],
      )!;

      expect(plan.totalParsed, 4);
      expect(plan.readyCount, 3);
      expect(plan.transferSkipped, 1);
      expect(plan.invalidSkipped, 0);

      final expense = plan.ready[0];
      expect(expense.kind, TransactionKind.expense);
      expect(expense.categoryId, 'k1');
      expect(expense.accountId, 'a1');
      expect(expense.amountMinor, 45000);
      final income = plan.ready[1];
      expect(income.kind, TransactionKind.income);
      expect(income.categoryId, 'k2');
    });

    test('empty pickers block the plan like the web page gate', () {
      final parsed = parseCsvStatement(sampleBankCsv, today: '2026-07-15');
      expect(
        planCsvImport(
          parsed.rows,
          accountId: '',
          expenseCategoryId: 'k1',
          incomeCategoryId: 'k2',
          accounts: [acc],
          categories: [catExpense, catIncome],
        ),
        isNull,
      );
    });

    test('batch metadata totals parse + plan skips like the web', () {
      final parsed = parseCsvStatement(
        sampleBankCsv,
        fileName: 'sample-bank.csv',
        today: '2026-07-15',
      );
      final plan = planCsvImport(
        parsed.rows,
        accountId: 'a1',
        expenseCategoryId: 'k1',
        incomeCategoryId: 'k2',
        accounts: [acc],
        categories: [catExpense, catIncome],
      )!;
      final batch = toCsvImportBatch(parsed, plan);
      expect(batch.fileName, 'sample-bank.csv');
      expect(batch.skippedRows, 1); // the transfer row
      expect(batch.warningCount, parsed.warningCount);
      expect(batch.headers, parsed.headers);
      expect(batch.rows.length, 3);
      expect(
        csvImportSummary(plan),
        '3 dòng sẽ nhập · 1 chuyển khoản (bỏ qua)',
      );
    });
  });

  group('prepareCsvImport RPC parity', () {
    test('POSTs the exact p_batch + p_candidates contract', () async {
      final requests = <NeonRequest>[];
      // The echo transport answers the RPC with the ids it was sent —
      // the store only reports success when the response matches its
      // request, like the web action's Zod check.
      Future<NeonResponse> echo(NeonRequest req) async {
        requests.add(req);
        if (req.url.path.endsWith(
          '/rpc/prepare_direct_csv_candidates_with_rules',
        )) {
          final body = req.body as Map;
          final batch = body['p_batch'] as Map;
          final candidates = body['p_candidates'] as List;
          return FakeTransport.json(200, {
            'batch_id': batch['id'],
            'candidate_ids': [for (final c in candidates) (c as Map)['id']],
            'candidate_count': candidates.length,
          });
        }
        return FakeTransport.json(500, 'unexpected ${req.url}');
      }

      Future<NeonResponse> authStub(NeonRequest req) async {
        if (req.url.path.endsWith('/sign-in/email')) {
          return FakeTransport.json(
            200,
            {
              'token': 't.s',
              'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
            },
            headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
          );
        }
        return FakeTransport.json(
          200,
          {},
          headers: {'set-auth-jwt': fakeJwt()},
        );
      }

      final auth = NeonAuthClient(config: config, requester: authStub);
      await auth.signIn('e', 'p');
      final store = RealStore(
        NeonDataApi(config: config, auth: auth, requester: echo),
      );

      final parsed = parseCsvStatement(
        sampleBankCsv,
        fileName: 'sample-bank.csv',
        today: '2026-07-15',
      );
      final plan = planCsvImport(
        parsed.rows,
        accountId: 'a1',
        expenseCategoryId: 'k1',
        incomeCategoryId: 'k2',
        accounts: [acc],
        categories: [catExpense, catIncome],
      )!;
      final result = await store.prepareCsvImport(
        toCsvImportBatch(parsed, plan),
      );

      expect(result.candidateCount, 3);
      final req = requests.last;
      expect(req.method, 'POST');
      expect(
        req.url.path,
        '/neondb/rest/v1/rpc/prepare_direct_csv_candidates_with_rules',
      );
      final body = req.body as Map;
      final batch = body['p_batch'] as Map;
      expect(batch['id'], result.batchId);
      expect(batch['file_name'], 'sample-bank.csv');
      expect(batch['warning_count'], parsed.warningCount);
      expect(batch['skipped_rows'], 1);
      expect(batch['map_confidence'], parsed.mapConfidence);
      expect(batch['headers'], parsed.headers);
      expect(batch['column_map'], {
        'date': 0,
        'amount': 2,
        'desc': 1,
        'debit': null,
        'credit': null,
      });

      final candidates = body['p_candidates'] as List;
      expect(candidates.length, 3);
      final uuid = RegExp(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      );
      for (final c in candidates.cast<Map>()) {
        expect(c['id'] as String, matches(uuid));
        // The RPC rejects a candidate that carries source_external_id —
        // mobile never sends one, just like the web contract.
        expect(c.containsKey('source_external_id'), isFalse);
        expect(c['category_id'], isNotEmpty);
        expect(c['account_id'], 'a1');
      }
      final first = candidates.first as Map;
      expect(first['row_index'], 2);
      expect(first['kind'], 'expense');
      expect(first['amount_minor'], 45000);
      expect(first['merchant'], 'Highlands Coffee');
      expect(first['occurred_on'], '2026-07-12');
      expect(first['confidence'], isIn(['high', 'medium', 'low']));
      final second = candidates[1] as Map;
      expect(second['kind'], 'income');
      expect(second['category_id'], 'k2');
    });

    test('incomplete server response throws, never fake success', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, {
          'batch_id': 'different-batch',
          'candidate_ids': <String>[],
          'candidate_count': 0,
        }),
      );
      expect(
        () => h.store.prepareCsvImport(
          const CsvImportBatch(
            fileName: 'a.csv',
            warningCount: 0,
            skippedRows: 0,
            mapConfidence: 1,
            headers: ['Ngày', 'Số tiền'],
            columnMap: CsvColumnMap(date: 0, amount: 1),
            rows: [
              CsvImportReadyRow(
                rowIndex: 2,
                kind: TransactionKind.expense,
                amountMinor: 5000,
                occurredOn: '2026-10-10',
                note: 'x',
                merchant: 'x',
                categoryId: 'k1',
                accountId: 'a1',
                confidence: 'high',
                rawSnippet: 'x',
              ),
            ],
          ),
        ),
        throwsA(predicate((e) => e.toString().contains('incomplete_result'))),
      );
    });
  });

  group('paste → the same prepare contract', () {
    final drafts = parseInboxPasteText(
      'TK 1234 GD -50,000 VND PHO NGON\n'
      'TK 1234 GD +100000 VND LUONG\n'
      'ck 300k noi bo giua tai khoan\n'
      'khong co so tien o day',
      today: '2026-10-14',
    );

    test('planPasteImport maps each draft to a ready row', () {
      // 4 non-empty lines: expense + income + a transfer-hinted line the
      // RPC cannot accept + an unparseable line (no draft at all).
      expect(drafts.length, 3);
      final plan = planPasteImport(
        drafts,
        accountId: 'a1',
        expenseCategoryId: 'k1',
        incomeCategoryId: 'k2',
        accounts: [acc],
        categories: [catExpense, catIncome],
      )!;
      expect(plan.totalParsed, 3);
      expect(plan.readyCount, 2);
      expect(plan.transferSkipped, 1);
      expect(plan.invalidSkipped, 0);
      final expense = plan.ready[0];
      expect(expense.rowIndex, 1);
      expect(expense.kind, TransactionKind.expense);
      expect(expense.amountMinor, 50000);
      expect(expense.merchant, 'PHO NGON');
      expect(expense.occurredOn, '2026-10-14');
      expect(expense.categoryId, 'k1');
      expect(expense.accountId, 'a1');
      expect(expense.rawSnippet, 'TK 1234 GD -50,000 VND PHO NGON');
      final income = plan.ready[1];
      expect(income.kind, TransactionKind.income);
      expect(income.categoryId, 'k2');
    });

    test('toPasteImportBatch carries honest provenance and skips', () {
      final plan = planPasteImport(
        drafts,
        accountId: 'a1',
        expenseCategoryId: 'k1',
        incomeCategoryId: 'k2',
        accounts: [acc],
        categories: [catExpense, catIncome],
      )!;
      final batch = toPasteImportBatch(
        fileName: 'paste-20261014-0930.txt',
        lineCount: 4,
        unparseableLines: 1,
        plan: plan,
      );
      expect(batch.fileName, 'paste-20261014-0930.txt');
      // warning_count = parsed lines minus produced candidates (4 − 2).
      expect(batch.warningCount, 2);
      // skipped_rows = unparseable line + the transfer skip.
      expect(batch.skippedRows, 2);
      // A paste has no columns — honest minimal batch metadata.
      expect(batch.mapConfidence, 0);
      expect(batch.headers, isEmpty);
      expect(batch.columnMap.toWire(), {
        'date': null,
        'amount': null,
        'desc': null,
        'debit': null,
        'credit': null,
      });
      expect(batch.rows.length, 2);
    });

    test(
      'store POSTs the exact paste p_batch + p_candidates payload',
      () async {
        final requests = <NeonRequest>[];
        Future<NeonResponse> echo(NeonRequest req) async {
          requests.add(req);
          if (req.url.path.endsWith(
            '/rpc/prepare_direct_csv_candidates_with_rules',
          )) {
            final body = req.body as Map;
            final batch = body['p_batch'] as Map;
            final candidates = body['p_candidates'] as List;
            return FakeTransport.json(200, {
              'batch_id': batch['id'],
              'candidate_ids': [for (final c in candidates) (c as Map)['id']],
              'candidate_count': candidates.length,
            });
          }
          return FakeTransport.json(500, 'unexpected ${req.url}');
        }

        Future<NeonResponse> authStub(NeonRequest req) async {
          if (req.url.path.endsWith('/sign-in/email')) {
            return FakeTransport.json(
              200,
              {
                'token': 't.s',
                'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
              },
              headers: {
                'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s',
              },
            );
          }
          return FakeTransport.json(
            200,
            {},
            headers: {'set-auth-jwt': fakeJwt()},
          );
        }

        final auth = NeonAuthClient(config: config, requester: authStub);
        await auth.signIn('e', 'p');
        final store = RealStore(
          NeonDataApi(config: config, auth: auth, requester: echo),
        );

        final plan = planPasteImport(
          drafts,
          accountId: 'a1',
          expenseCategoryId: 'k1',
          incomeCategoryId: 'k2',
          accounts: [acc],
          categories: [catExpense, catIncome],
        )!;
        final result = await store.prepareCsvImport(
          toPasteImportBatch(
            fileName: 'paste-20261014-0930.txt',
            lineCount: 4,
            unparseableLines: 1,
            plan: plan,
          ),
        );

        expect(result.candidateCount, 2);
        final body = requests.last.body as Map;
        final batch = body['p_batch'] as Map;
        expect(batch['id'], result.batchId);
        expect(batch['file_name'], 'paste-20261014-0930.txt');
        expect(batch['warning_count'], 2);
        expect(batch['skipped_rows'], 2);
        expect(batch['map_confidence'], 0);
        expect(batch['headers'], isEmpty);
        expect(batch['column_map'], {
          'date': null,
          'amount': null,
          'desc': null,
          'debit': null,
          'credit': null,
        });

        final candidates = body['p_candidates'] as List;
        expect(candidates.length, 2);
        final uuid = RegExp(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        );
        final first = candidates.first as Map;
        expect(first['id'] as String, matches(uuid));
        expect(first['row_index'], 1);
        expect(first['kind'], 'expense');
        expect(first['amount_minor'], 50000);
        expect(first['merchant'], 'PHO NGON');
        expect(first['occurred_on'], '2026-10-14');
        expect(first['confidence'], isIn(['high', 'medium', 'low']));
        expect(first['category_id'], 'k1');
        expect(first['account_id'], 'a1');
        expect(first['raw_snippet'], 'TK 1234 GD -50,000 VND PHO NGON');
        // The RPC rejects candidates carrying source_external_id — paste
        // rows never send one, like every other contract consumer.
        expect(first.containsKey('source_external_id'), isFalse);
        final second = candidates[1] as Map;
        expect(second['kind'], 'income');
        expect(second['category_id'], 'k2');
        expect(second['amount_minor'], 100000);
      },
    );
  });

  group('error mapping', () {
    test('RPC tokens map to the web preparation messages', () {
      expect(
        csvImportErrorMessage(Exception('account_not_found')),
        contains('Tài khoản hoặc danh mục đã thay đổi'),
      );
      expect(
        csvImportErrorMessage(Exception('category_kind_mismatch')),
        contains('Tài khoản hoặc danh mục đã thay đổi'),
      );
      expect(
        csvImportErrorMessage(Exception('rule_no_longer_matches')),
        contains('Quy tắc đã thay đổi'),
      );
      expect(
        csvImportErrorMessage(const FormatException('incomplete_result')),
        contains('phản hồi máy chủ không đầy đủ'),
      );
      expect(
        csvImportErrorMessage(Exception('invalid_direct_csv_candidate')),
        contains('Không chuẩn bị được lượt nhập'),
      );
    });
  });

  group('InboxPage CSV import wiring', () {
    InboxPage page({
      required Future<List<InboxCandidate>> Function() load,
      CsvFilePicker? pickCsvFile,
      Future<CsvImportResult> Function(CsvImportBatch)? onImportCsv,
    }) => InboxPage(
      loadCandidates: load,
      loadAccounts: () async => [acc],
      loadCategories: () async => [catExpense, catIncome],
      onPlan: (_) async => null,
      onApprove: (_) async {},
      onReject: (_) async {},
      pickCsvFile: pickCsvFile,
      onImportCsv: onImportCsv,
    );

    InboxCandidate row() => InboxCandidate(
      id: 'c1',
      kind: TransactionKind.expense,
      amountMinor: 45000,
      merchant: 'PHO NGON',
      note: '',
      occurredOn: '2026-10-14',
      source: 'csv',
      confidence: 'high',
      accountId: 'a1',
      accountName: 'VCB',
      categoryId: 'k1',
      categoryName: 'Ăn uống',
    );

    PickedCsvFile file(String name, String text) =>
        PickedCsvFile(name: name, bytes: utf8.encode(text));

    testWidgets('import entry hidden when the seams are unset', (t) async {
      // No write seam at all → both candidate-creation entries hide.
      await t.pumpWidget(MaterialApp(home: page(load: () async => const [])));
      await t.pumpAndSettle();
      expect(find.byTooltip('Nhập CSV/Excel'), findsNothing);
      expect(find.text('Nhập file CSV/Excel'), findsNothing);
      expect(find.byTooltip('Dán tin nhắn'), findsNothing);
    });

    testWidgets('write seam alone keeps paste, still hides CSV', (t) async {
      // onImportCsv wired but no file picker → paste works, CSV hidden.
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async => const [],
            onImportCsv: (_) async =>
                const CsvImportResult(batchId: 'b', candidateCount: 0),
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.byTooltip('Nhập CSV/Excel'), findsNothing);
      expect(find.text('Nhập file CSV/Excel'), findsNothing);
      expect(find.byTooltip('Dán tin nhắn'), findsOneWidget);
    });

    testWidgets('pick → preview → import lands candidates and refreshes', (
      t,
    ) async {
      // Tall surface: the sheet is a lazy ListView, so the import button
      // only builds once it can scroll into the viewport.
      t.view.physicalSize = const Size(1080, 2400);
      t.view.devicePixelRatio = 1.0;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      var loads = 0;
      CsvImportBatch? sent;
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async {
              loads++;
              // After the import the queue reloads and shows the new row.
              return loads == 1 ? const [] : [row()];
            },
            pickCsvFile: () async => file('stmt.csv', sampleBankCsv),
            onImportCsv: (b) async {
              sent = b;
              return const CsvImportResult(batchId: 'b1', candidateCount: 3);
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
      expect(find.textContaining('3 dòng sẽ nhập'), findsOneWidget);
      expect(find.textContaining('1 chuyển khoản (bỏ qua)'), findsOneWidget);

      await t.tap(find.text('Nhập 3 mục vào Cần xem'));
      await t.pumpAndSettle();

      expect(sent, isNotNull);
      expect(sent!.rows.length, 3);
      expect(sent!.fileName, 'stmt.csv');
      // Success message reports the server-verified count, then the queue
      // reloads and shows the imported candidate.
      expect(find.text('Đã tạo 3 mục chờ duyệt'), findsOneWidget);
      expect(loads, greaterThanOrEqualTo(2));
      expect(find.text('PHO NGON'), findsOneWidget);
    });

    testWidgets('a bad file shows the error and never imports', (t) async {
      var called = false;
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async => const [],
            pickCsvFile: () async => file('ghi-chu.txt', 'không phải csv'),
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
      expect(
        find.text('Chỉ hỗ trợ file CSV hoặc Excel (.csv, .xlsx).'),
        findsOneWidget,
      );
      expect(called, isFalse);
    });

    testWidgets('RPC failure maps to an honest inline message', (t) async {
      t.view.physicalSize = const Size(1080, 2400);
      t.view.devicePixelRatio = 1.0;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async => const [],
            pickCsvFile: () async => file('stmt.csv', sampleBankCsv),
            onImportCsv: (_) async =>
                throw NeonAuthException(400, 'account_not_found'),
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Nhập file CSV/Excel'));
      await t.pumpAndSettle();
      await t.tap(find.text('Chọn file CSV hoặc Excel (.xlsx)'));
      await t.pumpAndSettle();
      await t.tap(find.text('Nhập 3 mục vào Cần xem'));
      await t.pumpAndSettle();
      expect(
        find.textContaining('Tài khoản hoặc danh mục đã thay đổi'),
        findsOneWidget,
      );
    });
  });
}
