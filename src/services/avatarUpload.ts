/**
 * Avatar upload — POSTs the picked image to the MBIPA backend, which stores
 * it in Azure Blob Storage and returns a public HTTPS URL.
 *
 * Endpoint: POST /api/users/me/avatar (multipart/form-data, field "avatar")
 * Auth:     Authorization: Bearer <Firebase ID token>
 * Limits:   max 5 MB, image/jpeg | image/png | image/webp | image/gif
 *
 * Returns the canonical URL to store on the user profile.
 */
import { auth } from "@/src/config/firebase";
import { API_BASE_URL, ApiError } from "@/src/services/api";

export function isRemoteUrl(uri: string | undefined | null): boolean {
  if (!uri) return false;
  return /^https?:\/\//i.test(uri);
}

function inferFilenameAndType(localUri: string): {
  filename: string;
  type: string;
} {
  const filename = localUri.split("/").pop() || "avatar.jpg";
  const match = /\.(\w+)$/.exec(filename);
  let ext = (match?.[1] || "jpg").toLowerCase();
  if (ext === "jpg") ext = "jpeg";
  const type = `image/${ext}`;
  return { filename, type };
}

async function getIdToken(forceRefresh = false): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error("Not authenticated");
  return u.getIdToken(forceRefresh);
}

async function postAvatar(localUri: string, token: string): Promise<Response> {
  const { filename, type } = inferFilenameAndType(localUri);
  const fd = new FormData();
  // React Native FormData accepts the {uri,name,type} shape.
  fd.append("avatar", {
    uri: localUri,
    name: filename,
    type,
  } as unknown as Blob);

  // Do NOT set Content-Type — fetch sets the multipart boundary itself.
  return fetch(`${API_BASE_URL}/api/users/me/avatar`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: fd as any,
  });
}

/**
 * Uploads `localUri` and returns the public HTTPS URL. Auto-retries once
 * with a refreshed Firebase ID token on 401. Throws `ApiError` on failure
 * (backend `code` like `FILE_TOO_LARGE` or `INVALID_IMAGE_TYPE` in
 * `error.payload`).
 */
export async function uploadAvatar(
  localUri: string,
  _uid?: string,
): Promise<string> {
  if (!localUri) throw new Error("uploadAvatar: localUri is required");
  if (isRemoteUrl(localUri)) return localUri;

  let token = await getIdToken(false);
  let response = await postAvatar(localUri, token);

  if (response.status === 401) {
    token = await getIdToken(true);
    response = await postAvatar(localUri, token);
  }

  const raw = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const looksLikeHtml =
    contentType.includes("text/html") || /^\s*<(!doctype|html)/i.test(raw);

  let parsed: any = null;
  if (raw && !looksLikeHtml) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (response.status >= 400) {
    // Backend returned an HTML error page (e.g. Express default 404
    // "Cannot POST /api/users/me/avatar"). Don't dump HTML to the user.
    let message: string;
    if (looksLikeHtml || response.status === 404) {
      message =
        response.status === 404
          ? "Avatar upload is not available on the server yet."
          : `Server error (HTTP ${response.status}). Please try again later.`;
    } else {
      message =
        (parsed && (parsed.message || parsed.error)) ||
        (typeof parsed === "string" ? parsed : "") ||
        `HTTP ${response.status}`;
    }
    throw new ApiError(message, response.status, parsed);
  }

  const url: string | undefined =
    parsed?.photoURL || parsed?.avatar || parsed?.url;
  if (!url) {
    throw new ApiError("Upload succeeded but no URL returned", 500, parsed);
  }
  return url;
}
