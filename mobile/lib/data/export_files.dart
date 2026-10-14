import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../domain/export_csv.dart' show exportBackupFilename;

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

/// Loads the archive document via [loadArchive] (`export_user_archive`)
/// and writes it as pretty JSON to a temp file — the shared half of the
/// "Sao lưu (JSON)" flow the reports sheet and the settings surface both
/// run; each caller keeps its own error copy + share call. Throws when
/// the RPC answer isn't a JSON document or the write fails.
Future<File> writeArchiveExportFile(
  Future<Object?> Function() loadArchive, {
  ExportTempDir? tempDir,
}) async {
  final doc = await loadArchive();
  // The RPC answers a jsonb document — anything else isn't an archive
  // we can honestly hand over.
  if (doc is! Map && doc is! List) {
    throw const FormatException('unexpected archive shape');
  }
  final body = '${const JsonEncoder.withIndent('  ').convert(doc)}\n';
  return writeExportFile(
    exportBackupFilename(DateTime.now()),
    body,
    tempDir: tempDir,
  );
}
