# 🔐 Mobile Team Integration Guide - P0.1 Security Hardening

**For:** React Native/Expo Mobile Development Team  
**Date:** May 25, 2026  
**Priority:** 🔴 **CRITICAL** (required for App Store submission)  
**Impact:** Zero API key exposure, secure backend-only architecture  
**Timeline:** 2-3 hours integration + testing

---

## 📢 Breaking Change Announcement

Your backend team has implemented **two new secure endpoints** for Text-to-Speech (TTS) and Speech-to-Text (STT). **All Azure Speech calls must route through these proxies** — no more direct access to `EXPO_PUBLIC_AZURE_SPEECH_KEY`.

**This is non-negotiable for App Store compliance.**

---

## 🎯 Two New Secure Endpoints

### Endpoint 1: POST `/api/chat/tts` — Text-to-Speech

**Before (❌ INSECURE):**
```javascript
// ❌ DEPRECATED — API key exposed in APK, decompilable
const audioUrl = `https://${REGION}.tts.speech.microsoft.com/...?key=${EXPO_PUBLIC_AZURE_SPEECH_KEY}`;
const response = await fetch(audioUrl);
```

**After (✅ SECURE):**
```javascript
// ✅ Backend proxy keeps key safe on server
const response = await fetch("https://your-api.com/api/chat/tts", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${idToken}`,  // Firebase JWT required
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    text: "Hello, how can I help you?",
    lang: "en",              // "en", "fr", or "sg"
    voiceGender: "female",   // optional: "male" or "female"
    character: "bagaza",     // optional: voice character
    rate: 1.0                // optional: speech rate (0.5-2.0)
  })
});

// Response: Audio MP3 binary
const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);

// Play with: new Audio(audioUrl).play()
```

**Request Format:**
```json
{
  "text": "Your message",          // Required: 1-1000 chars
  "lang": "en",                   // Required: "en", "fr", "sg"
  "voiceGender": "female",        // Optional: "male" or "female"
  "character": "bagaza",          // Optional: voice name
  "rate": 1.0                     // Optional: 0.5-2.0
}
```

**Success Response:**
```
Status: 200 OK
Content-Type: audio/mpeg
Body: Binary MP3 audio file
```

**Error Responses:**
```json
// 401 — JWT invalid or expired
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or missing JWT token"
}

// 400 — Text missing or invalid
{
  "status": 400,
  "error": "MISSING_TEXT",
  "message": "Text is required and must be under 1000 characters"
}

// 502 — Azure service error
{
  "status": 502,
  "error": "TTS_FAILED",
  "message": "Azure Speech synthesis failed"
}

// 429 — Rate limit exceeded
{
  "status": 429,
  "error": "RATE_LIMITED",
  "message": "Too many requests. Please wait before retrying."
}
```

---

### Endpoint 2: POST `/api/chat/stt` — Speech-to-Text

**Before (❌ INSECURE):**
```javascript
// ❌ DEPRECATED — Direct Azure call with exposed key
const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
// speechConfig contains EXPO_PUBLIC_AZURE_SPEECH_KEY 🚨
```

**After (✅ SECURE):**
```javascript
// ✅ Record audio file, send to backend proxy
const formData = new FormData();
formData.append("audio", audioFile);  // File or Blob (WAV, MP3, OGG)

const response = await fetch("https://your-api.com/api/chat/stt?lang=en-US", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${idToken}`  // Firebase JWT required
  },
  body: formData
});

const result = await response.json();
// {
//   "text": "Hello, how are you?",
//   "confidence": 0.92,
//   "language": "en-US",
//   "duration_ms": 2340
// }
```

**Request Format:**
```
Content-Type: multipart/form-data
Field "audio": Binary file (WAV, MP3, or OGG)
Max size: 50 MB
```

**Query Parameters (optional):**
```
?lang=en-US          // Language code (default: en-US)
&confidence=true     // Include confidence score
```

**Success Response:**
```json
{
  "text": "Recognized text",
  "confidence": 0.92,       // 0.0 to 1.0 (if requested)
  "language": "en-US",
  "duration_ms": 2340
}
```

**Error Responses:**
```json
// 400 — No audio file
{
  "status": 400,
  "error": "MISSING_AUDIO",
  "message": "Audio file is required (field: 'audio')"
}

// 413 — File too large
{
  "status": 413,
  "error": "PAYLOAD_TOO_LARGE",
  "message": "Audio file must be under 50MB"
}

