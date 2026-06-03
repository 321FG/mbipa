# P1.1 - Android Build Configuration for ProGuard/R8

**This is a reference guide for configuring your `android/app/build.gradle` file to enable ProGuard/R8 code obfuscation.**

---

## What to Add/Update in build.gradle

### Location

The `build.gradle` file is typically located at:
```
android/app/build.gradle
```

Or for Gradle Kotlin DSL:
```
android/app/build.gradle.kts
```

### Updated buildTypes Section

Find the `buildTypes` block in `build.gradle` and update it:

```gradle
buildTypes {
  release {
    // ============================================================
    // CODE OBFUSCATION & SHRINKING
    // ============================================================
    minifyEnabled true              // Enable R8
    shrinkResources true            // Remove unused resources
    
    // Reference to ProGuard rules file
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    
    // ============================================================
    // SIGNING
    // ============================================================
    signingConfig signingConfigs.release  // Use release signing key
    
    // ============================================================
    // OPTIMIZATION
    // ============================================================
    debuggable false                 // Can't attach debugger in production
    
    // ============================================================
    // BUILD OPTIONS
    // ============================================================
    minSdkVersion 21                 // Minimum Android version
    targetSdkVersion 34              // Target Android version
    
    // Optional: remove unused resources
    resConfigs()                     // Will use gradle-exclude-resources
  }
  
  debug {
    // ============================================================
    // DEBUG BUILD - KEEP CODE READABLE
    // ============================================================
    minifyEnabled false             // Don't obfuscate debug builds
    shrinkResources false           // Keep all resources
    debuggable true                 // Allow debugging
    
    // Still use signing config, but can be basic
    signingConfig signingConfigs.debug
  }
}
```

---

## Full Example build.gradle (app-level)

```gradle
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'  // if using Kotlin

android {
  namespace "com.mbipa.app"  // App package name
  compileSdk 34              // Compile against Android 14

  defaultConfig {
    applicationId "com.mbipa.app"
    minSdk 21                  // Android 5.0 and up
    targetSdk 34               // Target Android 14
    versionCode 1              // Increment for each release
    versionName "1.0.0"        // Semantic versioning
    
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
  }

  // ================================================================
  // SIGNING CONFIGURATION
  // ================================================================
  signingConfigs {
    debug {
      // Default debug signing (auto-generated)
      storeFile file('debug.keystore')
      storePassword 'android'
      keyAlias 'androiddebugkey'
      keyPassword 'android'
    }
    
    release {
      // Production release signing
      // IMPORTANT: Use environment variables or keystore files, NOT hardcoded!
      storeFile file(System.getenv("KEYSTORE_FILE") ?: "release.jks")
      storePassword System.getenv("KEYSTORE_PASSWORD")
      keyAlias System.getenv("KEY_ALIAS")
      keyPassword System.getenv("KEY_PASSWORD")
    }
  }

  // ================================================================
  // BUILD TYPES
  // ================================================================
  buildTypes {
    release {
      // Enable obfuscation and shrinking
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
      
      signingConfig signingConfigs.release
      debuggable false
      
      // Keep symbols for crash reporting
      ndk {
        debugSymbolLevel 'full'  // Generate debug symbols for native code
      }
      
      buildFeatures {
        // Disable unused features
        aidl false
        renderScript false
      }
    }
    
    debug {
      minifyEnabled false
      shrinkResources false
      signingConfig signingConfigs.debug
      debuggable true
    }
  }

  // ================================================================
  // COMPILATION OPTIONS
  // ================================================================
  compileOptions {
    sourceCompatibility JavaVersion.VERSION_11
    targetCompatibility JavaVersion.VERSION_11
  }

  kotlinOptions {
    jvmTarget = '11'
  }

  // ================================================================
  // BUILD FEATURES
  // ================================================================
  buildFeatures {
    compose false  // Use native, not Compose
    viewBinding false
    aidl false
    renderScript false
    resValues false
    shaders false
  }

  // ================================================================
  // LINT OPTIONS (OPTIONAL)
  // ================================================================
  lint {
    disable 'MissingTranslation'
    checkReleaseBuilds true
    abortOnError false
  }
}

// ====================================================================
// DEPENDENCIES
// ====================================================================
dependencies {
  // (Your existing dependencies)
  
  // Firebase
  implementation platform('com.google.firebase:firebase-bom:32.0.0')
  implementation 'com.google.firebase:firebase-auth'
  implementation 'com.google.firebase:firebase-firestore'
  
  // Stripe
  implementation 'com.stripe:stripe-android:20.0.0'
  
  // SignalR
  implementation 'com.microsoft.aspnet:signalr:5.0.0'
  
  // AndroidX
  implementation 'androidx.appcompat:appcompat:1.6.1'
  implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
  
  // React Native (from Expo)
  // (dependencies handled by Expo)
  
  // Testing
  testImplementation 'junit:junit:4.13.2'
  androidTestImplementation 'androidx.test.ext:junit:1.1.5'
}
```

