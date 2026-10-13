import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/domain/export_csv.dart';
import 'package:moneyflow/domain/models.dart';

Transaction tx({
  String id = 't1',
  TransactionKind kind = TransactionKind.expense,
  int amount = 45000,
  String occurredOn = '2026-10-12',
  String note = 'Bún bò sáng',
  String category = 'Ăn uống',
  String account = 'Tiền mặt',
  String? destinationAccount,
  List<TransactionSplitLine> splitLines = const [],
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'cat-$id',
  category: category,
  note: note,
  accountId: 'acc-1',
  account: account,
  amount: amount,
  occurredOn: occurredOn,
  destinationAccount: destinationAccount,
  splitCount: splitLines.length,
  splitLines: splitLines,
);

const _header =
    '"Ngày","Loại","Ghi chú","Danh mục","Tài khoản nguồn","Tài khoản đích","Số tiền (VND)"';

const _bom = '\uFEFF';

void main() {
  group('escapeCsvCell', () {
    test('every cell is quoted; embedded quotes double', () {
      expect(escapeCsvCell('Ăn uống'), '"Ăn uống"');
      expect(escapeCsvCell('Ăn "tối"'), '"Ăn ""tối"""');
      expect(escapeCsvCell(45000), '"45000"');
    });

    test('formula-trigger first characters get a leading apostrophe', () {
      // Web rule: the guard applies to the first char of *string* cells.
      for (final trigger in ['=', '+', '-', '@', '\t', '\r']) {
        expect(
          escapeCsvCell('${trigger}x'),
          '"\'${trigger}x"',
          reason: 'trigger ${jsonEncode(trigger)}',
        );
      }
    });

    test('numbers keep a bare minus — the guard is strings-only', () {
      expect(escapeCsvCell(-45000), '"-45000"');
    });

    test('a mid-string trigger character is left alone', () {
      expect(escapeCsvCell('a=b'), '"a=b"');
    });
  });

  group('transactionsToCsv', () {
    test('empty list still writes the BOM + quoted header + newline', () {
      expect(transactionsToCsv(const []), '$_bom$_header\r\n');
    });

    test('signs and labels mirror the web row shape', () {
      final csv = transactionsToCsv([
        tx(),
        tx(
          id: 't2',
          kind: TransactionKind.income,
          amount: 15000000,
          occurredOn: '2026-10-10',
          note: 'Lương tháng 10',
          category: 'Lương',
          account: 'Ngân hàng VCB',
        ),
        tx(
          id: 't3',
          kind: TransactionKind.transfer,
          amount: 500000,
          occurredOn: '2026-10-09',
          note: 'Nạp ví MoMo',
          category: 'Chuyển khoản',
          account: 'Ngân hàng VCB',
          destinationAccount: 'Ví MoMo',
        ),
      ]);
      expect(
        csv,
        '$_bom$_header\r\n'
        '"2026-10-12","Chi tiêu","Bún bò sáng","Ăn uống","Tiền mặt","","-45000"\r\n'
        '"2026-10-10","Thu nhập","Lương tháng 10","Lương","Ngân hàng VCB","","15000000"\r\n'
        '"2026-10-09","Chuyển tiền","Nạp ví MoMo","Chuyển khoản","Ngân hàng VCB","Ví MoMo","500000"\r\n',
      );
    });

    test('a split expense expands one row per line, note repeated', () {
      final csv = transactionsToCsv([
        tx(
          amount: 300000,
          note: 'Đi chợ',
          category: 'Chia · 2 danh mục',
          splitLines: const [
            TransactionSplitLine(
              categoryId: 'c1',
              category: 'Thực phẩm',
              amount: 200000,
            ),
            TransactionSplitLine(
              categoryId: 'c2',
              category: 'Gia dụng',
              amount: 100000,
            ),
          ],
        ),
      ]);
      expect(
        csv,
        '$_bom$_header\r\n'
        '"2026-10-12","Chi tiêu","Đi chợ","Thực phẩm","Tiền mặt","","-200000"\r\n'
        '"2026-10-12","Chi tiêu","Đi chợ","Gia dụng","Tiền mặt","","-100000"\r\n',
      );
    });

    test('a single stored split line does not expand (web length>=2 gate)', () {
      final csv = transactionsToCsv([
        tx(
          amount: 90000,
          splitLines: const [
            TransactionSplitLine(
              categoryId: 'c1',
              category: 'Ăn uống',
              amount: 90000,
            ),
          ],
        ),
      ]);
      expect(
        csv,
        '$_bom$_header\r\n'
        '"2026-10-12","Chi tiêu","Bún bò sáng","Ăn uống","Tiền mặt","","-90000"\r\n',
      );
    });

    test('only expense rows expand splits — income keeps one row', () {
      final csv = transactionsToCsv([
        tx(
          kind: TransactionKind.income,
          amount: 100000,
          splitLines: const [
            TransactionSplitLine(
              categoryId: 'c1',
              category: 'Lương',
              amount: 60000,
            ),
            TransactionSplitLine(
              categoryId: 'c2',
              category: 'Thưởng',
              amount: 40000,
            ),
          ],
        ),
      ]);
      expect(
        csv,
        '$_bom$_header\r\n'
        '"2026-10-12","Thu nhập","Bún bò sáng","Ăn uống","Tiền mặt","","100000"\r\n',
      );
    });

    test('Vietnamese text, commas, quotes and newlines survive quoting', () {
      final csv = transactionsToCsv([tx(note: 'Bún bò, "đặc biệt"\nhai dòng')]);
      expect(
        csv,
        '$_bom$_header\r\n'
        '"2026-10-12","Chi tiêu","Bún bò, ""đặc biệt""\nhai dòng","Ăn uống","Tiền mặt","","-45000"\r\n',
      );
    });
  });

  group('export filenames', () {
    test('CSV names the shown period bounds like the web', () {
      expect(
        exportCsvFilename('2026-10-01', '2026-10-31'),
        'moneyflow-2026-10-01-2026-10-31.csv',
      );
    });

    test('backup uses a compact date stamp', () {
      expect(
        exportBackupFilename(DateTime(2026, 10, 5)),
        'moneyflow-backup-20261005.json',
      );
    });
  });

  group('RealStore export reads', () {
    test(
      'loadTransactionsInRange parses split_lines into splitLines',
      () async {
        final (store, t) = await _signedInStore();
        t.queue.add(
          _FakeTransport.json(200, [
            {
              'id': 'tx-1',
              'kind': 'expense',
              'note': 'Đi chợ',
              'occurred_on': '2026-10-12',
              'amount_minor': 300000,
              'account_id': 'a1',
              'account_name': 'Tiền mặt',
              'category_id': 'c0',
              'category_name': 'Chia · 2 danh mục',
              'destination_account_id': null,
              'destination_account_name': null,
              'payee': null,
              'updated_at': null,
              'split_lines': [
                {
                  'category_id': 'c1',
                  'category_name': 'Thực phẩm',
                  'amount_minor': 200000,
                },
                {
                  'category_id': 'c2',
                  'category_name': 'Gia dụng',
                  'amount_minor': 100000,
                },
              ],
            },
          ]),
        );
        final rows = await store.loadTransactionsInRange(
          '2026-10-01',
          '2026-11-01',
        );
        expect(rows.single.splitCount, 2);
        expect(rows.single.splitLines.map((l) => l.category), [
          'Thực phẩm',
          'Gia dụng',
        ]);
        expect(rows.single.splitLines.map((l) => l.amount), [200000, 100000]);
        expect(t.requests.last.url.path, '/neondb/rest/v1/transaction_feed');
      },
    );

    test(
      'a malformed split_lines entry drops the set, keeps the row',
      () async {
        final (store, t) = await _signedInStore();
        t.queue.add(
          _FakeTransport.json(200, [
            {
              'id': 'tx-1',
              'kind': 'expense',
              'note': '',
              'occurred_on': '2026-10-12',
              'amount_minor': 90000,
              'account_id': 'a1',
              'account_name': 'Tiền mặt',
              'category_id': 'c0',
              'category_name': 'Ăn uống',
              'destination_account_id': null,
              'destination_account_name': null,
              'payee': null,
              'updated_at': null,
              'split_lines': [
                {
                  'category_id': 'c1',
                  'category_name': 'Ăn uống',
                  'amount_minor': 50000,
                },
                {
                  'category_id': 'c2',
                  'category_name': null,
                  'amount_minor': 40000,
                },
              ],
            },
          ]),
        );
        final rows = await store.loadTransactionsInRange(
          '2026-10-01',
          '2026-11-01',
        );
        expect(rows.single.splitLines, isEmpty);
        expect(rows.single.amount, 90000);
      },
    );

    test('exportArchive posts to the RPC and returns the jsonb doc', () async {
      final (store, t) = await _signedInStore();
      t.queue.add(
        _FakeTransport.json(200, {
          'archive_id': 'ar-1',
          'schema_generation': '20260924120000',
          'tables': {
            'transactions': [
              {'id': 'tx-1'},
            ],
          },
        }),
      );
      final doc = await store.exportArchive();
      expect(doc, isA<Map>());
      expect((doc as Map)['archive_id'], 'ar-1');
      final req = t.requests.last;
      expect(req.url.path, '/neondb/rest/v1/rpc/export_user_archive');
      expect(req.method, 'POST');
    });
  });
}

/// Scripted transport — same helper shape as neon_client_test.dart, scoped
/// here so the split_lines mapping and the archive RPC get their own
/// honest coverage.
class _FakeTransport {
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

const _config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

String _fakeJwt() {
  final payload = {
    'sub': 'u1',
    'exp': (DateTime.now().millisecondsSinceEpoch ~/ 1000) + 900,
  };
  String b64(Object o) =>
      base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${b64({'alg': 'EdDSA'})}.${b64(payload)}.sig';
}

/// Signs in through the scripted transport and returns the store plus the
/// transport so tests can queue the API responses they want.
Future<(RealStore, _FakeTransport)> _signedInStore() async {
  final t = _FakeTransport()
    ..queue.add(
      _FakeTransport.json(
        200,
        {
          'token': 't.s',
          'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
        },
        headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
      ),
    )
    ..queue.add(
      _FakeTransport.json(200, {}, headers: {'set-auth-jwt': _fakeJwt()}),
    );
  final auth = NeonAuthClient(config: _config, requester: t.requester);
  await auth.signIn('e', 'p');
  return (
    RealStore(NeonDataApi(config: _config, auth: auth, requester: t.requester)),
    t,
  );
}