// 500 — Transcription failed
{
  "status": 500,
  "error": "TRANSCRIPTION_FAILED",
  "message": "Unable to transcribe audio. Please try again."
}

// 429 — Rate limit exceeded
{
  "status": 429,
  "error": "RATE_LIMITED",
  "message": "Too many requests. Please wait before retrying."
}
```

---

## 🔧 Mobile App Integration

### Step 1: Create Secure Audio Hook

Create a new file: `src/services/useSecureAudio.ts`

```typescript
import { useCallback } from 'react';
import * as FirebaseAuth from 'firebase/auth';
import * as FileSystem from 'expo-file-system';

interface UseSecureAudioOptions {
  apiBaseUrl: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface TranscriptionResult {
  text: string;
  confidence?: number;
  language: string;
  duration_ms: number;
  success: boolean;
}

export const useSecureAudio = (options: UseSecureAudioOptions) => {
  const {
    apiBaseUrl,
    maxRetries = 3,
    retryDelayMs = 1000
  } = options;

  const getIdToken = useCallback(async () => {
    const user = FirebaseAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated. Please login.');
    }
    return await user.getIdToken(true); // Force refresh
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const retryFetch = useCallback(
    async (url: string, options: RequestInit, retryCount = 0): Promise<Response> => {
      try {
        const response = await fetch(url, options);

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          if (retryCount < maxRetries) {
            const delay = retryDelayMs * Math.pow(2, retryCount);
            console.warn(`Rate limited. Retrying in ${delay}ms...`);
            await sleep(delay);
            return retryFetch(url, options, retryCount + 1);
          } else {
            throw new Error('Too many retries. Please try again later.');
          }
        }

        // Handle authentication errors
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }

        return response;
      } catch (error) {
        if (retryCount < maxRetries && !String(error).includes('Unauthorized')) {
          const delay = retryDelayMs * Math.pow(2, retryCount);
          console.warn(`Request failed. Retrying in ${delay}ms...`);
          await sleep(delay);
          return retryFetch(url, options, retryCount + 1);
        }
        throw error;
      }
    },
    [maxRetries, retryDelayMs]
  );

