package app.moneyflow.moneyflow

import android.content.Intent
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

/**
 * Shares incoming ACTION_SEND text with Dart: cold start via
 * MethodChannel("app.moneyflow/share_text").consumeSharedText(), warm
 * shares via EventChannel("app.moneyflow/share_stream").
 *
 * FlutterFragmentActivity (not FlutterActivity) — local_auth's
 * BiometricPrompt needs a FragmentActivity host.
 */
class MainActivity : FlutterFragmentActivity() {
    private var pendingShare: String? = null
    private var shareSink: EventChannel.EventSink? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        sharedText(intent)?.let { pendingShare = it }

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "app.moneyflow/share_text",
        ).setMethodCallHandler { call, result ->
            if (call.method == "consumeSharedText") {
                result.success(pendingShare)
                pendingShare = null
            } else {
                result.notImplemented()
            }
        }

        EventChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "app.moneyflow/share_stream",
        ).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    shareSink = events
                }

                override fun onCancel(arguments: Any?) {
                    shareSink = null
                }
            },
        )
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        sharedText(intent)?.let { shareSink?.success(it) ?: run { pendingShare = it } }
    }

    private fun sharedText(intent: Intent?): String? =
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            intent.getStringExtra(Intent.EXTRA_TEXT)
        } else {
            null
        }
}
