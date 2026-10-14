// Android backup hygiene — mf_notif_pending.xml holds raw
// bank-notification text parked by the native listener, so every
// backup/transfer mode must exclude it. A config regression here ships
// silently, which is why the file contents themselves are under test.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  const pendingFile = 'mf_notif_pending.xml';

  String section(String xml, String tag) {
    final match = RegExp('<$tag>(.*?)</$tag>', dotAll: true).firstMatch(xml);
    return match?.group(1) ?? '';
  }

  test('pre-Android 12 fullBackupContent excludes raw pending', () {
    final xml = File(
      'android/app/src/main/res/xml/backup_rules.xml',
    ).readAsStringSync();
    expect(
      xml.contains('<exclude domain="sharedpref" path="$pendingFile"/>'),
      isTrue,
      reason: 'full-backup-content must exclude $pendingFile',
    );
  });

  test(
    'Android 12+ cloud-backup and device-transfer both exclude raw pending',
    () {
      final xml = File(
        'android/app/src/main/res/xml/data_extraction_rules.xml',
      ).readAsStringSync();
      for (final mode in ['cloud-backup', 'device-transfer']) {
        final body = section(xml, mode);
        expect(
          body.contains('path="$pendingFile"'),
          isTrue,
          reason: '$mode must exclude $pendingFile',
        );
      }
    },
  );

  test('manifest keeps both backup rule hooks wired', () {
    final manifest = File(
      'android/app/src/main/AndroidManifest.xml',
    ).readAsStringSync();
    expect(manifest, contains('dataExtractionRules'));
    expect(manifest, contains('fullBackupContent'));
  });

  test(
    'release builds fail without the upload key unless explicitly opted in',
    () {
      // The reviewed gap: a missing key.properties used to warn quietly and
      // ship a debug-signed release. The Gradle contract must keep three
      // parts: the release-task detection, the hard check, and the opt-in
      // property/env escape hatch.
      final gradle = File('android/app/build.gradle.kts').readAsStringSync();
      expect(gradle, contains('mfAllowDebugRelease'));
      expect(gradle, contains('MF_ALLOW_DEBUG_RELEASE'));
      expect(gradle, contains('releaseRequested'));
      expect(gradle, contains('check(!releaseRequested)'));
    },
  );
}
