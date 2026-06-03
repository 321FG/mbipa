/**
 * AppUpdateGate — single mount point for the in-app update system.
 *
 * Drop this once near the navigation root (inside PaperProvider). It runs the
 * version check on launch and renders the appropriate modal (optional/forced
 * update, or the one-time "What's new" screen). It renders nothing when the
 * app is up to date, and never blocks startup.
 */
import React from "react";

import { useVersionCheck } from "@/src/hooks/useVersionCheck";

import { UpdateModal } from "./UpdateModal";
import { WhatsNewModal } from "./WhatsNewModal";

export function AppUpdateGate() {
  const {
    currentVersion,
    info,
    isForced,
    showUpdateModal,
    showWhatsNew,
    openStore,
    dismissUpdate,
    acknowledgeWhatsNew,
  } = useVersionCheck();

  return (
    <>
      <UpdateModal
        visible={showUpdateModal}
        forced={isForced}
        releaseNotes={info?.releaseNotes ?? []}
        latestVersion={info?.latestVersion}
        onUpdate={openStore}
        onDismiss={dismissUpdate}
      />
      <WhatsNewModal
        visible={showWhatsNew}
        version={currentVersion}
        releaseNotes={info?.releaseNotes ?? []}
        onContinue={acknowledgeWhatsNew}
      />
    </>
  );
}
