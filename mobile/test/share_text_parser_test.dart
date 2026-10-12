import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/share/share_text_parser.dart';
import 'package:moneyflow/domain/models.dart';

void main() {
  group('unusable input', () {
    test('null / empty / whitespace', () {
      expect(parseSharedText(null), isNull);
      expect(parseSharedText(''), isNull);
      expect(parseSharedText('   '), isNull);
      expect(parseSharedText(' \n\t '), isNull);
    });

    test('text without digits', () {
      expect(parseSharedText('abc no money'), isNull);
      expect(parseSharedText('hôm nay trời đẹp'), isNull);
    });

    test('non-VND decimals are not amounts', () {
      // "1,5" and "15,25" are not valid integer đồng groupings.
      expect(parseSharedText('1,5'), isNull);
      expect(parseSharedText('15,25'), isNull);
    });

    test('bare small numbers are not amounts', () {
      expect(parseSharedText('goi luc 5 gio'), isNull);
      expect(parseSharedText('mua 2 cai'), isNull);
      expect(parseSharedText('ghi chu 123'), isNull);
    });

    test('amount beyond maxSafe is ignored', () {
      expect(parseSharedText('chi 9.007.199.254.740.992'), isNull);
    });

    test('number glued to a word is not an amount', () {
      expect(parseSharedText('ma giao dich abc12345'), isNull);
    });
  });

  group('amount formats', () {
    test('grouped with commas or dots', () {
      expect(parseSharedText('tru 50,000')?.amount, 50000);
      expect(parseSharedText('chi 50.000')?.amount, 50000);
      expect(parseSharedText('chi 1,500,000')?.amount, 1500000);
      expect(parseSharedText('chi 1.500.000')?.amount, 1500000);
      expect(parseSharedText('chi 1,000,000 VND')?.amount, 1000000);
    });

    test('shorthand units', () {
      expect(parseSharedText('mua 50k')?.amount, 50000);
      expect(parseSharedText('nhan 2tr')?.amount, 2000000);
      expect(parseSharedText('nhan 1.5tr')?.amount, 1500000);
      expect(parseSharedText('nhan 1,5tr')?.amount, 1500000);
      expect(parseSharedText('mua 2 tỷ')?.amount, 2000000000);
      expect(parseSharedText('mua 3 củ')?.amount, 3000000);
      expect(parseSharedText('tra 4 triệu')?.amount, 4000000);
    });

    test('unit + currency markers', () {
      expect(parseSharedText('500K VND')?.amount, 500000);
      expect(parseSharedText('GD: -1.250.000d')?.amount, 1250000);
      expect(parseSharedText('nhan 750.000đ')?.amount, 750000);
      expect(
        parseSharedText('nhan 9007199254740991 VND')?.amount,
        9007199254740991,
      );
    });

    test('signed amounts', () {
      expect(parseSharedText('-45.000 VND')?.amount, 45000);
      expect(parseSharedText('+15.000.000')?.amount, 15000000);
    });
  });

  group('first plausible amount wins', () {
    test('skips account number with leading zero', () {
      final r = parseSharedText('TK 0123 trừ 2,500,000 VND tại Circle K');
      expect(r?.amount, 2500000);
    });

    test('skips counts before the real amount', () {
      final r = parseSharedText('mua 2 cai ao 150k');
      expect(r?.amount, 150000);
    });
  });

  group('kind detection', () {
    test('minus sign / GD: - => expense', () {
      expect(parseSharedText('-45.000 VND')?.kind, TransactionKind.expense);
      expect(
        parseSharedText('GD: -1.250.000d THANH TOAN POS')?.kind,
        TransactionKind.expense,
      );
    });

    test('plus sign => income', () {
      expect(parseSharedText('+15.000.000')?.kind, TransactionKind.income);
    });

    test('expense keywords', () {
      expect(
        parseSharedText('TK 0123 trừ 2,500,000 VND tại Circle K')?.kind,
        TransactionKind.expense,
      );
      expect(
        parseSharedText('thanh toan 125.000 POS')?.kind,
        TransactionKind.expense,
      );
      expect(parseSharedText('chi 50.000')?.kind, TransactionKind.expense);
      expect(parseSharedText('mua 50k')?.kind, TransactionKind.expense);
      expect(
        parseSharedText('Debit 350.000 VND')?.kind,
        TransactionKind.expense,
      );
      expect(parseSharedText('rut 500k atm')?.kind, TransactionKind.expense);
    });

    test('income keywords', () {
      expect(
        parseSharedText('Bạn nhận được 500k từ Momo')?.kind,
        TransactionKind.income,
      );
      expect(
        parseSharedText('luong 15.000.000 VND')?.kind,
        TransactionKind.income,
      );
      expect(
        parseSharedText('Credit 20.000.000 VND')?.kind,
        TransactionKind.income,
      );
      expect(parseSharedText('cong 300k')?.kind, TransactionKind.income);
    });

    test('transfer keywords', () {
      expect(
        parseSharedText('chuyen 300k to Momo')?.kind,
        TransactionKind.transfer,
      );
      expect(parseSharedText('ck 500k')?.kind, TransactionKind.transfer);
    });

    test('income cue beats bare transfer cue when nearer the amount', () {
      expect(
        parseSharedText('chuyen khoan nhan 500k')?.kind,
        TransactionKind.income,
      );
    });

    test('no cues => kind is null (caller defaults)', () {
      final r = parseSharedText('500K VND');
      expect(r?.amount, 500000);
      expect(r?.kind, isNull);
    });
  });

  group('note extraction', () {
    test('merchant after "tại"', () {
      final r = parseSharedText('TK 0123 trừ 2,500,000 VND tại Circle K');
      expect(r?.note, contains('Circle K'));
    });

    test('merchant after "từ"', () {
      final r = parseSharedText('Bạn nhận được 500k từ Momo');
      expect(r?.note, 'Momo');
    });

    test('merchant after "to"', () {
      final r = parseSharedText('chuyen 300k to Momo');
      expect(r?.note, 'Momo');
    });

    test('merchant snippet stops at clause break', () {
      final r = parseSharedText('tru 100k tai Grab. So du 5.000.000');
      expect(r?.note, 'Grab');
    });

    test('tai khoan is not a merchant', () {
      final r = parseSharedText('tai khoan 0123 nhan 500k');
      expect(r?.note, 'tai khoan 0123 nhan 500k');
    });

    test('falls back to the trimmed input', () {
      final r = parseSharedText('GD: -1.250.000d THANH TOAN POS');
      expect(r?.note, 'GD: -1.250.000d THANH TOAN POS');
    });

    test('fallback collapses whitespace', () {
      final r = parseSharedText('mua 50k\n cafe\nsang');
      expect(r?.note, 'mua 50k cafe sang');
    });

    test('note never exceeds 200 chars', () {
      final r = parseSharedText('${'ghi chu rat dai ' * 30}50k');
      expect(r?.amount, 50000);
      expect(r!.note!.length, lessThanOrEqualTo(200));
    });
  });
}
