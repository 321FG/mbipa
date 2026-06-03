# 🔧 Backend Implementation Guide - P0.1 Security Hardening

**For:** Backend Development Team  
**Date:** May 25, 2026  
**Priority:** 🔴 **CRITICAL** (blocks app store submission)  
**Timeline:** 1-2 days  

---

## 📋 Executive Summary

Your frontend team has completed **P0.1 (API Key Migration)** on their side. Your job is to implement 2 secure backend endpoints that will handle Text-to-Speech (TTS) and Speech-to-Text (STT) requests **without exposing Azure API keys to the frontend**.

**What you're building:** A security proxy layer that keeps Azure credentials safe on the backend.

---

## 🎯 What Needs to Be Built

### Endpoint 1: TTS (Text-to-Speech) Proxy

```
POST /api/chat/tts
```

**Purpose:** Convert text to audio speech, using Azure Cognitive Services on backend

**Request Headers:**
```json
{
  "Authorization": "Bearer {JWT_TOKEN}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "text": "Hello, how can I help you?",
  "lang": "en-US",           // BCP-47 language code
  "voiceGender": "female",   // "male" or "female"
  "character": "bagaza",     // Optional: voice character/name
  "rate": 1.0                // Optional: speech rate (0.5 to 2.0)
}
```

**Response:**
```
Status: 200 OK
Content-Type: audio/mpeg
Body: MP3 audio file (binary)
```

**Error Responses:**
```json
// Invalid JWT
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or missing JWT token"
}

// Invalid text/language
{
  "status": 400,
  "error": "Bad Request",
  "message": "Text is required and must be under 1000 characters"
}

// Azure service error
{
  "status": 503,
  "error": "Service Unavailable",
  "message": "Azure Speech Services temporarily unavailable"
}
```

**Azure Integration:**
```csharp
// Use Azure SDK (C#/.NET example)
using Microsoft.CognitiveServices.Speech;

var speechConfig = SpeechConfig.FromSubscription(
    AZURE_SPEECH_KEY,      // Keep on backend, NEVER expose to frontend
    AZURE_SPEECH_REGION    // e.g., "eastus"
);

// Configure voice based on language and gender
speechConfig.SpeechSynthesisVoiceName = "en-US-AriaNeural"; // Example
// Or map from request: `${lang}-${character}Neural` pattern

using (var synthesizer = new SpeechSynthesizer(speechConfig, AudioConfig.FromDefaultSpeakerOutput()))
{
    var result = await synthesizer.SpeakTextAsync(text);
    // Return result as MP3 binary
}
```

---

### Endpoint 2: STT (Speech-to-Text) Proxy

```
POST /api/chat/stt
```

**Purpose:** Convert audio to text, using Azure Cognitive Services on backend

**Request Headers:**
```json
{
  "Authorization": "Bearer {JWT_TOKEN}",
  "Content-Type": "multipart/form-data"
}
```

**Request Body (multipart/form-data):**
```
Field: audio
Type: File (binary)
Format: WAV or MP3
Max Size: 50MB
```

**Query Parameters (optional):**
```
?lang=en-US      // Language code (default: en-US)
&confidence=true // Include confidence score (default: false)
```

**Response:**
```json
{
  "text": "Hello, can you help me?",
  "confidence": 0.92,     // 0.0 to 1.0 (if requested)
  "language": "en-US",
  "duration_ms": 2340
}
```

**Error Responses:**
```json
// Invalid JWT
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or missing JWT token"
}

// No audio file
{
  "status": 400,
  "error": "Bad Request",
  "message": "Audio file is required"
}

// File too large
{
  "status": 413,
  "error": "Payload Too Large",
  "message": "Audio file must be under 50MB"
}

// Azure service error
{
  "status": 503,
  "error": "Service Unavailable",
  "message": "Azure Speech Services temporarily unavailable"
}
```

**Azure Integration:**
```csharp
// Use Azure SDK (C#/.NET example)
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;

var speechConfig = SpeechConfig.FromSubscription(
    AZURE_SPEECH_KEY,      // Keep on backend, NEVER expose
    AZURE_SPEECH_REGION
);

speechConfig.SpeechRecognitionLanguage = lang;

using (var audioConfig = AudioConfig.FromWavFileInput(audioFilePath))
{
    using (var recognizer = new SpeechRecognizer(speechConfig, audioConfig))
    {
        var result = await recognizer.RecognizeOnceAsync();
        
        if (result.Reason == ResultReason.RecognizedSpeech)
        {
            return new {
                text = result.Text,
                confidence = result.Properties.GetProperty("ConfidenceScore") ?? "N/A"
            };
        }
    }
}
```

---

## 🔐 Security Requirements

### 1. JWT Authentication
- **Every request** must include valid JWT in `Authorization: Bearer {token}` header
- JWT should be issued by Firebase Auth (frontend gets this token from Firebase)
- Verify JWT signature on backend
- Extract user ID from JWT for logging/auditing