---

## Gradle Build Command Reference

### Build Commands

```bash
# Build release APK (local)
cd android
./gradlew assembleRelease
cd ..

# Build debug APK (local)
cd android
./gradlew assembleDebug
cd ..

# Build with Gradle Wrapper (recommended)
cd android
gradlew assembleRelease  # Windows
./gradlew assembleRelease  # Mac/Linux
cd ..

# Using EAS (Expo - recommended for Expo projects)
eas build --platform android --release

# Build and install on connected device
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Verification Commands

```bash
# Check ProGuard output
ls -la android/app/build/outputs/mapping/release/mapping.txt

# View build logs
grep "minifyReleaseWithR8" android/app/build.log

# Check APK size
du -h android/app/build/outputs/apk/release/app-release.apk

# Decompile APK
apktool d android/app/build/outputs/apk/release/app-release.apk -o app-release-decoded
cat app-release-decoded/smali/com/mbipa/a.smali  # View obfuscated code
```

---

## Environment Variables (for CI/CD)

If building in CI/CD (GitHub Actions, Travis CI, etc.), set these environment variables:

```bash
export KEYSTORE_FILE=/path/to/release.jks
export KEYSTORE_PASSWORD=<password>
export KEY_ALIAS=<alias>
export KEY_PASSWORD=<password>
export GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx2g -XX:+HeapDumpOnOutOfMemory"
```

Or in GitHub Actions:

```yaml
- name: Build Release APK
  env:
    KEYSTORE_FILE: ${{ secrets.KEYSTORE_FILE }}
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
  run: |
    cd android
    ./gradlew assembleRelease
```

---

## ProGuard Rules File Location

The ProGuard rules file should be at:

```
android/app/proguard-rules.pro
```

The reference in build.gradle points to this:

```gradle
proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
```

This means:
1. Use Android's built-in `proguard-android-optimize.txt` rules
2. Apply additional custom rules from `proguard-rules.pro`

---

## Troubleshooting Build Issues

### Issue: ProGuard files not found

**Error:**
```
Could not find proguard-rules.pro
```

**Solution:**
```bash
# Create the file if it doesn't exist
touch android/app/proguard-rules.pro

# Or copy from existing template
cp proguard-rules.pro android/app/proguard-rules.pro
```

### Issue: Build fails with memory error

**Error:**
```
Java heap space
FAILURE: Build failed with an exception.
```

**Solution:**
```bash
# Increase heap memory
export GRADLE_OPTS="-Xmx2048m"

# Or set in build.gradle:
gradle {
  maxMetaspaceSize = "512m"
}

# Then rebuild
./gradlew assembleRelease
```

### Issue: Signing key not found

**Error:**
```
Keystore file not found: release.jks
```

**Solution:**
```bash
# Generate signing key
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mbipa_key

# Set environment variables
export KEYSTORE_FILE=release.jks
export KEYSTORE_PASSWORD=<your_password>
export KEY_ALIAS=mbipa_key
export KEY_PASSWORD=<your_password>

# Then rebuild
./gradlew assembleRelease
```

### Issue: ProGuard is too aggressive (app crashes)

**Error:**
```
App crashes after obfuscation
```

**Solution:**
1. Identify the crashing class
2. Add `-keep` rule to `proguard-rules.pro`
3. Rebuild

Example:
```bash
# In proguard-rules.pro
-keep class com.mbipa.auth.** { *; }

# Rebuild
./gradlew assembleRelease
```

---

## Best Practices

1. ✅ **Always enable for release builds** - minifyEnabled = true
2. ✅ **Never enable for debug** - Leaves code readable for debugging
3. ✅ **Save mapping.txt** - Keep with each release for debugging
4. ✅ **Test thoroughly** - Test all features on physical device after obfuscation
5. ✅ **Monitor APK size** - Obfuscation should reduce size by 5-20%
6. ✅ **Use environment variables** - Don't hardcode sensitive keys
7. ✅ **Automate in CI/CD** - Build release APK automatically

---

## Reference

**Android Developer Documentation:**
- https://developer.android.com/build/shrink-code
- https://developer.android.com/build/releases/gradle-plugin

**ProGuard Documentation:**
- https://www.guardsquare.com/manual/configuration/usage

**Gradle Plugin Documentation:**
- https://developer.android.com/studio/build/manifest-build-variables

---

**Last Updated:** May 26, 2026  
**Status:** Reference Documentation
