import 'package:speech_to_text/speech_to_text.dart' as stt;

/// Speech-recognition availability, resolved lazily at mic-tap.
enum VoiceEngineStatus {
  /// Recognition service present and the mic grant succeeded.
  available,

  /// No recognizer on this device/ROM (e.g. de-Googled Android).
  unavailable,

  /// RECORD_AUDIO denied — the OS prompt already ran; the page shows the
  /// manual-capture fallback rather than re-prompting.
  permissionDenied,
}

/// Platform speech-to-text behind a seam — the page drives the state
/// machine; tests inject a scripted fake instead of a microphone.
///
/// Contract mirrors use-voice-capture.ts: [listen] streams partial text
/// via [onPartial], delivers the final transcript via [onFinal], and
/// reports failures via [onError]. [stop] finishes the session and still
/// delivers a final result; [cancel] aborts with no result.
abstract class VoiceEngine {
  Future<VoiceEngineStatus> initialize();

  Future<void> listen({
    void Function(String partial)? onPartial,
    void Function(String finalText)? onFinal,
    void Function(String message)? onError,
  });

  Future<void> stop();

  Future<void> cancel();
}

/// Android SpeechRecognizer via speech_to_text. Vietnamese locale is
/// requested explicitly; when the device lacks vi_VN the plugin falls
/// back to its best locale and partial results still stream.
class SpeechToTextEngine implements VoiceEngine {
  SpeechToTextEngine([stt.SpeechToText? speech])
    : _speech = speech ?? stt.SpeechToText();

  final stt.SpeechToText _speech;

  void Function(String)? _onFinal;
  void Function(String)? _onError;
  var _initialized = false;

  @override
  Future<VoiceEngineStatus> initialize() async {
    final ok = await _speech.initialize(
      onStatus: (status) {
        // done/endOfSpeech deliver whatever the recognizer settled on as
        // the last result callback; no extra work needed here.
      },
      onError: (e) => _onError?.call(e.errorMsg),
    );
    _initialized = ok;
    return ok ? VoiceEngineStatus.available : VoiceEngineStatus.unavailable;
  }

  @override
  Future<void> listen({
    void Function(String partial)? onPartial,
    void Function(String finalText)? onFinal,
    void Function(String message)? onError,
  }) async {
    if (!_initialized) {
      final status = await initialize();
      if (status != VoiceEngineStatus.available) {
        onError?.call('init_failed');
        return;
      }
    }
    _onFinal = onFinal;
    _onError = onError;
    var delivered = false;
    await _speech.listen(
      listenOptions: stt.SpeechListenOptions(
        localeId: 'vi_VN',
        listenMode: stt.ListenMode.dictation,
      ),
      onResult: (result) {
        final text = result.recognizedWords;
        if (result.finalResult) {
          delivered = true;
          _onFinal?.call(text);
        } else {
          onPartial?.call(text);
        }
      },
    );
    // A denied mic grant surfaces as an empty listen (no callbacks); the
    // page distinguishes permission-denied from silence via initialize's
    // status, so only flag an outright listen failure here.
    if (!delivered && !_speech.isListening) {
      _onError?.call('listen_failed');
    }
  }

  @override
  Future<void> stop() => _speech.stop();

  @override
  Future<void> cancel() => _speech.cancel();
}
