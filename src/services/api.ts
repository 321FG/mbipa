/**
 * Central API helper.
 *
 * - Resolves the Firebase ID token via `auth.currentUser.getIdToken()` so
 *   every authenticated call uses the live, freshly-refreshed token.
 * - Adds `Authorization: Bearer <token>` automatically.
 * - Throws if `status >= 400`, with the response body included in the message.
 *
 * Usage:
 *   import { apiFetch, API_BASE_URL } from "@/src/services/api";
 *   const me = await apiFetch("/api/users/me");
 *   const updated = await apiFetch("/api/users/me", {
 *     method: "PUT",
 *     body: { name, avatar },
 *     forceRefresh: true,
 *   });
 */
import { auth } from "@/src/config/firebase";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net";

export interface ApiFetchOptions extends Omit<RequestInit, "body" | "headers"> {
  /** JSON body — will be stringified automatically. */
  body?: unknown;
  /** Extra headers to merge in. */
  headers?: Record<string, string>;
  /** Skip the Authorization header (e.g. for public endpoints). */
  skipAuth?: boolean;
  /**
   * Force-refresh the Firebase ID token before sending the request.
   * Use this before every critical call (PUT /me, POST /chat/message,
   * POST /chat/tts) and at the start of a session.
   */
  forceRefresh?: boolean;
  /** Request timeout in ms. Defaults to 20s. */
  timeoutMs?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    body,
    headers = {},
    skipAuth = false,
    forceRefresh = false,
    timeoutMs = 20000,
    method = body !== undefined ? "POST" : "GET",
    ...rest
  } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = await getToken(forceRefresh);
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  // Read body once (text first, parse JSON if applicable)
  const raw = await response.text();
  let parsed: any = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (response.status >= 400) {
    const message =
      (parsed && (parsed.message || parsed.error)) ||
      raw ||
      `HTTP ${response.status}`;
    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}
