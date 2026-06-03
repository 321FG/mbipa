/**
 * App version & update service.
 *
 * Self-contained, additive module that powers the in-app update system:
 *   - reads the installed app version (expo-constants)
 *   - fetches the remote version policy from the backend
 *   - decides whether an update is optional / forced / not needed
 *   - tracks which "What's new" version the user has already seen
 *
 * This module is intentionally side-effect free and never throws: every
 * network/parse failure resolves to `null` so callers can degrade gracefully
 * (offline mode, backend down, malformed payload). It does NOT touch auth,
 * chat, voice, avatar, routing or onboarding.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { API_URL } from "@/src/api/config";

/** Backend endpoint that returns the current version policy. */
export const APP_VERSION_ENDPOINT = "/api/mobile/app/version";

/** Android package id — matches app.json `android.package`. */
const ANDROID_PACKAGE = "com.mbipa.app";

/** Fallback store URLs (used when the backend omits `playStoreUrl`). */
export const STORE_URLS = {
  android: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
  ios: "https://apps.apple.com/app/mbipa/id0000000000",
} as const;

/** AsyncStorage key: last app version whose "What's new" screen was shown. */
const WHATS_NEW_KEY = "mbipa.whatsNew.lastSeenVersion";

/** Shape returned by the backend (and consumed across the app). */
export interface AppVersionInfo {
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  releaseNotes: string[];
  playStoreUrl?: string;
  appStoreUrl?: string;
}

/** Result of comparing the installed version against the remote policy. */
export type UpdateStatus = "none" | "optional" | "forced";

/** Request timeout so a slow/dead backend never blocks startup. */
const FETCH_TIMEOUT_MS = 6000;

/**
 * The currently installed app version, e.g. "1.0.0".
 * Falls back to "0.0.0" if it can't be resolved (treated as very old).
 */
export function getCurrentVersion(): string {
  const v =
    Constants.expoConfig?.version ??
    // expo-updates / manifest2 runtime fallback
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { version?: string } } } })
      .manifest2?.extra?.expoClient?.version;
  return typeof v === "string" && v.length > 0 ? v : "0.0.0";
}

/**
 * Compare two dotted numeric versions ("1.2.0" vs "1.10.0").
 * Returns -1 if a < b, 0 if equal, 1 if a > b. Non-numeric / missing
 * segments are treated as 0 so partial versions still compare sanely.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = String(a).split(".");
  const pb = String(b).split(".");
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] ?? "0", 10) || 0;
    const nb = parseInt(pb[i] ?? "0", 10) || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/** True when `latest` is strictly newer than `current`. */
export function isNewerVersion(current: string, latest: string): boolean {
  return compareVersions(latest, current) === 1;
}

/** Basic dotted-version sanity check ("1", "1.0", "1.0.0", ...). */
function isValidVersionString(v: unknown): v is string {
  return typeof v === "string" && /^\d+(\.\d+)*$/.test(v.trim());
}

/**
 * Validate & normalise a raw backend payload into `AppVersionInfo`.
 * Returns `null` when required fields are missing or malformed.
 */
export function parseVersionInfo(raw: unknown): AppVersionInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (!isValidVersionString(r.latestVersion)) return null;
  // minimumVersion is optional; default to latest if absent/invalid.
  const minimumVersion = isValidVersionString(r.minimumVersion)
    ? (r.minimumVersion as string).trim()
    : (r.latestVersion as string).trim();

  const releaseNotes = Array.isArray(r.releaseNotes)
    ? (r.releaseNotes as unknown[])
        .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
        .map((n) => n.trim())
    : [];

  return {
    latestVersion: (r.latestVersion as string).trim(),
    minimumVersion,
    forceUpdate: r.forceUpdate === true,
    releaseNotes,
    playStoreUrl:
      typeof r.playStoreUrl === "string" && r.playStoreUrl.trim().length > 0
        ? (r.playStoreUrl as string).trim()
        : undefined,
    appStoreUrl:
      typeof r.appStoreUrl === "string" && r.appStoreUrl.trim().length > 0
        ? (r.appStoreUrl as string).trim()
        : undefined,
  };
}

/**
 * Fetch the remote version policy. Resolves to `null` on offline / timeout /
 * non-2xx / malformed body — never throws, so app startup is never blocked.
 */
export async function fetchVersionInfo(
  externalSignal?: AbortSignal,
): Promise<AppVersionInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  // Propagate external cancellation (e.g. component unmount).
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(`${API_URL}${APP_VERSION_ENDPOINT}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      if (__DEV__) {
        console.warn(`[versionService] ${APP_VERSION_ENDPOINT} -> ${res.status}`);
      }
      return null;
    }
    const json = (await res.json()) as unknown;
    return parseVersionInfo(json);
  } catch (err) {
    if (__DEV__) {
      console.warn("[versionService] version check failed:", err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Decide the update status for the installed app given the remote policy.
 *  - "forced"   : current < minimumVersion OR forceUpdate flag
 *  - "optional" : a newer latestVersion exists
 *  - "none"     : up to date
 */
export function resolveUpdateStatus(
  current: string,
  info: AppVersionInfo | null,
): UpdateStatus {
  if (!info) return "none";
  const belowMinimum = compareVersions(current, info.minimumVersion) === -1;
  if (info.forceUpdate || belowMinimum) return "forced";
  if (isNewerVersion(current, info.latestVersion)) return "optional";
  return "none";
}

/** Best store URL for the current platform. */
export function getStoreUrl(info: AppVersionInfo | null): string {
  if (Platform.OS === "ios") {
    if (info?.appStoreUrl) return info.appStoreUrl;
    return STORE_URLS.ios;
  }
  if (info?.playStoreUrl) return info.playStoreUrl;
  return STORE_URLS.android;
}

/** The app version whose "What's new" screen the user last acknowledged. */
export async function getLastSeenWhatsNew(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(WHATS_NEW_KEY);
  } catch {
    return null;
  }
}

/** Persist the version whose "What's new" screen was just shown. */
export async function setLastSeenWhatsNew(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(WHATS_NEW_KEY, version);
  } catch {
    // Non-fatal: at worst the screen shows again next launch.
  }
}

/**
 * Whether to show the "What's new" screen: only after a genuine update
 * (the user has a previously-seen version on record that differs from the
 * current one). Returns false on a fresh install — there is nothing "new"
 * to a first-time user.
 */
export function shouldShowWhatsNew(
  current: string,
  info: AppVersionInfo | null,
  lastSeen: string | null,
): boolean {
  if (!info) return false;
  if (lastSeen === null) return false; // fresh install — never show
  const onLatest = compareVersions(current, info.latestVersion) >= 0;
  return onLatest && lastSeen !== current;
}