### 2. API Key Management
```
❌ NEVER expose AZURE_SPEECH_KEY to frontend
❌ NEVER log the API key
❌ NEVER return the API key in any response

✅ Store AZURE_SPEECH_KEY in secure backend storage:
   - Environment variables (development)
   - Azure Key Vault (production) ← RECOMMENDED
   - Secrets Manager (production alternative)
   - .env file (development only, NEVER commit to git)
```

### 3. Rate Limiting
```csharp
// Implement rate limiting per user
// Example: 100 TTS requests per hour, 50 STT requests per hour
// Use Redis or in-memory cache to track usage

var userKey = $"rate_limit:{userId}:{endpoint}";
var currentUsage = await cache.GetAsync(userKey) ?? 0;

if (currentUsage >= MAX_REQUESTS)
{
    return 429 Too Many Requests; // Prevent abuse
}

await cache.IncrementAsync(userKey, TimeSpan.FromHours(1));
```

### 4. Input Validation
```csharp
// TTS Endpoint
if (string.IsNullOrEmpty(request.text) || request.text.Length > 1000)
    return 400 Bad Request;

if (string.IsNullOrEmpty(request.lang))
    request.lang = "en-US"; // Default

if (request.voiceGender != "male" && request.voiceGender != "female")
    return 400 Bad Request;

// STT Endpoint
if (!uploadedFile.ContentType.Contains("audio"))
    return 400 Bad Request;

if (uploadedFile.Length > 50 * 1024 * 1024) // 50MB
    return 413 Payload Too Large;
```

### 5. Error Handling
```csharp
// Don't expose sensitive information in error messages
try
{
    // Azure call
}
catch (Exception ex)
{
    logger.LogError(ex, "Azure service error"); // Log full error internally
    
    // Return generic error to client
    return new {
        status = 503,
        error = "Service Unavailable",
        message = "Speech service temporarily unavailable" // Generic message
    };
}
```

---

## 📝 Implementation Checklist

### Step 1: Set Up Environment
- [ ] Store `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` securely
- [ ] Add Azure SDK NuGet packages:
  ```
  Microsoft.CognitiveServices.Speech
  ```
- [ ] Set up JWT verification middleware (Firebase)

### Step 2: Create TTS Endpoint
- [ ] Create `POST /api/chat/tts` route
- [ ] Validate JWT token
- [ ] Validate request body (text, language, gender)
- [ ] Implement rate limiting
- [ ] Call Azure Speech Services
- [ ] Return MP3 audio file
- [ ] Add error handling
- [ ] Add logging (user ID, timestamp, not API key)

### Step 3: Create STT Endpoint
- [ ] Create `POST /api/chat/stt` route
- [ ] Validate JWT token
- [ ] Validate uploaded audio file
- [ ] Implement rate limiting
- [ ] Call Azure Speech Services
- [ ] Return JSON response with transcription
- [ ] Add confidence score (if supported)
- [ ] Add error handling
- [ ] Add logging (user ID, timestamp, not API key)

### Step 4: Security Hardening
- [ ] Verify API keys are NOT hardcoded
- [ ] Verify API keys are NOT logged
- [ ] Verify JWT is required on all requests
- [ ] Implement rate limiting per user
- [ ] Add input validation
- [ ] Test with invalid JWT (should return 401)
- [ ] Test with missing JWT (should return 401)
- [ ] Test with oversized requests (should return 413)

### Step 5: Testing
- [ ] Unit tests for endpoint logic
- [ ] Integration tests with Azure Services
- [ ] Test with real audio files
- [ ] Test error scenarios (service outage, invalid input)
- [ ] Load testing (multiple concurrent requests)
- [ ] Security testing (no key leaks, rate limiting works)

### Step 6: Documentation
- [ ] Document API endpoints
- [ ] Document rate limits
- [ ] Document error codes
- [ ] Add code comments explaining security measures

---

## 🧪 Testing the Endpoints

### Test with cURL (After Deployment)

```bash
# Get JWT token from Firebase (frontend does this automatically)
# Export as TOKEN=your_jwt_token

# Test TTS
curl -X POST https://your-backend.com/api/chat/tts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test",
    "lang": "en-US",
    "voiceGender": "female",
    "character": "bagaza"
  }' \
  -o output.mp3

# Test STT
curl -X POST https://your-backend.com/api/chat/stt \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@sample.wav" \
  ?lang=en-US

# Test with invalid JWT (should return 401)
curl -X POST https://your-backend.com/api/chat/tts \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "lang": "en-US", "voiceGender": "female"}'
  # Expected: 401 Unauthorized
```

### Test with Frontend (After Integration)

