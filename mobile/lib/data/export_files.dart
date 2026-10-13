import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Hands a written export file to the platform share sheet. Kept as a
/// typedef so tests capture the call without touching platform channels.
typedef ExportSharer = Future<void> Function(String path, String mimeType);

/// Where export files land before sharing — injectable for the same reason.
typedef ExportTempDir = Future<Directory> Function();

/// The production share seam — the system share sheet via share_plus.
/// Export files are hand-offs, so sharing is fire-and-forget: the sheet's
/// outcome (sent, saved, cancelled) is the user's business, not ours.
Future<void> shareFileToSheet(String path, String mimeType) async {
  await SharePlus.instance.share(
    ShareParams(files: [XFile(path, mimeType: mimeType)]),
  );
}

/// Write [body] as UTF-8 to `<temp>/<name>` and return the file. Exports
/// go to the app temp dir — they are transient hand-offs, not user-visible
/// documents, and the share sheet streams them via the plugin's provider.
Future<File> writeExportFile(
  String name,
  String body, {
  ExportTempDir? tempDir,
}) async {
  final dir = await (tempDir ?? getTemporaryDirectory)();
  final file = File('${dir.path}/$name');
  await file.writeAsString(body, flush: true);
  return file;
}
