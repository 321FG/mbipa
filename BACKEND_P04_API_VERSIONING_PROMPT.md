# 🔧 Backend Implementation Prompt - P0.4: API Versioning

**For:** Backend Development Team  
**Date:** May 25, 2026  
**Priority:** 🟠 **HIGH** (required for graceful API evolution)  
**Timeline:** 1-2 days  
**Coordination:** Frontend versioning.ts already implemented, waiting for v1 endpoints

---

## 📋 Executive Summary

Your frontend has implemented automatic API versioning with fallback logic. Your job is to make those versions actually exist on the backend.

**What you need to do:**
1. Create `/api/v1/*` endpoints (new versions of all endpoints)
2. Keep `/api/v0/*` endpoints running (legacy support, optional but recommended)
3. Ensure both versions work identically for now
4. Enable smooth client migration and future evolution

---

## 🎯 Versioning Architecture

### Current (Pre-P0.4)
```
Frontend → /api/chat/tts
           /api/chat/stt
           /api/assessments
           etc.

Backend: Single unversioned endpoints
```

### After P0.4
```
Frontend → /api/v1/chat/tts (preferred)
           ↓
           /api/v0/chat/tts (fallback if v1 fails)

Backend: Both versions available
         V1 = current (new features here)
         V0 = legacy compatibility (same code for now)
```

---

## 🔧 Implementation Steps

### Step 1: Identify All API Endpoints

List all endpoints that need versioning:

```
Your endpoints:
POST   /api/chat/tts                    → /api/v1/chat/tts
POST   /api/chat/stt                    → /api/v1/chat/stt
POST   /api/chat/ai-response            → /api/v1/chat/ai-response
GET    /api/assessments                 → /api/v1/assessments
POST   /api/assessments                 → /api/v1/assessments
GET    /api/assessments/:id             → /api/v1/assessments/:id
GET    /api/sessions                    → /api/v1/sessions
POST   /api/sessions                    → /api/v1/sessions
GET    /api/sessions/:id                → /api/v1/sessions/:id
GET    /api/profile                     → /api/v1/profile
PUT    /api/profile                     → /api/v1/profile
POST   /api/subscriptions/checkout      → /api/v1/subscriptions/checkout
GET    /api/subscriptions/status        → /api/v1/subscriptions/status
... (add all your endpoints)
```

### Step 2: Create V1 Routes (Recommended Approach: Router Abstraction)

**C#/.NET Example:**

```csharp
// Controllers/V1/ChatController.cs
namespace Mbipa.Controllers.V1
{
    [ApiController]
    [Route("api/v1/chat")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;

        [HttpPost("tts")]
        public async Task<IActionResult> TextToSpeech([FromBody] TtsRequest request)
        {
            // Same logic as before
            var audio = await _chatService.SynthesizeSpeech(
                request.Text,
                request.Lang,
                request.VoiceGender
            );
            return File(audio, "audio/mpeg");
        }

        [HttpPost("stt")]
        public async Task<IActionResult> SpeechToText([FromForm] IFormFile audio, [FromQuery] string lang)
        {
            // Same logic as before
            var result = await _chatService.TranscribeAudio(audio, lang);
            return Ok(result);
        }

        [HttpPost("ai-response")]
        public async Task<IActionResult> GetAiResponse([FromBody] ChatRequest request)
        {
            // Same logic as before
            var response = await _chatService.GetAiResponse(request);
            return Ok(response);
        }
    }

    // Similar: AssessmentsController, SessionsController, ProfileController, etc.
}
```

### Step 3: Keep V0 Routes (Legacy Compatibility - Optional but Recommended)

**Two approaches:**

#### Option A: Duplicate Routes (Simple but repetitive)
```csharp
// Controllers/V0/ChatController.cs
namespace Mbipa.Controllers.V0
{
    [ApiController]
    [Route("api/v0/chat")]
    public class ChatController : ControllerBase
    {
        // Exact same code as V1
        // Redundant but simple
    }
}

// Also create: api/chat (no version = v0 fallback)
[ApiController]
[Route("api/chat")]
public class ChatLegacyController : ControllerBase { ... }
```