Frontend team will test by:
1. Opening chat in app
2. Clicking audio button
3. Speaking (STT → transcription)
4. Sending message
5. Receiving audio response (TTS → playback)

All requests will automatically include JWT token.

---

## 🔗 Integration Points

### Frontend to Backend Connection

```typescript
// Frontend code (already written for you)
import { speak } from '@/src/services/speech-secure';

// This automatically:
// 1. Gets JWT token from Firebase
// 2. Calls POST /api/chat/tts with JWT header
// 3. Receives MP3 audio
// 4. Plays it

await speak("Hello world", "en", "female", "bagaza");
```

**What you need:**
- `/api/chat/tts` endpoint (as documented above)
- JWT verification to extract user ID
- Azure Speech Services integration
- Secure API key storage

---

## 📊 Request/Response Examples

### Example 1: Successful TTS Request

**Request:**
```
POST /api/chat/tts HTTP/1.1
Host: backend.mbipa.app
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "text": "Can you help me with my appointment?",
  "lang": "en-US",
  "voiceGender": "female",
  "character": "bagaza",
  "rate": 1.0
}
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 12345
Content-Disposition: inline; filename="speech.mp3"

[Binary MP3 audio data...]
```

---

### Example 2: Successful STT Request

**Request:**
```
POST /api/chat/stt?lang=en-US&confidence=true HTTP/1.1
Host: backend.mbipa.app
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="audio"; filename="recording.wav"
Content-Type: audio/wav

[Binary WAV audio data...]
------WebKitFormBoundary--
```

**Response:**
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "text": "Can you help me with my appointment tomorrow?",
  "confidence": 0.95,
  "language": "en-US",
  "duration_ms": 3450
}
```

---

### Example 3: Unauthorized Request (Missing JWT)

**Request:**
```
POST /api/chat/tts HTTP/1.1
Host: backend.mbipa.app
Content-Type: application/json

{
  "text": "test",
  "lang": "en-US",
  "voiceGender": "female"
}
```

**Response:**
```json
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "status": 401,
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header"
}
```

---

## 🚀 Deployment Checklist

Before going live:

- [ ] Endpoints tested locally with real Azure keys
- [ ] JWT validation working correctly
- [ ] Rate limiting implemented and tested
- [ ] API keys stored securely (not hardcoded)
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't capture API keys
- [ ] All tests passing (unit + integration + security)
- [ ] Load testing completed
- [ ] Deployed to staging environment
- [ ] Tested from frontend app against staging
- [ ] Ready for production deployment

---

## 🆘 Troubleshooting

### "JWT token validation failing"
- Verify Firebase is configured correctly
- Check JWT secret matches Firebase config
- Ensure token is not expired
- Check token format: `Authorization: Bearer {token}`

### "Azure Speech Services returning 403"
- Verify API key is correct and not expired
- Verify region matches the key
- Check if subscription is still active
- Check if quota is exceeded

### "Audio quality issues"
- Verify audio format (WAV or MP3)
- Check audio bitrate (16kHz recommended)
- Test with sample audio files
- May need to adjust Azure voice settings

### "Rate limiting too strict"
- Adjust `MAX_REQUESTS` constant
- Consider per-subscription limits instead of per-user
- Add admin bypass for testing

---

## 📞 Frontend Contact Point

**When backend is ready:**
1. Notify frontend team with endpoint URLs
2. Share any authentication requirements changes
3. Provide sample responses for testing
4. Coordinate staging environment testing

**Frontend team will then:**
1. Update endpoint URLs in `src/api/config.ts`
2. Test TTS in chat (audio playback)
3. Test STT in chat (voice recording)
4. Run end-to-end testing

---

## ✅ Success Criteria

✅ Both endpoints implemented and working  
✅ JWT authentication required on all requests  
✅ API keys stored securely (not exposed)  
✅ Rate limiting prevents abuse  
✅ Error messages are user-friendly (no technical leaks)  
✅ All tests passing  
✅ Can be integrated with frontend immediately  
✅ Ready for App Store submission  

---

## 📈 Timeline

```
Day 1: Backend Team Setup & TTS Implementation
  - Set up environment
  - Implement /api/chat/tts
  - Test locally
  
Day 2: STT Implementation & Integration Testing
  - Implement /api/chat/stt
  - Security hardening
  - Full testing
  
Day 3: Staging & Frontend Integration
  - Deploy to staging
  - Test with frontend app
  - Fix any issues
  - Ready for production
```

---

## 🎯 Questions?

Refer to:
- `BACKEND_SECURITY_CHANGES.md` (full specifications)
- `SECURITY_HARDENING_P0_COMPREHENSIVE_REPORT.md` (project context)
- Azure Speech Services documentation
- Firebase Admin SDK documentation

**Status:** Ready to implement! 🚀

**Next Step:** Backend team creates `/api/chat/tts` and `/api/chat/stt` endpoints following this guide.
