/**
 * Centralized HTTP client for Mbipa backend.
 *
 * Features:
 * - Automatic Bearer token from Redux store
 * - Auto-refresh of Firebase ID token on 401
 * - Typed errors (NetworkError, ApiError, AuthError)
 * - Request timeout
 * - JSON helpers (get/post/put/delete)
 *
 * Usage:
 *   import { api } from '@/src/api/http';
 *   const user = await api.get<User>('/api/users/me');
 *   const reply = await api.post<Message>('/api/chat/message', { content });
 */
import { auth as firebaseAuth } from "../config/firebase";
import * as SecureStore from "../utils/secureStore";
import { API_URL } from "./config";

const DEFAULT_TIMEOUT_MS = 20000;

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

export class NetworkError extends Error {
  constructor(message = "Erreur réseau. Vérifiez votre connexion.") {
    super(message);
    this.name = "NetworkError";
  }
}

export class AuthError extends ApiError {
  constructor(message = "Session expirée. Veuillez vous reconnecter.") {
    super(message, 401);
    this.name = "AuthError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** If true, do not attach Authorization header */
  skipAuth?: boolean;
  /** Internal: prevents infinite refresh loop */
  _retried?: boolean;
}

/**
 * Read the current access token from SecureStore.
 * Falls back to the Firebase ID token if no app token is stored.
 */
async function getAccessToken(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync("accessToken");
  if (stored) return stored;
  try {
    const fbUser = firebaseAuth.currentUser;
    if (fbUser) return await fbUser.getIdToken();
  } catch {}
  return null;
}

/**
 * Force-refresh the Firebase ID token and persist it.
 * Returns null if there is no signed-in Firebase user.
 */
async function refreshToken(): Promise<string | null> {
  const fbUser = firebaseAuth.currentUser;
  if (!fbUser) return null;
  try {
    const fresh = await fbUser.getIdToken(true);
    await SecureStore.setItemAsync("accessToken", fresh);
    await SecureStore.setItemAsync("firebaseIdToken", fresh);
    return fresh;
  } catch {
    return null;
  }
}

/**
 * Core fetch wrapper. Handles timeout, auth, refresh, error mapping.
 */
async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };

  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (!opts.skipAuth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body:
        opts.body === undefined
          ? undefined
          : opts.body instanceof FormData
            ? (opts.body as any)
            : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") {
      throw new NetworkError("Délai dépassé. Réessayez.");
    }
    throw new NetworkError();
  }
  clearTimeout(timeout);

  // Handle 401 with one refresh retry
  if (response.status === 401 && !opts._retried && !opts.skipAuth) {
    const fresh = await refreshToken();
    if (fresh) {
      return request<T>(path, { ...opts, _retried: true });
    }
    throw new AuthError();
  }

  if (!response.ok) {
    let payload: any = null;
    let message = `Erreur ${response.status}`;
    try {
      payload = await response.json();
      message = payload?.message || payload?.error || message;
    } catch {
      try {
        message = (await response.text()) || message;
      } catch {}
    }
    throw new ApiError(message, response.status, payload);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">,
  ) => request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

/**
 * Helper to extract a user-friendly message from any thrown error.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof NetworkError)
    return err.message;
  if (err instanceof Error) return err.message;
  return "Une erreur est survenue";
}
