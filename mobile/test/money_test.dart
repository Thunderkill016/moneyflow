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
      expect(parseMoneyInput('2tr'), 2000000);
      expect(parseMoneyInput('1tr'), 1000000);
      expect(parseMoneyInput('3 tỷ'), 3000000000);
      expect(parseMoneyInput('5 củ'), 5000000);
    });

    test('rejects decimal entry (VND fraction rule)', () {
      expect(parseMoneyInput('50.5'), isNull);
      expect(parseMoneyInput('10,25'), isNull);
    });

    test('rejects garbage', () {
      expect(parseMoneyInput(''), isNull);
      expect(parseMoneyInput('abc'), isNull);
      expect(parseMoneyInput('1.2.3'), isNull);
    });
  });
}
