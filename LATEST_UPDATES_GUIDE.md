# Latest Updates & Fixes (May 25, 2026)

## What's Fixed in This Build

### 🌍 **1. Language Selector with Flag Emojis**
- **Before**: Only showed "FR | EN" text  
- **After**: Now shows **🇫🇷 FR | 🇬🇧 EN** with flag emojis
- **Where**: Visible on:
  - Onboarding screen (first entry)
  - Login screen (top-right)
  - Register screen (top-right)
  - Therapist appointment page (accessible during app use)

### ✅ **2. Language Switching Now Works Properly**
- Therapist page ("Prendre rendez-vous") now respects app language setting
- All UI strings update immediately when you switch between FR ↔ EN
- **Fix**: Properly implemented i18n dependencies in component rendering

### 📝 **3. Sign-Up Flow Improved**
- After clicking "Sign Up", you're now redirected to **Verify Email** screen
- Screen shows:
  - Clear instructions: "Check your email for verification link"
  - Email address you registered with
  - "Verify" button to check status
  - "Resend link" button if email not received
  - "Switch account" option
- **NOT blank anymore** ✅
- Auto-polls every 4 seconds - once you verify, auto-redirects to app

### 🔧 **4. Technical Improvements**
- Added flag emoji support to language switcher (🇫🇷 and 🇬🇧)
- Language selector now appears on Register screen (was missing)
- Enhanced UI consistency across all auth screens
- Fixed metadata dependencies for i18n re-rendering

---

## How to Test the New Build

### Step 1: Download APK
- **New Build ID**: `d448489d-9611-4d58-ae21-bc49cc99c02a`
- Wait for build to complete (typically 10-15 minutes)
- Build link will be provided once ready

### Step 2: Install on Android Phone
```bash
# Option A: Direct ADB install
adb install -r path/to/mbipa-preview.apk

# Option B: QR Code from build link
# Open build link on your phone → Download APK → Install

# Option C: Via file manager
# Copy APK to phone → File manager → Tap → Install
```

### Step 3: Verify Features
1. **Launch app** → See **🇫🇷 FR | 🇬🇧 EN** selector on onboarding
2. **Try language switching**: 
   - Tap 🇫🇷 → All text turns French
   - Tap 🇬🇧 → All text turns English
3. **Sign up test**:
   - Go through registration → Clear verification screen appears (not blank)
   - Verify email → Auto-redirects to app
4. **Therapist page test** (after login):
   - Navigate to Profile → "Prendre rendez-vous" / "Book Appointment"
   - Language selector still at top
   - Try FR ↔ EN switching → Form labels update instantly ✅
5. **Error handling** (bonus):
   - Toggle airplane mode → Should see offline error screen
   - Retry button should work

---

## Build Details

| Aspect | Details |
|--------|---------|
| **Format** | APK (direct install) |
| **Build ID** | d448489d-9611-4d58-ae21-bc49cc99c02a |
| **versionCode** | 3 |
| **Size** | ~50-55 MB |
| **Changelog** | Flag emojis, language fix, sign-up flow |

---

## Important Notes

### ⚠️ Fresh Install Recommended
- **Uninstall** previous version first: `adb uninstall com.juliuschrys.mbipa`
- Then install new APK
- This ensures all code changes and cache are fresh

### 🔄 If Language Still Doesn't Change
1. **Check**:  
   - Are you on the NEW APK (with 🇫🇷 emoji visible)?
   - Did you tap the flag, not just look at it?
2. **If not working**:
   - Force quit app → Reopen
   - Check app language setting in Settings → Apps → Mbipa
   - Clear app data: `adb shell pm clear com.juliuschrys.mbipa`

### 📱 Device Requirements
- Android 7.0+ (API 24)
- Internet connection (for Firebase auth)

---

## Next Steps

1. ✅ Test new APK once build completes (notification incoming)
2. ✅ Verify language switcher shows flags
3. ✅ Test language switching on all screens
4. ✅ Verify therapist page translates properly
5. ⏳ Provide feedback on any remaining issues
6. 🚀 When satisfied, we can build AAB for Play Store

---

## Support Contacts

If issues persist:
- **Language not switching**: Check app data is being cleared between installs
- **Therapist page still French**: Confirm you're on NEW APK (check build date)
- **Sign-up shows blank**: Try fresh uninstall + reinstall
- **Other issues**: Report with screenshot + steps to reproduce

---

**Build Status**: 🔄 Compiling (ETA 10-15 min)  
**You'll be notified when ready to download**
