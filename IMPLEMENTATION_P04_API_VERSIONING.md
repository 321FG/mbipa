# 🔐 P0.4: API Versioning - Implementation & Documentation

**Date:** May 25, 2026  
**Priority:** 🟠 **HIGH** (required before P0.5, improves API stability)  
**Timeline:** 1-2 days  
**Impact:** Seamless API upgrades without breaking client apps  
**Status:** ✅ Code Complete (src/api/versioning.ts)

---

## 📋 Executive Summary

**P0.4 implements API versioning** to allow backend to update endpoints without breaking older client versions. This is critical for long-term maintenance and rolling deployments.

**What this means:**
- All endpoints migrate to `/api/v1/` prefix
- Older clients automatically fallback to `/api/v0/` (legacy)
- Seamless version negotiation and fallback
- Zero downtime deployments possible
- App Store submissions don't require updates for minor backend changes

---

## 🎯 What Gets Versioned

### Versioned Endpoints
```
OLD: /api/chat/tts              → NEW: /api/v1/chat/tts
OLD: /api/chat/stt              → NEW: /api/v1/chat/stt
OLD: /api/chat/ai-response      → NEW: /api/v1/chat/ai-response
OLD: /api/assessments           → NEW: /api/v1/assessments
OLD: /api/sessions              → NEW: /api/v1/sessions
OLD: /api/profile               → NEW: /api/v1/profile
... and all others
```

### Backwards Compatibility
```
App Build 1-N (old):  /api/v0/*  (legacy endpoints)
App Build N+1+ (new): /api/v1/*  (new endpoints with fallback to v0)
```

---

## 🔧 Frontend Implementation

### Step 1: Add Versioning Manager to Store

```typescript
// src/store/index.ts or app initialization

import versioningManager from '@/src/api/versioning';

// Initialize on app startup
export async function initializeApp() {
  await versioningManager.initialize();
  
  // Log version context (for debugging)
  const context = versioningManager.getContext();
  console.log('API Version Context:', context);
  // Output: { appBuildNumber: 123, detectedVersion: 'v1', isLegacyApp: false, ... }
}
```

### Step 2: Integrate into Axios Client

```typescript
// src/api/http.ts

import axios from 'axios';
import versioningManager, { createVersioningInterceptor } from '@/src/api/versioning';

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api.com',
  timeout: 10000
});

// Add versioning interceptor (automatic version negotiation)
createVersioningInterceptor(apiClient);

// Example: All calls automatically get versioned
// Before: POST /api/chat/tts
// After:  POST /api/v1/chat/tts (with automatic fallback to v0 on failure)

export default apiClient;
```

### Step 3: Use in Components (No Changes Needed!)

```typescript
// Your existing code works WITHOUT modification
import apiClient from '@/src/api/http';

// This call automatically routes to /api/v1/chat/tts
const response = await apiClient.post('/api/chat/tts', {
  text: 'Hello',
  lang: 'en'
});

// The versioning manager:
// 1. Detects current app version
// 2. Adds /api/v1/ prefix
// 3. Sends request to /api/v1/chat/tts
// 4. If fails, automatically retries with /api/v0/
// 5. Caches the successful version for future calls
```

---

## 🛠️ Backend Implementation

### Requirements

Your backend must support:

#### 1. Migrate All Endpoints to `/api/v1/`

```
BEFORE:
  POST /api/chat/tts
  POST /api/chat/stt
  GET /api/assessments
  etc.

AFTER:
  POST /api/v1/chat/tts          ← NEW
  POST /api/v1/chat/stt          ← NEW
  GET /api/v1/assessments        ← NEW
  
  POST /api/chat/tts             ← KEEP (legacy route, optional)
  POST /api/chat/stt             ← KEEP (legacy route, optional)
  GET /api/assessments           ← KEEP (legacy route, optional)
```

#### 2. Support Both `/api/v0/` and `/api/v1/` Paths (Recommended)

```csharp
// C#/.NET Example
app.MapPost("/api/v1/chat/tts", TtsHandler);
app.MapPost("/api/v0/chat/tts", TtsHandler);  // Legacy alias

// Or use a router that supports both:
public class ApiRouter
{
    public static void MapVersionedEndpoints(this WebApplication app)
    {
        // V1 endpoints (new)
        app.MapPost("/api/v1/chat/tts", HandleTts);
        app.MapPost("/api/v1/chat/stt", HandleStt);
        
        // V0 endpoints (legacy alias)
        app.MapPost("/api/v0/chat/tts", HandleTts);
        app.MapPost("/api/v0/chat/stt", HandleStt);
    }
}
```

#### 3. Implement Version Header (Optional but Recommended)

