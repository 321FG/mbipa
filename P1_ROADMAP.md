# P1 Implementation Roadmap

**Phase:** Highly Recommended Security Hardening (Before App Store Submission)  
**Estimated Duration:** 4-5 days  
**Status:** 🟠 Starting  
**Target Completion:** May 27-29, 2026

---

## 📋 P1 Items Overview

| Item | Title | Estimation | Risk | Priority |
|------|-------|------------|------|----------|
| **P1.1** | ProGuard/R8 (Android Code Obfuscation) | 1 day | HIGH | 🔴 Critical |
| **P1.2** | Jailbreak/Root Detection | 4 hours | MEDIUM | 🟠 High |
| **P1.3** | Rate Limiting (API + Auth) | 1 day | HIGH | 🔴 Critical |
| **P1.4** | Log Audit & Structured Logging (Sentry) | 1 day | MEDIUM | 🟠 High |
| **P1.5** | Firebase Security Rules Audit | 4 hours | HIGH | 🔴 Critical |

**Total: 4-5 days, 5 items**

---

## 🚀 P1.1 - ProGuard/R8 Android Code Obfuscation

**Why:** Prevent reverse engineering of Android APK. App Store requires this for production apps with sensitive logic.

**What:**
```gradle
buildTypes {
  release {
    minifyEnabled true
    shrinkResources true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
  }
}
```

**Tasks:**
- [ ] Enable R8/ProGuard in `build.gradle` (release config)
- [ ] Create `proguard-rules.pro` with library-specific rules
  - Firebase rules
  - Stripe rules
  - SignalR rules
  - Redux rules
  - React Native rules
- [ ] Test debug build (unobfuscated) vs release (obfuscated)
- [ ] Verify APK size reduction
- [ ] Test end-to-end on physical Android device

**Files to Modify:**
- `android/app/build.gradle` - Enable minify + R8
- `android/app/proguard-rules.pro` - Custom rules (new file)

**Validation:**
- ProGuard enabled in release builds
- Mapping file generated (`app-release-mapping.txt`)
- APK successfully obfuscated (verify with apktool)

---

## 🚀 P1.2 - Jailbreak/Root Detection

**Why:** Prevent app running on rooted/jailbroken devices (bypass authentication, install malware).

**What:**
```typescript
import RootDetect from 'react-native-root-detect';

const checkDeviceSecurity = async () => {
  const isRooted = await RootDetect.isDeviceRooted();
  if (isRooted) {
    showWarning("Your device appears to be rooted/jailbroken");
    // Block or warn
  }
};
```

**Tasks:**
- [ ] Install package: `react-native-root-detect` or `react-native-jailbreak-detect`
- [ ] Create security module: `src/utils/device-security.ts`
- [ ] Implement `checkRootedDevice()` function
- [ ] Call on app startup (check in `app/_layout.tsx`)
- [ ] Show warning or block access based on policy
- [ ] Test on physical rooted/jailbroken device (or emulator)

**Files to Create/Modify:**
- `src/utils/device-security.ts` - New module
- `app/_layout.tsx` - Call security check on startup
- `package.json` - Add dependency

**Validation:**
- [ ] Root detection works on test device
- [ ] App behavior correct on rooted device (warn/block)
- [ ] App behavior normal on clean device

---

## 🚀 P1.3 - Rate Limiting (Backend + Frontend)

**Why:** Prevent brute force attacks on login, password reset, contact form, etc.

**Frontend:**
```typescript
// Disable button for N seconds after attempt
const [loginAttempts, setLoginAttempts] = useState(0);
const [cooldownSeconds, setCooldownSeconds] = useState(0);

const handleLogin = async () => {
  if (cooldownSeconds > 0) return; // Block if in cooldown
  setLoginAttempts(prev => prev + 1);
  setCooldownSeconds(600); // 10 minutes
  // ... login logic
};
```

**Backend (Node.js + Express):**
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, try again later'
});

