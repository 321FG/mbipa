# Migration Plan: speech.ts → speech-secure.ts (P0.1)

**Status:** Ready for testing  
**Risk Level:** 🟢 LOW (new file, existing file untouched)  
**Rollback:** Instant (delete speech-secure.ts)

---

## Phase 1: Test (Current)

### Files Created
- ✅ `src/services/speech-secure.ts` — Secure version (NO API KEYS)

### Files Unchanged
- ✅ `src/services/speech.ts` — Original (still works, has direct Azure calls)

### What to Test

1. **Audio Playback (TTS)**
   - [ ] Start app
   - [ ] Go to chat → Try audio output
   - [ ] Check browser console for errors
   - [ ] Verify no `EXPOSE_PUBLIC_AZURE_SPEECH_KEY` errors

2. **Audio Recording & Transcription**
   - [ ] Start recording
   - [ ] Say something
   - [ ] Stop recording → transcribe
   - [ ] Check browser console for errors

3. **Avatar Speaking Animation**
   - [ ] Check avatar mouth animation during TTS
   - [ ] Check `isSpeaking()` updates

---

## Phase 2: Integration (Next)

### Step 1: Create Adapter Layer (Optional but Recommended)

Create `src/services/speech-adapter.ts`:

```typescript
/**
 * Speech adapter that can toggle between old/new implementations.
 * Allows gradual migration without breaking existing code.
 */

// Toggle between implementations
const USE_SECURE_VERSION = true; // Set to false to use old version

import {
  speak as speakOld,
  stopSpeaking as stopSpeakingOld,
  isSpeaking as isSpeakingOld,
  onSpeakingChange as onSpeakingChangeOld,
  startRecording as startRecordingOld,
  stopRecordingAndTranscribe as stopRecordingAndTranscribeOld,
  cancelRecording as cancelRecordingOld,
} from './speech';

import {
  speak as speakSecure,
  stopSpeaking as stopSpeakingSecure,
  isSpeaking as isSpeakingSecure,
  onSpeakingChange as onSpeakingChangeSecure,
  startRecording as startRecordingSecure,
  stopRecordingAndTranscribe as stopRecordingAndTranscribeSecure,
  cancelRecording as cancelRecordingSecure,
} from './speech-secure';

// Export adapter functions
export const speak = USE_SECURE_VERSION ? speakSecure : speakOld;
export const stopSpeaking = USE_SECURE_VERSION ? stopSpeakingSecure : stopSpeakingOld;
export const isSpeaking = USE_SECURE_VERSION ? isSpeakingSecure : isSpeakingOld;
export const onSpeakingChange = USE_SECURE_VERSION ? onSpeakingChangeSecure : onSpeakingChangeOld;
export const startRecording = USE_SECURE_VERSION ? startRecordingSecure : startRecordingOld;
export const stopRecordingAndTranscribe = USE_SECURE_VERSION ? stopRecordingAndTranscribeSecure : stopRecordingAndTranscribeOld;
export const cancelRecording = USE_SECURE_VERSION ? cancelRecordingSecure : cancelRecordingOld;
```

**Benefit:** All imports stay the same, but you can toggle between versions instantly.

### Step 2: Update Imports (Gradual)

**Option A (Safest): Update adapter import**
- In app code: `import * from '../services/speech-adapter'`
- Tests both versions easily
- Instant rollback by changing `USE_SECURE_VERSION`

**Option B (Direct): Point to secure version**
- In app code: `import * from '../services/speech-secure'`
- After confirming secure version works 100%

### Step 3: Delete Old Version (Only When Ready)

- [ ] Confirm secure version works in production for 1 week
- [ ] Delete `speech.ts` (but keep in git history)
- [ ] Final cleanup

---

## Backend Endpoints Required

Before Phase 2 can be fully tested, backend must implement:

### 1. POST `/api/chat/tts`
```
Headers: Authorization: Bearer {JWT}
Body: { text, lang, voiceGender, character? }
Response: audio/mpeg file (MP3)
```

### 2. POST `/api/chat/stt`
```
Headers: Authorization: Bearer {JWT}
Body: FormData { audio, ...metadata }
Response: { text: "recognized text", confidence: 0.95 }
```

---

## Testing Checklist

### Unit Tests (if available)
- [ ] `speak()` returns without error
- [ ] `stopSpeaking()` stops playback
- [ ] `isSpeaking()` reflects correct state
- [ ] `startRecording()` requires permission
- [ ] `stopRecordingAndTranscribe()` sends to backend

### Integration Tests
- [ ] Chat page audio output works
- [ ] Chat page audio input/transcription works
- [ ] Therapist page audio works
- [ ] Backup character voices work
- [ ] Network error handling works

### Security Validation
- [ ] No `EXPOSE_PUBLIC_AZURE_SPEECH_KEY` in console
- [ ] All requests have JWT Authorization header
- [ ] No sensitive data in logs
- [ ] Backend holds all sensitive keys

---

## Rollback Procedure

If secure version fails:

```bash
# Option 1: Remove secure file
rm src/services/speech-secure.ts
# Update imports back to original

# Option 2: Revert adapter toggle
# In speech-adapter.ts, change:
USE_SECURE_VERSION = false
```

**Time to rollback:** < 2 minutes

---

## Success Criteria

✅ Phase 2 Complete when:
- [ ] TTS works through backend proxy
- [ ] STT works through backend proxy
- [ ] No exposed API keys in compiled app
- [ ] Zero console errors
- [ ] App bundle size unchanged
- [ ] Performance similar to old version

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Test | 1-2 days | 🟢 In Progress |
| Phase 2: Integration | 1-2 days | ⏳ Waiting for backend |
| Phase 3: Validation | 1 week | ⏳ Pending phase 2 |
| Phase 4: Cleanup | 1 day | ⏳ Pending phase 3 |

---

## Notes

- **Zero breaking changes:** Existing code unaffected
- **Instant toggles:** Adapter allows testing without commitment
- **Backend dependent:** Cannot fully test without `/api/chat/tts` and `/api/chat/stt`
- **git history preserved:** Old file remains in version control

---

**Next Action:** Wait for backend to implement `/api/chat/tts` and `/api/chat/stt` endpoints.
