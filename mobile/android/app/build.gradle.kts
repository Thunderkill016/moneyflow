import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Upload-keystore signing for release builds. `key.properties` lives next to
// settings.gradle.kts at mobile/android/key.properties and is gitignored —
// local-only, never committed. When it is absent we keep the previous debug
// fallback so `flutter run --release` still works, but warn during
// configuration so a debug-signed release is never silent.
val keyPropertiesFile = rootProject.file("key.properties")
val hasUploadKey = keyPropertiesFile.exists()
val keyProperties = Properties().apply {
    if (hasUploadKey) {
        keyPropertiesFile.inputStream().use { load(it) }
    }
}

if (!hasUploadKey) {
    logger.warn(
        "key.properties not found at ${keyPropertiesFile.path} — " +
            "release builds fall back to the debug signing key. " +
            "Restore the upload keystore before building a Play AAB.",
    )
}

android {
    namespace = "app.moneyflow.moneyflow"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // flutter_local_notifications uses java.time APIs below API 26.
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "app.moneyflow.moneyflow"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasUploadKey) {
            create("release") {
                keyAlias = keyProperties.getProperty("keyAlias")
                keyPassword = keyProperties.getProperty("keyPassword")
                storeFile = keyProperties.getProperty("storeFile")?.let { file(it) }
                storePassword = keyProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig =
                if (hasUploadKey) {
                    signingConfigs.getByName("release")
                } else {
                    // Debug fallback for local release runs without a
                    // key.properties file; the warning above fires at
                    // configuration time.
                    signingConfigs.getByName("debug")
                }
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
    // Local JVM unit tests — BankNotificationSources is pure Kotlin, so the
    // whitelist is verified without Robolectric or a device.
    testImplementation("junit:junit:4.13.2")
}

flutter {
    source = "../.."
}
