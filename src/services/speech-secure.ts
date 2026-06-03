/**
 * Azure Cognitive Services - Speech (TTS + STT)
 * 
 * SECURITY: P0.1 COMPLIANT - NO EXPOSED API KEYS
 * 
 * ✅ All Azure API calls are proxied through the backend.
 * ✅ EXPO_PUBLIC_AZURE_SPEECH_KEY is NOT used.
 * ✅ No direct calls to Azure endpoints.
 * ✅ JWT authentication required for all requests.
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

// Backend TTS endpoint — server-side proxy to Azure Neural Voices
// (Vivienne FR / Ava EN). The server holds the AZURE_SPEECH_KEY.
const BACKEND_TTS_ENDPOINT = `${API_URL}/api/chat/tts`;

// Backend STT endpoint — server-side proxy for transcription
// The server holds the AZURE_SPEECH_KEY and processes the audio.
const BACKEND_STT_ENDPOINT = `${API_URL}/api/chat/stt`;

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
 * Speak the given text via the Mbipa backend TTS proxy (Azure Neural Voices).
 * 
 * The backend selects the appropriate native voice (Vivienne FR, Ava EN, …)
 * based on the `lang` parameter, so the playback always sounds native
 * regardless of the device's system language.
 *
 * When `voiceGender` is provided, it is forwarded to the backend so the
 * server can honor it for gendered voices per character.
 *
 * `character` ("bagaza" | "yassingou") is forwarded to the backend so the
 * server can pick the right neural voice per character. The backend mapping
 * is the source of truth.
 * 
 * SECURITY: This method requires JWT authentication. The backend will attach
 * the AZURE_SPEECH_KEY server-side and never expose it to the client.
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
    console.log("🔊 TTS request (backend proxy)", {
      character: characterId,
      voiceGender,
      lang,
      textPreview: text.slice(0, 40),
    });
  }

  let path: string | null = null;
  try {
    // ✅ SECURE PATH: Backend proxy only
    // Get Firebase ID token for authentication
    const fbUser = firebaseAuth.currentUser;
    const token = fbUser ? await fbUser.getIdToken() : null;
    if (!token) {
      throw new Error("Authentification requise pour la voix.");
    }

    // Call backend TTS endpoint (never expose Azure key)
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
 * Stop recording and transcribe via backend STT proxy.
 * 
 * The recorded audio is sent to the backend, which will:
 * 1. Attach the AZURE_SPEECH_KEY server-side (never exposed to client)
 * 2. Call Azure Fast Transcription API
 * 3. Return the recognized text
 * 
 * SECURITY: The client never has access to the speech key.
 * 
 * Returns the recognized text (or empty string on error).
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

  // ✅ SECURE PATH: Use backend proxy instead of direct Azure call
  const fbUser = firebaseAuth.currentUser;
  const token = fbUser ? await fbUser.getIdToken() : null;
  if (!token) {
    FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    throw new Error("Authentification requise pour la transcription.");
  }

  const form = new FormData();
  // React Native FormData accepts {uri, name, type} objects.
  form.append("audio", { uri, name, type: mime } as any);

  let response: Response;
  try {
    response = await fetch(BACKEND_STT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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
    console.warn("[speech] STT backend failed", response.status, detail);
    // Surface a snippet of the server's reason so 422 issues are diagnosable.
    const snippet = detail
      ? ` — ${detail.replace(/\s+/g, " ").slice(0, 140)}`
      : "";
    throw new Error(`Transcription échec (${response.status})${snippet}`);
  }

  const data = await response.json();
  // Backend STT response shape (customize based on your backend):
  // { text: "recognized text", confidence: 0.95, ... }
  const text = data?.text?.trim() || "";
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
