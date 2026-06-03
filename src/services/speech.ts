/**
 * Azure Cognitive Services - Speech (TTS + STT)
 *
 * SECURITY NOTE: The subscription key is currently exposed via EXPO_PUBLIC_AZURE_SPEECH_KEY.
 * For production, proxy these calls through the backend so the key never ships to the client.
 *
 * Docs:
 *   TTS REST: https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech
 *   STT REST: https://learn.microsoft.com/azure/ai-services/speech-service/rest-speech-to-text-short
 */
import { Audio } from "expo-av";
// expo-file-system v19+ (SDK 54) moved the classic file API to /legacy.
// We use the legacy namespace because we need cacheDirectory + base64 read/write.
import * as FileSystem from "expo-file-system/legacy";
import { API_URL } from "../api/config";
import { auth as firebaseAuth } from "../config/firebase";

const SPEECH_KEY = process.env.EXPO_PUBLIC_AZURE_SPEECH_KEY!;
const SPEECH_REGION = process.env.EXPO_PUBLIC_AZURE_SPEECH_REGION || "westus2";

// Backend TTS endpoint — server-side proxy to Azure Neural Voices
// (Vivienne FR / Ava EN). Keeps the Speech key off the client.
const BACKEND_TTS_ENDPOINT = `${API_URL}/api/chat/tts`;

const TTS_ENDPOINT = `https://${SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
// Fast transcription endpoint accepts many container formats (mp3, mp4/m4a, wav, ogg, opus, flac, webm),
// so we don't need to force PCM/WAV recording on Android — m4a from expo-av works directly.
// Docs: https://learn.microsoft.com/azure/ai-services/speech-service/fast-transcription-create
const FAST_STT_ENDPOINT = `https://${SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`;

// French neural voices (legacy direct path; backend now picks voices itself)
const VOICE_FEMALE = "fr-FR-DeniseNeural";
const VOICE_MALE = "fr-FR-HenriNeural";

let currentSound: Audio.Sound | null = null;
let currentRecording: Audio.Recording | null = null;
let speakingListeners: Array<(speaking: boolean) => void> = [];
let speakingState = false;

function emitSpeaking(speaking: boolean) {
  speakingState = speaking;
  speakingListeners.forEach((fn) => {
    try {
      fn(speaking);
    } catch {}
  });
}

export function isSpeaking(): boolean {
  return speakingState;
}

/**
 * Subscribe to "isSpeaking" state changes (used to drive avatar animation).
 */
export function onSpeakingChange(listener: (speaking: boolean) => void) {
  speakingListeners.push(listener);
  return () => {
    speakingListeners = speakingListeners.filter((l) => l !== listener);
  };
}

/**
 * Build SSML for a French neural voice.
 */
function buildSsml(text: string, voice: "female" | "male" = "female"): string {
  const voiceName = voice === "male" ? VOICE_MALE : VOICE_FEMALE;
  // Escape XML special chars
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<speak version="1.0" xml:lang="fr-FR"><voice name="${voiceName}"><prosody rate="0%" pitch="0%">${safe}</prosody></voice></speak>`;
}

/**
 * Speak the given text via the Mbipa backend TTS proxy (Azure Neural Voices).
 * The backend selects the appropriate native voice (Vivienne FR, Ava EN, …)
 * based on the `lang` parameter, so the playback always sounds native
 * regardless of the device's system language.
 *
 * When `voiceGender` is provided, it is forwarded to the backend AND used to
 * pick a gendered French neural voice if we fall back to direct Azure TTS
 * (so a male character like Bagaza never gets a female voice).
 *
 * `character` ("bagaza" | "yassingou") is forwarded to the backend so the
 * server can pick the right neural voice per character (this is the source
 * of truth — the backend mapping wins over `voiceGender`).
 */
export async function speak(
  text: string,
  lang: "fr" | "en" | "sg" = "fr",
  voiceGender: "male" | "female" = "female",
  character?: "bagaza" | "yassingou",
): Promise<void> {
  if (!text?.trim()) return;
  await stopSpeaking();

  // Normalize character to lowercase id the backend expects.
  const characterId = character?.toLowerCase() as
    | "bagaza"
    | "yassingou"
    | undefined;

  if (__DEV__) {
    console.log("🔊 TTS request", {
      character: characterId,
      voiceGender,
      lang,
      textPreview: text.slice(0, 40),
    });
  }

  let path: string | null = null;
  try {
    // ---------------------------------------------------------------------
    // Direct Azure TTS path — used when the Speech key is shipped with the
    // app AND no character was specified. Once the backend supports the
    // `character` field (which is now the source of truth for voice
    // selection), we always prefer the backend path so the per-character
    // voice mapping stays centralized server-side.
    // ---------------------------------------------------------------------
    if (SPEECH_KEY && lang === "fr" && !characterId) {
      const ssml = buildSsml(text, voiceGender);
      const ttsResp = await fetch(TTS_ENDPOINT, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": SPEECH_KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "mbipa-app",
        },
        body: ssml,
      });
      if (!ttsResp.ok) {
        const detail = await ttsResp.text().catch(() => "");
        console.warn("[speech] direct TTS failed", ttsResp.status, detail);
        throw new Error(`Direct TTS échec (${ttsResp.status})`);
      }
      const ab = await ttsResp.arrayBuffer();
      path = await playMp3FromArrayBuffer(ab);
      return;
    }

    // ---------------------------------------------------------------------
    // Backend proxy path (default when SPEECH_KEY isn't shipped).
    // We forward `voiceGender` so a backend update can honour it; if the
    // backend ignores it, the gender will still be wrong for non-FR langs
    // until the backend is patched.
    // ---------------------------------------------------------------------
    const fbUser = firebaseAuth.currentUser;
    const token = fbUser ? await fbUser.getIdToken() : null;
    if (!token) {
      throw new Error("Authentification requise pour la voix.");
    }

    const response = await fetch(BACKEND_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        lang,
        voiceGender,
        ...(characterId ? { character: characterId } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn("[speech] TTS backend failed", response.status, detail);
      throw new Error(`TTS échec (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    path = await playMp3FromArrayBuffer(arrayBuffer);
  } catch (e: any) {
    emitSpeaking(false);
    if (path) {
      FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    }
    console.warn("[TTS] error:", e?.message || e);
    throw e;
  }
}

