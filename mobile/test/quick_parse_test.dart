// Unit tests for the quick-capture parser — the case table mirrors
// src/lib/voice/vi-money-parser.test.ts one-for-one (folded spellings
// count as the same input), plus mobile extensions: ASCII input, income/
// transfer hints, date hints, and the garbage-remainder reject.

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/quick_parse.dart';

void main() {
  group('parseQuickCapture — amounts (mirrors the web case table)', () {
    const cases = <String, int?>{
      // Core price shorthand ("hai chục" at a shop = 20.000đ).
      'ăn sáng hai chục': 20000,
      'hai mươi nghìn': 20000,
      'hai chục nghìn': 20000,
      'một trăm': 100000,
      'một trăm nghìn': 100000,
      'trăm rưỡi': 150000,
      'hai trăm rưỡi': 250000,
      // Millions and slang.
      'một triệu': 1000000,
      'hai triệu': 2000000,
      '2 củ': 2000000,
      'một củ rưỡi': 1500000,
      'một chai': 1000000,
      'một xị': 100000,
      'hai xị': 200000,
      'triệu rưỡi': 1500000,
      'hai triệu rưỡi': 2500000,
      // Tens variants.
      'năm chục': 50000,
      'ba mươi lăm': 35000,
      'ba lăm': 35000,
      'hai mươi mốt': 21000,
      'hai mốt': 21000,
      'hai mươi tư': 24000,
      'hai tư': 24000,
      'hai mươi lăm': 25000,
      'hai lăm': 25000,
      'mười': 10000,
      'một chục': 10000,
      'chục': 10000,
      'chín mươi chín': 99000,
      // Hundreds with linh/lẻ.
      'một trăm lẻ năm': 105000,
      'một trăm linh năm': 105000,
      'một trăm hai mươi ba': 123000,
      'một trăm mười một': 111000,
      'năm trăm nghìn': 500000,
      // Explicit thousands (no shorthand).
      'một nghìn': 1000,
      'nghìn': 1000,
      // Billions.
      'một tỷ': 1000000000,
      'hai tỷ ba trăm triệu': 2300000000,
      // Digit forms.
      '20000': 20000,
      '20.000': 20000,
      '20,000': 20000,
      '20k': 20000,
      '2tr': 2000000,
      '2,5 triệu': 2500000,
      'cà phê 35': 35000,
      '20đ': 20000,
      // Full sentences.
      'đổ xăng một trăm': 100000,
      'tiền điện hai trăm ba mươi': 230000,
      'mua sách năm mươi': 50000,
      'đi chợ ba trăm': 300000,
      'grab hai lăm': 25000,
      'tiền nhà ba triệu': 3000000,
      'thuốc một trăm hai': 120000,
      'lương tháng mười lăm triệu': 15000000,
      // No amount.
      'không có số': null,
      'ăn sáng': null,
      '': null,
      '   ': null,
    };
    for (final e in cases.entries) {
      test('"${e.key}" -> ${e.value}', () {
        expect(parseQuickCapture(e.key)?.amountMinor, e.value);
      });
    }
  });

  group('parseQuickCapture — ASCII input parses like diacritics', () {
    const cases = <String, int?>{
      'an trua 45k': 45000,
      'an sang hai chuc': 20000,
      'cafe 2 cu': 2000000,
      'ca phe 2 cu': 2000000,
      'tien nha 3 trieu ruoi': 3500000,
      'xang 100 nghin': 100000,
      'nhan 1.5tr': 1500000,
      'me gui 500k': 500000,
      'luong 15tr': 15000000,
      'hai muoi': 20000, // folded "mươi"/"mười" merge — documented divergence
      // Web grammar reads trailing digits as a remainder, not a unit
      // fraction: "1tr5" -> "1 triệu 5" (unlike money.dart's 1tr5 = 1,5tr).
      '1tr5': 1000005,
      '50k5': 50005, // "50 nghìn 5" — field shorthand says 50 500
      'nhan 500 nghin': 500000,
      'dong hoc phi 2 cu ruoi': 2500000,
      'mot xi': 100000,
    };
    for (final e in cases.entries) {
      test('"${e.key}" -> ${e.value}', () {
        expect(parseQuickCapture(e.key)?.amountMinor, e.value);
      });
    }
  });

  group('parseQuickCapture — rejects stay null', () {
    // '1tr5000001': a >=1000 bare-digit remainder after a big scale is
    // garbage typing — the web sums it (6 000 001), mobile rejects it.
    const cases = [
      'abc',
      'xin chao',
      '1tr5000001',
      'khong dong',
      '2.5.7',
      '9007199254740993', // past the JS safe-integer ceiling
      // Weekday "hai" (2) glues into the amount span as an unparseable
      // chunk ("hai 45 nghin") — the web grammar also fails this; a
      // broken span must never guess between 45k and "hai".
      'an trua thu hai 45k',
    ];
    for (final input in cases) {
      test('"$input" -> null', () {
        expect(parseQuickCapture(input), isNull);
      });
    }

    test('"chai nước" stays a noun, not million slang', () {
      final r = parseQuickCapture('mua 2 chai nước');
      // Only bare "2" is an amount candidate — 2.000 via shorthand, and
      // critically NOT 2.000.000 (chai-as-triệu).
      expect(r?.amountMinor, isNot(2000000));
    });
  });

  group('parseQuickCapture — parse metadata', () {
    test('shorthand flag marks the x1000 guess only', () {
      expect(parseQuickCapture('hai chục')!.shorthand, isTrue);
      expect(parseQuickCapture('hai mươi nghìn')!.shorthand, isFalse);
      expect(parseQuickCapture('2 củ')!.shorthand, isFalse);
    });

    test('amountText + note stay separate, diacritics kept', () {
      final r = parseQuickCapture('Ăn SÁNG, hai chục!!')!;
      expect(r.amountText, 'hai chục');
      expect(r.note, contains('ăn sáng'));
      expect(r.note, isNot(contains('hai chục')));
    });
  });

  group('parseQuickCapture — kind detection', () {
    const cases = <String, TransactionKind>{
      'an trua 45k': TransactionKind.expense,
      'do xang 100k': TransactionKind.expense,
      'me gui 500k': TransactionKind.expense, // "gửi" is expense-ish per spec
      'nhan 500k': TransactionKind.income,
      'me nhan 500k': TransactionKind.income,
      'luong thang 15tr': TransactionKind.income,
      'nhan thuong 2 trieu': TransactionKind.income,
      'lanh luong 10tr': TransactionKind.income,
      'thu 500k': TransactionKind.income,
      'tien ve 300k': TransactionKind.income,
      'chuyen khoan 500k': TransactionKind.transfer,
      'chuyen tien 200k sang vi': TransactionKind.transfer,
      // Money IN wins over the transfer word.
      'nhan chuyen khoan 500k': TransactionKind.income,
      // "thứ bảy" names a weekday — 'thu' must not read as income.
      'an trua thu bay hom qua 50k': TransactionKind.expense,
    };
    for (final e in cases.entries) {
      test('"${e.key}" -> ${e.value}', () {
        expect(parseQuickCapture(e.key)!.kind, e.value);
      });
    }
  });

  group('parseQuickCapture — category hints (web dictionary)', () {
    const cases = <String, String?>{
      'an sang 20k': 'Ăn uống',
      'ca phe ba lam': 'Ăn uống',
      'do xang 100k': 'Di chuyển',
      'tien dien 200k': 'Hóa đơn',
      'di cho 300k': 'Mua sắm',
      'mua thuoc 50k': 'Sức khỏe',
      'dong hoc phi 2tr': 'Giáo dục',
      'tien nha 3tr': 'Nhà ở',
      'luong 15tr': 'Lương',
      'xyz 45k': null,
    };
    for (final e in cases.entries) {
      test('"${e.key}" -> ${e.value}', () {
        expect(parseQuickCapture(e.key)!.categoryHint, e.value);
      });
    }
  });

  group('parseQuickCapture — date hints (mobile extension)', () {
    const cases = <String, String?>{
      'an trua 45k hom qua': 'yesterday',
      'an toi 100k hom kia': 'dayBeforeYesterday',
      'do xang 50k sang nay': 'today',
      'di cho 200k toi qua': 'yesterday',
      'an trua 45k': null,
    };
    for (final e in cases.entries) {
      test('"${e.key}" -> ${e.value}', () {
        expect(parseQuickCapture(e.key)!.dateHint, e.value);
      });
    }

    test('date words leave the note', () {
      final r = parseQuickCapture('ăn trưa 45k hôm qua')!;
      expect(r.note, 'ăn trưa');
    });
  });
}
