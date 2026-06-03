/**
 * Vision Service — emotional check-in (NOT medical diagnosis).
 *
 * Captures a quick selfie via the device camera, uploads it to the MBIPA
 * backend (Azure Vision behind the scenes), and returns a soft, supportive
 * conversational message we can drop into the chat as an assistant turn.
 *
 * Endpoint: POST /api/mobile/vision/analyze
 *           multipart/form-data, field "image"
 *           Authorization: Bearer <Firebase ID token>
 *
 * Backend response shape (recommended):
 *   { "message": "You seem a little tired today. Want to talk about it?",
 *     "mood": "calm" | "tired" | "stressed" | "happy" | "neutral" | "sad",
 *     "lang": "fr" | "en" }
 *
 * UX rules enforced here:
 *  - We never expose raw emotion scores to the UI.
 *  - We never label this as a medical analysis.
 *  - We always provide a graceful, supportive fallback message if the
 *    backend fails or the user is offline, so the chat conversation is
 *    never blocked by this optional feature.
 */
import { API_URL, ENDPOINTS } from "@/src/api/config";
import { auth } from "@/src/config/firebase";

export interface VisionResult {
  /** Conversational message to display as Mbipa's reply. */
  message: string;
  /** Coarse mood bucket — optional, never surfaced as a number. */
  mood?: "calm" | "tired" | "stressed" | "happy" | "neutral" | "sad";
  /** Language hint so we can speak the reply with the right voice. */
  lang?: "fr" | "en" | "sg";
}

function inferFilenameAndType(localUri: string): {
  filename: string;
  type: string;
} {
  const filename = localUri.split("/").pop() || "checkin.jpg";
  const match = /\.(\w+)$/.exec(filename);
  let ext = (match?.[1] || "jpg").toLowerCase();
  if (ext === "jpg") ext = "jpeg";
  return { filename, type: `image/${ext}` };
}

async function getIdToken(forceRefresh = false): Promise<string | null> {
  const u = auth.currentUser;
  if (!u) return null;
  try {
    return await u.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

async function postImage(
  localUri: string,
  token: string | null,
  lang: string,
): Promise<Response> {
  const { filename, type } = inferFilenameAndType(localUri);
  const fd = new FormData();
  fd.append("image", {
    uri: localUri,
    name: filename,
    type,
  } as unknown as Blob);
  fd.append("lang", lang);

  // Diagnostic log: filename/type and whether a token is supplied
  console.log(
    "[vision] postImage -> filename:",
    filename,
    "type:",
    type,
    "tokenPresent:",
    !!token,
    "lang:",
    lang,
  );

  return fetch(`${API_URL}${ENDPOINTS.VISION.ANALYZE}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Do NOT set Content-Type — fetch picks the multipart boundary.
    },
    body: fd as any,
  });
}

/** Soft, supportive fallback when the backend is unreachable or errors. */
function fallbackMessage(lang: "fr" | "en" | "sg"): string {
  if (lang === "en") {
    return "Thanks for sharing that moment with me. How are you feeling right now?";
  }
  // fr / sg default
  return "Merci de partager ce moment avec moi. Comment te sens-tu en ce moment ?";
}

/**
 * Analyze a captured photo and return a gentle conversational reply.
 *
 * @param localUri  file:// uri returned by `ImagePicker.launchCameraAsync`.
 * @param lang      User's current i18n language ("fr" | "en" | "sg").
 *                  Used to localise the fallback message and passed to the
 *                  backend so it can reply in the right language.
 */
export async function analyzeEmotion(
  localUri: string,
  lang: "fr" | "en" | "sg" = "fr",
): Promise<VisionResult> {
  if (!localUri) {
    return { message: fallbackMessage(lang), lang };
  }

  let token = await getIdToken(false);
  let response: Response;
  try {
    const start = Date.now();
    response = await postImage(localUri, token, lang);
    const duration = Date.now() - start;
    console.log(
      "[vision] postImage response status:",
      response.status,
      "durationMs:",
      duration,
    );
    if (response.status === 401 && token) {
      token = await getIdToken(true);
      response = await postImage(localUri, token, lang);
      console.log("[vision] retry postImage response status:", response.status);
    }
  } catch (e) {
    console.warn("[vision] network error:", e);
    return { message: fallbackMessage(lang), lang };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.warn(
      `[vision] backend error ${response.status}:`,
      text?.slice(0, 200),
    );
    return { message: fallbackMessage(lang), lang };
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch (e) {
    console.warn("[vision] invalid JSON:", e);
    return { message: fallbackMessage(lang), lang };
  }

  console.log("[vision] backend payload:", data);

  if (!data || typeof data !== "object") {
    console.warn("[vision] backend returned unexpected payload:", data);
  }

  const message =
    (typeof data?.message === "string" && data.message.trim()) ||
    fallbackMessage(lang);

  return {
    message,
    mood: data?.mood,
    lang: data?.lang || lang,
  };
}