#### Option B: Shared Logic (Better - recommended)
```csharp
// Services/ChatService.cs (shared logic)
public interface IChatService
{
    Task<byte[]> SynthesizeSpeech(string text, string lang, string voiceGender);
    Task<TranscriptionResult> TranscribeAudio(IFormFile audio, string lang);
    Task<ChatResponse> GetAiResponse(ChatRequest request);
}

// Controllers/V1/ChatController.cs
[ApiController]
[Route("api/v1/chat")]
public class ChatV1Controller : ControllerBase
{
    private readonly IChatService _chatService;

    [HttpPost("tts")]
    public async Task<IActionResult> TextToSpeech([FromBody] TtsRequest request)
        => File(await _chatService.SynthesizeSpeech(...), "audio/mpeg");
}

// Controllers/V0/ChatController.cs (or use routing instead)
[ApiController]
[Route("api/v0/chat")]
[Route("api/chat")]  // Also respond to unversioned
public class ChatLegacyController : ControllerBase
{
    // Exact same implementation as V1
    // Both just call IChatService
}
```

### Step 4: Test Both Versions Locally

```bash
# Test V1 endpoint
curl -X POST https://localhost:5001/api/v1/chat/tts \
  -H "Authorization: Bearer {JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello",
    "lang": "en",
    "voiceGender": "female"
  }'
# Expected: 200 OK, audio/mpeg response

# Test V0 endpoint (should work identically)
curl -X POST https://localhost:5001/api/v0/chat/tts \
  -H "Authorization: Bearer {JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello",
    "lang": "en",
    "voiceGender": "female"
  }'
# Expected: Same 200 OK, same audio response

# Test unversioned endpoint (fallback)
curl -X POST https://localhost:5001/api/chat/tts \
  -H "Authorization: Bearer {JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello",
    "lang": "en",
    "voiceGender": "female"
  }'
# Expected: Same 200 OK, same audio response
```

### Step 5: Deploy V1 + V0 Together

**Important:** Deploy BOTH versions at the same time.

```
Deployment Checklist:
- [ ] All /api/v1/* endpoints working
- [ ] All /api/v0/* endpoints working identically
- [ ] Both versions use same business logic
- [ ] JWT validation required on all versions
- [ ] Rate limiting applies to all versions
- [ ] Error responses format consistent across versions
```

---

## 📊 Version Rollout Timeline

### Phase 1: Deploy V1 & V0 (Today/Tomorrow)
```
Backend deploys both:
  /api/v1/chat/tts     ← NEW
  /api/v1/chat/stt     ← NEW
  /api/v0/chat/tts     ← Legacy alias
  /api/v0/chat/stt     ← Legacy alias

Frontend will automatically:
  1. Try v1 first
  2. Cache successful version
  3. Use cached version for future calls
  4. Fallback to v0 if v1 fails
```

### Phase 2: Frontend Deployment (Day 2)
```
All frontend clients automatically:
  - Detect current app version
  - Use /api/v1/* by default
  - Fallback to /api/v0/* if needed
  - Cache successful version

No client-side code changes needed!
```

### Phase 3: Monitor & Maintain (Week 1+)
```
Monitor logs for:
  - v1 success rate (should be >95%)
  - v0 fallback rate (should be <5%)
  - Any persistent fallbacks (indicates v1 issue)
```

### Phase 4: Eventually Deprecate V0 (6+ months)
```
Once >95% of users on v1:
  1. Announce: "V0 deprecated, sunset in 6 months"
  2. Wait 6 months
  3. Remove /api/v0/* endpoints
  4. Server logs will show very few v0 requests by then
```

---

## 🔄 Future API Evolution (Why We Need Versioning)

With versioning in place, you can evolve your API without breaking older clients:

### Example: Upgrade /api/chat/tts endpoint

**Current (V1):**
```json
Request:  { text, lang, voiceGender, character }
Response: audio/mpeg file
```

**Future (V2):**
```json
Request:  { text, lang, voiceGender, character, format: "mp3|wav|ogg" }
Response: audio blob with format header { format, data }
```

