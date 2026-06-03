# Backend Security Changes - P0.1 (API Keys Migration)

**Status:** Planning phase - NO CHANGES MADE YET  
**Date:** May 25, 2026  
**Priority:** CRITICAL

---

## Overview

Frontend is currently exposing sensitive API keys in compiled bundles:
- `EXPO_PUBLIC_AZURE_SPEECH_KEY` (Azure Speech Service)
- `EXPO_PUBLIC_FIREBASE_API_KEY` (Firebase - partially acceptable, but can be restricted)
- `AZURE_OPENAI_KEY` (Azure OpenAI - in .env only, but not secure)

**Solution:** Create proxy endpoints in backend that:
1. Accept requests from mobile app
2. Attach sensitive keys server-side
3. Forward to Azure/Firebase services
4. Return results to app

---

## Backend Endpoints Required

### 1. Speech Synthesis Proxy
```
POST /api/speech/synthesize
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

Request:
{
  "text": "Hello world",
  "language": "en-US",
  "voice": "en-US-AriaNeural"
}

Response:
{
  "success": true,
  "audioUrl": "https://signed-cdn-url/audio.wav",
  "duration": 2.5,
  "format": "audio/wav"
}

Error Response:
{
  "success": false,
  "error": "Synthesis failed"
}
```

**Backend Implementation:**
- Use `AZURE_SPEECH_KEY` (private, server-side only)
- Call Azure Cognitive Services Speech API
- Stream/cache audio on backend or signed CDN URL
- Never send Azure key to frontend
- Require JWT authentication

---

### 2. OpenAI Chat Proxy
```
POST /api/chat/ai-response
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

Request:
{
  "message": "Tell me about anxiety management",
  "conversationId": "uuid",
  "language": "en"
}

Response:
{
  "success": true,
  "response": "...",
  "tokens": {
    "prompt": 45,
    "completion": 120,
    "total": 165
  }
}

Error Response:
{
  "success": false,
  "error": "API call failed"
}
```

**Backend Implementation:**
- Use `AZURE_OPENAI_KEY` + `AZURE_OPENAI_ENDPOINT` (private, server-side only)
- Call Azure OpenAI API
- Implement token limiting per user/day
- Log API usage for cost tracking
- Require JWT authentication

---

### 3. Firebase Auth Token Exchange (Optional Enhancement)
```
POST /api/auth/firebase-token
Content-Type: application/json

Request:
{
  "customToken": "Firebase custom token from backend"
}

Response:
{
  "idToken": "...",
  "refreshToken": "..."
}
```

**Note:** Firebase API key is partially acceptable being public (by Firebase design), but can be further restricted via:
- API Key restrictions in Firebase Console
- Allow only specific Firestore rules
- Restrict to Android/iOS bundle IDs

---

## Migration Path (Non-Destructive)

### Step 1: Deploy New Backend Endpoints
- [ ] Implement `/api/speech/synthesize`
- [ ] Implement `/api/chat/ai-response`
- [ ] Add JWT auth middleware
- [ ] Add rate limiting

### Step 2: Update Frontend to Use Proxies
- [ ] Modify `src/services/speech.ts` to call `/api/speech/synthesize`
- [ ] Modify chat service to call `/api/chat/ai-response`
- [ ] Keep old code as fallback initially

### Step 3: Deprecate Direct Key Usage
- [ ] Remove `EXPO_PUBLIC_AZURE_SPEECH_KEY` from .env (gradually)
- [ ] Remove Azure Speech direct calls from frontend
- [ ] Remove `EXPO_PUBLIC_AZURE_SPEECH_KEY` from app.json plugins if any

### Step 4: Cleanup
- [ ] Remove unused keys from .env.example
- [ ] Update documentation
- [ ] Monitor for errors in production

---

## Security Improvements

**Before:**
```
Frontend app → [exposed key] → Azure API
Risk: Decompiled APK exposes key, unauthorized API calls, cost abuse
```

**After:**
```
Frontend app → [JWT token] → Backend → [server-side key] → Azure API
Risk: Only authorized users can access, rate limited, cost controlled
```

---

## Timeline

- **Week 1:** Implement backend endpoints (3-4 days)
- **Week 2:** Update frontend code + testing (2-3 days)
- **Week 3:** Gradual rollout + monitoring (5 days)

---

## Testing Checklist

- [ ] Backend endpoints accessible and authenticated
- [ ] Speech synthesis works through proxy
- [ ] AI chat works through proxy
- [ ] Rate limiting active
- [ ] Logs show correct API usage
- [ ] Frontend handles timeouts gracefully
- [ ] Fallback mechanism works if proxy fails

---

## Rollback Plan

If issues occur:
1. Keep old direct API calls in frontend code (commented)
2. Have emergency bypass in .env
3. Gradual traffic switch between old/new
4. No abrupt cutoffs

---

**Next Step:** Await backend team confirmation of implementation plan