app.post('/api/v1/auth/login', loginLimiter, (req, res) => {
  // ... login logic
});
```

**Tasks:**

**Frontend:**
- [ ] Create `src/utils/rate-limiting.ts` 
- [ ] Implement cooldown tracking per endpoint
- [ ] Disable buttons during cooldown
- [ ] Show countdown timer to user
- [ ] Persist cooldown state to AsyncStorage (survive app restart)

**Backend:**
- [ ] Install `express-rate-limit` package
- [ ] Configure for `/api/v1/auth/login` (5 attempts / 10 min)
- [ ] Configure for `/api/v1/auth/register` (3 attempts / 10 min)
- [ ] Configure for password reset (3 attempts / 30 min)
- [ ] Configure for contact form (5 attempts / 1 hour)
- [ ] Log rate limit violations to monitoring system

**Validation:**
- [ ] Frontend: Button disabled during cooldown
- [ ] Frontend: Countdown timer shown to user
- [ ] Backend: 5+ login attempts → 429 Too Many Requests
- [ ] Backend: Cooldown lasts 10 minutes
- [ ] Backend: Different limits per endpoint

---

## 🚀 P1.4 - Log Audit & Structured Logging

**Why:** Prevent leaking secrets in logs. Production logs should be structured + monitored.

**Current Issues:**
- [ ] Verify no `idToken`, `password`, `apiKey` logged
- [ ] Verify no `console.log()` in production
- [ ] Verify no sensitive data in Redux logs

**Tasks:**

**Audit Phase:**
- [ ] Search codebase for `console.log`, `console.warn`, `console.error`
- [ ] Identify what's logged (check for tokens, passwords, emails)
- [ ] Remove/redact sensitive data from logs

**Implementation:**
- [ ] Install Sentry (crash reporting + error tracking)
- [ ] Configure Sentry in app startup (`app/_layout.tsx`)
- [ ] Replace `console.log()` with Sentry logging
- [ ] Disable console in production: `__DEV__ ? console.log : noop`
- [ ] Set up Sentry dashboard for team alerts
- [ ] Configure environment tags (dev/staging/prod)

**Files:**
- `src/utils/logger.ts` - New logging utility
- `src/services/sentry-config.ts` - New Sentry config
- `app/_layout.tsx` - Initialize Sentry on startup

**Validation:**
- [ ] No sensitive data in logs
- [ ] `console.log()` disabled in production
- [ ] Sentry integration working
- [ ] Errors appear in Sentry dashboard within 5 seconds

---

## 🚀 P1.5 - Firebase Security Rules Audit

**Why:** Prevent unauthorized read/write to Firestore. Rules must enforce authentication + user partitioning.

**Current Rules Checklist:**
- [ ] All collections require authenticated user
- [ ] Data partitioned by `uid` (users can only read/write own data)
- [ ] No public read/write rules
- [ ] Sensitive fields protected (role, admin flags, etc.)
- [ ] Batch write limits enforced

**Tasks:**
- [ ] Review `firestore.rules` file
- [ ] Verify auth rules: `allow read/write: if request.auth.uid != null;`
- [ ] Verify user partition: `allow read: if resource.data.uid == request.auth.uid;`
- [ ] Test with Firebase Emulator Suite
- [ ] Deploy updated rules to Firebase Console
- [ ] Document rule strategy in FIREBASE_SECURITY_RULES.md

**Example Rule:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      // Only authenticated users can read/write own document
      allow read, write: if request.auth.uid == uid;
    }
    
    match /chat/{document=**} {
      // Only authenticated users can access
      allow read, write: if request.auth != null;
    }
  }
}
```

**Validation:**
- [ ] Firestore rules syntax correct
- [ ] All collections require auth
- [ ] User data properly partitioned by `uid`
- [ ] Firebase Emulator tests pass
- [ ] Rules deployed to production

---

## 📦 Dependencies to Install

```bash
npm install --save \
  react-native-root-detect \
  express-rate-limit \
  @sentry/react-native \
  @sentry/tracing
```

---

## 🧪 Validation Strategy

**Test Scripts:**
1. `scripts/validate-p11.js` - ProGuard configuration
2. `scripts/validate-p12.js` - Jailbreak detection module
3. `scripts/validate-p13.js` - Rate limiting implementation
4. `scripts/validate-p14.js` - Log audit + Sentry
5. `scripts/validate-p15.js` - Firebase security rules
6. `scripts/validate-p1-integration.js` - All P1 items together

---

## 🎯 Success Criteria

✅ **P1.1:** Android APK obfuscated, can't be decompiled to readable code  
✅ **P1.2:** Root detection works, app warns on rooted device  
✅ **P1.3:** Rate limiting enforced, 5+ attempts → cooldown for 10 minutes  
✅ **P1.4:** No sensitive data in logs, Sentry reporting errors  
✅ **P1.5:** Firestore rules authenticated + partitioned by user  

**Overall:** All 5 P1 items implemented + validated before TestFlight

---

## 📅 Timeline

| Day | Tasks | Status |
|-----|-------|--------|
| **May 26 (Today)** | Planning + P1.1 setup | 🟠 In Progress |
| **May 27** | P1.1 + P1.2 + P1.3 | ⏳ Not Started |
| **May 28** | P1.4 + P1.5 | ⏳ Not Started |
| **May 29** | Testing + validation | ⏳ Not Started |

---

## 🚀 Ready to Start?

**Next Step:** Choose priority order:
1. **Option A (Critical First):** P1.1 → P1.3 → P1.5 → P1.2 → P1.4
2. **Option B (Sequential):** P1.1 → P1.2 → P1.3 → P1.4 → P1.5
3. **Option C (Quick Wins):** P1.2 → P1.5 → P1.4 → P1.1 → P1.3

**Recommendation:** Option A (critical security items first)

Which would you like to start with? **P1.1, P1.2, P1.3, P1.4, or P1.5?**