**Migration process:**
```
1. Deploy /api/v2/chat/tts (with new format)
2. Keep /api/v1/chat/tts working (old format)
3. Clients gradually update (over weeks/months)
4. Monitor fallback rates
5. Eventually remove v1
```

**Without versioning:** Must support both formats in single endpoint = complexity  
**With versioning:** Each version is independent = clean evolution

---

## 🧪 Testing Versioning

### Automated Tests

```csharp
// Tests/ApiVersioningTests.cs

[TestFixture]
public class ApiVersioningTests
{
    [Test]
    public async Task V1TTS_Should_Return_Audio()
    {
        var response = await client.PostAsync("/api/v1/chat/tts", 
            new StringContent(JsonConvert.SerializeObject(new { text = "Hello", lang = "en" })));
        
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("audio/mpeg", response.Content.Headers.ContentType.MediaType);
    }

    [Test]
    public async Task V0TTS_Should_Also_Return_Audio()
    {
        var response = await client.PostAsync("/api/v0/chat/tts", 
            new StringContent(JsonConvert.SerializeObject(new { text = "Hello", lang = "en" })));
        
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("audio/mpeg", response.Content.Headers.ContentType.MediaType);
    }

    [Test]
    public async Task V1_And_V0_Should_Return_Identical_Responses()
    {
        var v1Response = await client.PostAsync("/api/v1/chat/tts", ...);
        var v0Response = await client.PostAsync("/api/v0/chat/tts", ...);
        
        var v1Audio = await v1Response.Content.ReadAsAsync<byte[]>();
        var v0Audio = await v0Response.Content.ReadAsAsync<byte[]>();
        
        CollectionAssert.AreEqual(v1Audio, v0Audio);
    }
}
```

### Manual Testing (Staging)

```bash
# 1. Test all V1 endpoints exist and respond
for endpoint in "/api/v1/chat/tts" "/api/v1/assessments" "/api/v1/profile"; do
  curl -H "Authorization: Bearer $TOKEN" $BASE_URL$endpoint
done

# 2. Test V0 endpoints still work
for endpoint in "/api/v0/chat/tts" "/api/v0/assessments"; do
  curl -H "Authorization: Bearer $TOKEN" $BASE_URL$endpoint
done

# 3. Load test both versions under concurrent requests
# (ensure no version gets priority over another)
ab -n 1000 -c 100 -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"test"}' \
  -p /api/v1/chat/tts $BASE_URL
```

---

## 📋 Implementation Checklist

### Backend Team

- [ ] List all API endpoints in your system
- [ ] Create `/api/v1/*` routes for each endpoint
- [ ] Implement or alias `/api/v0/*` routes (legacy)
- [ ] Ensure both versions use same business logic
- [ ] Test locally: all v1 endpoints work
- [ ] Test locally: all v0 endpoints work
- [ ] Test locally: both versions return identical results
- [ ] Write automated tests for version compatibility
- [ ] Deploy to staging
- [ ] Test v1 and v0 in staging
- [ ] Monitor: No errors on v1
- [ ] Deploy to production
- [ ] Monitor: Frontend migration to v1 (should see >90% v1 calls within hours)

### QA Team

- [ ] Test all endpoints with both /api/v1 and /api/v0
- [ ] Verify responses are identical between versions
- [ ] Test concurrent requests to both versions
- [ ] Test error responses are consistent
- [ ] Test under load
- [ ] Verify no version gets left behind (performance-wise)
- [ ] Test with frontend app against staging backend
- [ ] Verify automatic fallback works (disable v1, confirm v0 used)

### Operations/DevOps

- [ ] Plan deployment (both versions at same time)
- [ ] Set up monitoring for version usage
- [ ] Configure alerts if v0 fallback rate exceeds threshold
- [ ] Document deprecation plan for v0 (in 6+ months)

---

## 📊 Monitoring & Metrics

### What to Track