```
Request Header (optional):
  X-API-Version: v1
  
Response Header (recommended):
  X-API-Version: v1
  X-Supported-Versions: v0,v1
```

#### 4. Version Negotiation Endpoint (Optional)

```
GET /api/versions

Response:
{
  "supported": ["v0", "v1"],
  "current": "v1",
  "deprecationDate": "2026-12-31",
  "endpoints": {
    "v1": [
      "/api/v1/chat/tts",
      "/api/v1/chat/stt",
      "/api/v1/assessments",
      ...
    ],
    "v0": [
      "/api/v0/chat/tts",
      "/api/v0/chat/stt",
      ...
    ]
  }
}
```

---

## 📊 Frontend-Backend Interaction Flow

```
1. App starts
   ↓
2. versioningManager.initialize()
   - Reads app build number
   - Loads last successful version from cache
   - Determines: isLegacyApp? or use preferred version?
   ↓
3. First API call: POST /api/chat/tts
   ↓
4. Versioning interceptor
   - Reads preferred version from cache (or V1 default)
   - Rewrites URL: /api/chat/tts → /api/v1/chat/tts
   ↓
5. Send request to: POST /api/v1/chat/tts
   ↓
6. Backend processes V1 endpoint
   ↓
7. Success: 200 OK
   ↓
8. Interceptor catches success
   - Cache version: V1 (for next calls)
   - Return response
   ↓
9. Next calls automatically use /api/v1/
```

---

## 🔄 Fallback Handling Flow (If V1 Fails)

```
1. App tries: POST /api/v1/chat/tts
   ↓
2. Error: 404 Not Found / 500 Server Error
   (e.g., backend not yet updated)
   ↓
3. Versioning interceptor detects failure
   - Record error: "V1 failed, reason: 404"
   - Switch to fallback version: V0
   ↓
4. Rewrite URL: /api/v1/chat/tts → /api/v0/chat/tts
   ↓
5. Retry request: POST /api/v0/chat/tts
   ↓
6. Success: Backend responds with V0 endpoint
   ↓
7. Cache fallback version: V0
   ↓
8. All subsequent calls use /api/v0/ until V1 becomes available
```

---

## 📈 Migration Strategy

### Phase 1: Deploy V1 Endpoints (Backend)
```
Timeline: Day 1
- Deploy both /api/v0/* and /api/v1/* endpoints
- Both versions work identically
- No client changes needed yet
- Enable version negotiation endpoint
```

### Phase 2: Update Clients (Frontend)
```
Timeline: Day 2
- Frontend deploys with versioning.ts
- Clients automatically detect and use /api/v1/*
- Fallback to /api/v0/* if needed
- Monitor migration log in console
```

### Phase 3: Monitor Adoption (Ongoing)
```
Timeline: 1+ weeks
- Track version adoption
- Monitor fallback usage
- Identify legacy clients
- Plan deprecation of v0 (in 6+ months)
```

### Phase 4: Deprecate V0 (Eventually)
```
Timeline: 6+ months from now
- Once >95% of users on v1
- Announce v0 deprecation
- Set sunset date (e.g., 6 months)
- Finally remove v0 endpoints
```

---

## 🧪 Testing Versioning

### Scenario 1: Test V1 Endpoint
```
1. Start app normally
2. Open Chat, click audio button
3. In console, should see: "[API Versioning] API call succeeded with v1"
4. Network tab shows: POST /api/v1/chat/tts ✅
```

### Scenario 2: Test Fallback to V0
```
1. Temporarily disable /api/v1/* on backend
2. Start app
3. Open Chat, click audio button
4. Should see fallback message
5. Network tab shows: First POST /api/v1/chat/tts (fails)
6. Then retry with: POST /api/v0/chat/tts (succeeds) ✅
7. Future calls use v0 automatically
```

### Scenario 3: Test Version Caching
```
1. Make successful API call (v1)
2. Check cached version in AsyncStorage: "lastSuccessfulVersion": "v1"
3. Kill and restart app
4. Make another API call
5. Should immediately use v1 (from cache) ✅
```

### Scenario 4: Test Legacy App Build
```
1. Simulate old app build by setting: minBuildNumberForV1 = 1000
2. Current build number < 1000
3. Start app
4. Should detect: "isLegacyApp": true
5. All calls use /api/v0/* ✅
```

---

## 📝 Implementation Checklist

### Frontend Team

- [ ] Review src/api/versioning.ts code
- [ ] Update src/api/http.ts with createVersioningInterceptor()
- [ ] Add versioningManager.initialize() to app startup
- [ ] Test basic versioning (V1 endpoint calls)
- [ ] Test fallback (simulate V1 failure, should fallback to V0)
- [ ] Monitor console logs for version info
- [ ] Check AsyncStorage for cached version
- [ ] Test on physical device (iOS + Android)
- [ ] Deploy to staging
- [ ] Monitor migration log: no excessive fallbacks

