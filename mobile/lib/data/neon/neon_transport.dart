import 'dart:convert';
import 'dart:io';

/// Minimal injectable HTTP seam for Neon calls.
///
/// The auth flow needs raw response headers (`set-cookie`, `set-auth-jwt`)
/// that `package:http` flattens awkwardly, so the real implementation goes
/// through [HttpClient]; tests inject a fake [NeonRequester] instead.
class NeonRequest {
  const NeonRequest({
    required this.method,
    required this.url,
    this.headers = const {},
    this.body,
  });

  final String method;
  final Uri url;
  final Map<String, String> headers;
  final Object? body; // JSON-encodable
}

class NeonResponse {
  const NeonResponse({
    required this.status,
    required this.headers,
    required this.body,
  });

  final int status;
  // Header names are stored lower-cased.
  final Map<String, String> headers;
  final String body;

  bool get ok => status >= 200 && status < 300;

  Object? get json => body.isEmpty ? null : jsonDecode(body);

  String? header(String name) => headers[name.toLowerCase()];
}

typedef NeonRequester = Future<NeonResponse> Function(NeonRequest req);

/// Longest silence allowed mid-request: a hung server used to stall
/// callers forever because only the connect phase was bounded. 30s is
/// generous for a mobile API round-trip yet finite; the resulting
/// TimeoutException is queueable like other transient transport faults.
const _inactivityTimeout = Duration(seconds: 30);

/// Production transport over dart:io HttpClient.
Future<NeonResponse> httpNeonRequester(
  NeonRequest req, {
  Duration inactivityTimeout = _inactivityTimeout,
}) async {
  final client = HttpClient();
  // Without a bound, a dead connection stalls callers on the OS DNS/connect
  // timeout — in airplane mode that meant the app sat on a spinner forever.
  client.connectionTimeout = const Duration(seconds: 10);
  try {
    final ioReq = await client.openUrl(req.method, req.url);
    req.headers.forEach(ioReq.headers.set);
    if (req.body != null) {
      ioReq.headers.contentType = ContentType.json;
      ioReq.write(jsonEncode(req.body));
    }
    // The response-wait and every gap between body chunks get the same
    // bound — close() alone was the unbounded wait.
    final ioRes = await ioReq.close().timeout(inactivityTimeout);
    final body = await utf8.decodeStream(ioRes.timeout(inactivityTimeout));
    final headers = <String, String>{};
    ioRes.headers.forEach((name, values) {
      // Join repeated headers (e.g. set-cookie) so nothing is lost.
      headers[name.toLowerCase()] = values.join(', ');
    });
    return NeonResponse(status: ioRes.statusCode, headers: headers, body: body);
  } finally {
    client.close(force: true);
  }
}