```
1. V1 Success Rate
   - Target: >95% of requests to /api/v1/*
   - Alert if: <90%

2. V0 Fallback Rate
   - Target: <5% fallback to /api/v0/*
   - Alert if: >10% (indicates v1 issue)

3. Response Time by Version
   - Should be identical (v1 ≈ v0)
   - Alert if: v1 >10% slower than v0

4. Error Rate by Version
   - Should be identical for same operations
   - Alert if: different error patterns between versions
```

### Sample Metrics Query (if using ELK/Prometheus)

```
# V1 success rate
(sum(rate(http_requests_total{path=~"/api/v1/.*",status="200"}[5m])) /
 sum(rate(http_requests_total{path=~"/api/v1/.*"}[5m]))) * 100

# V0 fallback rate (should be low)
(sum(rate(http_requests_total{path=~"/api/v0/.*"}[5m])) /
 sum(rate(http_requests_total{path=~"/api/.*"}[5m]))) * 100
```

---

## 🔐 Security Considerations

### Ensure Both Versions Have Same Security

- [ ] JWT validation on both v1 and v0
- [ ] Rate limiting on both versions
- [ ] Input validation on both versions
- [ ] Error messages consistent (no info leakage)
- [ ] Logging consistent across versions
- [ ] No security bypass via version selection

### Example: Consistent JWT Validation

```csharp
// ✅ CORRECT - Both versions require JWT
[ApiController]
[Route("api/v1/chat")]
[Authorize]  // JWT required
public class ChatV1Controller { ... }

[ApiController]
[Route("api/v0/chat")]
[Authorize]  // JWT required
public class ChatV0Controller { ... }
```

---

## 🆘 Troubleshooting

### "Frontend keeps falling back to V0"
**Cause:** /api/v1/* endpoints not deployed or returning errors  
**Fix:**
```
1. Check /api/v1/* endpoints are actually deployed
2. Verify they return same responses as /api/v0/*
3. Check for any errors in v1 endpoints
4. Monitor backend logs for v1 request failures
```

### "V1 and V0 returning different results"
**Cause:** Logic divergence between versions  
**Fix:**
```
1. Use shared service interface (recommended)
2. Don't duplicate code
3. Both versions should call IChatService.SynthesizeSpeech()
4. Write tests that verify v1 ≈ v0 responses
```

### "Performance difference between V1 and V0"
**Cause:** Different code paths or middleware  
**Fix:**
```
1. Ensure both use identical business logic
2. Check middleware pipeline is same for both
3. Profile both endpoints
4. Identify and remove any version-specific code
```

---

## 📚 Related Documentation

- `IMPLEMENTATION_P04_API_VERSIONING.md` — Frontend versioning details
- `P0_SECURITY_QUICK_REFERENCE.md` — Team coordination
- Your existing API documentation (update to reference v1)

---

## ✅ Success Criteria

✅ All endpoints accessible via `/api/v1/*`  
✅ Legacy endpoints accessible via `/api/v0/*` (for compatibility)  
✅ Both versions return identical results  
✅ Frontend automatically detects and uses v1  
✅ Frontend fallback to v0 works (if v1 fails)  
✅ Monitoring shows >90% v1 adoption within first week  
✅ No breaking changes for existing clients  
✅ Future API evolution supported (v2, v3, etc.)  

---

## 📈 Timeline

```
Day 1 (Today):
  ✅ Identify all endpoints
  ✅ Create /api/v1/* routes
  ✅ Create /api/v0/* aliases
  ✅ Test locally
  
Day 2 (Tomorrow):
  ✅ Deploy to staging
  ✅ Test with frontend (staging)
  ✅ Set up monitoring
  ✅ Deploy to production
  
Week 1:
  ✅ Monitor adoption (>90% v1 target)
  ✅ Verify no issues
  ✅ Plan v0 deprecation (future)
```

---

## 🎯 Next Steps

1. **Today:** Create all /api/v1/* endpoints
2. **Today:** Test locally (v1 ≈ v0)
3. **Tomorrow:** Deploy to staging
4. **Tomorrow:** Deploy to production
5. **Week 1+:** Monitor adoption metrics

**Frontend is ready and waiting.** Deploy v1 endpoints and clients will automatically migrate.

---

**Ready to implement API versioning! 🚀**
