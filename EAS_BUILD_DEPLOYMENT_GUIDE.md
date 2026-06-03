# EAS Build & Deployment Guide

**Project**: Mbipa App (React Native with Expo)  
**Account**: @juliuschrys07  
**Last Updated**: May 25, 2026

---

## Quick Reference: Latest Build (May 25, 2026)

### Build Information (LATEST - Error Boundary - Both Formats)

- **Build Message**: "Fresh build with both APK and AAB formats - error boundary fixes"
- **Build Date**: May 25, 2026
- **Changes Deployed**:
  - ✅ Global error boundary for 404/500/offline errors
  - ✅ Fallback UI for network errors with "check internet" message
  - ✅ Fixed i18n hook dependency issue (error boundary now works without translation provider)
  - ✅ Simple retry button and support contact link

### Download Links

#### Android APK v3 (Direct Install - Ready Now ✅)

**Status**: ✅ READY FOR DOWNLOAD & TEST

- **Build ID**: `36cd4e08-6f2a-44a4-a9e8-95350ccaee1b`
- **versionCode**: 3
- **Build Link**: https://expo.dev/accounts/juliuschrys07/projects/mbipa-app/builds/36cd4e08-6f2a-44a4-a9e8-95350ccaee1b
- **Installation Method 1 (QR/Link)**: 
  - Open build link on Android device → Tap download → Install APK
- **Installation Method 2 (ADB)**:
  - Download APK from build page
  - Connect Android phone via USB
  - Run: `adb install mbipa-preview.apk`
- **Installation Method 3 (Direct File)**:
  - Download APK file
  - Copy to Android phone
  - Open file manager → Tap APK → Install

#### Android App Bundle v4 (Play Store - Ready ✅)

**Status**: ✅ READY FOR DOWNLOAD & PLAY STORE

- **Build ID**: `3eb95371-0b5b-496c-a6fd-dec2be202140`
- **versionCode**: 4
- **AAB Download**: https://expo.dev/artifacts/eas/8KeA3gMKWJeBJyX9KzPhp3.aab
- **Build Logs**: https://expo.dev/accounts/juliuschrys07/projects/mbipa-app/builds/3eb95371-0b5b-496c-a6fd-dec2be202140
- **Profile**: production (AAB format)
- **Installation**:
  - Download from link above
  - Use: `adb install-multiple [file].aab` on connected Android device
  - Or upload directly to Google Play Store for distribution

#### iOS Build

**Status**: Skipped (for this iteration - test Android first)

- To build iOS: Run `eas build --platform ios` and provide Apple Developer credentials

#### OTA Update (Over-the-Air)

**Status**: Available on production channel

- **Production Channel**: https://expo.dev/accounts/juliuschrys07/projects/mbipa-app/updates
- **Channel**: `production`
- **Message**: "Therapist page i18n support and improved chat bubble layout"
- **Update Auto-Distribution**: Users with existing app will receive this update automatically

---

## How to Deploy (Full Workflow)

### Prerequisites

```bash
npm install -g eas-cli
# Verify: eas --version
```

### Step 1: Make Code Changes

All code changes should be made and tested locally with:

```bash
npx expo start -c --tunnel
```

### Step 2: Run EAS Build

#### For Android Only (Faster Testing)

```bash
eas build --platform android --message "Your deployment message here"
```

#### For Both iOS & Android (Full Release)

```bash
eas build --platform all --message "Your deployment message here"
```

#### For Preview/Development Channel

```bash
eas build --platform android --profile preview
```

### Step 3: Wait for Build Completion

- EAS will compile the app (~10-15 minutes for Android)
- You can track progress at: https://expo.dev/accounts/juliuschrys07/projects/mbipa-app/builds
- Check terminal output for build ID and links

### Step 4: Test Build

Once complete, you'll get:

- **APK Link**: Download and install on Android device
- **OTA Update Link**: Available immediately on configured update channel
- **iOS Link**: (if built) Available for TestFlight or direct installation

### Step 5: Publish OTA Update (Optional - for Live Updates)

```bash
eas update --message "Your update message" --branch production
```

---

## Understanding the Build Output

### Key Information to Note:

```
✔ Incremented versionCode from X to Y.                    # Android version bump
√ Created update channel "production" and branch          # OTA channel created
✔ Computed project fingerprint                           # Build configuration hash
See logs: https://expo.dev/.../builds/[BUILD_ID]         # Build ID for tracking

Waiting for build to complete...
[After completion]
√ Build finished: https://expo.dev/artifacts/eas/[ID].apk
```

### Build Status Meanings:

- **In progress**: Building (10-15 min typical)
- **Finished**: Ready to download/test
- **Failed**: Check build logs for errors
- **Errored**: Contact EAS support if persistent

---

## Installation Methods

### Method 1: Direct APK Installation

```bash
# Download APK from link
adb install path/to/mbipa-app.apk

# Or use Expo Go
expo install  # Not recommended for production
```

### Method 2: OTA Update (Live on App)

- Users with the app installed automatically receive updates
- No re-installation needed
- Updates appear within minutes of publishing

### Method 3: TestFlight (iOS)

- Requires Apple Developer account
- Share TestFlight link with testers
- Automatic installation on iOS devices

---

## Rollback & Version History

### View Previous Builds

```bash
eas build:list --platform android
```

### View OTA Update History

```bash
eas update:list --branch production
```

### Rollback to Previous Update

```bash
eas update:rollback --branch production --message "Rollback: [reason]"
```

---

## Troubleshooting

### Build Fails

