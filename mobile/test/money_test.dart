import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/money.dart';

void main() {
  group('formatMoney', () {
    test('formats đồng with vi-VN grouping', () {
      expect(formatMoney(0), '0 ₫');
      expect(formatMoney(50000), '50.000 ₫');
      expect(formatMoney(2350000), '2.350.000 ₫');
      expect(formatMoney(-120000), '-120.000 ₫');
    });

    test('compact shows tr for >= 1M', () {
      expect(formatMoney(15000000, compact: true), '15 tr');
      expect(formatMoney(2500000, compact: true), '2,5 tr');
      expect(formatMoney(999999, compact: true), '999.999 ₫');
    });
  });

  group('formatSignedMoney', () {
    test('signs income/expense/zero', () {
      expect(formatSignedMoney(50000), '+ 50.000 ₫');
      expect(formatSignedMoney(-45000), '− 45.000 ₫');
      expect(formatSignedMoney(0), '0 ₫');
    });
  });

  group('moneyKindPrefix', () {
    test('matches web contract', () {
      expect(moneyKindPrefix(MoneySignKind.income), '+');
      expect(moneyKindPrefix(MoneySignKind.expense), '−');
      expect(moneyKindPrefix(MoneySignKind.transfer), '↔');
    });
  });

  group('parseMoneyInput', () {
    test('plain integer', () {
      expect(parseMoneyInput('50000'), 50000);
      expect(parseMoneyInput('  12000  '), 12000);
    });

    test('grouped separators', () {
      expect(parseMoneyInput('50.000'), 50000);
      expect(parseMoneyInput('1.234.567'), 1234567);
    });

    test('shorthand', () {
      expect(parseMoneyInput('50k'), 50000);
      expect(parseMoneyInput('50 k'), 50000);
      expect(parseMoneyInput('2tr'), 2000000);
      expect(parseMoneyInput('1tr'), 1000000);
      expect(parseMoneyInput('3 tỷ'), 3000000000);
      expect(parseMoneyInput('5 củ'), 5000000);
      expect(parseMoneyInput('1triệu'), 1000000);
      expect(parseMoneyInput('1trieu'), 1000000);
      expect(parseMoneyInput('1củ'), 1000000);
      expect(parseMoneyInput('2tỷ'), 2000000000);
      expect(parseMoneyInput('2tỉ'), 2000000000);
      expect(parseMoneyInput('2ty'), 2000000000);
      expect(parseMoneyInput('1TR'), 1000000);
    });

    // Web parity (src/lib/money.ts): digits after a unit are a decimal
    // fraction OF the unit, not raw đồng appended to it.
    test('unit tail digits are a fraction of the unit', () {
      expect(parseMoneyInput('1tr5'), 1500000);
      expect(parseMoneyInput('1tr500'), 1500000);
      expect(parseMoneyInput('12tr34'), 12340000);
      expect(parseMoneyInput('50k5'), 50500);
      // A fraction longer than the unit expresses is exact only on
      // trailing zeros.
      expect(parseMoneyInput('1tr5000000'), 1500000);
      expect(parseMoneyInput('1tr5000001'), isNull);
    });

    test('dot/comma decimal separator before a unit', () {
      expect(parseMoneyInput('1.5tr'), 1500000);
      expect(parseMoneyInput('1,5tr'), 1500000);
      expect(parseMoneyInput('12,5tr'), 12500000);
      // Three-digit groups keep the grouping rule inside shorthand.
      expect(parseMoneyInput('1.234tr'), 1234000000);
      expect(parseMoneyInput('1.234.567tr'), 1234567000000);
    });

    test('rejects malformed shorthand instead of dropping the unit', () {
      for (final bad in [
        'k50', // unit before the number
        'tr', // unit with no number
        '1tr5x', // trailing noise after the unit fraction
        '1tr5đ', // đ after a unit is not a scalable suffix
        '1,5tr5', // two fractions at once
        '1.2.3tr', // unparseable number part
        '1t', // half-typed unit tail
        '3 c', // stray partial unit
        '45.000đ trả', // 'tr' inside a word still forces the grammar
        'party: 45', // 'ty' inside a word
      ]) {
        expect(parseMoneyInput(bad), isNull, reason: bad);
      }
    });

    test('safe-integer bound rejects silent int64 wrap', () {
      // 18446744073710 * 1e6 wraps to 448384 in int64 — must reject.
      expect(parseMoneyInput('18446744073710tr'), isNull);
      expect(parseMoneyInput('9007199255tr'), isNull); // result > 2^53-1
      expect(parseMoneyInput('9007199254tr'), 9007199254000000); // edge ok
      expect(parseMoneyInput('9007199254740991'), 9007199254740991);
      expect(parseMoneyInput('9007199254740992'), isNull); // > 2^53-1
      expect(parseMoneyInput('9223372036854775808'), isNull); // > int64 max
    });

    test('pasted text keeps the digits the web keeps', () {
      expect(parseMoneyInput('45.000 ₫'), 45000);
      expect(parseMoneyInput('Total: 45.000'), 45000);
      // A bare 'm' stays unsupported — reads as million or minute.
      expect(parseMoneyInput('5m'), 5);
    });

    test('fullwidth digits fold like the web NFKC step', () {
      expect(parseMoneyInput('１２３'), 123);
      expect(parseMoneyInput('１tr'), 1000000);
    });

    test('rejects decimal entry (VND fraction rule)', () {
      expect(parseMoneyInput('50.5'), isNull);
      expect(parseMoneyInput('10,25'), isNull);
      expect(parseMoneyInput('12,5'), isNull);
    });

    test('rejects garbage', () {
      // Divergence kept on purpose: the web returns 0 when no digits
      // remain ("cat" -> 0); mobile callers need null = "no value".
      expect(parseMoneyInput(''), isNull);
      expect(parseMoneyInput('abc'), isNull);
      expect(parseMoneyInput('1.2.3'), isNull);
    });
  });
}
