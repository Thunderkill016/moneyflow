// Device file picking for CSV imports — the thin file_picker wrapper.
// Kept behind a typedef seam so the import sheet and its tests never
// touch the platform channel.

import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

/// A file the user picked — name for provenance (the RPC's
/// `p_batch.file_name`), bytes for the client-side preview parse.
class PickedCsvFile {
  const PickedCsvFile({required this.name, required this.bytes});

  final String name;
  final Uint8List bytes;
}

/// The picker seam injected into the import sheet — null means the user
/// cancelled, which is a silent no-op, never an error.
typedef CsvFilePicker = Future<PickedCsvFile?> Function();

/// The picker returned bytes that could not be read at all — surfaced as
/// a distinct error so the sheet can say "không đọc được file" honestly.
class CsvFileReadException implements Exception {
  const CsvFileReadException();
}

/// file_picker over the system document UI — custom type restricted to
/// .csv so the sheet only ever receives the shape it advertises. On
/// Android this goes through SAF: no storage permission, and
/// [PlatformFile.readAsBytes] resolves content:// providers itself.
Future<PickedCsvFile?> pickCsvFileFromDevice() async {
  final file = await FilePicker.pickFile(
    type: FileType.custom,
    allowedExtensions: const ['csv'],
  );
  if (file == null) return null;
  final Uint8List bytes;
  try {
    bytes = await file.readAsBytes();
  } catch (_) {
    throw const CsvFileReadException();
  }
  return PickedCsvFile(name: file.name, bytes: bytes);
}
