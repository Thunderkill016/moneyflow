import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Upload-keystore signing for release builds. `key.properties` lives next to
// settings.gradle.kts at mobile/android/key.properties and is gitignored —
// local-only, never committed. A release task without it FAILS the build:
// a debug-signed Play artifact must be impossible, not just warned about.
// Local release runs opt in explicitly via
//   -PmfAllowDebugRelease=true   or   MF_ALLOW_DEBUG_RELEASE=true
val keyPropertiesFile = rootProject.file("key.properties")
val hasUploadKey = keyPropertiesFile.exists()
val keyProperties = Properties().apply {
    if (hasUploadKey) {
        keyPropertiesFile.inputStream().use { load(it) }
    }
}

val allowDebugRelease =
    providers.gradleProperty("mfAllowDebugRelease")
        .orElse(providers.environmentVariable("MF_ALLOW_DEBUG_RELEASE"))
        .map { it.equals("true", ignoreCase = true) }
        .orElse(false)
        .get()

// The requested invocation touches release artifacts — `build`/`assemble`
// alone run every variant, so they count too.
val releaseRequested =
    gradle.startParameter.taskNames.any { name ->
        name.contains("Release", ignoreCase = true) ||
            name == "assemble" ||
            name == "build" ||
            name == "bundle"
    }

if (!hasUploadKey && !allowDebugRelease) {
    check(!releaseRequested) {
        "key.properties not found at ${keyPropertiesFile.path} — refusing " +
            "to build a release artifact signed with the debug key. Restore " +
            "the upload keystore for Play builds, or pass " +
            "-PmfAllowDebugRelease=true / MF_ALLOW_DEBUG_RELEASE=true for a " +
            "local-only release run."
    }
    logger.warn(
        "key.properties not found at ${keyPropertiesFile.path} — " +
            "release builds will use the debug signing key. " +
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
            // R8 whole-program shrink + obfuscation — an unobfuscated
            // finance client hands class names to anyone with apktool.
            // Every plugin in use ships consumer keep rules;
            // flutter_local_notifications additionally needs its
            // serialized-details keeps, held in proguard-rules.pro.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
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

// compilerOptions DSL — kotlinOptions.jvmTarget is a hard deprecation in
// Kotlin Gradle Plugin 2.x (fails script compilation on CI).
kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
    // Local JVM unit tests — BankNotificationSources is pure Kotlin, so the
    // whitelist is verified without Robolectric or a device.
    testImplementation("junit:junit:4.13.2")
    // Real org.json for the JVM harness — the android.jar stub throws
    // "not mocked" otherwise. The on-device framework class stays the
    // runtime implementation.
    testImplementation("org.json:json:20180813")
}

flutter {
    source = "../.."
}