  /**
   * Synthesize text to speech using backend proxy
   * @param text - Text to convert (1-1000 chars)
   * @param lang - Language: "en", "fr", or "sg"
   * @param voiceGender - Optional: "male" or "female"
   * @param character - Optional: voice character name
   * @returns Audio blob (MP3 format)
   */
  const synthesizeSpeech = useCallback(
    async (
      text: string,
      lang: string = 'en',
      voiceGender?: string,
      character?: string
    ): Promise<Blob> => {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      if (text.length > 1000) {
        throw new Error('Text must be under 1000 characters');
      }

      const idToken = await getIdToken();

      try {
        const response = await retryFetch(
          `${apiBaseUrl}/api/chat/tts`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: text.trim(),
              lang,
              ...(voiceGender && { voiceGender }),
              ...(character && { character })
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `TTS failed: ${response.statusText}`
          );
        }

        return await response.blob();
      } catch (error) {
        console.error('Synthesis error:', error);
        throw new Error(`Text-to-Speech failed: ${String(error)}`);
      }
    },
    [apiBaseUrl, getIdToken, retryFetch]
  );

  /**
   * Transcribe audio to text using backend proxy
   * @param audioFile - Audio file or blob (WAV, MP3, OGG)
   * @param lang - Language code: "en-US", "fr-FR", etc.
   * @returns Transcription result with text, confidence, language, duration
   */
  const transcribeAudio = useCallback(
    async (
      audioFile: Blob | File,
      lang: string = 'en-US'
    ): Promise<TranscriptionResult> => {
      if (!audioFile || audioFile.size === 0) {
        throw new Error('Audio file is required');
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (audioFile.size > maxSize) {
        throw new Error('Audio file must be under 50MB');
      }

      const idToken = await getIdToken();
      const formData = new FormData();
      formData.append('audio', audioFile);

      try {
        const response = await retryFetch(
          `${apiBaseUrl}/api/chat/stt?lang=${encodeURIComponent(lang)}&confidence=true`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`
            },
            body: formData
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `STT failed: ${response.statusText}`
          );
        }

        const result = await response.json();
        return {
          ...result,
          success: true
        };
      } catch (error) {
        console.error('Transcription error:', error);
        throw new Error(`Speech-to-Text failed: ${String(error)}`);
      }
    },
    [apiBaseUrl, getIdToken, retryFetch]
  );

  return {
    synthesizeSpeech,
    transcribeAudio
  };
};
```

---

### Step 2: Configure API Base URL

Update: `src/api/config.ts`

```typescript
// Add to your existing config
export const SECURE_AUDIO_CONFIG = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api.com',
  maxRetries: 3,
  retryDelayMs: 1000
};

// Example:
// EXPO_PUBLIC_API_BASE_URL=https://mbipa-backend.azurewebsites.net
```

Update: `.env` and `app.json`

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://your-api.com"
    }
  }
}
```

Or in `.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://your-api.com
```

---

### Step 3: Use Secure Audio in Components

#### Chat Screen Example

```typescript
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { useSecureAudio } from '@/src/services/useSecureAudio';
import { SECURE_AUDIO_CONFIG } from '@/src/api/config';

export const ChatScreen = () => {
  const { synthesizeSpeech, transcribeAudio } = useSecureAudio({
    apiBaseUrl: SECURE_AUDIO_CONFIG.apiBaseUrl,
    maxRetries: 3
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Play text-to-speech response
  const playResponse = async (text: string, lang: string = 'en') => {
    try {
      setIsPlaying(true);

      // Get audio blob from backend
      const audioBlob = await synthesizeSpeech(text, lang);

      // Convert blob to local file (React Native compatible)
      const audioUri = `${FileSystem.cacheDirectory}speech_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(
        audioUri,
        await blobToBase64(audioBlob),
        { encoding: FileSystem.EncodingType.Base64 }
      );

      // Play audio using expo-av
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      await sound.playAsync();

    } catch (error) {
      console.error('Play error:', error);
      Alert.alert('Audio Error', String(error));
    } finally {
      setIsPlaying(false);
    }
  };

  // Record and transcribe audio
  const handleRecordingComplete = async (audioFile: Blob) => {
    try {
      setIsListening(true);

      const result = await transcribeAudio(audioFile, 'en-US');

      console.log('Transcription:', {
        text: result.text,
        confidence: result.confidence,
        language: result.language,
        duration: result.duration_ms
      });

      // Send transcribed text to chat...
      await sendMessage(result.text);

    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert('Transcription Error', String(error));
    } finally {
      setIsListening(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Chat messages */}

      {/* Response audio player */}
      {isPlaying && <ActivityIndicator size="large" />}

      {/* Recording indicator */}
      {isListening && <Text>Transcribing...</Text>}
    </View>
  );
};

// Helper function to convert Blob to Base64
async function blobToBase64(blob: Blob): Promise<string> {
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data:audio/mp3;base64, prefix
    };
    reader.readAsDataURL(blob);
  });
}
```

---

## 🚀 Integration Checklist

### Phase 1: Remove Old Code (30 minutes)

- [ ] Delete `EXPO_PUBLIC_AZURE_SPEECH_KEY` from `.env`
- [ ] Delete `EXPO_PUBLIC_AZURE_SPEECH_REGION` from `.env`
- [ ] Remove from `app.json` extra config
- [ ] Delete all direct Azure Speech SDK imports
- [ ] Search codebase for `SpeechConfig`, `SpeechRecognizer`, `SpeechSynthesizer` — remove/replace

### Phase 2: Create New Secure Services (30 minutes)

- [ ] Create `src/services/useSecureAudio.ts` (copy from Step 1 above)
- [ ] Update `src/api/config.ts` with `SECURE_AUDIO_CONFIG`
- [ ] Update `.env` with `EXPO_PUBLIC_API_BASE_URL`
- [ ] Test hook can get Firebase ID token
- [ ] Test hook can call `/api/chat/tts` (will fail until backend ready)
- [ ] Test hook can call `/api/chat/stt` (will fail until backend ready)

### Phase 3: Update Components (30 minutes)

- [ ] Find all components using TTS/STT
- [ ] Replace with `useSecureAudio` hook
- [ ] Update language parameters ("en", "fr", "sg")
- [ ] Add error handling for 401 (re-login) and 429 (rate limit)
- [ ] Add loading indicators

### Phase 4: Testing (1 hour)

- [ ] Test TTS with English text
- [ ] Test TTS with French text
- [ ] Test TTS with Sango text
- [ ] Test STT with MP3 file
- [ ] Test STT with WAV file
- [ ] Test error: missing authentication
- [ ] Test error: text too long
- [ ] Test error: audio file too large
- [ ] Test on physical iOS device
- [ ] Test on physical Android device

### Phase 5: Validation (30 minutes)

- [ ] Verify no API keys in console logs
- [ ] Verify no API keys in APK/IPA (decompile to check)
- [ ] Verify every request includes JWT token
- [ ] Verify JWT token is fresh (not expired)
- [ ] Check App Store compliance

---

## ⚠️ Critical Security Points

### ❌ NEVER Do This

```typescript
// ❌ FORBIDDEN — Direct Azure call with exposed key
import { SpeechConfig } from 'microsoft-cognitiveservices-speech-sdk';
const speechConfig = SpeechConfig.FromSubscription(
  EXPO_PUBLIC_AZURE_SPEECH_KEY,  // 🚨 KEY EXPOSED IN APK
  'eastus'
);

// ❌ FORBIDDEN — Hardcoded API key
const response = await fetch(
  `https://eastus.tts.speech.microsoft.com/?key=${EXPO_PUBLIC_AZURE_SPEECH_KEY}`
);

// ❌ FORBIDDEN — Logging the key
console.log('Using key:', EXPO_PUBLIC_AZURE_SPEECH_KEY); // 🚨 DO NOT LOG
```

### ✅ ALWAYS Do This

```typescript
// ✅ CORRECT — Backend proxy with JWT
const idToken = await user.getIdToken();
const response = await fetch('https://your-api.com/api/chat/tts', {
  headers: {
    'Authorization': `Bearer ${idToken}`,  // ✅ Use JWT, not API key
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ text, lang })
});

// ✅ CORRECT — No key in logs
console.log('TTS response:', response.status); // Safe to log
```

---

## 📊 Before vs After

| Aspect | Before (❌) | After (✅) |
|--------|-----------|-----------|
| **API Key Location** | Hardcoded in APK (decompilable) | Secured on backend server |
| **Key Exposure Risk** | HIGH — Anyone can decompile APK | NONE — Key never leaves server |
| **Authentication** | None | JWT required on every call |
| **Rate Limiting** | None (allows abuse) | Per-user limits on backend |
| **Cost Control** | Unlimited Azure calls possible | Protected by backend quotas |
| **App Store Compliance** | ❌ Rejected | ✅ Ready |
| **Security Audit** | ❌ Fails | ✅ Passes |

---

## 🧪 Testing Your Integration

### Local Testing

```bash
# 1. Start dev server
npm start

# 2. In simulator/device, open Chat
# 3. Try audio features
# 4. Check console for errors

# If errors, check:
# - Is backend running?
# - Is API_BASE_URL correct?
# - Is Firebase JWT valid?
# - Is user logged in?
```

### Integration Testing

```javascript
// Test script for useSecureAudio hook
import { useSecureAudio } from '@/src/services/useSecureAudio';

export const AudioTestScreen = () => {
  const { synthesizeSpeech, transcribeAudio } = useSecureAudio({
    apiBaseUrl: 'https://your-api.com'
  });

  const testTTS = async () => {
    try {
      console.log('Testing TTS...');
      const blob = await synthesizeSpeech('Hello world', 'en');
      console.log('✅ TTS Success:', blob.size, 'bytes');
    } catch (err) {
      console.error('❌ TTS Failed:', err);
    }
  };

  const testSTT = async () => {
    try {
      console.log('Testing STT...');
      const result = await transcribeAudio(
        sampleAudioBlob,
        'en-US'
      );
      console.log('✅ STT Success:', result.text);
    } catch (err) {
      console.error('❌ STT Failed:', err);
    }
  };

  return (
    <View>
      <Button title="Test TTS" onPress={testTTS} />
      <Button title="Test STT" onPress={testSTT} />
    </View>
  );
};
```

---

## 🆘 Troubleshooting

### "401 Unauthorized"
**Cause:** Invalid or expired JWT token  
**Fix:**
```typescript
// Force token refresh
const user = FirebaseAuth.getCurrentUser();
const freshToken = await user?.getIdToken(true);
// Then retry request
```

### "Cannot read property 'getIdToken' of null"
**Cause:** User not authenticated  
**Fix:** Ensure user is logged in before calling audio functions
```typescript
if (!user) {
  Alert.alert('Error', 'Please login first');
  return;
}
```

### "Network error: Cannot resolve EXPO_PUBLIC_API_BASE_URL"
**Cause:** Environment variable not set  
**Fix:** Update `.env` and/or `app.json`:
```
EXPO_PUBLIC_API_BASE_URL=https://your-actual-backend.com
```

### "ERR_INVALID_URL"
**Cause:** API_BASE_URL doesn't include protocol  
**Fix:** Must start with `https://` or `http://`
```typescript
// ❌ Wrong
apiBaseUrl: 'your-api.com'

// ✅ Correct
apiBaseUrl: 'https://your-api.com'
```

### "429 Too Many Requests"
**Cause:** Rate limit exceeded  
**Fix:** Hook has automatic retry with exponential backoff
```typescript
// Max 3 retries with delays: 1s, 2s, 4s
const { synthesizeSpeech } = useSecureAudio({
  maxRetries: 3,
  retryDelayMs: 1000
});
```

### "Audio file too large"
**Cause:** File exceeds 50MB  
**Fix:** Compress audio before sending
```typescript
// Ensure audio is < 50MB
if (audioFile.size > 50 * 1024 * 1024) {
  throw new Error('Audio file too large');
}
```

---

## 📞 Support & Escalation

### Common Issues

**TTS not working?**
- [ ] Verify backend `/api/chat/tts` is deployed
- [ ] Check network tab in debugger
- [ ] Verify JWT token is valid

**STT returning gibberish?**
- [ ] Verify audio format (WAV, MP3, OGG)
- [ ] Check audio quality (16kHz recommended)
- [ ] Contact backend team if Azure service down

**App crashes on audio call?**
- [ ] Check console for full error stack
- [ ] Verify Firebase auth initialized
- [ ] Verify user logged in

### Contact Points

**Backend Issues:**
- [ ] Contact backend team about `/api/chat/tts` or `/api/chat/stt` errors

**Infrastructure/Deployment:**
- [ ] Contact DevOps if backend endpoints unavailable

**Firebase Auth Issues:**
- [ ] Verify Firebase project configured
- [ ] Check Firebase console for errors

---

## ✅ Success Criteria

✅ All Azure Speech calls route through backend  
✅ No API keys exposed in app code  
✅ JWT token required on every request  
✅ Error handling for auth failures (401)  
✅ Error handling for rate limits (429)  
✅ Tested on physical iOS device  
✅ Tested on physical Android device  
✅ No sensitive data in console logs  
✅ App Store compliant  

---

## 📈 Timeline

```
Day 1 (Today):
  - Remove old Azure code (30 min)
  - Create useSecureAudio hook (30 min)
  - Update configuration (15 min)

Day 2 (Tomorrow):
  - Update components (30 min)
  - Test TTS & STT (30 min)
  - Physical device testing (30 min)

Day 3:
  - Final validation
  - Ready for App Store submission
```

---

## 🎯 Next Steps

1. **Now:** Read this guide completely
2. **Today:** Remove old API key from code
3. **Today:** Create `useSecureAudio.ts` hook
4. **Tomorrow:** Update all components
5. **Tomorrow:** Test all audio features
6. **Day 3:** Deploy to TestFlight

---

## 📚 Related Documentation

- `BACKEND_IMPLEMENTATION_PROMPT.md` — Backend endpoint specifications
- `DEVOPS_CERTIFICATE_PINS_PROMPT.md` — SSL certificate pinning setup
- `P0_SECURITY_QUICK_REFERENCE.md` — Team coordination guide
- `SECURITY_HARDENING_P0_COMPREHENSIVE_REPORT.md` — Full security context

---

## 🚀 Ready to Integrate?

**You have everything you need:**
- ✅ Complete hook code (`useSecureAudio.ts`)
- ✅ Integration examples
- ✅ Error handling patterns
- ✅ Testing checklist
- ✅ Troubleshooting guide

**Time to secure Mbipa! 🔐**

---

**Integration Status:** Ready to implement  
**Blocking Items:** None (code is self-contained)  
**Dependencies:** Backend team must deploy endpoints first  
**Next Review:** After physical device testing

---

**Questions?** Reference:
1. This document for integration details
2. `BACKEND_IMPLEMENTATION_PROMPT.md` for endpoint specs
3. React Native Firebase docs for authentication
4. Expo Audio docs for playback

**Let's ship secure! 🚀**
