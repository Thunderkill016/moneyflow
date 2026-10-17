// Launcher identity — the shipped icon must be the MoneyFlow brand mark,
// not the Flutter default. The adaptive descriptor, its background color
// and every density's foreground/legacy asset are under test because a
// missing piece degrades to the framework icon silently.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

  test('adaptive icon descriptor wires brand background + foreground', () {
    final xml = File(
      'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    ).readAsStringSync();
    expect(xml, contains('<adaptive-icon'));
    expect(xml, contains('android:drawable="@color/ic_launcher_background"'));
    expect(xml, contains('android:drawable="@mipmap/ic_launcher_foreground"'));
  });

  test('launcher background color is the MoneyFlow neon brand', () {
    final xml = File(
      'android/app/src/main/res/values/colors.xml',
    ).readAsStringSync();
    expect(
      xml,
      contains('<color name="ic_launcher_background">#FF00FF88</color>'),
    );
  });

  test('every density ships legacy icon and adaptive foreground', () {
    for (final d in densities) {
      for (final name in ['ic_launcher.png', 'ic_launcher_foreground.png']) {
        final file = File('android/app/src/main/res/mipmap-$d/$name');
        expect(file.existsSync(), isTrue, reason: 'missing mipmap-$d/$name');
        expect(
          file.lengthSync(),
          greaterThan(256),
          reason: 'mipmap-$d/$name looks empty/corrupt',
        );
      }
    }
  });
}
