import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart' show TransactionKind;
import 'package:moneyflow/domain/voice_money_parser.dart';

/// Contract mirror of src/lib/voice/vi-money-parser.test.ts — the same
/// Vietnamese money-speech cases must parse identically on mobile.
void main() {
  group('parseVietnameseMoney', () {
    const cases = <(String, int?)>[
      // Core price shorthand ("hai chục" at a shop = 20.000đ)
      ('ăn sáng hai chục', 20000),
      ('hai mươi nghìn', 20000),
      ('hai chục nghìn', 20000),
      ('một trăm', 100000),
      ('một trăm nghìn', 100000),
      ('trăm rưỡi', 150000),
      ('hai trăm rưỡi', 250000),
      // Millions and slang
      ('một triệu', 1000000),
      ('hai triệu', 2000000),
      ('2 củ', 2000000),
      ('một củ rưỡi', 1500000),
      ('một chai', 1000000),
      ('một xị', 100000),
      ('hai xị', 200000),
      ('triệu rưỡi', 1500000),
      ('hai triệu rưỡi', 2500000),
      // Tens variants
      ('năm chục', 50000),
      ('ba mươi lăm', 35000),
      ('ba lăm', 35000),
      ('hai mươi mốt', 21000),
      ('hai mốt', 21000),
      ('hai mươi tư', 24000),
      ('hai tư', 24000),
      ('hai mươi lăm', 25000),
      ('hai lăm', 25000),
      ('mười', 10000),
      ('một chục', 10000),
      ('chục', 10000),
      ('chín mươi chín', 99000),
      // Hundreds with linh/lẻ
      ('một trăm lẻ năm', 105000),
      ('một trăm linh năm', 105000),
      ('một trăm hai mươi ba', 123000),
      ('một trăm mười một', 111000),
      ('năm trăm nghìn', 500000),
      // Explicit thousands (no shorthand)
      ('một nghìn', 1000),
      ('nghìn', 1000),
      // Billions
      ('một tỷ', 1000000000),
      ('hai tỷ ba trăm triệu', 2300000000),
      // Digit forms
      ('20000', 20000),
      ('20.000', 20000),
      ('20,000', 20000),
      ('20k', 20000),
      ('2tr', 2000000),
      ('2,5 triệu', 2500000),
      ('cà phê 35', 35000),
      ('20đ', 20000),
      // Full sentences
      ('đổ xăng một trăm', 100000),
      ('tiền điện hai trăm ba mươi', 230000),
      ('mua sách năm mươi', 50000),
      ('đi chợ ba trăm', 300000),
      ('grab hai lăm', 25000),
      ('tiền nhà ba triệu', 3000000),
      ('thuốc một trăm hai', 120000),
      ('lương tháng mười lăm triệu', 15000000),
      // No amount
      ('không có số', null),
      ('ăn sáng', null),
      ('', null),
      ('   ', null),
    ];

    for (final (input, expected) in cases) {
      test('"$input" -> $expected', () {
        expect(parseVietnameseMoney(input).amount, expected);
      });
    }

    test('normalizes the transcript', () {
      final result = parseVietnameseMoney('  Ăn SÁNG, hai chục!! ');
      expect(result.transcript, 'ăn sáng hai chục');
      expect(result.amount, 20000);
    });

    test('marks price shorthand', () {
      expect(parseVietnameseMoney('hai chục').shorthand, isTrue);
      expect(parseVietnameseMoney('hai mươi nghìn').shorthand, isFalse);
      expect(parseVietnameseMoney('2 củ').shorthand, isFalse);
    });

    test('keeps the amount text and the rest separate', () {
      final result = parseVietnameseMoney('ăn sáng hai chục');
      expect(result.amountText, 'hai chục');
      expect(result.rest, contains('ăn sáng'));
      expect(result.rest, isNot(contains('hai chục')));
    });

    test("does not treat 'chai nước' (bottle) as million slang", () {
      final result = parseVietnameseMoney('mua 2 chai nước');
      expect(result.amount, isNot(2000000));
    });

    test('returns null for zero', () {
      expect(parseVietnameseMoney('không đồng').amount, isNull);
    });

    test(
      'an absurd spoken amount fails instead of saturating at int64 max',
      () {
        // total.round() on a >int64 double saturates to 9223372036854775807 —
        // the bound must fire before the round, like the share parser's.
        expect(parseVietnameseMoney('123456789012345678 đồng').amount, isNull);
        expect(parseVietnameseMoney('10000000 tỷ').amount, isNull);
        expect(parseVietnameseMoney('999999999999999999999999').amount, isNull);
        // Sane figures still parse on either side of the guard.
        expect(parseVietnameseMoney('hai tỷ').amount, 2000000000);
        expect(parseVietnameseMoney('100 tỷ').amount, 100000000000);
      },
    );
  });

  group('detectVoiceKind', () {
    test('detects income hints', () {
      expect(
        detectVoiceKind('lương tháng mười lăm triệu'),
        TransactionKind.income,
      );
      expect(detectVoiceKind('nhận thưởng hai triệu'), TransactionKind.income);
    });
    test('defaults to expense', () {
      expect(detectVoiceKind('ăn sáng hai chục'), TransactionKind.expense);
      expect(detectVoiceKind('đổ xăng một trăm'), TransactionKind.expense);
    });
  });

  group('suggestVoiceCategory', () {
    const cases = <(String, String?)>[
      ('ăn sáng', 'Ăn uống'),
      ('cà phê ba lăm', 'Ăn uống'),
      ('đổ xăng', 'Di chuyển'),
      ('tiền điện', 'Hóa đơn'),
      ('đi chợ', 'Mua sắm'),
      ('mua thuốc', 'Sức khỏe'),
      ('đóng học phí', 'Giáo dục'),
      ('tiền nhà', 'Nhà ở'),
      ('xyz không khớp gì', null),
    ];
    for (final (input, expected) in cases) {
      test('"$input" -> $expected', () {
        expect(suggestVoiceCategory(input), expected);
      });
    }
  });
}
