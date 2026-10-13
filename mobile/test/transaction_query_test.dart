import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/transaction_query.dart';

Transaction _tx(
  String id, {
  TransactionKind kind = TransactionKind.expense,
  String note = '',
  String? payee,
  String category = 'Ăn uống',
  String categoryId = 'cat-food',
  String account = 'Tiền mặt',
  String accountId = 'a1',
  String? destination,
  String? destinationId,
  int amount = 50000,
  String on = '2026-10-10',
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: categoryId,
  category: category,
  note: note,
  accountId: accountId,
  account: account,
  amount: amount,
  occurredOn: on,
  payee: payee,
  destinationAccount: destination,
  destinationAccountId: destinationId,
);

void main() {
  group('toPostgrestParams', () {
    test('empty query adds no filters', () {
      expect(TransactionQuery.none.toPostgrestParams(), isEmpty);
      expect(TransactionQuery.none.isEmpty, isTrue);
    });

    test('text becomes a quoted ilike or() over every searched column', () {
      final p = const TransactionQuery(text: 'cafe').toPostgrestParams();
      expect(
        p['and'],
        '(or(note.ilike."*cafe*",payee.ilike."*cafe*",'
        'category_name.ilike."*cafe*",account_name.ilike."*cafe*",'
        'destination_account_name.ilike."*cafe*"))',
      );
    });

    test('kind, category, dates, amounts, account', () {
      final p = const TransactionQuery(
        kind: TransactionKind.transfer,
        categoryId: 'c1',
        accountId: 'a1',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
        minAmount: 1000,
        maxAmount: 90000,
      ).toPostgrestParams();
      expect(p['kind'], 'eq.transfer');
      expect(p['category_id'], 'eq."c1"');
      expect(
        p['and'],
        '(or(account_id.eq."a1",destination_account_id.eq."a1"),'
        'occurred_on.gte."2026-10-01",occurred_on.lte."2026-10-31",'
        'amount_minor.gte.1000,amount_minor.lte.90000)',
      );
    });

    test('hostile input stays inside one quoted value', () {
      final p = const TransactionQuery(
        text: 'a,b)"\\%_ (x)',
      ).toPostgrestParams();
      // `"` and `\` are backslash-escaped for PostgREST; `\`, `%`, `_`
      // are first escaped for LIKE. The `)` and `,` sit inside quotes.
      const value = r'"*a,b)\"\\\\\\%\\_ (x)*"';
      expect(p['and'], contains('note.ilike.$value,payee'));
      // Exactly one or() group: nothing leaked out of the quotes.
      expect('or('.allMatches(p['and']!).length, 1);
    });

    test('asterisks are dropped (PostgREST cannot escape them)', () {
      expect(const TransactionQuery(text: ' *  ').isEmpty, isTrue);
      final p = const TransactionQuery(text: 'a*b').toPostgrestParams();
      expect(p['and'], contains('ilike."*ab*"'));
    });

    test('quote helpers', () {
      expect(postgrestQuote('a"b\\c'), r'"a\"b\\c"');
      expect(escapeLikeTerm(r'50%_\'), r'50\%\_\\');
    });
  });

  group('matches (client semantics mirror the server params)', () {
    final food = _tx('1', note: 'Bún bò', payee: 'Quán Bà Tư');
    final transfer = _tx(
      '2',
      kind: TransactionKind.transfer,
      category: 'Chuyển khoản',
      categoryId: '',
      account: 'Tiền mặt',
      accountId: 'a1',
      destination: 'VCB',
      destinationId: 'a2',
      amount: 500000,
      on: '2026-09-30',
    );

    test('text is case-insensitive across note/payee/category/accounts', () {
      expect(TransactionQuery(text: 'BÚN').matches(food), isTrue);
      expect(TransactionQuery(text: 'bà tư').matches(food), isTrue);
      expect(TransactionQuery(text: 'ăn u').matches(food), isTrue);
      expect(TransactionQuery(text: 'tiền mặt').matches(food), isTrue);
      expect(TransactionQuery(text: 'vcb').matches(transfer), isTrue);
      expect(TransactionQuery(text: 'vcb').matches(food), isFalse);
    });

    test('LIKE wildcards in input are literal', () {
      expect(const TransactionQuery(text: '%').matches(food), isFalse);
      expect(const TransactionQuery(text: '_').matches(food), isFalse);
      expect(const TransactionQuery(text: 'a,b)').matches(food), isFalse);
    });

    test('kind, amount and date bounds are inclusive', () {
      expect(
        const TransactionQuery(kind: TransactionKind.income).matches(food),
        isFalse,
      );
      expect(const TransactionQuery(minAmount: 50000).matches(food), isTrue);
      expect(const TransactionQuery(minAmount: 50001).matches(food), isFalse);
      expect(const TransactionQuery(maxAmount: 50000).matches(food), isTrue);
      expect(const TransactionQuery(maxAmount: 49999).matches(food), isFalse);
      expect(
        const TransactionQuery(dateFrom: '2026-10-10').matches(food),
        isTrue,
      );
      expect(
        const TransactionQuery(dateFrom: '2026-10-11').matches(food),
        isFalse,
      );
      expect(
        const TransactionQuery(dateTo: '2026-10-10').matches(food),
        isTrue,
      );
      expect(
        const TransactionQuery(dateTo: '2026-10-09').matches(food),
        isFalse,
      );
    });

    test('account matches source or destination of a transfer', () {
      expect(const TransactionQuery(accountId: 'a1').matches(transfer), isTrue);
      expect(const TransactionQuery(accountId: 'a2').matches(transfer), isTrue);
      expect(const TransactionQuery(accountId: 'a2').matches(food), isFalse);
    });

    test('category id', () {
      expect(
        const TransactionQuery(categoryId: 'cat-food').matches(food),
        isTrue,
      );
      expect(const TransactionQuery(categoryId: 'x').matches(food), isFalse);
    });

    test('payee is an exact trimmed-text filter', () {
      // The report buckets on trimmed text — the drill-in value is the
      // bucket key, so 'Quán Bà Tư' hits, anything else misses.
      expect(const TransactionQuery(payee: 'Quán Bà Tư').matches(food), isTrue);
      expect(
        const TransactionQuery(payee: 'quán bà tư').matches(food),
        isFalse,
      );
      expect(const TransactionQuery(payee: '').matches(food), isFalse);
    });

    test('payee "" is the unnamed bucket — null or blank stored payee', () {
      expect(const TransactionQuery(payee: '').matches(_tx('p1')), isTrue);
      expect(
        const TransactionQuery(payee: '').matches(_tx('p2', payee: '   ')),
        isTrue,
      );
      expect(
        const TransactionQuery(payee: '').matches(_tx('p3', payee: 'GRAB')),
        isFalse,
      );
    });
  });

  group('payee PostgREST params', () {
    test('named payee is a quoted eq inside the and() group', () {
      final p = const TransactionQuery(
        kind: TransactionKind.expense,
        payee: 'Quán, Bà (Tư)',
      ).toPostgrestParams();
      expect(p['kind'], 'eq.expense');
      // Commas/parens stay data inside the quotes — one flat and() group.
      expect(p['and'], '(payee.eq."Quán, Bà (Tư)")');
    });

    test('the unnamed bucket covers both null and blank stored payees', () {
      final p = const TransactionQuery(payee: '').toPostgrestParams();
      expect(p['and'], '(or(payee.is.null,payee.eq.""))');
    });

    test('payee counts as a filter and clears like the others', () {
      const q = TransactionQuery(payee: 'GRAB');
      expect(q.isEmpty, isFalse);
      expect(q.filterCount, 1);
      expect(q.copyWith(clearPayee: true).payee, isNull);
      expect(q.copyWith(clearPayee: true).isEmpty, isTrue);
    });
  });

  group('copyWith / counts', () {
    test('clear flags and filterCount', () {
      const q = TransactionQuery(
        text: 'x',
        kind: TransactionKind.income,
        dateFrom: 'a',
        dateTo: 'b',
        minAmount: 1,
      );
      expect(q.filterCount, 3); // kind, dates (one), amounts (one)
      final c = q.copyWith(
        clearKind: true,
        clearDates: true,
        clearAmounts: true,
      );
      expect(c.filterCount, 0);
      expect(c.text, 'x');
    });
  });

  group('inMemoryPageLoader', () {
    final rows = [
      for (var i = 0; i < 7; i++)
        _tx(
          't$i',
          note: 'n$i',
          on: '2026-10-${10 + i}',
          amount: 1000 * (i + 1),
        ),
    ];

    test('pages newest-first with hasMore', () async {
      final load = inMemoryPageLoader(rows, pageSize: 3);
      final p1 = await load(TransactionQuery.none);
      expect(p1.rows.map((t) => t.id), ['t6', 't5', 't4']);
      expect(p1.hasMore, isTrue);
      final p3 = await load(TransactionQuery.none, offset: 6);
      expect(p3.rows.map((t) => t.id), ['t0']);
      expect(p3.hasMore, isFalse);
    });

    test('applies the query before paging', () async {
      final load = inMemoryPageLoader(rows, pageSize: 3);
      final p = await load(const TransactionQuery(minAmount: 5000));
      expect(p.rows.map((t) => t.id), ['t6', 't5', 't4']);
      expect(p.hasMore, isFalse);
    });
  });
}
