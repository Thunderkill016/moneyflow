import 'dart:async';

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
    this.onSessionExpired,
  }) : _config = config,
       _auth = auth,
       _requester = requester;

  final NeonConfig _config;
  final NeonAuthClient _auth;
  final NeonRequester _requester;

  /// Called when the transport proves the session is dead — the auth
  /// service refuses the session cookie, or PostgREST rejects a
  /// still-fresh JWT. Only status 401 fires it: 4xx business codes from
  /// RPCs are ordinary errors, never session death. Fires at most once
  /// per failed request and never blocks it.
  final Future<void> Function()? onSessionExpired;

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

  /// The signed-in user's id — direct table writes must send `user_id`
  /// explicitly (the web action passes `viewer.id`; RLS checks it against
  /// `auth.uid()`).
  String? get userId => _auth.session?.userId;

  /// POST a SECURITY DEFINER RPC (the same functions the web's server
  /// actions call). Returns the decoded result (uuid string for creates).
  Future<Object?> rpc(String fn, Map<String, Object?> params) async {
    final base = _config.dataApiUrl.replaceAll(RegExp(r'/+$'), '');
    final res = await _send('POST', Uri.parse('$base/rpc/$fn'), body: params);
    return res.json;
  }

  /// POST a table row with `Prefer: return=representation` — the same
  /// insert+read-back the web's `.insert().select().single()` performs.
  Future<List<Map<String, dynamic>>> insert(
    String table,
    Map<String, Object?> body,
  ) => _rows(
    _send(
      'POST',
      _url(table, const {}),
      body: body,
      prefer: _preferRepresentation,
    ),
  );

  /// PATCH rows matching [query], reading back the written rows so the
  /// caller sees what RLS actually persisted (empty = nothing matched).
  Future<List<Map<String, dynamic>>> update(
    String table,
    Map<String, String> query,
    Map<String, Object?> body,
  ) => _rows(
    _send(
      'PATCH',
      _url(table, query),
      body: body,
      prefer: _preferRepresentation,
    ),
  );

  /// DELETE rows matching [query]. The representation tells "deleted" from
  /// "RLS hid the row" — an empty list means nothing was removed.
  Future<List<Map<String, dynamic>>> delete(
    String table,
    Map<String, String> query,
  ) =>
      _rows(_send('DELETE', _url(table, query), prefer: _preferRepresentation));

  static const _preferRepresentation = 'return=representation';

  static Future<List<Map<String, dynamic>>> _rows(
    Future<NeonResponse> res,
  ) async {
    final json = (await res).json;
    if (json is! List) return const [];
    return json.cast<Map<String, dynamic>>();
  }

  void _signalSessionExpired() {
    final cb = onSessionExpired;
    if (cb != null) unawaited(cb());
  }

  Future<NeonResponse> _send(
    String method,
    Uri url, {
    Object? body,
    String? prefer,
    bool retry = false,
  }) async {
    final String? jwt;
    try {
      jwt = await _auth.sessionJwt();
    } on NeonAuthException catch (e) {
      // The auth service refusing /get-session with a 401 means the
      // session cookie itself is dead — not a request-specific failure.
      if (e.status == 401) _signalSessionExpired();
      rethrow;
    }
    // No session client-side: local sign-out already happened or never
    // occurred — that is state, not an upstream session-death signal.
    if (jwt == null) throw NeonAuthException(401, 'not signed in');
    final res = await _requester(
      NeonRequest(
        method: method,
        url: url,
        headers: {'Authorization': 'Bearer $jwt', 'Prefer': ?prefer},
        body: body,
      ),
    );
    if (!res.ok) {
      // PostgREST rejecting a just-issued JWT means the session behind
      // it was revoked server-side.
      if (res.status == 401) _signalSessionExpired();
      // A P0001 'authentication_required' is raised INSIDE the definer:
      // the JWT passed PostgREST's role check but carried no usable
      // session claims (stale/wrong-token class) — drop the cached JWT,
      // force one refresh through /get-session, and replay the request
      // once. A repeat failure is a real dead session.
      if (!retry && res.body.contains('authentication_required')) {
        _auth.invalidateJwt();
        return _send(method, url, body: body, prefer: prefer, retry: true);
      }
      throw NeonAuthException(
        res.status,
        '${url.host}${url.path} -> ${res.body}',
      );
    }
    return res;
  }
}
