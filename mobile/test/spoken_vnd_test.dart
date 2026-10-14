import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/spoken_vnd.dart';

void main() {
  group('spokenVnd', () {
    test('zero and small đồng', () {
      expect(spokenVnd(0), 'không đồng');
      expect(spokenVnd(5), 'năm đồng');
      expect(spokenVnd(15), 'mười lăm đồng');
      expect(spokenVnd(21), 'hai mươi mốt đồng');
      expect(spokenVnd(50), 'năm mươi đồng');
      expect(spokenVnd(100), 'một trăm đồng');
      expect(spokenVnd(115), 'một trăm mười lăm đồng');
    });

    test('nghìn and trăm-lẻ bridges', () {
      expect(spokenVnd(45000), 'bốn mươi lăm nghìn đồng');
      expect(spokenVnd(11000), 'mười một nghìn đồng');
      expect(spokenVnd(1005), 'một nghìn không trăm lẻ năm đồng');
      expect(spokenVnd(201000), 'hai trăm lẻ một nghìn đồng');
    });

    test('triệu and tỷ groups', () {
      expect(spokenVnd(2350000), 'hai triệu ba trăm năm mươi nghìn đồng');
      expect(spokenVnd(2000000000), 'hai tỷ đồng');
      expect(
        spokenVnd(999999999),
        'chín trăm chín mươi chín triệu '
        'chín trăm chín mươi chín nghìn '
        'chín trăm chín mươi chín đồng',
      );
      // Interior group under 100 keeps the formal "không trăm" bridge.
      expect(spokenVnd(1010000), 'một triệu không trăm mười nghìn đồng');
    });

    test('rưỡi reads an exact half of the emitted unit', () {
      expect(spokenVnd(1500000), 'một triệu rưỡi đồng');
      expect(spokenVnd(2500), 'hai nghìn rưỡi đồng');
      expect(spokenVnd(10500), 'mười nghìn rưỡi đồng');
      expect(spokenVnd(1500000000), 'một tỷ rưỡi đồng');
      // "rưỡi" applies to the last emitted unit — 500.500 reads
      // "five hundred and a half nghìn".
      expect(spokenVnd(1500500), 'một triệu năm trăm nghìn rưỡi đồng');
      // Never on the bare đồng group.
      expect(spokenVnd(500), 'năm trăm đồng');
    });

    test('negative reads âm instead of a stray sign', () {
      expect(spokenVnd(-50000), 'âm năm mươi nghìn đồng');
    });
  });
}
