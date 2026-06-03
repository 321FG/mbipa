/**
 * useVersionCheck — drives the in-app update experience.
 *
 * On mount it reads the installed version, fetches the remote policy and
 * decides which (if any) modal to show:
 *   - forced update   -> non-dismissable UpdateModal
 *   - optional update -> dismissable UpdateModal
 *   - just updated     -> one-time WhatsNewModal
 *
 * Fully additive and resilient: a missing/slow/invalid backend simply yields
 * `status: "none"` and no modal. Nothing here touches auth, chat, voice,
 * avatar, routing or onboarding.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

import {
  type AppVersionInfo,
  type UpdateStatus,
  fetchVersionInfo,
  getCurrentVersion,
  getLastSeenWhatsNew,
  getStoreUrl,
  resolveUpdateStatus,
  setLastSeenWhatsNew,
  shouldShowWhatsNew,
} from "@/src/services/versionService";

export interface VersionCheckState {
  /** Installed app version, e.g. "1.0.0". */
  currentVersion: string;
  /** Remote policy, or null while loading / on failure. */
  info: AppVersionInfo | null;
  /** Resolved update status. */
  status: UpdateStatus;
  /** Whether the update modal should be visible. */
  showUpdateModal: boolean;
  /** Whether the modal blocks interaction (forced update). */
  isForced: boolean;
  /** Whether the one-time "What's new" screen should be visible. */
  showWhatsNew: boolean;
  /** True while the initial check is in flight. */
  loading: boolean;
  /** Open the app store (Play Store / App Store). */
  openStore: () => Promise<void>;
  /** Dismiss the optional update modal ("Plus tard"). No-op when forced. */
  dismissUpdate: () => void;
  /** Acknowledge the "What's new" screen and persist it. */
  acknowledgeWhatsNew: () => void;
}

export function useVersionCheck(): VersionCheckState {
  const currentVersion = getCurrentVersion();

  const [info, setInfo] = useState<AppVersionInfo | null>(null);
  const [status, setStatus] = useState<UpdateStatus>("none");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();

    (async () => {
      const [remote, lastSeen] = await Promise.all([
        fetchVersionInfo(controller.signal),
        getLastSeenWhatsNew(),
      ]);
      if (!mounted.current) return;

      const nextStatus = resolveUpdateStatus(currentVersion, remote);
      setInfo(remote);
      setStatus(nextStatus);

      if (nextStatus !== "none") {
        // An update is available/required — prioritise the update modal.
        setShowUpdateModal(true);
      } else if (shouldShowWhatsNew(currentVersion, remote, lastSeen)) {
        // Up to date but the release notes for this version are unseen.
        setShowWhatsNew(true);
      }
      setLoading(false);
    })();

    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, [currentVersion]);

  const openStore = useCallback(async () => {
    const url = getStoreUrl(info);
    try {
      // Prefer the native store app deep-link when possible.
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // fall through to in-app browser
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      if (__DEV__) console.warn("[useVersionCheck] unable to open store URL");
    }
  }, [info]);

  const dismissUpdate = useCallback(() => {
    // Forced updates cannot be dismissed.
    if (status === "forced") return;
    setShowUpdateModal(false);
  }, [status]);

  const acknowledgeWhatsNew = useCallback(() => {
    setShowWhatsNew(false);
    void setLastSeenWhatsNew(currentVersion);
  }, [currentVersion]);

  return {
    currentVersion,
    info,
    status,
    showUpdateModal,
    isForced: status === "forced",
    showWhatsNew,
    loading,
    openStore,
    dismissUpdate,
    acknowledgeWhatsNew,
  };
}