### Backend Team

- [ ] Create /api/v1/* routes (all existing endpoints)
- [ ] Test /api/v1/* endpoints in isolation
- [ ] Keep /api/v0/* endpoints running (optional, for compatibility)
- [ ] Implement optional version header in responses
- [ ] Deploy to staging
- [ ] Test both /api/v0/* and /api/v1/* work identically
- [ ] Implement optional /api/versions endpoint
- [ ] Monitor for v0 fallback requests in logs
- [ ] Document version migration plan for future changes

### QA Team

- [ ] Test all features work with /api/v1/*
- [ ] Test fallback works (disable v1, verify v0 used)
- [ ] Test mixed version scenarios (some v1, some v0)
- [ ] Test on devices with varied network conditions
- [ ] Test rapid endpoint calls
- [ ] Verify no sensitive data in version logs

---

## 🔐 Security Considerations

### Do's
✅ Version all API endpoints  
✅ Keep legacy versions running for >6 months  
✅ Log version usage for monitoring  
✅ Use HTTPS for all versions  
✅ Apply same security to all versions (JWT, rate limiting, etc.)

### Don'ts
❌ Don't expose version in error messages to clients  
❌ Don't remove old versions without notice period  
❌ Don't use version as security bypass  
❌ Don't log sensitive data in version logs

---

## 📊 Monitoring & Metrics

### What to Monitor

```javascript
// From versioning context:
{
  appBuildNumber: 123,        // Track user build distribution
  detectedVersion: 'v1',      // Monitor version adoption
  isLegacyApp: false,         // Identify legacy users
  lastSuccessfulVersion: 'v1' // Track fallback usage
}
```

### Log Entries to Track

```
[API Versioning] API call succeeded with v1 (endpoint: /api/chat/tts)
  ↑ Shows successful v1 adoption

[API Versioning] API call failed with v1: 404 Not Found
  ↑ Indicates v1 endpoint down, will fallback to v0

[API Versioning] Migration: v1 → v0 (reason: Failed: 404 Not Found)
  ↑ Shows fallback occurred, track frequency
```

### Recommended Alerts

- [ ] Alert if >5% of requests fallback to v0
- [ ] Alert if v0 endpoint unavailable
- [ ] Alert if v1 endpoint unavailable
- [ ] Monitor: What % of users are on v1 vs v0

---

## 🆘 Troubleshooting

### "All requests falling back to v0"
**Cause:** /api/v1/* endpoints not deployed  
**Fix:** Backend must deploy /api/v1/* endpoints

### "Version context shows isLegacyApp: true but I have latest build"
**Cause:** Build number lower than minBuildNumberForV1  
**Fix:** Increase minBuildNumberForV1 in config or rebuild app with newer build number

### "Version not caching properly"
**Cause:** AsyncStorage permissions issue  
**Fix:** Check AsyncStorage is initialized before versioningManager.initialize()

### "Getting 404 errors with v1"
**Cause:** Backend v1 endpoints not ready  
**Fix:** Verify backend has deployed /api/v1/* routes

---

## 📚 Related Documentation

- `BACKEND_P04_API_VERSIONING_PROMPT.md` — Backend implementation guide
- `SECURITY_HARDENING_P0_COMPREHENSIVE_REPORT.md` — Full P0 context
- `P0_SECURITY_QUICK_REFERENCE.md` — Team coordination

---

## ✅ Success Criteria

✅ All endpoints accessible via both `/api/v0/*` and `/api/v1/*`  
✅ Frontend automatically uses `/api/v1/*` with fallback to v0  
✅ Version caching works (app remembers last successful version)  
✅ Fallback mechanism prevents service disruption  
✅ Monitoring shows >90% adoption of v1 within 1 week  
✅ No service outages during rollout  
✅ Zero breaking changes for legacy apps  

---

## 📈 Timeline

```
Day 1 (Today):
  ✅ Frontend code complete (src/api/versioning.ts)
  ⏳ Backend deploys /api/v1/* endpoints
  
Day 2:
  ✅ Frontend integrates versioning
  ✅ Testing begins
  ⏳ Monitor adoption metrics
  
Week 1:
  ✅ >90% of new users on v1
  ✅ Verify fallback working correctly
  ⏳ Continue monitoring
  
6+ Months:
  ⏳ Plan v0 deprecation
  ⏳ Announce sunset date
```

---

**Status:** 🟢 Frontend Complete, ⏳ Awaiting Backend v1 Deployment

**Next Step:** Backend team implements /api/v1/* endpoints and tests both v0/v1 work identically.
