/**
 * PaymentService — Flutterwave hosted-checkout integration.
 *
 * Backend contract:
 *   POST {API_URL}/api/mobile/payment/flutterwave
 *   body: { email, plan: "premium" | "pro" }
 *   200: { url, tx_ref, plan, amount, currency }
 *   400/502: { error, message }
 *
 * NEVER stores or handles the Flutterwave secret key — that lives on the server.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

import { API_URL } from "../api/config";
import { auth as firebaseAuth } from "../config/firebase";

export type PaymentPlan = "premium" | "pro";
export type SubscriptionPlanValue = "free" | "premium" | "pro";

export interface PaymentLinkResponse {
  url: string;
  tx_ref: string;
  plan: PaymentPlan;
  amount: number;
  currency: string;
}

export interface SubscriptionStatus {
  plan: SubscriptionPlanValue;
  status?: string;
  expiresAt?: string;
}

export interface PaymentError {
  error: string;
  message: string;
  status?: number;
}

const TX_REF_KEY_PREFIX = "@mbipa/payment/tx_ref/";

function txRefKey(userId: string): string {
  return `${TX_REF_KEY_PREFIX}${userId}`;
}

/**
 * Persist the latest tx_ref for a user so we can verify the transaction
 * after the redirect (or on next app launch).
 */
export async function persistTxRef(
  userId: string,
  data: PaymentLinkResponse,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      txRefKey(userId),
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch (e) {
    console.warn("[paymentService] persistTxRef failed", e);
  }
}

export async function getStoredTxRef(
  userId: string,
): Promise<(PaymentLinkResponse & { savedAt: number }) | null> {
  try {
    const raw = await AsyncStorage.getItem(txRefKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearStoredTxRef(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(txRefKey(userId));
  } catch {
    /* noop */
  }
}

/**
 * Call backend to create a Flutterwave hosted-checkout link.
 * Throws PaymentError on non-2xx responses.
 */
export async function createPaymentLink(params: {
  email: string;
  plan: PaymentPlan;
}): Promise<PaymentLinkResponse> {
  if (!params.email) {
    throw {
      error: "EMAIL_REQUIRED",
      message: "Email is required",
    } as PaymentError;
  }
  if (params.plan !== "premium" && params.plan !== "pro") {
    throw {
      error: "INVALID_PLAN",
      message: "Plan must be 'premium' or 'pro'",
    } as PaymentError;
  }

  // Attach Firebase ID token if available (backend may require auth).
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const user = firebaseAuth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    /* token optional */
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/mobile/payment/flutterwave`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: params.email, plan: params.plan }),
    });
  } catch (e: any) {
    throw {
      error: "NETWORK_ERROR",
      message: e?.message || "Network request failed",
    } as PaymentError;
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-json body */
  }

  if (!res.ok) {
    throw {
      error: body?.error || "PAYMENT_ERROR",
      message: body?.message || `Request failed (${res.status})`,
      status: res.status,
    } as PaymentError;
  }

  if (!body?.url || !body?.tx_ref) {
    throw {
      error: "PAYMENT_ERROR",
      message: "Invalid response from payment service",
      status: res.status,
    } as PaymentError;
  }

  return body as PaymentLinkResponse;
}

/**
 * Open the Flutterwave checkout URL.
 * Prefers the in-app browser (better UX + the redirect can return to the app
 * via deep link). Falls back to `Linking.openURL` if it fails.
 */
export async function openCheckout(url: string): Promise<void> {
  // Hard guard: only ever open HTTPS checkout URLs. A non-HTTPS link here
  // would mean the backend (or a tampered response) handed us an unsafe URL.
  if (!/^https:\/\//i.test(url)) {
    throw new Error("openCheckout: refusing to open non-HTTPS URL");
  }
  try {
    await WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: "close",
      enableBarCollapsing: true,
      // showTitle is Android-only; ignored elsewhere.
      showTitle: true,
    } as any);
  } catch (e) {
    if (__DEV__)
      console.warn("[paymentService] openBrowserAsync failed, falling back", e);
    // Re-validate before the fallback (defense in depth).
    if (!/^https:\/\//i.test(url)) {
      throw new Error("openCheckout: fallback rejected, non-HTTPS URL");
    }
    await Linking.openURL(url);
  }
}

/**
 * Verify a transaction by tx_ref. Backend should call Flutterwave's verify API.
 * NEVER trust the redirect URL alone — always call this.
 */
export async function verifyPayment(txRef: string): Promise<{
  status: "successful" | "failed" | "pending";
  plan?: PaymentPlan;
  amount?: number;
  currency?: string;
  message?: string;
}> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const user = firebaseAuth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    /* token optional */
  }

  try {
    const res = await fetch(
      `${API_URL}/api/mobile/payment/flutterwave/verify`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ tx_ref: txRef }),
      },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        status: "failed",
        message: body?.message || `Verify failed (${res.status})`,
      };
    }
    return {
      status: body?.status ?? "pending",
      plan: body?.plan,
      amount: body?.amount,
      currency: body?.currency,
      message: body?.message,
    };
  } catch (e: any) {
    return { status: "pending", message: e?.message || "Network error" };
  }
}

/**
 * Get the current subscription plan for a user.
 * Tries Authorization header (Firebase ID token) first; falls back to ?email= query.
 */
export async function getSubscription(
  email?: string,
): Promise<SubscriptionStatus> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let useEmail = email;
  try {
    const user = firebaseAuth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
      if (!useEmail && user.email) useEmail = user.email;
    }
  } catch {
    /* token optional */
  }

  const url =
    `${API_URL}/api/mobile/user/subscription` +
    (useEmail ? `?email=${encodeURIComponent(useEmail)}` : "");

  const res = await fetch(url, { method: "GET", headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw {
      error: body?.error || "SUBSCRIPTION_ERROR",
      message: body?.message || `Request failed (${res.status})`,
      status: res.status,
    } as PaymentError;
  }
  return {
    plan: (body?.plan as SubscriptionPlanValue) || "free",
    status: body?.status,
    expiresAt: body?.expiresAt,
  };
}

/**
 * Poll getSubscription until the plan changes from `previousPlan` to a paid plan,
 * or the timeout is reached. Returns the new status (paid) or null if it never changed.
 */
export async function pollUntilPlanChanges(opts: {
  email?: string;
  previousPlan: SubscriptionPlanValue;
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<SubscriptionStatus | null> {
  const interval = opts.intervalMs ?? 3000;
  const timeout = opts.timeoutMs ?? 30000;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (opts.signal?.aborted) return null;
    try {
      const status = await getSubscription(opts.email);
      if (status.plan !== opts.previousPlan && status.plan !== "free") {
        return status;
      }
    } catch {
      /* swallow and retry */
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return null;
}
