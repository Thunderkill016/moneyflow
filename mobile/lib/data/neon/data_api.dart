import 'neon_config.dart';
import 'neon_transport.dart';
import 'auth_client.dart';

/// Neon Data API (PostgREST) client. Every request carries the session JWT
/// as `Authorization: Bearer` — RLS on the database scopes rows to the user,
/// exactly like the web client.
class NeonDataApi {
  NeonDataApi({
    required NeonConfig config,
    required NeonAuthClient auth,
    NeonRequester requester = httpNeonRequester,
  }) : _config = config,
       _auth = auth,
       _requester = requester;

  final NeonConfig _config;
  final NeonAuthClient _auth;
  final NeonRequester _requester;

  Uri _url(String table, Map<String, String> query) {
    final base = _config.dataApiUrl.replaceAll(RegExp(r'/+$'), '');
    return Uri.parse('$base/$table').replace(queryParameters: query);
  }

  /// GET a PostgREST resource. Returns decoded rows ([] when none).
  Future<List<Map<String, dynamic>>> select(
    String table, {
    Map<String, String> query = const {},
  }) async {
    final res = await _send('GET', _url(table, query));
    final json = res.json;
    if (json is! List) return const [];
    return json.cast<Map<String, dynamic>>();
  }

  /// POST a SECURITY DEFINER RPC (the same functions the web's server
  /// actions call). Returns the decoded result (uuid string for creates).
  Future<Object?> rpc(String fn, Map<String, Object?> params) async {
    final base = _config.dataApiUrl.replaceAll(RegExp(r'/+$'), '');
    final res = await _send('POST', Uri.parse('$base/rpc/$fn'), body: params);
    return res.json;
  }

  Future<NeonResponse> _send(String method, Uri url, {Object? body}) async {
    final jwt = await _auth.sessionJwt();
    if (jwt == null) throw NeonAuthException(401, 'not signed in');
    final res = await _requester(
      NeonRequest(
        method: method,
        url: url,
        headers: {'Authorization': 'Bearer $jwt'},
        body: body,
      ),
    );
    if (!res.ok) {
      throw NeonAuthException(
        res.status,
        '${url.host}${url.path} -> ${res.body}',
      );
    }
    return res;
  }
}