/**
 * Write an MP3 ArrayBuffer to the cache directory and start playback.
 * Returns the cached file path so the caller can clean it up on error.
 */
async function playMp3FromArrayBuffer(
  arrayBuffer: ArrayBuffer,
): Promise<string> {
  const base64 = arrayBufferToBase64(arrayBuffer);
  const path = `${FileSystem.cacheDirectory}mbipa-tts-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const { sound } = await Audio.Sound.createAsync(
    { uri: path },
    { shouldPlay: true },
  );
  currentSound = sound;
  emitSpeaking(true);

  sound.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      emitSpeaking(false);
      sound.unloadAsync().catch(() => {});
      if (currentSound === sound) currentSound = null;
      FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    }
  });

  return path;
}

export async function stopSpeaking(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {}
    currentSound = null;
  }
  emitSpeaking(false);
}

/**
 * Start recording audio from the microphone.
 * Returns true if recording started, false if permission denied.
 */
export async function startRecording(): Promise<boolean> {
  if (currentRecording) return true;

  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) return false;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  await recording.startAsync();
  currentRecording = recording;
  return true;
}

/**
 * Stop recording and transcribe via Azure Fast Transcription API.
 * Accepts the recording in its native container format (m4a on Android,
 * caf/wav on iOS) and uses multipart/form-data which the Azure endpoint
 * happily ingests.
 * Returns the recognized French text (or empty string).
 */
export async function stopRecordingAndTranscribe(): Promise<string> {
  const recording = currentRecording;
  currentRecording = null;
  if (!recording) return "";

  try {
    await recording.stopAndUnloadAsync();
  } catch (e) {
    console.warn("[speech] stopAndUnloadAsync failed", e);
  }

  const uri = recording.getURI();
  if (!uri) {
    throw new Error("Aucun fichier audio enregistré.");
  }

  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) {
    throw new Error("Fichier audio introuvable.");
  }

  // Infer mime/name from the URI extension.
  const lower = uri.toLowerCase();
  let mime = "audio/mp4";
  let name = "recording.m4a";
  if (lower.endsWith(".wav")) {
    mime = "audio/wav";
    name = "recording.wav";
  } else if (lower.endsWith(".caf")) {
    mime = "audio/x-caf";
    name = "recording.caf";
  } else if (lower.endsWith(".3gp") || lower.endsWith(".3gpp")) {
    mime = "audio/3gpp";
    name = "recording.3gp";
  } else if (lower.endsWith(".mp3")) {
    mime = "audio/mpeg";
    name = "recording.mp3";
  } else if (lower.endsWith(".aac")) {
    mime = "audio/aac";
    name = "recording.aac";
  }

  const form = new FormData();
  // React Native FormData accepts {uri, name, type} objects.
  form.append("audio", { uri, name, type: mime } as any);
  form.append(
    "definition",
    JSON.stringify({
      locales: ["fr-FR"],
      profanityFilterMode: "None",
    }),
  );

  let response: Response;
  try {
    response = await fetch(FAST_STT_ENDPOINT, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": SPEECH_KEY,
        Accept: "application/json",
        // Note: do NOT set Content-Type manually — fetch sets the multipart boundary.
      },
      body: form as any,
    });
  } catch (e: any) {
    console.warn("[speech] STT fetch failed", e);
    // Cleanup before rethrow
    FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    throw new Error(`Réseau indisponible : ${e?.message || e}`);
  }

  // Cleanup audio file regardless of outcome
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("[speech] STT failed", response.status, detail);
    // Surface a snippet of the server's reason so 422 issues are diagnosable.
    const snippet = detail
      ? ` — ${detail.replace(/\s+/g, " ").slice(0, 140)}`
      : "";
    throw new Error(`Transcription échec (${response.status})${snippet}`);
  }

  const data = await response.json();
  // Fast transcription response shape:
  // { duration, combinedPhrases: [{ text }], phrases: [...] }
  const text =
    data?.combinedPhrases?.[0]?.text?.trim() ||
    data?.phrases
      ?.map((p: any) => p?.text)
      .filter(Boolean)
      .join(" ") ||
    "";
  return text;
}

export async function cancelRecording(): Promise<void> {
  if (!currentRecording) return;
  try {
    await currentRecording.stopAndUnloadAsync();
  } catch {}
  currentRecording = null;
}

// ---------- helpers ----------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)),
    );
  }
  // global.btoa not always available in RN
  if (typeof btoa === "function") return btoa(binary);
  // fallback
  return Buffer.from(binary, "binary").toString("base64");
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary =
    typeof atob === "function"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