1. Check logs: `eas build:log --build-id [BUILD_ID]`
2. Clear cache: `npx expo start -c`
3. Verify `eas.json` and `app.json` are configured correctly

### APK Won't Install

- Check Android version compatibility (min API level)
- Uninstall previous version first
- Try: `adb install -r path/to/apk` (force replace)

### OTA Update Not Appearing

- Force quit and restart app
- Check update channel configuration: `eas update:configure`
- Verify app version matches build target

### Apple Developer Credentials Issues

- Run: `eas credentials`
- Reconfigure: `eas credentials --platform ios`
- Use Apple app-specific passwords, not main account password

---

## Important Configuration Files

### `eas.json` (Build Configuration)

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### `app.json` (Expo Configuration)

- Contains app name, version, Android/iOS configs
- Update `version` and `versionCode`/`buildNumber` here before major releases

### `.env` or Environment Variables

- Store API keys, Firebase config, etc.
- Reference in build with: `eas update --env-file .env.production`

---

## Channel & Branch Management

### Update Channels

```bash
# List all channels
eas channel:list

# Create new channel
eas channel:create --channel development

# Publish to specific channel
eas update --channel development
```

### Branches

```bash
# List branches
eas branch:list

# Create promotion branch (staging → production)
eas branch:create staging
eas update --branch staging
# Then promote: eas update:republish --source production --branch staging
```

---

## Best Practices

### ✅ DO:

- Use descriptive commit messages for each build
- Test APK on real devices before OTA deployment
- Keep `app.json` version in sync with Git tags
- Use update channels for staged rollouts (dev → staging → production)
- Document breaking changes in commit message

### ❌ DON'T:

- Deploy without testing locally first
- Use same build for multiple environments
- Forget to increment version numbers
- Push incompatible SDK versions
- Ignore build warnings/errors

---

## Quick Commands Reference

```bash
# Start local dev server
npx expo start -c --tunnel

# Build Android only
eas build --platform android --message "[msg]"

# Build iOS only
eas build --platform ios --message "[msg]"

# Build both
eas build --platform all --message "[msg]"

# Publish OTA update
eas update --message "[msg]" --branch production

# Check build status
eas build:list --platform android

# View update history
eas update:list --branch production

# Rollback update
eas update:rollback --branch production

# Clear local Expo cache
expo prebuild --clean
npx expo start -c
```

---

## Build Version History

### All Builds (Recent)

| Date         | Build ID                               | Version | Format | Status      | Key Changes                                  | Download |
| ------------ | -------------------------------------- | ------- | ------ | ----------- | -------------------------------------------- | --------- |
| May 25, 2026 | `3eb95371-0b5b-496c-a6fd-dec2be202140` | v4      | AAB    | ✅ Complete | Error boundary, fallback UI, i18n fix       | [AAB](https://expo.dev/artifacts/eas/8KeA3gMKWJeBJyX9KzPhp3.aab) |
| May 25, 2026 | `36cd4e08-6f2a-44a4-a9e8-95350ccaee1b` | v3      | APK    | ✅ Complete | Global error boundary, fallback UI, i18n fix | [Build Link](https://expo.dev/accounts/juliuschrys07/projects/mbipa-app/builds/36cd4e08-6f2a-44a4-a9e8-95350ccaee1b) |
| May 25, 2026 | `c082b27f-7a84-480a-9797-ac9a96c81abb` | v3      | AAB    | ✅ Complete | Therapist page i18n, chat consolidation      | [AAB](https://expo.dev/artifacts/eas/pLM5GJbn2J3JN9biA1CDD6.aab) |

### APK vs AAB: Which Should I Use?

| Aspect             | APK                            | AAB                              |
| ------------------ | ------------------------------ | -------------------------------- |
| **Installation**   | Direct on phone/adb            | Google Play only, auto-optimized |
| **File Size**      | Smaller, single download       | Optimized per device             |
| **Testing**        | ✅ Best for local testing      | For Play Store distribution      |
| **Use Case**       | Beta testing, dev distribution | Production/Play Store            |
| **Device Support** | Must match exact device config | Auto-adjusted by Play Store      |

**Recommendation**:

- **APK**: Use for internal testing and development
- **AAB**: Use for Google Play Store distribution

---

## Emergency Contacts & Resources

- **Expo Documentation**: https://docs.expo.dev/
- **EAS Build Docs**: https://docs.expo.dev/eas-update/introduction/
- **Expo Discord**: https://discord.gg/expo
- **Build Logs**: https://expo.dev/accounts/juliuschrys07/projects/mbipa-app/builds
- **Updates Dashboard**: https://expo.dev/accounts/juliuschrys07/projects/mbipa-app/updates

---

## Version History

| Date         | Version       | Platform | Changes                           | Status      | Build ID                             | Download                                                         |
| ------------ | ------------- | -------- | --------------------------------- | ----------- | ------------------------------------ | ---------------------------------------------------------------- |
| May 25, 2026 | versionCode 3 | Android  | Therapist i18n, Chat improvements | ✅ Complete | c082b27f-7a84-480a-9797-ac9a96c81abb | [AAB](https://expo.dev/artifacts/eas/pLM5GJbn2J3JN9biA1CDD6.aab) |
| [Previous]   | versionCode 2 | Both     | [Previous changes]                | Complete    | —                                    | —                                                                |

---

**Last Build ID**: `c082b27f-7a84-480a-9797-ac9a96c81abb`  
**Last Build Date**: May 25, 2026  
**Last Android Artifact**: `pLM5GJbn2J3JN9biA1CDD6`
