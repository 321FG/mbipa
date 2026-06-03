/**
 * Public form submissions (Appointments, Testimonials, Contact messages).
 *
 * A single `submitForm(endpoint, payload)` helper used by every screen so the
 * fetch / auth / error-mapping logic lives in exactly one place.
 *
 * Backend contract (Cosmos DB-backed, database `mbipaDB`):
 *   POST /api/v1/appointments  -> container `appointments`
 *   POST /api/v1/testimonials  -> container `testimonials`
 *   POST /api/v1/messages      -> container `contacts`
 *
 * Behaviour:
 * - Content-Type is always application/json (handled by `apiFetch`).
 * - Auth is optional: if a Firebase user is signed in, `apiFetch` attaches the
 *   ID token automatically; otherwise the request is sent anonymously and the
 *   server stores `userId: "anonymous"`.
 * - Fields are validated client-side against the server schema so users get a
 *   friendly message instead of a raw 400.
 * - Failed POSTs are never retried automatically — the caller may offer a
 *   single user-triggered retry.
 * - The returned `id` (201) is logged for QA only; never surface it in the UI.
 */
import type { TFunction } from "i18next";

import { API_BASE_URL, ApiError, apiFetch } from "./api";

export const FORM_ENDPOINTS = {
  APPOINTMENTS: "/api/v1/appointments",
  TESTIMONIALS: "/api/v1/testimonials",
  MESSAGES: "/api/v1/messages",
} as const;

export type FormEndpoint = (typeof FORM_ENDPOINTS)[keyof typeof FORM_ENDPOINTS];

export const APPOINTMENT_REASONS = [
  "anxiety",
  "depression",
  "burnout",
  "couple",
  "self",
  "other",
] as const;

export const APPOINTMENT_FORMATS = ["video", "phone", "inperson"] as const;

export const APPOINTMENT_PERIODS = ["morning", "afternoon", "evening"] as const;

/** Discriminated result of a form submission. Never throws. */
export type SubmitFormResult =
  | { kind: "success"; status: 201; id?: string }
  | {
      kind: "validation";
      status: number;
      messageKey?: string;
      serverError?: string;
    }
  | { kind: "rateLimited"; status: 429 }
  | { kind: "network"; status: 0 }
  | { kind: "error"; status: number };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return (
    typeof value === "string" && (allowed as readonly string[]).includes(value)
  );
}

/**
 * Validate a payload against the server schema for the given endpoint.
 * Returns an i18n key for the first problem found, or null when valid.
 */
function validate(
  endpoint: FormEndpoint,
  payload: Record<string, unknown>,
): string | null {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  if (endpoint === FORM_ENDPOINTS.APPOINTMENTS) {
    if (str(payload.name).length < 2) return "forms.validation.name";
    if (!isOneOf(payload.reason, APPOINTMENT_REASONS))
      return "forms.validation.reason";
    if (!isOneOf(payload.format, APPOINTMENT_FORMATS))
      return "forms.validation.format";
    if (
      payload.email != null &&
      str(payload.email) &&
      !EMAIL_RE.test(str(payload.email))
    )
      return "forms.validation.email";
    if (
      payload.period != null &&
      str(payload.period) &&
      !isOneOf(payload.period, APPOINTMENT_PERIODS)
    )
      return "forms.validation.period";
    if (payload.date != null && str(payload.date)) {
      const ts = Date.parse(str(payload.date));
      if (Number.isNaN(ts)) return "forms.validation.date";
      if (ts <= Date.now()) return "forms.validation.dateFuture";
    }
    if (str(payload.notes).length > 2000) return "forms.validation.notes";
    return null;
  }

  if (endpoint === FORM_ENDPOINTS.TESTIMONIALS) {
    if (str(payload.name).length < 1) return "forms.validation.name";
    if (!EMAIL_RE.test(str(payload.email))) return "forms.validation.email";
    const msg = str(payload.message);
    if (msg.length < 10) return "forms.validation.messageShort";
    if (msg.length > 5000) return "forms.validation.messageLong";
    return null;
  }

  if (endpoint === FORM_ENDPOINTS.MESSAGES) {
    if (str(payload.subject).length < 1) return "forms.validation.subject";
    if (str(payload.message).length < 5) return "forms.validation.messageShort";
    if (
      payload.senderEmail != null &&
      str(payload.senderEmail) &&
      !EMAIL_RE.test(str(payload.senderEmail))
    )
      return "forms.validation.email";
    return null;
  }

  return null;
}

/**
 * Submit a public form. Validates client-side, POSTs JSON, and maps the
 * outcome to a structured result. Does not retry on failure.
 */
export async function submitForm(
  endpoint: FormEndpoint,
  payload: Record<string, unknown>,
): Promise<SubmitFormResult> {
  const url = `${API_BASE_URL}${endpoint}`;

  const clientError = validate(endpoint, payload);
  if (clientError) {
    if (__DEV__)
      console.log(
        `[submitForm] POST ${url} -> blocked (client validation: ${clientError})`,
      );
    return { kind: "validation", status: 400, messageKey: clientError };
  }

  try {
    const res = await apiFetch<{
      success: boolean;
      id?: string;
      error?: string;
    }>(endpoint, {
      method: "POST",
      body: payload,
    });

    if (res?.success === false) {
      if (__DEV__)
        console.log(
          `[submitForm] POST ${url} -> 200 but success=false`,
          res?.error,
        );
      return { kind: "validation", status: 400, serverError: res?.error };
    }

    if (__DEV__)
      console.log(`[submitForm] POST ${url} -> 201 id=${res?.id ?? "(none)"}`);
    return { kind: "success", status: 201, id: res?.id };
  } catch (e) {
    if (e instanceof ApiError) {
      if (__DEV__)
        console.log(`[submitForm] POST ${url} -> ${e.status} ${e.message}`);
      if (e.status === 400) {
        const serverError =
          (e.payload as { error?: string } | null)?.error || e.message;
        return { kind: "validation", status: 400, serverError };
      }
      if (e.status === 429) return { kind: "rateLimited", status: 429 };
      return { kind: "error", status: e.status };
    }
    if (__DEV__) console.log(`[submitForm] POST ${url} -> network error`, e);
    return { kind: "network", status: 0 };
  }
}

/**
 * Map a non-success result to a localized `{ title, message }` for an Alert.
 * Returns null for success (caller handles its own success UI).
 */
export function formFeedback(
  result: SubmitFormResult,
  t: TFunction,
): { title: string; message: string } | null {
  switch (result.kind) {
    case "success":
      return null;
    case "validation":
      return {
        title: t("forms.validation.title"),
        message:
          result.serverError ||
          (result.messageKey
            ? t(result.messageKey)
            : t("forms.validation.generic")),
      };
    case "rateLimited":
      return {
        title: t("forms.rateLimited.title"),
        message: t("forms.rateLimited.message"),
      };
    case "network":
      return { title: t("common.error"), message: t("forms.networkError") };
    case "error":
    default:
      return { title: t("common.error"), message: t("forms.serverError") };
  }
}
